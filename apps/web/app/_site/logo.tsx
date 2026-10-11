import Link from "next/link";

/** The sun-and-check mark; the check follows the text colour. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 120 120">
      <g stroke="#F5A524" strokeWidth="7" strokeLinecap="round">
        <line x1="92" y1="62" x2="103" y2="62" />
        <line x1="56" y1="98" x2="56" y2="109" />
        <line x1="20" y1="62" x2="9" y2="62" />
        <line x1="56" y1="26" x2="56" y2="15" />
        <line x1="81.5" y1="87.5" x2="89.2" y2="95.2" />
        <line x1="30.5" y1="87.5" x2="22.8" y2="95.2" />
        <line x1="30.5" y1="36.5" x2="22.8" y2="28.8" />
      </g>
      <circle cx="56" cy="62" r="26" fill="#F5A524" />
      <path
        d="M42 62 L54 74 L96 30"
        fill="none"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark plus the Baloo 2 wordmark, linking home. */
export function Logo({ mark = true }: { mark?: boolean }) {
  return (
    <Link className="logo" href="/" aria-label="SuryaSaathi home">
      {mark && <LogoMark />}
      <span>
        Surya<span className="hl">Saathi</span>
      </span>
    </Link>
  );
}
