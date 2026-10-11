import { Fragment, type ReactNode } from "react";

/**
 * Splits text into words for the heading reveal: each word slides up from behind its own
 * mask, 45 ms after the previous one. `start` continues the count across segments.
 */
export function words(text: string, start = 0): ReactNode {
  let i = start;
  return text.split(/(\s+)/).map((part, k) =>
    /^\s+$/.test(part) || !part ? (
      <Fragment key={k}>{part}</Fragment>
    ) : (
      <span key={k} className="w">
        <span style={{ ["--d" as string]: `${i++ * 45}ms` }}>{part}</span>
      </span>
    ),
  );
}

/** A heading revealed word by word as it scrolls into view. */
export function RevealHeading({
  as: Tag = "h2",
  className = "h2",
  children,
}: {
  as?: "h1" | "h2";
  className?: string;
  children: string;
}) {
  return (
    <Tag className={className} data-reveal="">
      {words(children)}
    </Tag>
  );
}

/** Delay for staggered fades, as a style object. */
export const delay = (ms: number) => ({ ["--d" as string]: `${ms}ms` });
