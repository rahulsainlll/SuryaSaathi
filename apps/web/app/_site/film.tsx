"use client";

import { useState, type ReactNode } from "react";
import { YOUTUBE_URL } from "./content";

const PLAY_ICON = (
  <span className="pb">
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="#111">
      <polygon points="7 4 21 12 7 20" />
    </svg>
  </span>
);

const BAR = (
  <span className="film-bar" aria-hidden="true">
    <span>SuryaSaathi in 70 seconds</span>
    <span>Sound on · 1:10</span>
  </span>
);

/**
 * The film card. With the film hosted on the site (`src`), pressing play swaps the thumbnail
 * for a plain video player in the same card: no pop-up, nothing from YouTube. Without it,
 * the card links to the film on YouTube.
 */
export function Film({ poster, src }: { poster: ReactNode; src?: string }) {
  const [playing, setPlaying] = useState(false);

  if (!src) {
    return (
      <div className="film fade">
        <a
          className="film-in"
          href={YOUTUBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Watch the 70-second SuryaSaathi film on YouTube (opens in a new tab)"
        >
          {poster}
          <span className="play" aria-hidden="true">
            {PLAY_ICON}
          </span>
          {BAR}
        </a>
      </div>
    );
  }

  return (
    <div className="film fade">
      <div className="film-in">
        {playing ? (
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
        ) : (
          <>
            {poster}
            <button
              className="play"
              onClick={() => setPlaying(true)}
              aria-label="Play the 70-second SuryaSaathi film"
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
