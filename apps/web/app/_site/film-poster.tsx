import Image from "next/image";

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
