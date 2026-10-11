import type { Metadata } from "next";
import { LiveBoard } from "./_components/live-board";

export const metadata: Metadata = {
  title: "Live from AWS · SuryaSaathi",
  description:
    "The deployed SuryaSaathi backend, read live: simulated rooftops on real AWS services, the agent's own diagnoses and reasons, and the cases it has filed.",
};

export default function Live() {
  return <LiveBoard />;
}
