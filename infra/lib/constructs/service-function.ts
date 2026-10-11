import { fileURLToPath } from "node:url";
import { Duration, IgnoreMode, RemovalPolicy } from "aws-cdk-lib";
import { Platform } from "aws-cdk-lib/aws-ecr-assets";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import type { SuryaConfig } from "../config.js";

/** The repository root: the Docker build context for services/Dockerfile. */
export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export interface ServiceFunctionProps {
  /** Folder under services/, e.g. "agents". */
  service: string;
  /** Python handler, e.g. "suryasaathi_agents.handler.handler". */
  handler: string;
  config: SuryaConfig;
  environment?: Record<string, string>;
  timeout?: Duration;
  memorySize?: number;
}

/** A Lambda function running one Python service from the shared container image. */
export class ServiceFunction extends Construct {
  readonly fn: lambda.DockerImageFunction;
  readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: ServiceFunctionProps) {
    super(scope, id);
    const arm = props.config.architecture === "arm64";

    this.logGroup = new logs.LogGroup(this, "Logs", {
      retention: props.config.logRetentionDays as logs.RetentionDays,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.fn = new lambda.DockerImageFunction(this, "Function", {
      code: lambda.DockerImageCode.fromImageAsset(REPO_ROOT, {
        file: "services/Dockerfile",
        buildArgs: { SERVICE: props.service },
        cmd: [props.handler],
        platform: arm ? Platform.LINUX_ARM64 : Platform.LINUX_AMD64,
        ignoreMode: IgnoreMode.DOCKER,
      }),
      architecture: arm ? lambda.Architecture.ARM_64 : lambda.Architecture.X86_64,
      timeout: props.timeout ?? Duration.seconds(30),
      memorySize: props.memorySize ?? 512,
      logGroup: this.logGroup,
      environment: {
        POWERTOOLS_SERVICE_NAME: props.service,
        POWERTOOLS_LOG_LEVEL: "INFO",
        ...props.environment,
      },
    });
  }
}
