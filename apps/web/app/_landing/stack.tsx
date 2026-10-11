import Image from "next/image";
import { LAYERS, OPEN_SOURCE, REPO, type Service } from "./content";
import { GitHubIcon } from "./icons";
import { Section } from "./section";

/** Seconds for one pass of the layers lighting up in turn. */
const CYCLE = 8;

export function Stack() {
  return (
    <Section
      id="stack"
      eyebrow="Built on AWS"
      title="The stack"
      intro="Serverless end to end, defined in AWS CDK. Idle costs are close to zero, and a nightly rollup means the DISCOM console never scans raw readings."
    >
      <div className="grid gap-4 md:grid-cols-2">
        {LAYERS.map((layer, i) => (
          <article
            key={layer.title}
            className="relative overflow-hidden rounded-3xl border border-separator bg-surface p-6"
          >
            {/* Lights up in sequence; with reduced motion every layer stays softly lit. */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-3xl border-2 border-accent bg-accent/5 opacity-40 motion-safe:animate-[ss-light_var(--cycle)_ease-in-out_infinite] motion-safe:opacity-0"
              style={{
                ["--cycle" as string]: `${CYCLE}s`,
                animationDelay: `${(i * CYCLE) / LAYERS.length}s`,
              }}
            />
            <div className="relative">
              <p className="text-sm font-semibold text-accent">
                {i + 1} · {layer.title}
              </p>
              <p className="mt-1 text-muted">{layer.summary}</p>
              <ul className="mt-5 grid gap-4">
                {layer.services.map((s) => (
                  <ServiceRow key={s.name} service={s} />
                ))}
              </ul>
            </div>
          </article>
        ))}

        <article className="rounded-3xl border border-separator bg-surface p-6 md:col-span-2">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-accent">AWS open source</p>
              <h3 className="mt-1 text-xl font-semibold">Built on open projects AWS backs</h3>
            </div>
            <a
              href={REPO}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-separator px-4 py-2 font-medium hover:border-accent"
            >
              <GitHubIcon className="size-5" />
              Our code on GitHub
            </a>
          </div>
          <ul className="mt-5 flex flex-wrap gap-2">
            {OPEN_SOURCE.map((p) => (
              <li key={p.name}>
                <a
                  href={p.href}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-secondary px-4 py-2 text-sm font-medium hover:text-accent"
                >
                  {p.name === "AWS CDK" && (
                    <Image
                      unoptimized
                      src="/aws/AWSCloudDevelopmentKit.svg"
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      className="rounded"
                    />
                  )}
                  {p.name === "OpenSearch" && (
                    <Image
                      unoptimized
                      src="/aws/AmazonOpenSearchService.svg"
                      alt=""
                      width={20}
                      height={20}
                      loading="lazy"
                      className="rounded"
                    />
                  )}
                  {p.name}
                </a>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </Section>
  );
}

function ServiceRow({ service }: { service: Service }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex shrink-0 -space-x-2">
        {service.icons.length ? (
          service.icons.map((icon) => (
            <Image
              unoptimized
              key={icon}
              src={`/aws/${icon}.svg`}
              alt=""
              width={36}
              height={36}
              loading="lazy"
              className="rounded-lg ring-2 ring-surface"
            />
          ))
        ) : (
          <span
            aria-hidden="true"
            className="flex size-9 items-center justify-center rounded-lg bg-surface-secondary text-xs font-bold text-accent"
          >
            {service.name
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)}
          </span>
        )}
      </span>
      <span>
        <span className="block font-medium">{service.name}</span>
        <span className="text-sm text-muted">{service.job}</span>
      </span>
    </li>
  );
}
