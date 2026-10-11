import type { ReactNode } from "react";
import { SiteFooter } from "./footer";
import { SiteHeader } from "./header";
import { RevealObserver } from "./reveal";
import { ThemeSync } from "./theme-sync";

/** Header, page and footer for the site and the blog. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site">
      <ThemeSync />
      <RevealObserver />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      {/* Without JavaScript, show everything that would have been revealed. */}
      <noscript>
        <style>{`.site .fade{opacity:1;transform:none}.site .w>span{transform:none}.site .draw svg.sig{clip-path:none}`}</style>
      </noscript>
    </div>
  );
}
