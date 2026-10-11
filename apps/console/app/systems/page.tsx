"use client";

import { Label, SearchField } from "@heroui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { LoadError, Loading, PageHeader } from "../../components/page";
import { SystemsTable } from "../../components/tables";
import { useQuery } from "../../lib/data";

function SystemsView() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const q = params.get("q") ?? "";
  const [text, setText] = useState(q);

  // Update the URL (and the query) a moment after typing stops.
  useEffect(() => {
    const id = setTimeout(() => {
      if (text !== q)
        router.replace(text ? `${path}?q=${encodeURIComponent(text)}` : path, { scroll: false });
    }, 250);
    return () => clearTimeout(id);
  }, [text, q, path, router]);

  const systems = useQuery(`systems:${q}`, (d) => d.systems(q));

  return (
    <>
      <PageHeader
        title="Systems"
        subtitle="Search by system ID, DSAIN, vendor or zone."
        asOf={systems.data?.asOf}
        simulated={systems.data?.simulated}
      />
      <SearchField value={text} onChange={setText} className="mb-4 max-w-md">
        <Label>Search systems</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder="SS-DL-001001, DSAIN, Rohini, VND-DL-0042…" />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      {systems.error ? (
        <LoadError error={systems.error} />
      ) : systems.data ? (
        <>
          <p className="mb-2 text-sm text-muted" aria-live="polite">
            {systems.data.systems.length} system{systems.data.systems.length === 1 ? "" : "s"}
          </p>
          <SystemsTable systems={systems.data.systems} />
        </>
      ) : (
        <Loading rows={3} />
      )}
    </>
  );
}

export default function SystemsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SystemsView />
    </Suspense>
  );
}
