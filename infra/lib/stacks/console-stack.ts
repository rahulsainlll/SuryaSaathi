import { CfnOutput, Duration, Fn, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpUserPoolAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cognito from "aws-cdk-lib/aws-cognito";
import type { Construct } from "constructs";
import type { SuryaConfig } from "../config.js";
import { ServiceFunction } from "../constructs/service-function.js";
import type { DataStack } from "./data-stack.js";

export interface ConsoleStackProps extends StackProps {
  config: SuryaConfig;
  data: DataStack;
}

export const ADMIN_GROUP = "admin";
export const CALLBACK_PATH = "/auth/callback";
/** The site's public, unauthenticated read of the live demo fleet. */
export const LIVE_PATH = "/public/live";

/**
 * The DISCOM console's backend: a Cognito user pool (admins only, no self sign-up) with a
 * hosted sign-in page, and a read-only HTTP API (services/console-api) that only accepts
 * that pool's tokens. Serverless throughout: no VPC, no NAT gateway.
 */
export class ConsoleStack extends Stack {
  readonly userPool: cognito.UserPool;
  readonly client: cognito.UserPoolClient;
  readonly apiUrl: string;
  /** The public Live endpoint, for the website's NEXT_PUBLIC_LIVE_API. */
  readonly liveUrl: string;

  constructor(scope: Construct, id: string, props: ConsoleStackProps) {
    super(scope, id, props);
    const { data, config } = props;

    this.userPool = new cognito.UserPool(this, "Users", {
      userPoolName: "suryasaathi-console",
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: false,
        tempPasswordValidity: Duration.days(7),
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { otp: true, sms: false },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    new cognito.CfnUserPoolGroup(this, "AdminGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: ADMIN_GROUP,
      description: "DISCOM staff who may read the console",
    });

    const domain = this.userPool.addDomain("SignIn", {
      cognitoDomain: { domainPrefix: config.cognitoDomainPrefix ?? `suryasaathi-${this.account}` },
    });
    const callbackUrls = config.consoleUrls.map((u) => `${u}${CALLBACK_PATH}`);
    // A public client for the browser: authorization code with PKCE, no secret.
    this.client = this.userPool.addClient("Console", {
      userPoolClientName: "console",
      generateSecret: false,
      authFlows: {},
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
        callbackUrls,
        logoutUrls: config.consoleUrls.map((u) => `${u}/`),
      },
      supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
      preventUserExistenceErrors: true,
      accessTokenValidity: Duration.hours(1),
      idTokenValidity: Duration.hours(1),
      refreshTokenValidity: Duration.days(1),
    });

    const consoleApi = new ServiceFunction(this, "ConsoleApi", {
      service: "console-api",
      handler: "suryasaathi_console_api.handler.handler",
      config,
      environment: { ...data.tableEnvironment, ADMIN_GROUP },
      timeout: Duration.seconds(15),
      memorySize: 1024,
    });
    // Read only: summaries, cases, and readings (by key, for one system's detail page).
    data.summaries.grantReadData(consoleApi.fn);
    data.cases.grantReadData(consoleApi.fn);
    data.readings.grantReadData(consoleApi.fn);

    // The public endpoint behind the website's Live page. Its own function, so the
    // console's API is never reachable without a token, and so this one can be capped
    // on its own: reserved concurrency costs nothing and bounds a public endpoint.
    const liveApi = new ServiceFunction(this, "LiveApi", {
      service: "live-api",
      handler: "suryasaathi_live_api.handler.handler",
      config,
      environment: {
        ...data.tableEnvironment,
        MODEL_PROVIDER: config.modelProvider,
        BEDROCK_MODEL_ID: config.bedrockModelId,
        ANTHROPIC_MODEL_ID: config.anthropicModelId,
      },
      timeout: Duration.seconds(15),
      memorySize: 512,
      reservedConcurrency: 2,
    });
    data.summaries.grantReadData(liveApi.fn);
    data.cases.grantReadData(liveApi.fn);
    data.readings.grantReadData(liveApi.fn);

    const api = new apigwv2.HttpApi(this, "Api", {
      apiName: "suryasaathi-console",
      description: "Read-only API for the DISCOM console, plus the site's public Live route",
      createDefaultStage: false,
      corsPreflight: {
        // The console's own origins, plus the website's for the public Live route.
        allowOrigins: [...config.consoleUrls, ...config.siteUrls],
        allowMethods: [apigwv2.CorsHttpMethod.GET],
        allowHeaders: ["Authorization"],
        maxAge: Duration.hours(1),
      },
      defaultAuthorizer: new HttpUserPoolAuthorizer("Cognito", this.userPool, {
        userPoolClients: [this.client],
      }),
    });
    api.addRoutes({
      path: "/{proxy+}",
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration("ConsoleApi", consoleApi.fn),
    });
    const liveRoutes = api.addRoutes({
      path: LIVE_PATH,
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration("LiveApi", liveApi.fn),
      // Deliberately unauthenticated: this is what the public site reads.
      authorizer: new apigwv2.HttpNoneAuthorizer(),
    });
    const stage = new apigwv2.HttpStage(this, "Stage", {
      httpApi: api,
      stageName: "$default",
      autoDeploy: true,
      throttle: { rateLimit: 20, burstLimit: 40 },
    });
    // Per-route throttling is L1 only: the L2 stage exposes the default settings alone.
    // routeSettings is typed `any`, so CDK does not camel-case it for us — these have to
    // be the CloudFormation property names or the limits are silently dropped.
    (stage.node.defaultChild as apigwv2.CfnStage).routeSettings = {
      [`GET ${LIVE_PATH}`]: { ThrottlingRateLimit: 5, ThrottlingBurstLimit: 10 },
    };
    // Settings for a route API Gateway cannot see yet are a 404, and nothing in the
    // template says the stage needs the route, so CloudFormation is free to update the
    // stage first — and did. Order it explicitly.
    for (const route of liveRoutes) stage.node.addDependency(route);
    this.apiUrl = stage.url;
    this.liveUrl = `${stage.url.replace(/\/+$/, "")}${LIVE_PATH}`;

    // What the console needs at build time, e.g. for Amplify Hosting or .env.local.
    const env: Record<string, string> = {
      NEXT_PUBLIC_CONSOLE_DATA: "api",
      NEXT_PUBLIC_CONSOLE_API_URL: this.apiUrl,
      NEXT_PUBLIC_COGNITO_DOMAIN: domain.baseUrl(),
      NEXT_PUBLIC_COGNITO_CLIENT_ID: this.client.userPoolClientId,
      NEXT_PUBLIC_COGNITO_REDIRECT_URI: callbackUrls[0]!,
    };
    for (const [key, value] of Object.entries(env)) {
      new CfnOutput(this, key.replaceAll("_", ""), {
        key: key.replaceAll("_", ""),
        value,
        description: key,
      });
    }
    new CfnOutput(this, "AmplifyEnvironmentVariables", {
      description: "KEY=value pairs for `aws amplify update-branch --environment-variables`",
      value: Fn.join(
        ",",
        Object.entries(env).map(([k, v]) => `${k}=${v}`),
      ),
    });
    new CfnOutput(this, "UserPoolId", { value: this.userPool.userPoolId });
    new CfnOutput(this, "AdminGroupName", { value: ADMIN_GROUP });
    new CfnOutput(this, "ConsoleApiFunctionName", { value: consoleApi.fn.functionName });
    new CfnOutput(this, "LiveApiFunctionName", { value: liveApi.fn.functionName });
    new CfnOutput(this, "NEXTPUBLICLIVEAPI", {
      key: "NEXTPUBLICLIVEAPI",
      value: this.liveUrl,
      description: "NEXT_PUBLIC_LIVE_API — set this on the website's Amplify app",
    });
    new CfnOutput(this, "WebsiteEnvironmentVariables", {
      description: "KEY=value pairs for the website's `aws amplify update-branch`",
      value: `NEXT_PUBLIC_LIVE_API=${this.liveUrl}`,
    });
  }
}
