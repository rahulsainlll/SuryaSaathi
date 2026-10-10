import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import type * as lambda from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";
import type { SuryaConfig } from "../config.js";
import { ServiceFunction } from "../constructs/service-function.js";
import type { DataStack } from "./data-stack.js";

export interface ExpectedOutputStackProps extends StackProps {
  config: SuryaConfig;
  data: DataStack;
}

/** Expected output per system and day (services/expected-output): on demand and nightly. */
export class ExpectedOutputStack extends Stack {
  readonly fn: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ExpectedOutputStackProps) {
    super(scope, id, props);
    const { data } = props;

    const expected = new ServiceFunction(this, "ExpectedOutput", {
      service: "expected-output",
      handler: "suryasaathi_expected_output.handler.handler",
      config: props.config,
      environment: data.tableEnvironment,
      timeout: Duration.minutes(5),
      memorySize: 1024,
    });
    data.systems.grantReadData(expected.fn);
    data.expected.grantReadWriteData(expected.fn);
    this.fn = expected.fn;

    // 02:00 IST: compute yesterday for every system, so the agent mostly reads the cache.
    new events.Rule(this, "Nightly", {
      description: "Expected output for every system, for yesterday",
      schedule: events.Schedule.cron({ minute: "30", hour: "20" }),
      targets: [
        new targets.LambdaFunction(expected.fn, { event: events.RuleTargetInput.fromObject({}) }),
      ],
    });

    new CfnOutput(this, "ExpectedOutputFunctionName", { value: expected.fn.functionName });
  }
}
