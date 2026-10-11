import { existsSync } from "node:fs";
import { join } from "node:path";
import Image from "next/image";

/** The film itself, when it's hosted with the site. */
const FILM = "/film.mp4";

/** The film's URL on this site, or undefined while the file isn't there (decided at build time). */
export function filmSource(): string | undefined {
  return existsSync(join(process.cwd(), "public", FILM)) ? FILM : undefined;
}

/** The film's thumbnail (docs/assets/thumbnails.html#film-clean; the card adds the play button). */
export function FilmPoster() {
  return (
    <Image
      src="/images/film-thumbnail.jpg"
      alt=""
      width={1280}
      height={720}
      sizes="(min-width: 1144px) 1100px, 100vw"
      priority
    />
  );
}
