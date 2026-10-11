"use client";

import { Alert, Breadcrumbs, Card, Skeleton } from "@heroui/react";
import type { ReactNode } from "react";
import { dayYear } from "../lib/format";
import { SimulatedBadge } from "./badges";

export interface Crumb {
  label: string;
  href: string;
}

export function PageHeader({
  title,
  subtitle,
  asOf,
  simulated,
  actions,
  crumbs,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  asOf?: string;
  simulated?: boolean;
  actions?: ReactNode;
  /** Parent pages, shown as HeroUI breadcrumbs above the title. */
  crumbs?: Crumb[];
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {crumbs && (
          <Breadcrumbs className="mb-2">
            {crumbs.map((c) => (
              <Breadcrumbs.Item key={c.href} href={c.href}>
                {c.label}
              </Breadcrumbs.Item>
            ))}
            <Breadcrumbs.Item>{title}</Breadcrumbs.Item>
          </Breadcrumbs>
        )}
        <h1 className="text-2xl font-bold tracking-tight break-words sm:text-3xl">{title}</h1>
        {subtitle && <div className="mt-1 max-w-[70ch] text-muted">{subtitle}</div>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          {simulated !== undefined && <SimulatedBadge simulated={simulated} />}
          {asOf && <span>As of {dayYear(asOf)}</span>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

/** A KPI as a HeroUI card. */
export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "danger" | "warning";
}) {
  const toneClass = tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : "";
  return (
    <Card>
      <Card.Header>
        <Card.Description>{label}</Card.Description>
        <Card.Title className={`text-2xl tracking-tight tabular-nums ${toneClass}`}>
          {value}
        </Card.Title>
      </Card.Header>
      {hint && <Card.Footer className="text-xs text-muted">{hint}</Card.Footer>}
    </Card>
  );
}

/** A titled HeroUI card for a block of content. */
export function Panel({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`min-w-0 ${className ?? ""}`}>
      {(title || description) && (
        <Card.Header>
          {title && <Card.Title>{title}</Card.Title>}
          {description && <Card.Description>{description}</Card.Description>}
        </Card.Header>
      )}
      <Card.Content>{children}</Card.Content>
    </Card>
  );
}

export function Section({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function Loading({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64 rounded-lg" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function LoadError({ error }: { error: Error }) {
  return (
    <Alert status="danger">
      <Alert.Content>
        <Alert.Title>Couldn’t load this page</Alert.Title>
        <Alert.Description>{error.message}</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}

export function NotFound({ what }: { what: string }) {
  return (
    <Alert status="warning">
      <Alert.Content>
        <Alert.Title>{what} not found</Alert.Title>
        <Alert.Description>Check the link, or find it with ⌘K.</Alert.Description>
      </Alert.Content>
    </Alert>
  );
}
