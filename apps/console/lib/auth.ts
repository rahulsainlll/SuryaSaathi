/**
 * Cognito sign-in for API mode: the hosted sign-in page with the authorization code flow
 * and PKCE (a public client, no secret). Tokens live in sessionStorage, so closing the tab
 * signs out; when the access token expires the next request signs in again.
 */
import { config } from "./config";

const TOKENS = "suryasaathi.console.tokens";
const PENDING = "suryasaathi.console.pkce";
const SCOPES = "openid email profile";

interface Tokens {
  accessToken: string;
  idToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
}

interface Pending {
  verifier: string;
  state: string;
  returnTo: string;
}

const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked: sign-in will be asked for again on the next request.
    }
  },
  remove(key: string) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Nothing stored.
    }
  },
};

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const randomString = (bytes = 32) => base64url(crypto.getRandomValues(new Uint8Array(bytes)));

async function challengeFor(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

const domain = () => config.cognito.domain.replace(/\/+$/, "");

/** Sends the browser to the hosted sign-in page; it comes back to /auth/callback. */
export async function signIn(returnTo = window.location.pathname + window.location.search) {
  const pending: Pending = { verifier: randomString(48), state: randomString(16), returnTo };
  storage.set(PENDING, pending);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.cognito.clientId,
    redirect_uri: config.cognito.redirectUri,
    scope: SCOPES,
    state: pending.state,
    code_challenge_method: "S256",
    code_challenge: await challengeFor(pending.verifier),
  });
  // The Cognito domain is another origin, not a Next.js page.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `${domain()}/oauth2/authorize?${params}`;
}

/** Exchanges the code on /auth/callback for tokens; returns where to go next. */
export async function completeSignIn(url: URL): Promise<string> {
  const error = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (error) throw new Error(error);
  const pending = storage.get<Pending>(PENDING);
  const code = url.searchParams.get("code");
  if (!pending || !code || url.searchParams.get("state") !== pending.state) {
    throw new Error("This sign-in link has expired. Please sign in again.");
  }
  storage.remove(PENDING);
  const response = await fetch(`${domain()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.cognito.clientId,
      code,
      redirect_uri: config.cognito.redirectUri,
      code_verifier: pending.verifier,
    }),
  });
  if (!response.ok) throw new Error(`Sign-in failed (HTTP ${response.status}).`);
  const body = (await response.json()) as {
    access_token: string;
    id_token: string;
    expires_in: number;
  };
  storage.set(TOKENS, {
    accessToken: body.access_token,
    idToken: body.id_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  } satisfies Tokens);
  return pending.returnTo.startsWith("/") ? pending.returnTo : "/";
}

function validTokens(): Tokens | null {
  const tokens = storage.get<Tokens>(TOKENS);
  return tokens && tokens.expiresAt - 60_000 > Date.now() ? tokens : null;
}

/**
 * The access token for the console API. In API mode without a valid token this starts
 * sign-in, and the returned promise never settles because the page is navigating away.
 */
export async function getAccessToken(): Promise<string | null> {
  if (config.dataSource !== "api") return null;
  const tokens = validTokens();
  if (tokens) return tokens.accessToken;
  await signIn();
  return new Promise<never>(() => {});
}

/** Who is signed in (from the ID token), or null. */
export function currentUser(): { email: string; groups: string[] } | null {
  const tokens = validTokens();
  if (!tokens) return null;
  try {
    const payload = tokens.idToken.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload)) as { email?: string; "cognito:groups"?: string[] };
    return { email: claims.email ?? "", groups: claims["cognito:groups"] ?? [] };
  } catch {
    return null;
  }
}

/** Clears the tokens and signs out of the hosted sign-in page too. */
export function signOut() {
  storage.remove(TOKENS);
  const params = new URLSearchParams({
    client_id: config.cognito.clientId,
    logout_uri: `${window.location.origin}/`,
  });
  // The Cognito domain is another origin, not a Next.js page.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `${domain()}/logout?${params}`;
}
