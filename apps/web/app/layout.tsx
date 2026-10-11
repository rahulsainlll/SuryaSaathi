import { brandIcons } from "@suryasaathi/ui";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  icons: brandIcons,
  title: "SuryaSaathi",
  description: "Marketing site and public demo for SuryaSaathi",
};

export const viewport: Viewport = { themeColor: "#14121C" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
