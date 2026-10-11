"use client";

import type { ReactNode } from "react";

/** "Watch the film" in the hero: scrolls to the film card. */
export function ScrollToFilm({ children }: { children: ReactNode }) {
  return (
    <button
      className="btn btn-g"
      onClick={() =>
        document.getElementById("film")?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        })
      }
    >
      {children}
    </button>
  );
}
