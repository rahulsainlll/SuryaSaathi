import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";

/** Strands agents on Amazon Bedrock (services/agents). */
export class AgentsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
