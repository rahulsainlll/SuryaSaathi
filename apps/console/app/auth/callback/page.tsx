"use client";

import { Alert, Button } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loading } from "../../../components/page";
import { completeSignIn, signIn } from "../../../lib/auth";

/** Where Cognito's hosted sign-in page returns to with the authorization code. */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // The code can only be exchanged once (React runs effects twice in development).
    if (started.current) return;
    started.current = true;
    completeSignIn(new URL(window.location.href))
      .then((next) => router.replace(next))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [router]);

  if (!error) return <Loading />;
  return (
    <Alert status="danger">
      <Alert.Content>
        <Alert.Title>Couldn’t sign you in</Alert.Title>
        <Alert.Description>{error}</Alert.Description>
      </Alert.Content>
      <Button size="sm" variant="secondary" onPress={() => signIn("/")}>
        Sign in again
      </Button>
    </Alert>
  );
}
