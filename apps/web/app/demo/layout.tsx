import type { ReactNode } from "react";
import { ForceLight } from "../_site/theme-sync";

/** The demo keeps its light design whatever theme the site is in. */
export default function DemoLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ForceLight />
      {children}
    </>
  );
}
