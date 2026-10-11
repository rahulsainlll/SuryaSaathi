"use client";

import dynamic from "next/dynamic";

/** The live widget loads after the page, so the headline paints first. */
export const HeroWidgetLoader = dynamic(() => import("./hero-widget").then((m) => m.HeroWidget), {
  ssr: false,
  loading: () => (
    <div
      aria-hidden="true"
      className="h-[22.5rem] rounded-3xl border border-separator bg-surface sm:h-[23.5rem]"
    />
  ),
});
