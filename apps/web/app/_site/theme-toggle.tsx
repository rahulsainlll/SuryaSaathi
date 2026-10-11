"use client";

/**
 * Flips light and dark and remembers the choice. Which icon shows is decided in CSS from
 * the data-theme attribute, so server and client markup always match.
 */
export function ThemeToggle() {
  return (
    <button
      className="icon-btn"
      aria-label="Switch colour theme"
      onClick={() => {
        const root = document.documentElement;
        const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
        root.setAttribute("data-theme", next);
        root.style.colorScheme = next;
        try {
          localStorage.setItem("ss-theme", next);
        } catch {
          // Private mode: the choice lasts for this page only.
        }
      }}
    >
      <svg
        className="i-moon"
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg
        className="i-sun"
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
