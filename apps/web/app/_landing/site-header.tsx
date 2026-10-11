import { Logo } from "@suryasaathi/ui";
import Link from "next/link";
import { REPO } from "./content";
import { GitHubIcon } from "./icons";

const link =
  "rounded-lg px-1.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted transition-colors hover:text-foreground sm:px-2";

/** Sticky header for the landing page and the blog. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-separator bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-1 px-3 sm:h-16 sm:gap-2 sm:px-6">
        <Link href="/" aria-label="SuryaSaathi home" className="shrink-0 rounded-lg">
          <Logo height={22} />
        </Link>
        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-2">
          <Link href="/#how-it-works" className={link}>
            How it works
          </Link>
          <Link href="/demo" className={link}>
            Demo
          </Link>
          <Link href="/blog" className={`${link} hidden sm:inline-block`}>
            Blog
          </Link>
          <a href={REPO} className={`${link} inline-flex items-center gap-1.5`}>
            <GitHubIcon className="size-5" />
            <span className="sr-only sm:not-sr-only">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
