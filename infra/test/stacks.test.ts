import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { beforeAll, describe, expect, it } from "vitest";
import { addStacks } from "../lib/index.js";

const ENV = { account: "123456789012", region: "ap-south-1" };

function synth(context: Record<string, unknown> = {}) {
  const stacks = addStacks(new App({ context }), { env: ENV });
  return {
    stacks,
    data: Template.fromStack(stacks.data),
    ingest: Template.fromStack(stacks.ingest),
    expected: Template.fromStack(stacks.expectedOutput),
    agents: Template.fromStack(stacks.agents),
  };
}

type Synth = ReturnType<typeof synth>;
let t: Synth;
beforeAll(() => {
  t = synth();
}, 120_000);

const env = (template: Template, logicalPrefix: string) => {
  const fns = template.findResources("AWS::Lambda::Function", {
    Properties: { PackageType: "Image" },
  });
  const [, fn] = Object.entries(fns).find(([id]) => id.startsWith(logicalPrefix))!;
  return (fn as { Properties: { Environment: { Variables: Record<string, unknown> } } }).Properties
    .Environment.Variables;
};

describe("stacks", () => {
  it("defines one stack per service plus data", () => {
    expect(Object.values(t.stacks).map((s) => s.stackName)).toEqual([
      "SuryaSaathi-Data",
      "SuryaSaathi-Ingest",
      "SuryaSaathi-ExpectedOutput",
      "SuryaSaathi-Agents",
      "SuryaSaathi-Whatsapp",
      "SuryaSaathi-Rollups",
    ]);
  });
});

describe("data", () => {
  it("creates the tables with the keys suryasaathi_core.store uses", () => {
    t.data.resourceCountIs("AWS::DynamoDB::Table", 4);
    t.data.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "suryasaathi-readings",
      KeySchema: [
        { AttributeName: "systemId", KeyType: "HASH" },
        { AttributeName: "date", KeyType: "RANGE" },
      ],
      StreamSpecification: { StreamViewType: "NEW_IMAGE" },
    });
    t.data.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "suryasaathi-cases",
      GlobalSecondaryIndexes: [
        Match.objectLike({
          IndexName: "bySystem",
          KeySchema: [
            { AttributeName: "systemId", KeyType: "HASH" },
            { AttributeName: "openedAt", KeyType: "RANGE" },
          ],
        }),
      ],
    });
  });
});

describe("ingest", () => {
  it("routes device readings through an IoT rule to the ingest Lambda", () => {
    t.ingest.hasResourceProperties("AWS::IoT::TopicRule", {
      TopicRulePayload: Match.objectLike({
        Sql: "SELECT *, topic(3) AS topicSystemId FROM 'suryasaathi/readings/+'",
        Actions: [{ Lambda: { FunctionArn: Match.anyValue() } }],
        ErrorAction: { CloudwatchLogs: Match.anyValue() },
      }),
    });
    t.ingest.hasResourceProperties("AWS::Lambda::Permission", {
      Principal: "iot.amazonaws.com",
      Action: "lambda:InvokeFunction",
    });
    expect(env(t.ingest, "Ingest")).toMatchObject({ READINGS_TABLE: expect.anything() });
  });

  it("gives the simulator a thing type, thing, policy and certificate", () => {
    t.ingest.hasResourceProperties("AWS::IoT::ThingType", {
      ThingTypeName: "suryasaathi-simulator",
    });
    t.ingest.hasResourceProperties("AWS::IoT::Thing", { ThingName: "suryasaathi-sim" });
    const policy = JSON.stringify(t.ingest.findResources("AWS::IoT::Policy"));
    expect(policy).toContain('"PolicyName":"suryasaathi-simulator"');
    expect(policy).toContain(":topic/suryasaathi/readings/*");
    expect(policy).toContain(":client/suryasaathi-sim*");
    t.ingest.resourceCountIs("AWS::IoT::PolicyPrincipalAttachment", 1);
    t.ingest.resourceCountIs("AWS::IoT::ThingPrincipalAttachment", 1);
    t.ingest.resourceCountIs("AWS::SecretsManager::Secret", 1);
    t.ingest.hasOutput("IotEndpointAddress", {});
    expect(Object.keys(t.ingest.findOutputs("SimulatorCertificateSecret"))).toHaveLength(1);
  });
});

describe("expected output", () => {
  it("runs nightly for every system", () => {
    t.expected.hasResourceProperties("AWS::Events::Rule", {
      ScheduleExpression: "cron(30 20 * * ? *)",
    });
  });
});

describe("agents", () => {
  it("runs the diagnosis agent on new readings only", () => {
    t.agents.hasResourceProperties("AWS::Lambda::EventSourceMapping", {
      FilterCriteria: { Filters: [{ Pattern: JSON.stringify({ eventName: ["INSERT"] }) }] },
      FunctionResponseTypes: ["ReportBatchItemFailures"],
      StartingPosition: "LATEST",
    });
  });

  it("configures Bedrock from context, defaulting to Claude Opus 5.5 in the stack region", () => {
    expect(env(t.agents, "DiagnosisAgent")).toMatchObject({
      BEDROCK_MODEL_ID: "anthropic.claude-opus-5-5",
      BEDROCK_REGION: "ap-south-1",
      AGENT_SCOPE: "actions",
      DAY_LENGTH_SECONDS: "86400",
    });
    t.agents.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["bedrock-mantle:*", "bedrock:InvokeModel"]),
          }),
        ]),
      },
    });
  });

  it("defines the case workflow state machine", () => {
    const machines = t.agents.findResources("AWS::StepFunctions::StateMachine");
    const definition = JSON.stringify(Object.values(machines)[0]);
    for (const state of [
      "NotifyVendor",
      "WaitForDeadline",
      "Recheck",
      "Escalate",
      "RemindDiscom",
      "Verify",
      "ClosedByRain",
      "Unresolved",
    ]) {
      expect(definition).toContain(state);
    }
    t.agents.hasResourceProperties("AWS::StepFunctions::StateMachine", {
      StateMachineName: "suryasaathi-case-workflow",
      LoggingConfiguration: Match.objectLike({ Level: "ALL" }),
    });
    t.agents.resourceCountIs("AWS::Logs::QueryDefinition", 3);
  });

  it("ships every service as an arm64 container image", () => {
    const fns = Object.values(
      t.agents.findResources("AWS::Lambda::Function", { Properties: { PackageType: "Image" } }),
    ) as { Properties: { Architectures: string[] } }[];
    expect(fns).toHaveLength(2);
    expect(fns.every((f) => f.Properties.Architectures[0] === "arm64")).toBe(true);
  });
});

describe("context", () => {
  it("demoMode turns workflow days into minutes; other settings pass through", () => {
    const demo = synth({
      demoMode: "true",
      bedrockModelId: "anthropic.claude-sonnet-5-5",
      bedrockRegion: "us-east-1",
      senderEmail: "alerts@example.com",
      lambdaArchitecture: "x86_64",
    });
    expect(env(demo.agents, "DiagnosisAgent")).toMatchObject({
      DAY_LENGTH_SECONDS: "60",
      BEDROCK_MODEL_ID: "anthropic.claude-sonnet-5-5",
      BEDROCK_REGION: "us-east-1",
    });
    expect(env(demo.agents, "CaseWorkflow")).toMatchObject({ SENDER_EMAIL: "alerts@example.com" });
    demo.agents.hasOutput("DayLengthSeconds", { Value: "60" });
  }, 120_000);

  it("rejects an unknown architecture", () => {
    expect(() => synth({ lambdaArchitecture: "sparc" })).toThrow(/lambdaArchitecture/);
  });
});
