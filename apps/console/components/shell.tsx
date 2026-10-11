"use client";

import { Button, Drawer, Kbd } from "@heroui/react";
import { BrandMark } from "@suryasaathi/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useQuery } from "../lib/data";
import { SimulatedBadge } from "./badges";
import { CommandPalette } from "./command-palette";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/cases", label: "Cases" },
  { href: "/vendors", label: "Vendors" },
  { href: "/systems", label: "Systems" },
  { href: "/breakdown", label: "Causes & zones" },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <nav aria-label="Console" className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-accent-soft text-foreground" : "text-muted hover:bg-default"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SearchButton({ onPress }: { onPress: () => void }) {
  return (
    <Button variant="secondary" size="sm" onPress={onPress} aria-keyshortcuts="Meta+K Control+K">
      <span>Search</span>
      <Kbd className="hidden sm:inline-flex">
        <Kbd.Abbr keyValue="command" />
        <Kbd.Content>K</Kbd.Content>
      </Kbd>
    </Button>
  );
}

/** Sidebar on wide screens, a top bar with a drawer on phones; ⌘K everywhere. */
export function Shell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data } = useQuery("search", (d) => d.search());
  const simulated = data?.simulated ?? false;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-separator bg-surface px-4 py-5 lg:flex">
        <Link href="/" className="rounded-lg">
          <BrandMark />
          <span className="mt-0.5 block text-xs text-muted">DISCOM console</span>
        </Link>
        <NavLinks />
        <div className="mt-auto flex flex-col gap-2 text-xs text-muted">
          <SimulatedBadge simulated={simulated} />
          {simulated && (
            <p>Every system, vendor and case here is simulated with the SuryaSaathi engine.</p>
          )}
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-separator bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <Drawer>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Open navigation"
                onPress={() => setMenuOpen(true)}
              >
                <svg
                  aria-hidden="true"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </Button>
              <Drawer.Backdrop isOpen={menuOpen} onOpenChange={setMenuOpen}>
                <Drawer.Content placement="left">
                  <Drawer.Dialog aria-label="Navigation">
                    <Drawer.CloseTrigger />
                    <Drawer.Header>
                      <Drawer.Heading>
                        <BrandMark />
                      </Drawer.Heading>
                    </Drawer.Header>
                    <Drawer.Body>
                      <NavLinks onNavigate={() => setMenuOpen(false)} />
                    </Drawer.Body>
                  </Drawer.Dialog>
                </Drawer.Content>
              </Drawer.Backdrop>
            </Drawer>
            <Link href="/" className="rounded-lg">
              <BrandMark />
            </Link>
          </div>
          <div className="hidden text-sm text-muted lg:block">Rooftop solar monitoring · Delhi</div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex">
              <SimulatedBadge simulated={simulated} />
            </span>
            <SearchButton onPress={() => setPaletteOpen(true)} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
