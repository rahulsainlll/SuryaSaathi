/**
 * The brand files in packages/ui/brand, as URLs the apps' bundler emits, plus the favicon,
 * apple-touch-icon and web manifest settings both apps share.
 */
import appIcon180 from "../brand/suryasaathi-app-icon-180.png";
import appIcon192 from "../brand/suryasaathi-app-icon-192.png";
import appIcon512 from "../brand/suryasaathi-app-icon-512.png";
import appIconSvg from "../brand/suryasaathi-app-icon.svg";
import faviconIco from "../brand/favicon.ico";
import faviconSvg from "../brand/favicon.svg";
import logoDark from "../brand/suryasaathi-logo-dark.svg";
import logoLight from "../brand/suryasaathi-logo.svg";

/** A static import is a URL string or `{ src }`, depending on the bundler. */
type Asset = string | { src: string };
const url = (asset: Asset) => (typeof asset === "string" ? asset : asset.src);

export const brandAssets = {
  logo: url(logoLight),
  logoDark: url(logoDark),
  /** viewBox of both logo files. */
  logoSize: { width: 642, height: 120 },
};

/** Colours from the brand files. */
export const brandColor = {
  sun: "#F5A524",
  ink: "#11181C",
  night: "#14121C",
} as const;

/** For Next.js `metadata.icons`. */
export const brandIcons = {
  icon: [
    { url: url(faviconIco), sizes: "any" },
    { url: url(faviconSvg), type: "image/svg+xml" },
  ],
  apple: [{ url: url(appIcon180), sizes: "180x180", type: "image/png" }],
};

/** For an app's `app/manifest.ts` (Next.js `MetadataRoute.Manifest`). */
export function brandManifest(app: { name: string; shortName: string; description: string }) {
  return {
    name: app.name,
    short_name: app.shortName,
    description: app.description,
    start_url: "/",
    display: "standalone" as const,
    background_color: brandColor.night,
    theme_color: brandColor.night,
    icons: [
      { src: url(appIcon192), sizes: "192x192", type: "image/png" },
      { src: url(appIcon512), sizes: "512x512", type: "image/png" },
      { src: url(appIconSvg), sizes: "any", type: "image/svg+xml" },
    ],
  };
}
