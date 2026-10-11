import { brandIcons } from "@suryasaathi/ui";
import type { Metadata, Viewport } from "next";
import { Baloo_2, Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});
// Only the logo wordmark uses Baloo 2.
const baloo = Baloo_2({
  subsets: ["latin"],
  weight: "800",
  variable: "--font-baloo",
  display: "swap",
});
const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  weight: "500",
  variable: "--font-devanagari",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  icons: brandIcons,
  title: "SuryaSaathi: 50 lakh solar roofs. Nobody's watching.",
  description:
    "An AI agent on AWS that checks every rooftop solar system every day, tells smog, dust and faults apart, and makes the vendor fix what they owe.",
  openGraph: {
    title: "50 lakh solar roofs. Nobody's watching.",
    description: "SuryaSaathi: the AI agent that keeps India's rooftop solar working.",
    images: [{ url: "/images/og.jpg", width: 1280, height: 720 }],
  },
  twitter: { card: "summary_large_image", images: ["/images/og.jpg"] },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d11" },
  ],
};

/**
 * Sets the theme before the first paint: the saved choice, else the system's. The demo
 * keeps its light design.
 */
const THEME_SCRIPT = `(function(){try{var d=document.documentElement,t;if(location.pathname.indexOf('/demo')===0){t='light'}else{try{t=localStorage.getItem('ss-theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}}d.setAttribute('data-theme',t);d.style.colorScheme=t}catch(e){}})()`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${baloo.variable} ${devanagari.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
