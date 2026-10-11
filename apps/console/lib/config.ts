/** Console settings from NEXT_PUBLIC_* environment variables (inlined at build time). */
export const config = {
  /** "mock" (default): data generated in the browser. "api": the deployed console API. */
  dataSource: process.env.NEXT_PUBLIC_CONSOLE_DATA === "api" ? "api" : "mock",
  apiUrl: process.env.NEXT_PUBLIC_CONSOLE_API_URL ?? "",
  cognito: {
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN ?? "",
    clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID ?? "",
    redirectUri: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_URI ?? "",
  },
} as const;
