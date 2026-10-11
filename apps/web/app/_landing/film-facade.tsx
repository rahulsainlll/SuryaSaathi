"use client";

import Image from "next/image";
import { useState } from "react";
import { PlayIcon } from "./icons";

/**
 * A click-to-load YouTube player: a poster and a real button until the viewer asks, so the
 * page doesn't pay for YouTube's scripts up front.
 */
export function FilmFacade({ id, title, poster }: { id: string; title: string; poster: string }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <iframe
        className="aspect-video w-full rounded-3xl border border-separator"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-3xl border border-separator bg-surface text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
    >
      <Image
        src={poster}
        alt=""
        fill
        sizes="(min-width: 1152px) 1152px, 100vw"
        className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.02]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <span className="absolute bottom-4 left-4 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 font-semibold text-[#14121C] shadow-lg sm:bottom-6 sm:left-6">
        <PlayIcon className="size-5" />
        Play the film
        <span className="sr-only">: {title} (loads YouTube)</span>
      </span>
    </button>
  );
}
