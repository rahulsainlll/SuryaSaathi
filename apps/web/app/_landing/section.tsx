import type { ReactNode } from "react";

/** A landing-page section: an anchor, an eyebrow, a heading and its content. */
export function Section({
  id,
  eyebrow,
  title,
  intro,
  children,
  className = "",
}: {
  id?: string;
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={`scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28 ${className}`}
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold tracking-wide text-accent uppercase">{eyebrow}</p>
        <h2
          id={headingId}
          className="mt-3 max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-5xl"
        >
          {title}
        </h2>
        {intro && <p className="mt-5 max-w-2xl text-lg text-muted">{intro}</p>}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

/** "Source: …" under a figure, always a real link. */
export function SourceLink({ source }: { source: { name: string; href: string } }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-muted underline decoration-separator underline-offset-4 hover:text-foreground"
    >
      Source: {source.name}
    </a>
  );
}
