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
    rollups: Template.fromStack(stacks.rollups),
    console: Template.fromStack(stacks.console),
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
      "SuryaSaathi-Console",
    ]);
  });

  it("creates no VPC or NAT gateway anywhere", () => {
    for (const stack of Object.values(t.stacks)) {
      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::EC2::VPC", 0);
      template.resourceCountIs("AWS::EC2::NatGateway", 0);
    }
  });

  // Everything here is billed per request. Anything that bills by the hour, or that keeps
  // capacity warm, costs money on an idle demo account and must stay out of the app.
  it("creates nothing that costs money while idle", () => {
    const idleCharges = [
      "AWS::EC2::VPC",
      "AWS::EC2::NatGateway",
      "AWS::EC2::VPCEndpoint",
      "AWS::EC2::Instance",
      "AWS::ECS::Cluster",
      "AWS::ECS::Service",
      "AWS::OpenSearchService::Domain",
      "AWS::OpenSearchServerless::Collection",
      "AWS::Elasticsearch::Domain",
      "AWS::RDS::DBInstance",
      "AWS::RDS::DBCluster",
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
      "AWS::KMS::Key",
      "AWS::MSK::Cluster",
      "AWS::ElastiCache::CacheCluster",
      "AWS::DocDB::DBCluster",
      "AWS::Kinesis::Stream",
    ];
    for (const stack of Object.values(t.stacks)) {
      const template = Template.fromStack(stack);
      for (const type of idleCharges) template.resourceCountIs(type, 0);
    }
  });

  it("keeps every table on-demand and every log group short-lived", () => {
    for (const table of Object.values(t.data.findResources("AWS::DynamoDB::Table")) as {
      Properties: Record<string, unknown>;
    }[]) {
      expect(table.Properties.BillingMode).toBe("PAY_PER_REQUEST");
      expect(table.Properties.ProvisionedThroughput).toBeUndefined();
    }
    for (const stack of Object.values(t.stacks)) {
      const groups = Object.values(
        Template.fromStack(stack).findResources("AWS::Logs::LogGroup"),
      ) as { Properties: { RetentionInDays?: number } }[];
      for (const g of groups) expect(g.Properties.RetentionInDays).toBe(3);
    }
  });

  it("reserves no Lambda capacity", () => {
    for (const stack of Object.values(t.stacks)) {
      const template = Template.fromStack(stack);
      template.resourceCountIs("AWS::Lambda::Alias", 0);
      const fns = Object.values(template.findResources("AWS::Lambda::Function")) as {
        Properties: Record<string, unknown>;
      }[];
      for (const fn of fns) {
        expect(fn.Properties.ReservedConcurrentExecutions).toBeUndefined();
      }
    }
  });
});

describe("data", () => {
  it("creates the tables with the keys suryasaathi_core.store uses", () => {
    t.data.resourceCountIs("AWS::DynamoDB::Table", 5);
    t.data.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "suryasaathi-summaries",
      KeySchema: [
        { AttributeName: "pk", KeyType: "HASH" },
        { AttributeName: "sk", KeyType: "RANGE" },
      ],
    });
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

  it("configures Bedrock from context, defaulting to Claude Haiku 4.5 in the stack region", () => {
    expect(env(t.agents, "DiagnosisAgent")).toMatchObject({
      BEDROCK_MODEL_ID: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
      BEDROCK_REGION: "ap-south-1",
      AGENT_SCOPE: "actions",
      DAY_LENGTH_SECONDS: "86400",
    });
    t.agents.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["bedrock:InvokeModel", "bedrock:ConverseStream"]),
          }),
        ]),
      },
    });
  });

  it("can be pointed at the Anthropic API, taking the key from Secrets Manager", () => {
    const anthropic = synth({ modelProvider: "anthropic" }).agents;
    const vars = env(anthropic, "DiagnosisAgent");
    expect(vars).toMatchObject({
      MODEL_PROVIDER: "anthropic",
      ANTHROPIC_MODEL_ID: "claude-haiku-4-5",
      ANTHROPIC_SECRET_NAME: "suryasaathi/anthropic-api-key",
    });
    // The key itself must never be synthesized into the template, in any form.
    const template = JSON.stringify(anthropic.toJSON());
    expect(template).not.toMatch(/sk-ant-/);
    expect(template).not.toMatch(/ANTHROPIC_API_KEY/);
    expect(template).not.toMatch(/\{\{resolve:secretsmanager/);
    anthropic.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([Match.objectLike({ Action: "secretsmanager:GetSecretValue" })]),
      },
    });
  });

  it("asks for no secret when it is using Bedrock", () => {
    const policies = JSON.stringify(t.agents.findResources("AWS::IAM::Policy"));
    expect(policies).not.toContain("secretsmanager:GetSecretValue");
    expect(env(t.agents, "DiagnosisAgent")).toMatchObject({ MODEL_PROVIDER: "bedrock" });
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

describe("rollups", () => {
  it("runs nightly at 06:00 IST and writes the summaries", () => {
    t.rollups.hasResourceProperties("AWS::Events::Rule", {
      ScheduleExpression: "cron(30 0 * * ? *)",
    });
    expect(env(t.rollups, "Rollups")).toMatchObject({
      SUMMARIES_TABLE: expect.anything(),
      TARIFF_INR: "7",
    });
    const policies = JSON.stringify(t.rollups.findResources("AWS::IAM::Policy"));
    expect(policies).toContain("dynamodb:BatchWriteItem");
  });
});

describe("console", () => {
  it("has an admin-only user pool with hosted sign-in and a PKCE client", () => {
    t.console.hasResourceProperties("AWS::Cognito::UserPool", {
      AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
      UsernameAttributes: ["email"],
    });
    t.console.hasResourceProperties("AWS::Cognito::UserPoolGroup", { GroupName: "admin" });
    t.console.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
      Domain: "suryasaathi-123456789012",
    });
    t.console.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      GenerateSecret: false,
      AllowedOAuthFlows: ["code"],
      CallbackURLs: ["http://localhost:3001/auth/callback"],
      LogoutURLs: ["http://localhost:3001/"],
    });
  });

  it("puts the read-only console API behind a Cognito JWT authorizer", () => {
    t.console.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      ProtocolType: "HTTP",
      CorsConfiguration: Match.objectLike({
        AllowOrigins: ["http://localhost:3001"],
        AllowMethods: ["GET"],
      }),
    });
    t.console.hasResourceProperties("AWS::ApiGatewayV2::Authorizer", { AuthorizerType: "JWT" });
    t.console.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /{proxy+}",
      AuthorizationType: "JWT",
    });
    t.console.hasResourceProperties("AWS::ApiGatewayV2::Stage", {
      StageName: "$default",
      DefaultRouteSettings: { ThrottlingRateLimit: 20, ThrottlingBurstLimit: 40 },
    });
    expect(env(t.console, "ConsoleApi")).toMatchObject({ ADMIN_GROUP: "admin" });
    const policies = JSON.stringify(t.console.findResources("AWS::IAM::Policy"));
    expect(policies).not.toMatch(/dynamodb:(PutItem|UpdateItem|DeleteItem|BatchWriteItem)/);
  });

  it("outputs the console's build environment", () => {
    for (const key of [
      "NEXTPUBLICCONSOLEDATA",
      "NEXTPUBLICCONSOLEAPIURL",
      "NEXTPUBLICCOGNITODOMAIN",
      "NEXTPUBLICCOGNITOCLIENTID",
      "NEXTPUBLICCOGNITOREDIRECTURI",
      "AmplifyEnvironmentVariables",
      "UserPoolId",
    ]) {
      t.console.hasOutput(key, {});
    }
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
    demo.rollups.hasResourceProperties("AWS::Events::Rule", {
      ScheduleExpression: "rate(5 minutes)",
      Targets: [Match.objectLike({ Input: JSON.stringify({ asOf: "latest" }) })],
    });
  }, 120_000);

  it("takes the console's URLs and sign-in domain from context", () => {
    const custom = synth({
      consoleUrls: "https://console.example.com/, http://localhost:3001",
      cognitoDomainPrefix: "discom-console",
    });
    custom.console.hasResourceProperties("AWS::Cognito::UserPoolClient", {
      CallbackURLs: [
        "https://console.example.com/auth/callback",
        "http://localhost:3001/auth/callback",
      ],
    });
    custom.console.hasResourceProperties("AWS::Cognito::UserPoolDomain", {
      Domain: "discom-console",
    });
    custom.console.hasOutput("NEXTPUBLICCOGNITOREDIRECTURI", {
      Value: "https://console.example.com/auth/callback",
    });
  }, 120_000);

  it("rejects an unknown architecture", () => {
    expect(() => synth({ lambdaArchitecture: "sparc" })).toThrow(/lambdaArchitecture/);
  });
});
