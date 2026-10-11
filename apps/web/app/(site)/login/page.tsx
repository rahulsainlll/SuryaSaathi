import type { Metadata } from "next";
import { LoginForm } from "./_components/login-form";

export const metadata: Metadata = {
  title: "Log in · SuryaSaathi",
  description:
    "Sign in to the SuryaSaathi demo as a DISCOM admin or a vendor. Real Amazon Cognito, demo accounts filled in.",
};

export default function Login() {
  return (
    <section className="hero page-tight">
      <div className="wrap stack g28 login-wrap">
        <div className="stack g12">
          <span className="eyebrow">Demo sign-in</span>
          <h1 className="h1 page hero-load">Log in</h1>
          <p className="lead fade hero-load" style={{ maxWidth: 560 }}>
            Two roles see two different things. The demo accounts are filled in, so you can sign in
            without one of your own.
          </p>
        </div>
        <LoginForm />
      </div>
    </section>
  );
}
