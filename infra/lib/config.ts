import type { Node } from "constructs";

/** Deployment settings, from CDK context (`-c key=value` or cdk.json). */
export interface SuryaConfig {
  /** One "day" of the case workflow lasts a minute instead of 24 hours. */
  demoMode: boolean;
  dayLengthSeconds: number;
  bedrockModelId: string;
  /** Region for Amazon Bedrock; defaults to the stack's region. */
  bedrockRegion?: string;
  agentEnabled: boolean;
  agentScope: "actions" | "all";
  agentEffort: string;
  vendorName: string;
  /** SES identities. Without a sender, case emails are logged instead of sent. */
  senderEmail?: string;
  vendorEmail?: string;
  discomEmail?: string;
  architecture: "arm64" | "x86_64";
  /** Where the console runs (origins), for Cognito redirects and CORS. */
  consoleUrls: string[];
  /** Prefix of the Cognito hosted sign-in domain; unique per region. */
  cognitoDomainPrefix?: string;
  /** ₹ per kWh for the console's money-lost figure. */
  tariffInr: number;
}

const flag = (v: unknown, fallback: boolean) =>
  v === undefined ? fallback : v === true || String(v).toLowerCase() === "true";
const str = (v: unknown) => (v === undefined || v === "" ? undefined : String(v));

export function readConfig(node: Node): SuryaConfig {
  const c = (key: string) => node.tryGetContext(key);
  const demoMode = flag(c("demoMode"), false);
  const architecture = (str(c("lambdaArchitecture")) ?? "arm64") as SuryaConfig["architecture"];
  if (!["arm64", "x86_64"].includes(architecture)) {
    throw new Error(`lambdaArchitecture must be arm64 or x86_64, not ${architecture}`);
  }
  return {
    demoMode,
    dayLengthSeconds: demoMode ? 60 : 86_400,
    bedrockModelId: str(c("bedrockModelId")) ?? "anthropic.claude-opus-5-5",
    bedrockRegion: str(c("bedrockRegion")),
    agentEnabled: flag(c("agentEnabled"), true),
    agentScope: str(c("agentScope")) === "all" ? "all" : "actions",
    agentEffort: str(c("agentEffort")) ?? "low",
    vendorName: str(c("vendorName")) ?? "[Vendor name] Solar",
    senderEmail: str(c("senderEmail")),
    vendorEmail: str(c("vendorEmail")),
    discomEmail: str(c("discomEmail")),
    architecture,
    consoleUrls: (str(c("consoleUrls")) ?? "http://localhost:3001")
      .split(",")
      .map((u) => u.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    cognitoDomainPrefix: str(c("cognitoDomainPrefix")),
    tariffInr: Number(str(c("tariffInr")) ?? 7),
  };
}
