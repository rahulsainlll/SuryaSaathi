"use client";

import { useRef, useState, type ReactNode } from "react";
import { YOUTUBE_ID, YOUTUBE_URL } from "./content";

/**
 * The film card and its modal. The YouTube iframe only exists while the dialog is open:
 * it loads on click and is removed on close (Esc, the backdrop or Close).
 */
export function Film({ poster }: { poster: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [playing, setPlaying] = useState(false);

  const open = () => {
    const d = dialog.current;
    if (!d?.showModal) {
      window.location.href = YOUTUBE_URL;
      return;
    }
    setPlaying(true);
    d.showModal();
  };

  return (
    <>
      <div className="film fade">
        <div className="film-in">
          {poster}
          <button className="play" onClick={open} aria-label="Play the 70-second SuryaSaathi film">
            <span className="pb">
              <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" fill="#111">
                <polygon points="7 4 21 12 7 20" />
              </svg>
            </span>
          </button>
          <div className="film-bar" aria-hidden="true">
            <span>SuryaSaathi in 70 seconds</span>
            <span>Sound on · 1:10</span>
          </div>
        </div>
      </div>
      <dialog
        ref={dialog}
        className="vid"
        aria-label="SuryaSaathi film"
        onClose={() => setPlaying(false)}
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
      >
        <div className="vid-frame">
          {playing && (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0`}
              title="SuryaSaathi film"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )}
        </div>
        <div className="vid-bar">
          <span>
            Not loading?{" "}
            <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
              Watch on YouTube
            </a>
          </span>
          <button className="vid-close" onClick={() => dialog.current?.close()}>
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}

/** "Watch the film" in the hero: scrolls to the film card. */
export function ScrollToFilm({ children }: { children: ReactNode }) {
  return (
    <button
      className="btn btn-g"
      onClick={() =>
        document.getElementById("film")?.scrollIntoView({
          behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        })
      }
    >
      {children}
    </button>
  );
}
