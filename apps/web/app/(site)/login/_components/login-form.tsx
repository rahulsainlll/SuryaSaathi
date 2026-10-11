"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authConfig } from "../../live/_components/config";

type Role = "discom" | "vendor";

const ROLES: Record<Role, { tab: string; email: string; password: string; blurb: string }> = {
  discom: {
    tab: "DISCOM admin",
    email: "discom@demo.suryasaathi",
    password: "Demo@12345678",
    blurb: "The DISCOM console: the vendor leaderboard and the escalation queue.",
  },
  vendor: {
    tab: "Vendor",
    email: "vendor@demo.suryasaathi",
    password: "Demo@12345678",
    blurb: "The cases this vendor owes a visit, with the evidence behind each one.",
  },
};

/** Where a signed-in role lands. */
function destination(role: Role): string {
  return role === "discom" ? authConfig.consoleUrl : authConfig.vendorPath;
}

function go(role: Role, router: ReturnType<typeof useRouter>) {
  const to = destination(role);
  if (to.startsWith("http")) window.location.assign(to);
  else router.push(to);
}

/**
 * Amazon Cognito's InitiateAuth, called straight from the browser.
 *
 * USER_PASSWORD_AUTH against a public app client with no secret, so there is nothing to
 * sign and no SDK to ship: it is one JSON POST with an X-Amz-Target header.
 */
async function signIn(email: string, password: string): Promise<Record<string, unknown>> {
  const res = await fetch(`https://cognito-idp.${authConfig.region}.amazonaws.com/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: authConfig.clientId,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  });
  const body = (await res.json()) as {
    AuthenticationResult?: Record<string, unknown>;
    __type?: string;
    message?: string;
  };
  if (!res.ok) throw new Error(friendly(body.__type, body.message));
  if (!body.AuthenticationResult) throw new Error("Cognito did not return a session.");
  return body.AuthenticationResult;
}

/** Cognito's error names are not for reading aloud. */
function friendly(type?: string, message?: string): string {
  const name = (type ?? "").split("#").pop();
  switch (name) {
    case "NotAuthorizedException":
      return "That email and password did not match. The demo details are filled in above.";
    case "UserNotFoundException":
      return "No such user in this pool. The demo accounts may not have been created yet.";
    case "UserNotConfirmedException":
      return "That account still needs confirming in Cognito.";
    case "TooManyRequestsException":
    case "LimitExceededException":
      return "Too many attempts just now. Wait a moment and try again.";
    case "InvalidParameterException":
      return "Cognito rejected the request. The app client may not allow password sign-in.";
    case "ResourceNotFoundException":
      return "That Cognito app client was not found. Check NEXT_PUBLIC_COGNITO_CLIENT_ID.";
    default:
      return message ?? "Sign-in failed. Please try again.";
  }
}

export function LoginForm() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("discom");
  const [email, setEmail] = useState(ROLES.discom.email);
  const [password, setPassword] = useState(ROLES.discom.password);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = (next: Role) => {
    setRole(next);
    setEmail(ROLES[next].email);
    setPassword(ROLES[next].password);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (!authConfig.clientId) {
        throw new Error("This build has no NEXT_PUBLIC_COGNITO_CLIENT_ID set.");
      }
      const tokens = await signIn(email, password);
      sessionStorage.setItem(
        "suryasaathi.auth",
        JSON.stringify({ role, email, at: Date.now(), tokens }),
      );
      go(role, router);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <div className="card stack g20 login-card">
      <div className="login-tabs" role="tablist" aria-label="Choose a role">
        {(Object.keys(ROLES) as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            className={`login-tab${role === r ? " on" : ""}`}
            onClick={() => pick(r)}
          >
            {ROLES[r].tab}
          </button>
        ))}
      </div>

      <p className="small muted">{ROLES[role].blurb}</p>

      <p className="chip b self-start">
        <svg
          aria-hidden="true"
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        Secured by Amazon Cognito
      </p>

      <form className="stack g16" onSubmit={submit}>
        <label className="stack g8">
          <span className="small">Email</span>
          <input
            className="login-input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="stack g8">
          <span className="small">Password</span>
          <input
            className="login-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error ? (
          <p className="login-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="btn btn-ink" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <button type="button" className="login-guest" onClick={() => go(role, router)}>
        Continue as guest →
      </button>
    </div>
  );
}
