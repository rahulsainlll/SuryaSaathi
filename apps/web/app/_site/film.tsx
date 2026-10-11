"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { YOUTUBE_ID } from "./content";

type YTPlayer = { playVideo(): void; destroy(): void };
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string;
      host: string;
      playerVars: Record<string, number>;
      events: { onReady: (e: { target: YTPlayer }) => void };
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let api: Promise<YTNamespace> | undefined;

/** YouTube's IFrame API, loaded once. */
function loadYouTubeApi(): Promise<YTNamespace> {
  api ??= new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    document.head.append(script);
  });
  return api;
}

let warmed = false;

/** On the way to the play button: open the connections and fetch the API, so play is quick. */
function warmUp() {
  if (warmed) return;
  warmed = true;
  for (const href of [
    "https://www.youtube-nocookie.com",
    "https://www.youtube.com",
    "https://www.google.com",
    "https://i.ytimg.com",
  ]) {
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    document.head.append(link);
  }
  void loadYouTubeApi();
}

/**
 * The YouTube film, started through the IFrame API rather than an autoplay URL: the player
 * calls playVideo() as soon as it's ready, so one press on our button is enough (an autoplay
 * URL alone leaves Safari and phones on YouTube's own play button, needing a second press).
 */
function YouTubeFilm() {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let player: YTPlayer | undefined;
    let cancelled = false;
    void loadYouTubeApi().then((YT) => {
      if (cancelled || !host.current) return;
      player = new YT.Player(host.current, {
        videoId: YOUTUBE_ID,
        host: "https://www.youtube-nocookie.com",
        playerVars: { autoplay: 1, playsinline: 1, rel: 0 },
        events: { onReady: (e) => e.target.playVideo() },
      });
    });
    return () => {
      cancelled = true;
      player?.destroy();
    };
  }, []);

  // The API swaps the inner div for its iframe; the outer one stays React's.
  return (
    <div className="film-yt">
      <div ref={host} />
    </div>
  );
}

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
          <YouTubeFilm />
        ) : (
          <>
            {poster}
            <button
              className="play"
              onPointerEnter={src ? undefined : warmUp}
              onFocus={src ? undefined : warmUp}
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
