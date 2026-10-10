import { Stack, type StackProps } from "aws-cdk-lib";
import type { Construct } from "constructs";

/** End User Messaging Social webhook (services/whatsapp). */
export class WhatsappStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
  }
}
