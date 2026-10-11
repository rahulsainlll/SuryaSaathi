import { post as itsNotThePollution } from "./its-not-the-pollution";
import type { Post } from "./types";

/** Newest first. */
export const POSTS: Post[] = [itsNotThePollution];

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export type { Post };
