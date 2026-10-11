import { CfnOutput, Duration, Stack, type StackProps } from "aws-cdk-lib";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import type { Construct } from "constructs";
import type { SuryaConfig } from "../config.js";
import { ServiceFunction } from "../constructs/service-function.js";
import type { DataStack } from "./data-stack.js";

export interface RollupsStackProps extends StackProps {
  config: SuryaConfig;
  data: DataStack;
}

/**
 * Nightly aggregation for the console (services/rollups): reads systems, each system's
 * readings by key and the cases, and writes the summary items the console API serves.
 */
export class RollupsStack extends Stack {
  readonly fn: ServiceFunction["fn"];

  constructor(scope: Construct, id: string, props: RollupsStackProps) {
    super(scope, id, props);
    const { data, config } = props;

    const rollups = new ServiceFunction(this, "Rollups", {
      service: "rollups",
      handler: "suryasaathi_rollups.handler.handler",
      config,
      environment: { ...data.tableEnvironment, TARIFF_INR: String(config.tariffInr) },
      timeout: Duration.minutes(10),
      memorySize: 1024,
    });
    data.systems.grantReadData(rollups.fn);
    data.readings.grantReadData(rollups.fn);
    data.cases.grantReadData(rollups.fn);
    data.summaries.grantReadWriteData(rollups.fn);
    this.fn = rollups.fn;

    // 06:00 IST, after the expected-output job: everything up to yesterday is in. In demo
    // mode simulated days pass in minutes, so roll up to the newest reading every 5 minutes.
    new events.Rule(this, "Schedule", {
      description: config.demoMode
        ? "Console summaries up to the newest reading (demo mode)"
        : "Console summaries as of yesterday",
      schedule: config.demoMode
        ? events.Schedule.rate(Duration.minutes(5))
        : events.Schedule.cron({ minute: "30", hour: "0" }),
      targets: [
        new targets.LambdaFunction(rollups.fn, {
          event: events.RuleTargetInput.fromObject(config.demoMode ? { asOf: "latest" } : {}),
        }),
      ],
    });

    new CfnOutput(this, "RollupsFunctionName", { value: rollups.fn.functionName });
  }
}
