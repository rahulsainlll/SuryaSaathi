import type { ReactNode } from "react";
import { YOUTUBE_URL } from "./content";

/**
 * The film card: the thumbnail and a play button. Clicking anywhere on it opens the film
 * on YouTube in a new tab; nothing from YouTube loads on this page.
 */
export function Film({ poster }: { poster: ReactNode }) {
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
          <span className="pb">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#111">
              <polygon points="7 4 21 12 7 20" />
            </svg>
          </span>
        </span>
        <span className="film-bar" aria-hidden="true">
          <span>SuryaSaathi in 70 seconds</span>
          <span>Sound on · 1:10</span>
        </span>
      </a>
    </div>
  );
}
