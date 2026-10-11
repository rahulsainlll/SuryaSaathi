import { brandAssets } from "../brand";

export interface LogoProps {
  /** Rendered height in pixels; the width follows the logo's proportions. */
  height?: number;
  className?: string;
}

/**
 * The SuryaSaathi logo: suryasaathi-logo.svg on the light theme and
 * suryasaathi-logo-dark.svg on the dark theme (`.dark` or `data-theme="dark"`, as in
 * theme.css).
 */
export function Logo({ height = 28, className }: LogoProps) {
  const { width: w, height: h } = brandAssets.logoSize;
  const width = Math.round((height * w) / h);
  const size = { width, height };
  return (
    <span className={`ss-logo inline-flex shrink-0 ${className ?? ""}`}>
      <img src={brandAssets.logo} alt="SuryaSaathi" {...size} className="ss-logo-light block" />
      <img src={brandAssets.logoDark} alt="SuryaSaathi" {...size} className="ss-logo-dark hidden" />
    </span>
  );
}
