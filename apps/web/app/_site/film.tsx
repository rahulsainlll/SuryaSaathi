"use client";

import { useState, type ReactNode } from "react";
import { YOUTUBE_ID } from "./content";

const PLAY_ICON = (
  <span className="pb">
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="#111">
      <polygon points="7 4 21 12 7 20" />
    </svg>
  </span>
);

const BAR = (
  <span className="film-bar" aria-hidden="true">
    <span>The SuryaSaathi film</span>
    <span>Sound on</span>
  </span>
);

/**
 * The film card, right under the hero. Pressing play plays the film in place, filling the
 * card (it's 16:9, like the card): from public/film.mp4 when the site hosts it, otherwise the
 * YouTube film, embedded without leaving the page. Nothing loads until play is pressed.
 */
export function Film({ poster, src }: { poster: ReactNode; src?: string }) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="film fade">
      <div className="film-in">
        {playing && src ? (
          // Started by the click, so it may play with sound; the browser's own controls only.
          <video
            src={src}
            autoPlay
            controls
            playsInline
            preload="auto"
            aria-label="SuryaSaathi film"
            onEnded={() => setPlaying(false)}
          />
        ) : playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&playsinline=1&rel=0&modestbranding=1`}
            title="SuryaSaathi film"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        ) : (
          <>
            {poster}
            <button
              className="play"
              onClick={() => setPlaying(true)}
              aria-label="Play the SuryaSaathi film"
            >
              {PLAY_ICON}
            </button>
            {BAR}
          </>
        )}
      </div>
    </div>
  );
}
