"use client";

import { Button, Drawer, Kbd } from "@heroui/react";
import { BrandMark } from "@suryasaathi/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { RouterProvider } from "react-aria-components";
import { useState, useSyncExternalStore, type ReactNode } from "react";
import { currentUser, signOut } from "../lib/auth";
import { config } from "../lib/config";
import { useQuery } from "../lib/data";
import { SimulatedBadge } from "./badges";
import { CommandPalette } from "./command-palette";
import { ButtonLink } from "./links";

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
          <ButtonLink
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            variant={active ? "secondary" : "ghost"}
            size="md"
            fullWidth
            className="justify-start"
          >
            {n.label}
          </ButtonLink>
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

const noSubscription = () => () => {};

/** In API mode: who is signed in, and a way out. */
function UserMenu() {
  // Tokens live in sessionStorage: read on the client only (null while prerendering).
  const email = useSyncExternalStore(
    noSubscription,
    () => currentUser()?.email ?? null,
    () => null,
  );
  if (config.dataSource !== "api" || email === null) return null;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-48 truncate text-sm text-muted md:inline">{email}</span>
      <Button variant="ghost" size="sm" onPress={signOut}>
        Sign out
      </Button>
    </div>
  );
}

/** Sidebar on wide screens, a top bar with a drawer on phones; ⌘K everywhere. */
export function Shell({ children }: { children: ReactNode }) {
  // The sign-in callback must not load data: that would start another sign-in.
  if (usePathname().startsWith("/auth/")) {
    return <main className="mx-auto max-w-xl px-4 py-16">{children}</main>;
  }
  return <ConsoleShell>{children}</ConsoleShell>;
}

function ConsoleShell({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { data } = useQuery("search", (d) => d.search());
  const simulated = data?.simulated ?? false;
  const router = useRouter();

  return (
    // HeroUI links (breadcrumbs, link components) navigate through the Next.js router.
    <RouterProvider navigate={(href) => router.push(href)}>
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
            <div className="hidden text-sm text-muted lg:block">
              Rooftop solar monitoring · Delhi
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex">
                <SimulatedBadge simulated={simulated} />
              </span>
              <SearchButton onPress={() => setPaletteOpen(true)} />
              <UserMenu />
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
        </div>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </RouterProvider>
  );
}
