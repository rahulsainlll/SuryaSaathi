import type { Metadata } from "next";
import { Simulator } from "./_components/simulator";

export const metadata: Metadata = {
  title: "Demo · SuryaSaathi",
  description:
    "Replay 30 days on one Delhi rooftop: watch readings arrive, the agents diagnose smog, dust and faults, and a maintenance case escalate.",
};

export default function DemoPage() {
  return <Simulator />;
}
