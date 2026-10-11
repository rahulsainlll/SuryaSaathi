"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { REPO } from "./content";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/technology", label: "Technology" },
  { href: "/impact", label: "Impact" },
  { href: "/blog", label: "Blog" },
];

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  // Close the mobile menu on navigation.
  const [lastPath, setLastPath] = useState(path);
  if (path !== lastPath) {
    setLastPath(path);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`hdr${open ? " open" : ""}`}>
      <div className="wrap">
        <Logo />
        <div className="mob">
          <ThemeToggle />
          <button
            className="icon-btn menu-btn"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((o) => !o)}
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
        <nav className="nav" id="site-nav" aria-label="Main">
          {NAV.map((n) => (
            <Link
              key={n.href}
              className="l"
              href={n.href}
              aria-current={path === n.href || path.startsWith(`${n.href}/`) ? "page" : undefined}
            >
              {n.label}
            </Link>
          ))}
          <a className="l" href={REPO}>
            GitHub
          </a>
          <span className="desk-toggle">
            <ThemeToggle />
          </span>
          <Link className="btn btn-ink" style={{ minHeight: 44, marginLeft: 6 }} href="/demo">
            Try the demo
          </Link>
        </nav>
      </div>
    </header>
  );
}
