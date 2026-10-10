import { brand } from "../tokens";

export interface BrandMarkProps {
  className?: string;
}

/** The SuryaSaathi sun mark and wordmark. */
export function BrandMark({ className }: BrandMarkProps) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${className ?? ""}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 text-accent">
        <circle cx="12" cy="12" r="5" fill="currentColor" />
        <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </g>
      </svg>
      {brand.name}
    </span>
  );
}
