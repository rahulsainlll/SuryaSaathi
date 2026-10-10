import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";

/** IoT Core rules and source connectors (services/ingest). */
export class IngestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
