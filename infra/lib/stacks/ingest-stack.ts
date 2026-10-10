import { CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as iot from "aws-cdk-lib/aws-iot";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cr from "aws-cdk-lib/custom-resources";
import type { Construct } from "constructs";
import type { SuryaConfig } from "../config.js";
import { ServiceFunction } from "../constructs/service-function.js";
import {
  CERTIFICATE_SECRET_NAME,
  SimulatorCertificate,
} from "../constructs/simulator-certificate.js";
import type { DataStack } from "./data-stack.js";

export const READINGS_TOPIC = "suryasaathi/readings";
export const SIMULATOR_THING = "suryasaathi-sim";

export interface IngestStackProps extends StackProps {
  config: SuryaConfig;
  data: DataStack;
}

/** AWS IoT Core for devices and the simulator, and the rule → ingest Lambda (services/ingest). */
export class IngestStack extends Stack {
  constructor(scope: Construct, id: string, props: IngestStackProps) {
    super(scope, id, props);
    const { data } = props;

    // --- the simulator as an IoT thing with its own certificate -------------------------
    const thingType = new iot.CfnThingType(this, "SimulatorType", {
      thingTypeName: "suryasaathi-simulator",
      thingTypeProperties: {
        thingTypeDescription: "SuryaSaathi device simulator replaying the golden scenarios",
      },
    });
    const thing = new iot.CfnThing(this, "Simulator", {
      thingName: SIMULATOR_THING,
      attributePayload: { attributes: { purpose: "simulation" } },
    });
    // CloudFormation's AWS::IoT::Thing has no thing type property; set it with UpdateThing.
    const typeAssignment = new cr.AwsCustomResource(this, "SimulatorTypeAssignment", {
      onUpdate: {
        service: "Iot",
        action: "updateThing",
        parameters: { thingName: thing.ref, thingTypeName: thingType.ref },
        physicalResourceId: cr.PhysicalResourceId.of(`${SIMULATOR_THING}-type`),
      },
      onDelete: {
        service: "Iot",
        action: "updateThing",
        parameters: { thingName: thing.ref, removeThingType: true },
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
      installLatestAwsSdk: false,
    });
    typeAssignment.node.addDependency(thingType);

    const policy = new iot.CfnPolicy(this, "SimulatorPolicy", {
      policyName: "suryasaathi-simulator",
      policyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "iot:Connect",
            Resource: `arn:${this.partition}:iot:${this.region}:${this.account}:client/${SIMULATOR_THING}*`,
          },
          {
            Effect: "Allow",
            Action: "iot:Publish",
            Resource: `arn:${this.partition}:iot:${this.region}:${this.account}:topic/${READINGS_TOPIC}/*`,
          },
        ],
      },
    });

    const certificate = new SimulatorCertificate(this, "SimulatorCertificate");
    new iot.CfnPolicyPrincipalAttachment(this, "SimulatorPolicyAttachment", {
      policyName: policy.ref,
      principal: certificate.certificateArn,
    });
    new iot.CfnThingPrincipalAttachment(this, "SimulatorThingAttachment", {
      thingName: thing.ref,
      principal: certificate.certificateArn,
    });

    // --- readings → ingest Lambda ------------------------------------------------------
    const ingest = new ServiceFunction(this, "Ingest", {
      service: "ingest",
      handler: "suryasaathi_ingest.handler.handler",
      config: props.config,
      environment: data.tableEnvironment,
      timeout: Duration.seconds(15),
    });
    data.systems.grantReadData(ingest.fn);
    data.readings.grantWriteData(ingest.fn);

    const ruleErrors = new logs.LogGroup(this, "RuleErrors", {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    const ruleErrorRole = new iam.Role(this, "RuleErrorRole", {
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
    });
    ruleErrors.grantWrite(ruleErrorRole);

    const rule = new iot.CfnTopicRule(this, "ReadingsRule", {
      ruleName: "suryasaathi_readings",
      topicRulePayload: {
        description: "Every device reading goes to the ingest Lambda",
        sql: `SELECT *, topic(3) AS topicSystemId FROM '${READINGS_TOPIC}/+'`,
        awsIotSqlVersion: "2016-03-23",
        ruleDisabled: false,
        actions: [{ lambda: { functionArn: ingest.fn.functionArn } }],
        errorAction: {
          cloudwatchLogs: { logGroupName: ruleErrors.logGroupName, roleArn: ruleErrorRole.roleArn },
        },
      },
    });
    ingest.fn.addPermission("IotRuleInvoke", {
      principal: new iam.ServicePrincipal("iot.amazonaws.com"),
      sourceArn: rule.attrArn,
      sourceAccount: this.account,
    });

    // --- outputs for the simulator -------------------------------------------------------
    const endpoint = new cr.AwsCustomResource(this, "IotEndpoint", {
      onUpdate: {
        service: "Iot",
        action: "describeEndpoint",
        parameters: { endpointType: "iot:Data-ATS" },
        physicalResourceId: cr.PhysicalResourceId.of("iot-data-ats-endpoint"),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
      installLatestAwsSdk: false,
    });

    new CfnOutput(this, "IotEndpointAddress", {
      value: endpoint.getResponseField("endpointAddress"),
      description: "Pass to device-sim --endpoint (or IOT_ENDPOINT)",
    });
    new CfnOutput(this, "SimulatorThingName", { value: thing.ref });
    new CfnOutput(this, "SimulatorCertificateArn", { value: certificate.certificateArn });
    new CfnOutput(this, "SimulatorCertificateSecret", {
      value: CERTIFICATE_SECRET_NAME,
      description: "Saved locally by `uv run tools/device-sim fetch-cert`",
    });
    new CfnOutput(this, "ReadingsTopic", { value: `${READINGS_TOPIC}/<systemId>` });
    new CfnOutput(this, "IngestFunctionName", { value: ingest.fn.functionName });
  }
}
