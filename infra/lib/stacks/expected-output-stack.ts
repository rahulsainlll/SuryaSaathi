import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";

/** Daily expected-output runs (services/expected-output). */
export class ExpectedOutputStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
