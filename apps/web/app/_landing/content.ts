/** Copy, figures and sources for the landing page, in one place so every claim links out. */

export const REPO = "https://github.com/rahulsainlll/SuryaSaathi";
export const YOUTUBE_ID = "m6HiN65kmdo";
export const YOUTUBE_URL = `https://www.youtube.com/watch?v=${YOUTUBE_ID}`;

export const SOURCES = {
  pmSuryaGhar: { name: "pv magazine India", href: "https://www.pv-magazine-india.com/?p=16188" },
  monitoring: {
    name: "ETV Bharat",
    href: "https://etvbharat.com/en/bharat/rooftop-solar-push-under-pm-surya-ghar-yojana-crossed-37-lakh-but-maintenance-a-challenge-enn26070705272",
  },
  dust: { name: "Renewable Watch", href: "https://renewablewatch.in/2018/12/22/soiling-analysis/" },
  maintenance: {
    name: "Delhi Solar Portal",
    href: "https://solar.delhi.gov.in/page/operation-and-maintenance-procedure",
  },
  recFramework: {
    name: "REC framework",
    href: "https://renewablewatch.in/2024/11/28/rec-releases-guidelines-for-vendor-operations-under-pm-surya-ghar/",
  },
  delhiPolicy: {
    name: "Delhi Solar Energy Policy, Second Amendment (summary)",
    href: "https://advocategandhi.com/delhi-solar-energy-policy-2023-gets-major-second-amendment-new-rooftop-solar-subsidies-free-solar-for-eligible-households-and-discom-trusteeship-model-introduced/",
  },
} as const;

export type Source = (typeof SOURCES)[keyof typeof SOURCES];

/** The proof strip. `value` counts up, shown as prefix + value (to `decimals`) + suffix. */
export const PROOF = [
  {
    value: 50,
    decimals: 0,
    prefix: "",
    suffix: " lakh+",
    label: "homes with rooftop solar under PM Surya Ghar",
    source: SOURCES.pmSuryaGhar,
  },
  {
    value: 14.8,
    decimals: 1,
    prefix: "",
    suffix: " GW",
    label: "of rooftop capacity commissioned",
    source: SOURCES.pmSuryaGhar,
  },
  {
    value: 99,
    decimals: 0,
    prefix: "",
    suffix: "%",
    label: "of users stop monitoring once the installer leaves, experts estimate",
    source: SOURCES.monitoring,
  },
  {
    value: 25,
    decimals: 0,
    prefix: "17–",
    suffix: "%",
    label: "of a year's output lost to dust in North India, even with monthly cleaning",
    source: SOURCES.dust,
  },
] as const;

export const STEPS = [
  {
    title: "Collect",
    text: "Yesterday’s generation arrives on its own: from a DISCOM data logger, the inverter maker’s cloud, or a camera clip reading the inverter screen.",
  },
  {
    title: "Compare",
    text: "Against what that exact roof should have made, from satellite sunlight and haze for that location and day.",
  },
  {
    title: "Diagnose",
    text: "Smog, dust or a fault: each leaves a different signature in the gap between expected and actual.",
  },
  {
    title: "Act and verify",
    text: "A free-maintenance claim with evidence, a 3-day vendor deadline, escalation to the DISCOM if it’s missed, and a fix checked from new readings.",
  },
] as const;

export type ServiceIcon =
  | "AWSIoTCore"
  | "AWSLambda"
  | "AmazonBedrock"
  | "AmazonDynamoDB"
  | "AmazonSimpleStorageService"
  | "AWSStepFunctions"
  | "AmazonEventBridge"
  | "AWSEndUserMessaging"
  | "AmazonTranscribe"
  | "AmazonSimpleEmailService"
  | "AmazonSimpleNotificationService"
  | "AWSAmplify"
  | "AmazonCognito"
  | "AmazonCloudWatch"
  | "AWSCloudDevelopmentKit"
  | "AmazonOpenSearchService";

export interface Service {
  name: string;
  job: string;
  /** Official AWS Architecture Icon(s) in public/aws; none for open-source projects. */
  icons: ServiceIcon[];
}

/** The stack, grouped into the four layers the README's architecture shows. */
export const LAYERS: { title: string; summary: string; services: Service[] }[] = [
  {
    title: "Ingest",
    summary: "Every reading, from any roof, into one place.",
    services: [
      { name: "AWS IoT Core", job: "Receives device readings over MQTT", icons: ["AWSIoTCore"] },
      {
        name: "AWS Lambda",
        job: "Ingest, expected output, connectors, rollups",
        icons: ["AWSLambda"],
      },
      {
        name: "Amazon EventBridge",
        job: "Daily expected-output runs and nightly rollups",
        icons: ["AmazonEventBridge"],
      },
    ],
  },
  {
    title: "Agents",
    summary: "Reasoning that explains every decision.",
    services: [
      {
        name: "Amazon Bedrock",
        job: "Agent reasoning, reading screen photos, Hindi and English messages",
        icons: ["AmazonBedrock"],
      },
      {
        name: "Strands Agents",
        job: "Diagnosis, accountability and messenger agents",
        icons: [],
      },
      {
        name: "AWS Step Functions",
        job: "Complaint → deadline → escalation → verification",
        icons: ["AWSStepFunctions"],
      },
      { name: "Amazon Transcribe", job: "Hindi voice notes to text", icons: ["AmazonTranscribe"] },
    ],
  },
  {
    title: "Memory and rules",
    summary: "What happened, and who may see it.",
    services: [
      {
        name: "Amazon DynamoDB",
        job: "Systems, readings, consent and cases",
        icons: ["AmazonDynamoDB"],
      },
      {
        name: "Amazon S3",
        job: "Photos, evidence files, daily rollups",
        icons: ["AmazonSimpleStorageService"],
      },
      { name: "Cedar", job: "Consent and access before every agent tool call", icons: [] },
    ],
  },
  {
    title: "Act and report",
    summary: "Messages out, people in, everything logged.",
    services: [
      {
        name: "End User Messaging Social",
        job: "WhatsApp in and out",
        icons: ["AWSEndUserMessaging"],
      },
      {
        name: "Amazon SES + SNS",
        job: "Complaint emails and SMS to vendors",
        icons: ["AmazonSimpleEmailService", "AmazonSimpleNotificationService"],
      },
      {
        name: "AWS Amplify + Cognito",
        job: "Hosts the web apps; admin sign-in",
        icons: ["AWSAmplify", "AmazonCognito"],
      },
      {
        name: "Amazon CloudWatch",
        job: "Logs, metrics and alarms for every agent run",
        icons: ["AmazonCloudWatch"],
      },
    ],
  },
];

export const OPEN_SOURCE = [
  { name: "Strands Agents", href: "https://strandsagents.com" },
  { name: "Cedar", href: "https://www.cedarpolicy.com" },
  { name: "OpenSearch", href: "https://opensearch.org" },
  { name: "AWS CDK", href: "https://github.com/aws/aws-cdk" },
  { name: "FreeRTOS", href: "https://www.freertos.org" },
] as const;

export const TEAM = [
  { name: "Rahul Sain", github: "rahulsainlll" },
  { name: "Yukti", github: "Kiarstein" },
  { name: "Mayank Dhokal", github: "mayankdhokal" },
] as const;
