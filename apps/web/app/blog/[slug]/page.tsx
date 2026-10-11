import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { REPO } from "../../_site/content";
import { words } from "../../_site/words";
import { ReadProgress, Toc } from "../_components";
import { findPost, POSTS } from "../_posts";
import { formatDate } from "../format";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) return {};
  return {
    title: `${post.title} · SuryaSaathi`,
    description: post.description,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      images: [{ url: post.image.src, width: post.image.width, height: post.image.height }],
    },
    twitter: { card: "summary_large_image", images: [post.image.src] },
  };
}

function Plus() {
  return (
    <svg
      className="plus"
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  const { Content } = post;
  const toc = [...post.toc, { id: "faq", title: "FAQ" }, { id: "sources", title: "Sources" }];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      image: post.image.src,
      author: { "@type": "Organization", name: post.author },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: post.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <article className="post">
      <ReadProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="wrap">
        <div className="post-grid">
          <header className="post-head">
            <Link href="/blog" className="back">
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
                <path d="M19 12H5M11 18l-6-6 6-6" />
              </svg>
              All posts
            </Link>
            <div className="meta">
              <span className="eyebrow">{post.tag}</span>
              <span className="dot" />
              <span>{post.readingMinutes} min read</span>
            </div>
            <h1 className="hero-load">{words(post.title)}</h1>
            <p className="lead fade hero-load">{post.description}</p>
            <div className="byline fade hero-load">
              <span className="av" aria-hidden="true">
                M
              </span>
              <div>
                <b>{post.author}</b>
                <time className="meta" dateTime={post.date}>
                  {formatDate(post.date)}
                </time>
              </div>
            </div>
          </header>

          <figure className="post-figure">
            <Image
              src={post.image.src}
              alt={post.image.alt}
              width={post.image.width}
              height={post.image.height}
              priority
              sizes="(min-width: 728px) 680px, calc(100vw - 48px)"
            />
          </figure>

          <details className="toc-mobile">
            <summary>
              On this page
              <Plus />
            </summary>
            <Toc items={toc} />
          </details>

          <div className="prose">
            <Content />

            <h2 id="faq">Frequently asked questions</h2>
            <div className="faq">
              {post.faq.map((f) => (
                <details key={f.q}>
                  <summary>
                    {f.q}
                    <Plus />
                  </summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </div>

            <h2 id="sources">Sources</h2>
            <ol className="sources-list">
              {post.sources.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                </li>
              ))}
            </ol>

            <div className="post-end">
              <span className="eyebrow">See it on a roof</span>
              <p
                style={{
                  color: "var(--ink)",
                  fontSize: 20,
                  fontWeight: 600,
                  letterSpacing: "-0.02em",
                }}
              >
                Watch a whole month on one roof in Dwarka, in your browser.
              </p>
              <div className="btn-row" style={{ marginTop: 6 }}>
                <Link className="btn btn-p" href="/demo">
                  Try the live demo
                </Link>
                <a className="btn btn-g" href={REPO}>
                  Read the code
                </a>
              </div>
            </div>
          </div>

          <aside className="toc-rail">
            <p className="toc-label">On this page</p>
            <Toc items={toc} />
          </aside>
        </div>
      </div>
    </article>
  );
}
