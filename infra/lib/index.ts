import { App, type StackProps, Tags } from "aws-cdk-lib";
import { AgentsStack } from "./stacks/agents-stack.js";
import { ExpectedOutputStack } from "./stacks/expected-output-stack.js";
import { IngestStack } from "./stacks/ingest-stack.js";
import { RollupsStack } from "./stacks/rollups-stack.js";
import { WhatsappStack } from "./stacks/whatsapp-stack.js";

/** Adds one stack per service to the app. */
export function addStacks(app: App, props: StackProps = {}) {
  const stacks = {
    agents: new AgentsStack(app, "SuryaSaathi-Agents", props),
    ingest: new IngestStack(app, "SuryaSaathi-Ingest", props),
    expectedOutput: new ExpectedOutputStack(app, "SuryaSaathi-ExpectedOutput", props),
    whatsapp: new WhatsappStack(app, "SuryaSaathi-Whatsapp", props),
    rollups: new RollupsStack(app, "SuryaSaathi-Rollups", props),
  };
  Tags.of(app).add("project", "suryasaathi");
  return stacks;
}
