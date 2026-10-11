/** Website settings from NEXT_PUBLIC_* environment variables (inlined at build time). */
export const liveConfig = {
  /** The public Live endpoint, from the Console stack's NEXTPUBLICLIVEAPI output. */
  apiUrl: process.env.NEXT_PUBLIC_LIVE_API ?? "",
  /** How often the page re-reads it. Matches the endpoint's own cache window. */
  refreshMs: 15_000,
} as const;
