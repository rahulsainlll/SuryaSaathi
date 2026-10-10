import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";

/** Nightly aggregation for the console (services/rollups). */
export class RollupsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
