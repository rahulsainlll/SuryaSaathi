"use client";

import { useEffect } from "react";

function apply(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

/** Re-applies the saved or system theme after client navigation (e.g. back from /demo). */
export function ThemeSync() {
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("ss-theme");
    } catch {
      // Storage blocked.
    }
    apply(
      saved === "light" || saved === "dark"
        ? saved
        : matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light",
    );
  }, []);
  return null;
}

/** The demo keeps its light design whatever the site theme is. */
export function ForceLight() {
  useEffect(() => apply("light"), []);
  return null;
}
