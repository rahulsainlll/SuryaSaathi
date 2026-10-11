"use client";

import { motion, useScroll } from "motion/react";
import { useEffect, useState } from "react";

/** A thin amber bar across the top that follows how far through the article you are. */
export function ReadProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div className="read-progress" aria-hidden="true" style={{ scaleX: scrollYProgress }} />
  );
}

/**
 * The article's contents. Marks the section being read (the last heading that has
 * scrolled past the top third of the screen) with aria-current.
 */
export function Toc({ items }: { items: { id: string; title: string }[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const headings = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight / 3;
      let current: string | null = null;
      for (const h of headings) if (h.getBoundingClientRect().top <= line) current = h.id;
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [items]);

  return (
    <nav className="toc" aria-label="On this page">
      <ol>
        {items.map((t) => (
          <li key={t.id}>
            <a href={`#${t.id}`} aria-current={active === t.id ? "true" : undefined}>
              {t.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
