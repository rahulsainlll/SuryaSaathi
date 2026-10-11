import Image from "next/image";
import { buttonVariants } from "@heroui/styles";
import Link from "next/link";
import type { ReactNode } from "react";
import { CountUp } from "./count-up";
import { PROOF, REPO, SOURCES, TEAM, YOUTUBE_ID } from "./content";
import { FilmFacade } from "./film-facade";
import { CameraIcon, ChatIcon, CloudIcon, GitHubIcon, LoggerIcon } from "./icons";
import { Section, SourceLink } from "./section";
import { SignatureChart } from "./signature-chart";
import type { Signature } from "./signatures";
import { TeaserVideo } from "./teaser-video";

const card = "rounded-3xl border border-separator bg-surface";

// 2. Proof strip ----------------------------------------------------------------------------

export function ProofStrip() {
  return (
    <section
      aria-label="The scale of the problem"
      className="border-y border-separator px-4 py-12 sm:px-6"
    >
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {PROOF.map((p) => (
          <div key={p.label} className="flex flex-col">
            <dt className="order-2 mt-2 text-sm text-muted">{p.label}</dt>
            <dd className="order-1 text-3xl font-bold tracking-tight sm:text-4xl">
              <CountUp value={p.value} decimals={p.decimals} prefix={p.prefix} suffix={p.suffix} />
            </dd>
            <dd className="order-3 mt-2">
              <SourceLink source={p.source} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

// 3. The hidden problem ---------------------------------------------------------------------

const CAUSES = [
  {
    key: "smog",
    name: "Smog",
    owner: "Nobody’s problem",
    tell: "Expected and actual fall together, and recover together.",
    action: "No action",
  },
  {
    key: "dust",
    name: "Dust",
    owner: "The vendor’s problem",
    tell: "The gap widens every dry day; rain resets it.",
    action: "Free cleaning, owed for 5 years",
  },
  {
    key: "fault",
    name: "Fault",
    owner: "The vendor’s problem",
    tell: "Output collapses overnight while sunlight doesn’t.",
    action: "Free repair, owed for 5 years",
  },
] as const;

export function Problem({ sigs }: { sigs: Record<(typeof CAUSES)[number]["key"], Signature> }) {
  return (
    <Section
      id="problem"
      eyebrow="The hidden problem"
      title="Three causes. One electricity bill that can’t tell them apart."
      intro="When a roof makes less, the family sees a smaller saving and nothing else. But each cause leaves its own signature in the gap between what the roof should have made and what it did."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {CAUSES.map((c) => (
          <article key={c.key} className={`${card} flex flex-col p-6`}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-xl font-semibold">{c.name}</h3>
              <span className="text-sm text-muted">{c.owner}</span>
            </div>
            <div className="my-5">
              <SignatureChart sig={sigs[c.key]} label={`${c.name}: ${c.tell}`} />
            </div>
            <p className="text-muted">{c.tell}</p>
            <p className="mt-4 text-sm font-semibold text-accent">{c.action}</p>
          </article>
        ))}
      </div>
      <div className="mt-16 grid items-center gap-8 lg:grid-cols-2">
        <blockquote>
          <p className="text-2xl font-semibold text-balance sm:text-3xl">
            The vendor’s easy answer:{" "}
            <span className="text-accent">“it’s just the pollution.”</span>
          </p>
          <p className="mt-4 text-lg text-muted">
            SuryaSaathi tells them apart, every day, for every roof, and claims the free cleaning or
            repair the family is owed.
          </p>
          <p className="mt-3 text-sm text-muted">
            Dust can cost 0.3–0.6% of output per day in Delhi. <SourceLink source={SOURCES.dust} />
          </p>
        </blockquote>
        <TeaserVideo
          sources={[
            { src: "/film-teaser.webm", type: "video/webm" },
            { src: "/film-teaser.mp4", type: "video/mp4" },
          ]}
          poster="/images/film-teaser-poster.webp"
          label="Teaser: smog, dust or a fault?"
        />
      </div>
    </Section>
  );
}

// 5. Film -----------------------------------------------------------------------------------

export function Film() {
  return (
    <Section
      id="film"
      eyebrow="The film"
      title="Three minutes on one roof in Delhi"
      intro="Why output drops, who should fix it, and how an agent on AWS makes sure someone does."
    >
      <FilmFacade id={YOUTUBE_ID} title="SuryaSaathi: the film" poster="/images/film-poster.jpg" />
    </Section>
  );
}

// 6. Who it's for ---------------------------------------------------------------------------

export function Audience() {
  return (
    <Section
      id="who"
      eyebrow="Who it’s for"
      title="One agent, four people who need it"
      intro="Families do nothing; everyone else gets exactly the evidence they need to act."
    >
      <div className="grid gap-4 md:grid-cols-6">
        <Tile
          className="md:col-span-4"
          title="Families"
          text="Nothing to install. One-time consent at installation, then one WhatsApp message in their language when a problem is fixed."
        >
          <div className="flex flex-col gap-2">
            <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-surface-secondary px-3 py-2 text-sm text-muted">
              Panel output down for 5 days…
            </p>
            <p
              lang="hi"
              className="w-fit max-w-[85%] self-end rounded-2xl rounded-br-sm bg-[#1f6f4a] px-3 py-2 text-sm text-white motion-safe:animate-[ss-pop_5s_ease-in-out_infinite]"
            >
              सफाई हो गई! Output वापस 96% पर है।
            </p>
          </div>
        </Tile>
        <Tile
          className="md:col-span-2"
          title="DISCOMs"
          text="A vendor leaderboard and an escalation queue across lakhs of systems."
        >
          <div className="flex flex-col gap-2" aria-hidden="true">
            {[92, 74, 51, 33].map((w, i) => (
              <div key={w} className="h-2.5 rounded-full bg-surface-secondary">
                <div
                  className="h-full origin-left rounded-full bg-accent motion-safe:animate-[ss-grow_6s_ease-in-out_infinite]"
                  style={{ width: `${w}%`, animationDelay: `${i * 150}ms` }}
                />
              </div>
            ))}
          </div>
        </Tile>
        <Tile
          className="md:col-span-3"
          title="Vendors"
          text="Clear claims with readings as evidence, by email and SMS, and a fair deadline to fix them."
        >
          <div className="flex items-center justify-between rounded-2xl bg-surface-secondary px-4 py-3 text-sm">
            <span>Case SS-142 · Dust</span>
            <span className="inline-flex items-center gap-2 text-warning">
              <span className="size-2 rounded-full bg-warning motion-safe:animate-pulse" />3 days to
              fix
            </span>
          </div>
        </Tile>
        <Tile
          className="md:col-span-3"
          title="Government"
          text="Proof that subsidised rooftops keep producing, and a measure of the energy recovered."
        >
          <div className="grid grid-cols-12 gap-1.5" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <span
                key={i}
                className="aspect-square rounded-sm bg-accent/25 motion-safe:animate-[ss-blink_4s_ease-in-out_infinite]"
                style={{ animationDelay: `${((i * 7) % 24) * 160}ms` }}
              />
            ))}
          </div>
        </Tile>
      </div>
    </Section>
  );
}

function Tile({
  title,
  text,
  children,
  className = "",
}: {
  title: string;
  text: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`${card} flex flex-col justify-between gap-6 p-6 ${className}`}>
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-2 text-muted">{text}</p>
      </div>
      {children}
    </article>
  );
}

// 7. Works with any roof --------------------------------------------------------------------

const ROOF_SOURCES = [
  {
    name: "Data logger",
    detail: "The DISCOM’s logger reads the inverter every 15 minutes",
    icon: LoggerIcon,
  },
  { name: "Inverter cloud", detail: "The maker’s cloud API, pulled once a day", icon: CloudIcon },
  {
    name: "Camera clip",
    detail: "An ESP32-CAM on FreeRTOS photographs the inverter screen",
    icon: CameraIcon,
  },
];

export function AnyRoof() {
  return (
    <Section
      id="any-roof"
      eyebrow="Works with any roof"
      title="No new hardware on most roofs"
      intro="SuryaSaathi uses whatever the roof already has, and a small camera clip where it has nothing."
    >
      <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_minmax(0,0.8fr)]">
        <ul className="grid gap-3">
          {ROOF_SOURCES.map((s) => (
            <li key={s.name} className={`${card} flex items-start gap-4 p-5`}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-secondary text-accent">
                <s.icon className="size-6" />
              </span>
              <span>
                <span className="block font-semibold">{s.name}</span>
                <span className="text-sm text-muted">{s.detail}</span>
              </span>
            </li>
          ))}
        </ul>
        <svg
          aria-hidden="true"
          viewBox="0 0 80 24"
          className="mx-auto h-8 w-20 rotate-90 lg:rotate-0"
        >
          <path
            d="M2 12h70"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="5 6"
            className="motion-safe:animate-[ss-dash_1.2s_linear_infinite]"
          />
          <path
            d="m66 5 8 7-8 7"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div className={`${card} p-6`}>
          <div className="flex items-center gap-3">
            <Image
              unoptimized
              src="/aws/AWSIoTCore.svg"
              alt=""
              width={44}
              height={44}
              loading="lazy"
              className="rounded-lg"
            />
            <div>
              <p className="font-semibold">AWS IoT Core</p>
              <p className="text-sm text-muted">MQTT over TLS, one certificate per device</p>
            </div>
          </div>
          <p className="mt-5 text-muted">
            Every source becomes the same normalised reading, so the agents never care where it came
            from.
          </p>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-dashed border-separator p-4">
            <ChatIcon className="mt-0.5 size-5 shrink-0 text-accent" />
            <p className="text-sm text-muted">
              <span className="font-semibold text-foreground">Fallback: a WhatsApp photo.</span> The
              family sends a picture of the inverter screen; Amazon Bedrock reads the numbers.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

// 9. Why now --------------------------------------------------------------------------------

export function WhyNow() {
  const installed = 10_073;
  const target = 230_000;
  return (
    <Section
      id="why-now"
      eyebrow="Why now"
      title="The duty exists. The tool doesn’t."
      intro="Delhi’s Solar Energy Policy, Second Amendment (17 September 2026), puts monitoring on the DISCOMs."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <article className={`${card} p-6`}>
          <h3 className="text-xl font-semibold">DISCOMs must find under-performing systems</h3>
          <p className="mt-3 text-muted">
            Monitoring generation and identifying under-performing rooftops is now the DISCOM’s job.
          </p>
        </article>
        <article className={`${card} p-6`}>
          <h3 className="text-xl font-semibold">A DSAIN for every roof</h3>
          <p className="mt-3 text-muted">
            Each system gets a Digital Solar Asset Identification Number, so every reading and case
            can be tied to one asset.
          </p>
        </article>
        <article className={`${card} p-6`}>
          <h3 className="text-xl font-semibold">
            {installed.toLocaleString("en-IN")} installed of 2.30 lakh targeted
          </h3>
          <p className="mt-3 text-muted">
            Delhi’s target for March 2027. The fleet is about to grow fast.
          </p>
          <div
            className="mt-5 h-2.5 rounded-full bg-surface-secondary"
            role="img"
            aria-label={`${((installed / target) * 100).toFixed(1)}% of the target installed`}
          >
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(installed / target) * 100}%` }}
            />
          </div>
        </article>
      </div>
      <p className="mt-6">
        <SourceLink source={SOURCES.delhiPolicy} />
      </p>
    </Section>
  );
}

// 10. Impact --------------------------------------------------------------------------------

export function Impact() {
  return (
    <Section
      id="impact"
      eyebrow="Impact"
      title="Small per roof. Large across the country."
      intro="Estimates, not measurements: the assumptions are below so you can check them."
    >
      <div className="grid gap-4 md:grid-cols-3">
        <ImpactCard value="₹5–6k" label="a year back for a 3 kW home" tag="Estimate" />
        <ImpactCard
          value="~2 TWh"
          label="a year of clean energy recovered nationally"
          tag="Estimate"
        />
        <ImpactCard
          value="5 years"
          label="of free maintenance, actually claimed"
          tag="Owed by the vendor"
        />
      </div>
      <details className="mt-6 rounded-2xl border border-separator p-5 text-muted [&_summary]:cursor-pointer">
        <summary className="font-medium text-foreground">How we estimate</summary>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            A 3 kW roof in Delhi makes about 4,700 kWh a year (4.3 kWh per kW per day). Recovering
            15–18% lost to unchecked dust and faults is 700–850 kWh, or ₹5–6k at ₹7 per kWh.
          </li>
          <li>
            14.8 GW of rooftop solar makes roughly 20 TWh a year; recovering a tenth of it is about
            2 TWh.
          </li>
          <li>
            Vendors owe free operation and maintenance for 5 years under PM Surya Ghar.{" "}
            <SourceLink source={SOURCES.maintenance} />
          </li>
        </ul>
      </details>
    </Section>
  );
}

function ImpactCard({ value, label, tag }: { value: string; label: string; tag: string }) {
  return (
    <article className={`${card} p-6`}>
      <span className="rounded-full bg-surface-secondary px-2.5 py-1 text-xs font-medium text-muted">
        {tag}
      </span>
      <p className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{value}</p>
      <p className="mt-2 text-muted">{label}</p>
    </article>
  );
}

// 11. Final CTA -----------------------------------------------------------------------------

export function FinalCta() {
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-24 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-separator bg-surface px-6 py-14 text-center sm:px-12 sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
        />
        <h2
          id="cta-title"
          className="relative text-3xl font-bold tracking-tight text-balance sm:text-5xl"
        >
          Watch one roof get its free cleaning.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-lg text-muted">
          The demo runs a month on a 3 kW roof in Dwarka in your browser. No login.
        </p>
        <div className="relative mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/demo" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Try the live demo
          </Link>
          <a href={REPO} className={buttonVariants({ variant: "secondary", size: "lg" })}>
            <GitHubIcon className="size-5" />
            View on GitHub
          </a>
        </div>
        <div className="relative mt-12 text-sm text-muted">
          <p className="font-semibold text-foreground">Team Mythos</p>
          <ul className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1">
            {TEAM.map((m) => (
              <li key={m.github}>
                <a
                  href={`https://github.com/${m.github}`}
                  className="underline decoration-separator underline-offset-4 hover:text-foreground"
                >
                  {m.name}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4">
            Built for Environmental Hacks (Waste and Energy track), part of the Bharat Builds Tour
            by WeMakeDevs × AWS, October 2026.
          </p>
        </div>
      </div>
    </section>
  );
}
