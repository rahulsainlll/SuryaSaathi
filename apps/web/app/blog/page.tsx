import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { POSTS } from "./_posts";
import { formatDate } from "./format";

export const metadata: Metadata = {
  title: "Blog · SuryaSaathi",
  description: "How SuryaSaathi watches India’s rooftop solar, and how it’s built on AWS.",
};

export default function BlogIndex() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">Blog</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Notes from the roof</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        How SuryaSaathi tells smog, dust and faults apart, how it makes vendors fix what they owe,
        and how it’s built on AWS.
      </p>
      <ul className="mt-12 grid gap-6 md:grid-cols-2">
        {POSTS.map((p, i) => (
          <li key={p.slug}>
            <Link
              href={`/blog/${p.slug}`}
              className="group block overflow-hidden rounded-3xl border border-separator bg-surface transition-colors hover:border-accent"
            >
              <Image
                src={p.image.src}
                alt=""
                width={p.image.width}
                height={p.image.height}
                priority={i === 0}
                sizes="(min-width: 768px) 560px, 100vw"
                className="aspect-video w-full object-cover"
              />
              <div className="p-6">
                <p className="text-sm text-muted">
                  {p.tag} · <time dateTime={p.date}>{formatDate(p.date)}</time> · {p.readingMinutes}{" "}
                  min read
                </p>
                <h2 className="mt-2 text-xl font-semibold text-balance group-hover:text-accent">
                  {p.title}
                </h2>
                <p className="mt-2 text-muted">{p.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
