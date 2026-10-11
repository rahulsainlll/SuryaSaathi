import { buttonVariants } from "@heroui/styles";
import { familyMessage } from "@suryasaathi/engine";
import type { Metadata } from "next";
import Link from "next/link";
import { HeroWidgetLoader } from "./_landing/hero-widget-loader";
import { HowItWorks } from "./_landing/how-it-works";
import { PlayIcon } from "./_landing/icons";
import { Section } from "./_landing/section";
import {
  AnyRoof,
  Audience,
  FinalCta,
  Film,
  Impact,
  Problem,
  ProofStrip,
  WhyNow,
} from "./_landing/sections";
import { signatures } from "./_landing/signatures";
import { SiteFooter } from "./_landing/site-footer";
import { SiteHeader } from "./_landing/site-header";
import { Stack } from "./_landing/stack";

export const metadata: Metadata = {
  title: "SuryaSaathi: 50 lakh solar roofs. Nobody's watching.",
  description:
    "An AI agent on AWS that watches every rooftop solar system, tells smog, dust and faults apart, and makes vendors fix what they owe.",
  openGraph: {
    title: "50 lakh solar roofs. Nobody's watching.",
    description: "SuryaSaathi: the AI agent that keeps India's rooftop solar working.",
    images: [{ url: "/images/film-poster.jpg", width: 1280, height: 720 }],
  },
};

export default function Home() {
  const sigs = signatures();
  return (
    <div data-theme="dark" className="landing dark min-h-dvh">
      <SiteHeader />
      <main>
        <Hero />
        <ProofStrip />
        <Problem sigs={sigs} />
        <Section
          id="how-it-works"
          eyebrow="How it works"
          title="From a reading on a roof to a fixed panel"
          intro="Every day, for every roof. Scroll to follow one month on a 3 kW roof in Dwarka."
        >
          <HowItWorks
            sig={sigs.story}
            message={familyMessage({ id: "SS-142", cause: "dust", resolvedBy: "discom" }, 96)}
          />
        </Section>
        <Film />
        <Audience />
        <AnyRoof />
        <Stack />
        <WhyNow />
        <Impact />
        <FinalCta />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="relative overflow-hidden px-4 pt-14 pb-20 sm:px-6 sm:pt-20 lg:pb-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-[-10%] size-[36rem] rounded-full bg-accent/10 blur-3xl"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <div>
          <p className="inline-flex rounded-full border border-separator px-3 py-1 text-xs font-medium text-muted">
            AI agent for rooftop solar · built on AWS
          </p>
          <h1
            id="hero-title"
            className="mt-6 text-[2.6rem] leading-[1.05] font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl"
          >
            50 lakh solar roofs. <span className="text-accent">Nobody’s watching.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted sm:text-xl">
            SuryaSaathi checks every roof every day, tells smog, dust and faults apart, and makes
            the vendor fix what they owe. Families just get one WhatsApp message.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/demo" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Try the live demo
            </Link>
            <a href="#film" className={buttonVariants({ variant: "secondary", size: "lg" })}>
              <PlayIcon className="size-4" />
              Watch the film
            </a>
          </div>
        </div>
        <HeroWidgetLoader />
      </div>
    </section>
  );
}
