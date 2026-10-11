import type { ComponentType } from "react";

export interface Post {
  slug: string;
  title: string;
  description: string;
  /** YYYY-MM-DD */
  date: string;
  author: string;
  readingMinutes: number;
  tag: string;
  image: { src: string; alt: string; width: number; height: number };
  /** Section headings, for the table of contents (ids match the h2s in Content). */
  toc: { id: string; title: string }[];
  faq: { q: string; a: string }[];
  sources: { name: string; href: string }[];
  Content: ComponentType;
}
