"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../demo/_components/use-reduced-motion";

/**
 * The muted teaser loop. Nothing downloads until it is near the viewport; with reduced
 * motion it shows the poster and offers controls instead of autoplaying.
 */
export function TeaserVideo({
  sources,
  poster,
  label,
}: {
  /** Best first, e.g. WebM then MP4. */
  sources: { src: string; type: string }[];
  poster: string;
  label: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Setting autoPlay after mount doesn't start playback, so start it once the source is in.
  useEffect(() => {
    const el = ref.current;
    if (!el || !near) return;
    el.load();
    if (!reduced) el.play().catch(() => {});
  }, [near, reduced]);

  return (
    <video
      ref={ref}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay={near && !reduced}
      controls={reduced}
      preload="none"
      aria-label={label}
      width={960}
      height={540}
      className="aspect-video w-full rounded-2xl border border-separator bg-surface object-cover"
    >
      {near && sources.map((s) => <source key={s.src} src={s.src} type={s.type} />)}
    </video>
  );
}
