import type { Node } from "constructs";

/** Deployment settings, from CDK context (`-c key=value` or cdk.json). */
export interface SuryaConfig {
  /** One "day" of the case workflow lasts a minute instead of 24 hours. */
  demoMode: boolean;
  dayLengthSeconds: number;
  /** "bedrock" calls Claude on Amazon Bedrock; "anthropic" calls the Anthropic API. */
  modelProvider: "bedrock" | "anthropic";
  bedrockModelId: string;
  /** Region for Amazon Bedrock; defaults to the stack's region. */
  bedrockRegion?: string;
  /** Model ID and Secrets Manager secret used when modelProvider is "anthropic". */
  anthropicModelId: string;
  anthropicSecretName: string;
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
  /** Where the public website runs (origins), for the Live page's CORS. */
  siteUrls: string[];
  /** Prefix of the Cognito hosted sign-in domain; unique per region. */
  cognitoDomainPrefix?: string;
  /** ₹ per kWh for the console's money-lost figure. */
  tariffInr: number;
  /** Days CloudWatch keeps logs. Short by default: logs are the one charge that grows while idle. */
  logRetentionDays: number;
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
    modelProvider: str(c("modelProvider")) === "anthropic" ? "anthropic" : "bedrock",
    bedrockModelId: str(c("bedrockModelId")) ?? "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    bedrockRegion: str(c("bedrockRegion")),
    anthropicModelId: str(c("anthropicModelId")) ?? "claude-haiku-4-5",
    anthropicSecretName: str(c("anthropicSecretName")) ?? "suryasaathi/anthropic-api-key",
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
    siteUrls: (str(c("siteUrls")) ?? "http://localhost:3000")
      .split(",")
      .map((u) => u.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    cognitoDomainPrefix: str(c("cognitoDomainPrefix")),
    tariffInr: Number(str(c("tariffInr")) ?? 7),
    logRetentionDays: Number(str(c("logRetentionDays")) ?? 3),
  };
}
