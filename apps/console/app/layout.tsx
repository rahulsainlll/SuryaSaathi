import { brandIcons } from "@suryasaathi/ui";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Shell } from "../components/shell";
import "./globals.css";

export const metadata: Metadata = {
  icons: brandIcons,
  title: { default: "SuryaSaathi Console", template: "%s · SuryaSaathi Console" },
  description: "DISCOM admin console for SuryaSaathi: vendors, cases and systems across the fleet.",
};

export const viewport: Viewport = { themeColor: "#14121C" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
