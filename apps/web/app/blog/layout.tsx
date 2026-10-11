import type { ReactNode } from "react";
import { SiteFooter } from "../_landing/site-footer";
import { SiteHeader } from "../_landing/site-header";

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="dark" className="landing dark min-h-dvh">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
