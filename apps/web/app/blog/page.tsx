import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RevealHeading } from "../_site/words";
import { POSTS } from "./_posts";
import { formatDate } from "./format";

export const metadata: Metadata = {
  title: "Blog · SuryaSaathi",
  description: "How SuryaSaathi watches India's rooftop solar, and how it's built on AWS.",
};

/** What the series covers next (from the first post's "What's next"). */
const UPCOMING = [
  "Modelling expected output from sunlight and haze",
  "Reading an inverter screen with a camera clip",
  "Chasing vendors: the case workflow on Step Functions",
  "Inside the DISCOM console",
];

export default function BlogIndex() {
  const [featured, ...rest] = POSTS;
  return (
    <>
      <section className="blog-hero">
        <div className="wrap stack g20">
          <span className="eyebrow">Blog</span>
          <RevealHeading as="h1" className="h1 page hero-load">
            Notes from the roof.
          </RevealHeading>
          <p className="lead fade hero-load" style={{ maxWidth: 620 }}>
            How SuryaSaathi tells smog, dust and faults apart, how it makes vendors fix what they
            owe, and how it&apos;s built on AWS.
          </p>
        </div>
      </section>

      <section style={{ padding: "16px 0 96px" }}>
        <div className="wrap stack g40">
          {featured && <PostCard post={featured} priority />}
          {rest.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}

          <div className="stack g16 fade">
            <span className="eyebrow">Coming next in the series</span>
            <ol className="upcoming">
              {UPCOMING.map((t, i) => (
                <li key={t}>
                  <span>{String(i + 2).padStart(2, "0")}</span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}

function PostCard({
  post,
  priority = false,
}: {
  post: (typeof POSTS)[number];
  priority?: boolean;
}) {
  return (
    <Link href={`/blog/${post.slug}`} className="post-card fade">
      <div className="media">
        <Image
          src={post.image.src}
          alt=""
          width={post.image.width}
          height={post.image.height}
          priority={priority}
          sizes="(min-width: 1120px) 580px, (min-width: 860px) 52vw, 100vw"
        />
      </div>
      <div className="body">
        <div className="meta">
          <span>{post.tag}</span>
          <span className="dot" />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span className="dot" />
          <span>{post.readingMinutes} min read</span>
        </div>
        <h2>{post.title}</h2>
        <p className="muted">{post.description}</p>
        <span className="more">
          Read the post
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
