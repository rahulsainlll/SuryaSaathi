import { Logo } from "@suryasaathi/ui";
import Link from "next/link";
import { REPO, YOUTUBE_URL } from "./content";

/** Footer for the landing page and the blog. */
export function SiteFooter() {
  return (
    <footer className="border-t border-separator px-4 py-12 text-sm text-muted sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="max-w-sm">
          <Logo height={26} />
          <p className="mt-3">
            An AI agent that keeps India’s rooftop solar working. Every system, reading and case on
            this site is simulated.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-2">
          <Link href="/demo" className="hover:text-foreground">
            Live demo
          </Link>
          <Link href="/blog" className="hover:text-foreground">
            Blog
          </Link>
          <Link href="/#how-it-works" className="hover:text-foreground">
            How it works
          </Link>
          <a href={YOUTUBE_URL} className="hover:text-foreground">
            The film
          </a>
          <a href={REPO} className="hover:text-foreground">
            GitHub
          </a>
          <a href={`${REPO}/blob/main/LICENSE`} className="hover:text-foreground">
            MIT licence
          </a>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-6xl text-xs">
        Built by Team Mythos for Environmental Hacks 2026. AWS service icons are from the AWS
        Architecture Icons set; AWS and the service names are trademarks of Amazon.com, Inc. or its
        affiliates.
      </p>
    </footer>
  );
}
