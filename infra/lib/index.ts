import { App, type StackProps, Tags } from "aws-cdk-lib";
import { readConfig, type SuryaConfig } from "./config.js";
import { AgentsStack } from "./stacks/agents-stack.js";
import { DataStack } from "./stacks/data-stack.js";
import { ExpectedOutputStack } from "./stacks/expected-output-stack.js";
import { IngestStack } from "./stacks/ingest-stack.js";
import { RollupsStack } from "./stacks/rollups-stack.js";
import { WhatsappStack } from "./stacks/whatsapp-stack.js";

/** Adds the SuryaSaathi stacks to the app. Settings come from CDK context. */
export function addStacks(
  app: App,
  props: StackProps = {},
  config: SuryaConfig = readConfig(app.node),
) {
  const data = new DataStack(app, "SuryaSaathi-Data", props);
  const ingest = new IngestStack(app, "SuryaSaathi-Ingest", { ...props, config, data });
  const expectedOutput = new ExpectedOutputStack(app, "SuryaSaathi-ExpectedOutput", {
    ...props,
    config,
    data,
  });
  const agents = new AgentsStack(app, "SuryaSaathi-Agents", {
    ...props,
    config,
    data,
    expectedOutput: expectedOutput.fn,
  });
  const stacks = {
    data,
    ingest,
    expectedOutput,
    agents,
    whatsapp: new WhatsappStack(app, "SuryaSaathi-Whatsapp", props),
    rollups: new RollupsStack(app, "SuryaSaathi-Rollups", props),
  };
  Tags.of(app).add("project", "suryasaathi");
  return stacks;
}
