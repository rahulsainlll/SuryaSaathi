import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";

/** The frame extracted from public/film.mp4 (see `pnpm --filter web film:poster`). */
const POSTER = "/images/film-poster.jpg";

/**
 * The film card's poster: the extracted frame when it exists, otherwise the prototype's
 * illustrated scene. Decided at build time.
 */
export function FilmPoster() {
  if (existsSync(join(process.cwd(), "public", POSTER))) {
    return (
      <Image
        src={POSTER}
        alt=""
        width={1280}
        height={720}
        sizes="(min-width: 1144px) 1100px, 100vw"
        priority
      />
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="glow" cx="72%" cy="36%" r="42%">
          <stop offset="0" stopColor="#8B7CF6" stopOpacity=".38" />
          <stop offset="1" stopColor="#14121C" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#glow)" />
      <circle cx="1180" cy="320" r="110" fill="#F5A524" />
      <rect x="0" y="640" width="260" height="260" fill="#221E35" />
      <rect x="268" y="560" width="300" height="340" fill="#1B1830" />
      <rect x="576" y="610" width="240" height="290" fill="#221E35" />
      <rect x="824" y="520" width="330" height="380" fill="#1B1830" />
      <rect x="1162" y="590" width="250" height="310" fill="#221E35" />
      <rect x="1420" y="540" width="180" height="360" fill="#1B1830" />
      <g fill="#4B3F96" stroke="#A99BFF" strokeWidth="3">
        <polygon points="290,556 340,556 332,528 282,528" />
        <polygon points="350,556 400,556 392,528 342,528" />
        <polygon points="410,556 460,556 452,528 402,528" />
        <polygon points="846,516 896,516 888,488 838,488" />
        <polygon points="906,516 956,516 948,488 898,488" />
        <polygon points="966,516 1016,516 1008,488 958,488" />
        <polygon points="1026,516 1076,516 1068,488 1018,488" />
        <polygon points="1440,536 1490,536 1482,508 1432,508" />
        <polygon points="1500,536 1550,536 1542,508 1492,508" />
      </g>
    </svg>
  );
}
