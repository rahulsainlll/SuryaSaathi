"use client";

import type { SearchItem } from "@suryasaathi/console-data";
import { Modal } from "@heroui/react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "../lib/data";

const HREF: Record<SearchItem["type"], (id: string) => string> = {
  system: (id) => `/systems/${encodeURIComponent(id)}`,
  vendor: (id) => `/vendors/${encodeURIComponent(id)}`,
  case: (id) => `/cases/${encodeURIComponent(id)}`,
};

const GROUPS: { type: SearchItem["type"]; heading: string }[] = [
  { type: "vendor", heading: "Vendors" },
  { type: "case", heading: "Cases" },
  { type: "system", heading: "Systems" },
];

/** ⌘K / Ctrl+K: jump to any system, vendor or case (cmdk inside a HeroUI modal). */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data } = useQuery("search", (d) => d.search());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Container placement="top" size="lg">
        <Modal.Dialog aria-label="Jump to a system, vendor or case" className="overflow-hidden p-0">
          <Command label="Jump to a system, vendor or case">
            <Command.Input
              autoFocus
              placeholder="Jump to a system, vendor or case…"
              className="w-full border-b border-separator bg-transparent px-4 py-3.5 text-base outline-none"
            />
            <Command.List className="max-h-[60vh] overflow-auto p-2">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
                {data ? "No matches." : "Loading…"}
              </Command.Empty>
              {GROUPS.map((g) => (
                <Command.Group
                  key={g.type}
                  heading={g.heading}
                  className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted"
                >
                  {data?.items
                    .filter((i) => i.type === g.type)
                    .map((i) => (
                      <Command.Item
                        key={`${i.type}:${i.id}`}
                        value={`${i.type} ${i.label} ${i.id}`}
                        keywords={[i.hint]}
                        onSelect={() => {
                          onOpenChange(false);
                          router.push(HREF[i.type](i.id));
                        }}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-accent-soft"
                      >
                        <span className="truncate font-medium">{i.label}</span>
                        <span className="shrink-0 truncate text-xs text-muted">{i.hint}</span>
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
