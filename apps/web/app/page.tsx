import { Card, Chip } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { DiagnosisChip, Logo, brand } from "@suryasaathi/ui";
import Link from "next/link";
import type { ReactNode } from "react";

const REPO = "https://github.com/rahulsainlll/SuryaSaathi";

const PROBLEM_STATS = [
  {
    value: "50 lakh+",
    label: "homes with rooftop solar under PM Surya Ghar (14.8 GW commissioned)",
    source: { name: "pv magazine India", href: "https://www.pv-magazine-india.com/?p=16188" },
  },
  {
    value: "99%",
    label: "of users stop monitoring once the installer leaves, industry experts estimate",
    source: {
      name: "ETV Bharat",
      href: "https://etvbharat.com/en/bharat/rooftop-solar-push-under-pm-surya-ghar-yojana-crossed-37-lakh-but-maintenance-a-challenge-enn26070705272",
    },
  },
  {
    value: "0.3–0.6%",
    label:
      "of output lost to dust per day in Delhi; North Indian systems can lose 17–25% a year even with monthly cleaning",
    source: {
      name: "Renewable Watch",
      href: "https://renewablewatch.in/2018/12/22/soiling-analysis/",
    },
  },
];

const CAUSES = [
  {
    diagnosis: "smog",
    cause: "Smog in the air",
    owner: "Nobody’s",
    outcome: "Nothing; output recovers when the air clears",
  },
  {
    diagnosis: "dust",
    cause: "Dust on the panels",
    owner: "The vendor’s",
    outcome: "Free cleaning, owed for 5 years",
  },
  {
    diagnosis: "fault",
    cause: "Inverter or wiring fault",
    owner: "The vendor’s",
    outcome: "Free repair, owed for 5 years",
  },
] as const;

const STEPS = [
  {
    title: "Collects",
    text: "Yesterday’s generation, automatically: from a DISCOM data logger, the inverter maker’s cloud, or a camera clip that reads the inverter screen. A WhatsApp photo is the fallback.",
  },
  {
    title: "Compares",
    text: "With what that exact roof should have made, using satellite sunlight and haze data for that location and day.",
  },
  {
    title: "Diagnoses",
    text: "Smog (output and expected fall together), dust (the gap widens every dry day and rain resets it) or a fault (output collapses overnight).",
  },
  {
    title: "Acts",
    text: "Ignores smog, files a free-maintenance claim with evidence for dust or faults, tracks the vendor’s 3-day deadline, and escalates to the DISCOM if it’s missed.",
  },
  {
    title: "Verifies",
    text: "Checks the fix from new readings, then sends the family one WhatsApp message in their language.",
  },
];

const AWS_SERVICES = [
  { name: "AWS IoT Core", job: "Receives device readings over MQTT" },
  { name: "AWS Lambda", job: "Ingest, expected output, connectors, rollups" },
  {
    name: "Amazon Bedrock",
    job: "Agent reasoning, reading screen photos, Hindi and English messages",
  },
  { name: "Strands Agents", job: "Diagnosis, accountability and messenger agents" },
  { name: "Amazon DynamoDB", job: "Systems, readings, consent and cases" },
  { name: "Amazon S3", job: "Photos, evidence files, daily rollups" },
  { name: "AWS Step Functions", job: "Complaint → deadline → escalation → verification" },
  { name: "Amazon EventBridge", job: "Daily expected-output runs and nightly rollups" },
  { name: "End User Messaging Social", job: "WhatsApp in and out" },
  { name: "Amazon Transcribe", job: "Hindi voice notes to text" },
  { name: "Amazon SES + SNS", job: "Complaint emails and SMS to vendors" },
  { name: "Cedar", job: "Consent and access before every agent tool call" },
  { name: "AWS Amplify + Cognito", job: "Hosts the web apps; admin sign-in" },
  { name: "Amazon CloudWatch", job: "Logs, metrics and alarms for every agent run" },
  { name: "AWS CDK", job: "The whole stack as code" },
];

const TEAM = [
  { name: "Rahul Sain", github: "rahulsainlll" },
  { name: "Yukti", github: "Kiarstein" },
  { name: "Mayank Dhokal", github: "mayankdhokal" },
];

export default function Home() {
  return (
    <>
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Logo height={32} />
        <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-4">
          <a href="#how-it-works" className="hidden rounded-lg px-2 py-1 text-muted sm:inline">
            How it works
          </a>
          <a href="#stack" className="hidden rounded-lg px-2 py-1 text-muted sm:inline">
            AWS stack
          </a>
          <Link href="/demo" className={buttonVariants({ variant: "primary", size: "sm" })}>
            Try the demo
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
          <Chip variant="soft" color="accent">
            Environmental Hacks 2026 · Waste and Energy track
          </Chip>
          <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
            {brand.tagline}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted">
            It watches every roof, works out why output dropped (smog, dust or a fault), files
            free-maintenance claims with the vendor, and escalates to the DISCOM when the vendor
            doesn’t show up. Families never install an app: they get one WhatsApp message when it’s
            fixed.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Try the demo
            </Link>
            <a href={REPO} className={buttonVariants({ variant: "secondary", size: "lg" })}>
              View on GitHub
            </a>
          </div>
          <p className="mt-3 text-sm text-muted">
            No login. Runs in your browser on simulated data.
          </p>
        </section>

        <Section id="problem" eyebrow="The problem" title="Panels go quiet, and nobody notices">
          <p className="max-w-3xl text-muted">
            India is putting solar on lakhs of roofs, but almost nobody checks whether those systems
            keep producing after installation. When output drops, families can’t tell why.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PROBLEM_STATS.map((s) => (
              <Card key={s.value}>
                <Card.Content className="flex flex-col gap-2">
                  <span className="text-4xl font-bold tracking-tight">{s.value}</span>
                  <span className="text-muted">{s.label}</span>
                  <a
                    href={s.source.href}
                    className="mt-auto text-sm text-muted underline underline-offset-2"
                  >
                    Source: {s.source.name}
                  </a>
                </Card.Content>
              </Card>
            ))}
          </div>

          <h3 className="mt-12 text-lg font-semibold">
            Three causes that look the same on the electricity bill
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-muted">
                <tr>
                  <th className="py-2 pr-4 font-medium">Cause</th>
                  <th className="py-2 pr-4 font-medium">Whose problem</th>
                  <th className="py-2 font-medium">What should happen</th>
                </tr>
              </thead>
              <tbody>
                {CAUSES.map((c) => (
                  <tr key={c.cause} className="border-t border-separator">
                    <td className="py-3 pr-4">
                      <span className="flex items-center gap-2">
                        <DiagnosisChip diagnosis={c.diagnosis} />
                        {c.cause}
                      </span>
                    </td>
                    <td className="py-3 pr-4">{c.owner}</td>
                    <td className="py-3">{c.outcome}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 max-w-3xl text-muted">
            The vendor’s easy answer every winter is “it’s the pollution.” Families lose money, the
            free maintenance they’re owed goes unclaimed, and clean energy the country already paid
            for is never produced.
          </p>
          <p className="mt-4 max-w-3xl text-muted">
            <strong className="text-foreground">Why now:</strong> Delhi’s Solar Energy Policy
            (Second Amendment, September 2026) makes DISCOMs responsible for monitoring generation
            and identifying under-performing systems. The duty exists; the tool doesn’t.{" "}
            <a
              href="https://advocategandhi.com/delhi-solar-energy-policy-2023-gets-major-second-amendment-new-rooftop-solar-subsidies-free-solar-for-eligible-households-and-discom-trusteeship-model-introduced/"
              className="underline underline-offset-2"
            >
              Policy summary
            </a>
            {" · "}
            <a
              href="https://solar.delhi.gov.in/page/operation-and-maintenance-procedure"
              className="underline underline-offset-2"
            >
              Vendor maintenance duty
            </a>
          </p>
        </Section>

        <Section id="how-it-works" eyebrow="How it works" title="Every day, for every roof">
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <Card className="h-full">
                  <Card.Content className="flex flex-col gap-2">
                    <span
                      aria-hidden="true"
                      className="grid size-8 place-items-center rounded-full bg-accent font-semibold text-accent-foreground"
                    >
                      {i + 1}
                    </span>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted">{step.text}</p>
                  </Card.Content>
                </Card>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex flex-col items-start gap-3 rounded-3xl bg-accent-soft p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl">
              Replay 30 days on a 3 kW roof in Dwarka. Add rain, smog or a broken inverter, and
              watch a case escalate when the vendor doesn’t show up.
            </p>
            <Link href="/demo" className={buttonVariants({ variant: "primary" })}>
              Try the demo
            </Link>
          </div>
        </Section>

        <Section id="stack" eyebrow="Built on AWS" title="The stack">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {AWS_SERVICES.map((s) => (
              <li key={s.name} className="rounded-2xl bg-surface p-4 shadow-sm">
                <b className="text-sm">{s.name}</b>
                <p className="mt-1 text-sm text-muted">{s.job}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="team" eyebrow="Team Mythos" title="Who built it">
          <ul className="grid gap-3 sm:grid-cols-3">
            {TEAM.map((m) => (
              <li key={m.github}>
                <a
                  href={`https://github.com/${m.github}`}
                  className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar, no optimisation needed */}
                  <img
                    src={`https://github.com/${m.github}.png?size=96`}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 rounded-full bg-default"
                  />
                  <span>
                    <b className="block">{m.name}</b>
                    <span className="text-sm text-muted">@{m.github}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 pt-8 pb-12 text-sm text-muted sm:px-6">
        <p>
          Built by Team Mythos for Environmental Hacks 2026, part of the Bharat Builds Tour by
          WeMakeDevs × AWS. All data in the demo is simulated.{" "}
          <a href={REPO} className="underline underline-offset-2">
            Source on GitHub
          </a>
          , MIT licensed.
        </p>
      </footer>
    </>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="mx-auto max-w-6xl scroll-mt-6 px-4 py-14 sm:px-6"
    >
      <p className="text-sm font-semibold tracking-wide text-muted uppercase">{eyebrow}</p>
      <h2 id={`${id}-title`} className="mt-1 mb-6 text-3xl font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}
