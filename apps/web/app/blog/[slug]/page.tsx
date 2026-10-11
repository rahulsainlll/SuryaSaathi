import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { REPO } from "../../_landing/content";
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

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  const { Content } = post;

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
    <article className="px-4 py-12 sm:px-6 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="mx-auto max-w-3xl">
        <Link href="/blog" className="text-sm text-muted hover:text-foreground">
          ← All posts
        </Link>
        <p className="mt-6 text-sm font-semibold text-accent">{post.tag}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-balance sm:text-5xl">
          {post.title}
        </h1>
        <p className="mt-4 text-lg text-muted">{post.description}</p>
        <p className="mt-4 text-sm text-muted">
          {post.author} · <time dateTime={post.date}>{formatDate(post.date)}</time> ·{" "}
          {post.readingMinutes} min read
        </p>
      </header>

      <Image
        src={post.image.src}
        alt={post.image.alt}
        width={post.image.width}
        height={post.image.height}
        priority
        sizes="(min-width: 1024px) 960px, 100vw"
        className="mx-auto mt-10 aspect-video w-full max-w-5xl rounded-3xl border border-separator object-cover"
      />

      <div className="mx-auto mt-12 grid max-w-5xl gap-12 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="ss-prose min-w-0">
          <Content />

          <h2 id="faq">Frequently asked questions</h2>
          <div className="not-prose space-y-3">
            {post.faq.map((f) => (
              <details key={f.q} className="rounded-2xl border border-separator bg-surface p-5">
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-3 text-muted">{f.a}</p>
              </details>
            ))}
          </div>

          <h2 id="sources">Sources</h2>
          <ol>
            {post.sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              </li>
            ))}
          </ol>

          <div className="not-prose mt-12 rounded-3xl border border-separator bg-surface p-6">
            <p className="text-lg font-semibold">See it on a roof</p>
            <p className="mt-1 text-muted">
              The demo replays a month on a 3 kW roof in Dwarka, in your browser.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/demo" className={buttonVariants({ variant: "primary" })}>
                Try the live demo
              </Link>
              <a href={REPO} className={buttonVariants({ variant: "secondary" })}>
                Read the code
              </a>
            </div>
          </div>
        </div>

        <nav aria-label="On this page" className="order-first lg:order-none">
          <div className="lg:sticky lg:top-24">
            <p className="text-sm font-semibold">On this page</p>
            <ol className="mt-3 space-y-2 border-l border-separator text-sm">
              {[...post.toc, { id: "faq", title: "FAQ" }, { id: "sources", title: "Sources" }].map(
                (t) => (
                  <li key={t.id}>
                    <a
                      href={`#${t.id}`}
                      className="-ml-px block border-l border-transparent pl-3 text-muted hover:border-accent hover:text-foreground"
                    >
                      {t.title}
                    </a>
                  </li>
                ),
              )}
            </ol>
          </div>
        </nav>
      </div>
    </article>
  );
}
