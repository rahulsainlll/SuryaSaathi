/** Website settings from NEXT_PUBLIC_* environment variables (inlined at build time). */
export const liveConfig = {
  /** The public Live endpoint, from the Console stack's NEXTPUBLICLIVEAPI output. */
  apiUrl: process.env.NEXT_PUBLIC_LIVE_API ?? "",
  /** How often the page re-reads it. Matches the endpoint's own cache window. */
  refreshMs: 15_000,
} as const;

/** Amazon Cognito, for the demo sign-in on /login. */
export const authConfig = {
  region: process.env.NEXT_PUBLIC_COGNITO_REGION ?? "us-east-1",
  /** The "suryasaathi-web-demo" client: password auth, no secret. */
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
  /** Where each role lands once it is signed in. */
  consoleUrl: "https://main.d30365l3mmwb4s.amplifyapp.com",
  vendorPath: "/vendor",
} as const;
