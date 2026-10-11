import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import type { Construct } from "constructs";
import type { SuryaConfig } from "../config.js";
import { ServiceFunction } from "../constructs/service-function.js";
import type { DataStack } from "./data-stack.js";

export interface AgentsStackProps extends StackProps {
  config: SuryaConfig;
  data: DataStack;
  expectedOutput: lambda.IFunction;
}

/**
 * The diagnosis agent (Strands Agents on Amazon Bedrock), invoked by the readings stream,
 * and the per-case Step Functions workflow (services/agents).
 */
export class AgentsStack extends Stack {
  readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: AgentsStackProps) {
    super(scope, id, props);
    const { config, data } = props;

    const shared: Record<string, string> = {
      ...data.tableEnvironment,
      DAY_LENGTH_SECONDS: String(config.dayLengthSeconds),
      VENDOR_DEADLINE_DAYS: "3",
      VENDOR_NAME: config.vendorName,
      EXPECTED_FUNCTION: props.expectedOutput.functionName,
    };

    // --- case workflow ---------------------------------------------------------------------
    const workflow = new ServiceFunction(this, "CaseWorkflow", {
      service: "agents",
      handler: "suryasaathi_agents.workflow.handler",
      config,
      timeout: Duration.seconds(60),
      environment: {
        ...shared,
        ...(config.senderEmail ? { SENDER_EMAIL: config.senderEmail } : {}),
        ...(config.vendorEmail ? { VENDOR_EMAIL: config.vendorEmail } : {}),
        ...(config.discomEmail ? { DISCOM_EMAIL: config.discomEmail } : {}),
      },
    });
    data.cases.grantReadWriteData(workflow.fn);
    data.readings.grantReadData(workflow.fn);
    data.systems.grantReadData(workflow.fn);
    data.expected.grantReadData(workflow.fn);
    props.expectedOutput.grantInvoke(workflow.fn);
    workflow.fn.addToRolePolicy(
      new iam.PolicyStatement({ actions: ["ses:SendEmail"], resources: ["*"] }),
    );

    this.stateMachine = caseWorkflow(this, workflow.fn, config);

    // --- diagnosis agent ---------------------------------------------------------------------
    const agent = new ServiceFunction(this, "DiagnosisAgent", {
      service: "agents",
      handler: "suryasaathi_agents.handler.handler",
      config,
      timeout: Duration.minutes(3),
      memorySize: 1024,
      environment: {
        ...shared,
        CASE_WORKFLOW_ARN: this.stateMachine.stateMachineArn,
        BEDROCK_MODEL_ID: config.bedrockModelId,
        BEDROCK_REGION: config.bedrockRegion ?? this.region,
        AGENT_ENABLED: String(config.agentEnabled),
        AGENT_SCOPE: config.agentScope,
        AGENT_EFFORT: config.agentEffort,
      },
    });
    data.readings.grantReadWriteData(agent.fn);
    data.cases.grantReadWriteData(agent.fn);
    data.systems.grantReadData(agent.fn);
    data.expected.grantReadData(agent.fn);
    props.expectedOutput.grantInvoke(agent.fn);
    this.stateMachine.grantStartExecution(agent.fn);
    agent.fn.addToRolePolicy(
      new iam.PolicyStatement({
        // Claude on Bedrock through the Converse API. The model ID is a cross-region
        // inference profile, so this has to cover both the profile and the foundation
        // models it routes to, in every region the profile spans — hence "*".
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:Converse",
          "bedrock:ConverseStream",
        ],
        resources: ["*"],
      }),
    );
    agent.fn.addEventSource(
      new DynamoEventSource(data.readings, {
        startingPosition: lambda.StartingPosition.LATEST,
        batchSize: 5,
        bisectBatchOnError: true,
        retryAttempts: 2,
        reportBatchItemFailures: true,
        // Only new readings: the agent's own annotations are MODIFY events.
        filters: [lambda.FilterCriteria.filter({ eventName: lambda.FilterRule.isEqual("INSERT") })],
      }),
    );

    // --- CloudWatch Logs Insights queries --------------------------------------------------------
    const logGroups = [agent.logGroup.logGroupName, workflow.logGroup.logGroupName];
    new logs.CfnQueryDefinition(this, "DecisionsQuery", {
      name: "SuryaSaathi/agent-decisions",
      logGroupNames: logGroups,
      queryString: [
        "fields @timestamp, systemId, date, diagnosis, action, caseId, reasonSource, reason",
        'filter event = "agent_decision"',
        "sort @timestamp desc",
        "limit 200",
      ].join("\n| "),
    });
    new logs.CfnQueryDefinition(this, "CasesQuery", {
      name: "SuryaSaathi/case-events",
      logGroupNames: logGroups,
      queryString: [
        "fields @timestamp, event, caseId, systemId, outcome, subject",
        'filter ispresent(caseId) and event != "agent_decision"',
        "sort @timestamp desc",
        "limit 200",
      ].join("\n| "),
    });
    new logs.CfnQueryDefinition(this, "DecisionCountsQuery", {
      name: "SuryaSaathi/decisions-by-diagnosis",
      logGroupNames: [agent.logGroup.logGroupName],
      queryString: [
        'filter event = "agent_decision"',
        "stats count(*) by diagnosis, action, reasonSource",
      ].join("\n| "),
    });

    new CfnOutput(this, "CaseWorkflowArn", { value: this.stateMachine.stateMachineArn });
    new CfnOutput(this, "DiagnosisAgentLogGroup", { value: agent.logGroup.logGroupName });
    new CfnOutput(this, "CaseWorkflowLogGroup", { value: workflow.logGroup.logGroupName });
    new CfnOutput(this, "DayLengthSeconds", { value: String(config.dayLengthSeconds) });
  }
}

/** NotifyVendor → wait → Recheck → Verify, or Escalate / Remind and wait again. */
function caseWorkflow(
  scope: Construct,
  fn: lambda.IFunction,
  config: SuryaConfig,
): sfn.StateMachine {
  const step = (id: string, name: string, extra: Record<string, unknown> = {}) =>
    new tasks.LambdaInvoke(scope, id, {
      lambdaFunction: fn,
      payload: sfn.TaskInput.fromObject({ step: name, "caseId.$": "$.caseId", ...extra }),
      payloadResponseOnly: true,
      retryOnServiceExceptions: true,
    });

  const notifyVendor = step("NotifyVendor", "notifyVendor");
  const waitForDeadline = new sfn.Wait(scope, "WaitForDeadline", {
    time: sfn.WaitTime.timestampPath("$.waitUntil"),
  });
  const recheck = step("Recheck", "recheck", { "attempts.$": "$.attempts" });
  const waitForReading = new sfn.Wait(scope, "WaitForReading", {
    time: sfn.WaitTime.secondsPath("$.retryAfterSeconds"),
  });
  const escalate = step("Escalate", "escalate");
  const remind = step("RemindDiscom", "remind");
  const verify = step("Verify", "verify");

  notifyVendor.next(waitForDeadline);
  waitForDeadline.next(recheck);
  waitForReading.next(recheck);
  escalate.next(waitForDeadline);
  remind.next(waitForDeadline);
  verify.next(new sfn.Succeed(scope, "Verified"));

  recheck.next(
    new sfn.Choice(scope, "Outcome")
      .when(sfn.Condition.stringEquals("$.outcome", "verified"), verify)
      .when(
        sfn.Condition.stringEquals("$.outcome", "closed"),
        new sfn.Succeed(scope, "ClosedByRain"),
      )
      .when(sfn.Condition.stringEquals("$.outcome", "pending"), waitForReading)
      .when(sfn.Condition.stringEquals("$.outcome", "escalate"), escalate)
      .when(sfn.Condition.stringEquals("$.outcome", "still_failing"), remind)
      .otherwise(
        new sfn.Fail(scope, "Unresolved", {
          error: "Unresolved",
          cause: "Output still low after the DISCOM's reminders",
        }),
      ),
  );

  const logGroup = new logs.LogGroup(scope, "CaseWorkflowExecutions", {
    retention: config.logRetentionDays as logs.RetentionDays,
    removalPolicy: RemovalPolicy.DESTROY,
  });
  return new sfn.StateMachine(scope, "CaseStateMachine", {
    stateMachineName: "suryasaathi-case-workflow",
    definitionBody: sfn.DefinitionBody.fromChainable(notifyVendor),
    logs: { destination: logGroup, level: sfn.LogLevel.ALL },
    tracingEnabled: true,
  });
}
