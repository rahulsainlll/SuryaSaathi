import Link from "next/link";
import { REPO, SOURCES } from "../_site/content";
import { CtaMini } from "../_site/cta-mini";
import { Film } from "../_site/film";
import { filmSource, FilmPoster } from "../_site/film-poster";
import { AwsFlow } from "../_site/aws-flow";
import { ScrollToFilm } from "../_site/scroll-to-film";
import { delay, RevealHeading, words } from "../_site/words";

const STATS = [
  {
    count: 50,
    suffix: " lakh+",
    text: "homes with rooftop solar under PM Surya Ghar",
    source: SOURCES.pmSuryaGhar,
  },
  {
    count: 14.8,
    dec: 1,
    suffix: " GW",
    text: "of rooftop capacity commissioned",
    source: SOURCES.pmSuryaGhar,
  },
  {
    count: 99,
    suffix: "%",
    text: "stop monitoring once the installer leaves",
    source: SOURCES.monitoring,
  },
  { fixed: "17–25%", text: "of a year's output lost to dust in North India", source: SOURCES.dust },
];

const STEPS = [
  {
    title: "Collect",
    text: "Yesterday's reading arrives on its own: a DISCOM data logger, the inverter's cloud or a camera clip.",
  },
  {
    title: "Compare",
    text: "Against what that exact roof should have made, from satellite sunlight and haze.",
  },
  {
    title: "Diagnose",
    text: "Smog, dust or a fault, told apart by signature. Smog never triggers a complaint.",
  },
  {
    title: "Act and verify",
    text: "Claim filed with evidence, deadline chased, DISCOM steps in if missed, fix checked from new readings.",
  },
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="wrap stack g28 center">
          <span className="pill fade hero-load">AI agent for rooftop solar · built on AWS</span>
          <h1 className="h1 hero-load">
            {words("50 lakh solar roofs.")} <br />
            <span className="hl">{words("Nobody's watching.", 4)}</span>
          </h1>
          <p className="lead fade hero-load" style={{ maxWidth: 640, ...delay(250) }}>
            SuryaSaathi checks every roof every day, tells smog, dust and faults apart, and makes
            the vendor fix what they owe. Families just get one WhatsApp message.
          </p>
          <div
            className="fade hero-load"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
              ...delay(400),
            }}
          >
            <Link className="btn btn-p" href="/demo">
              Try the live demo
            </Link>
            <ScrollToFilm>
              <svg
                aria-hidden="true"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="6 4 20 12 6 20" />
              </svg>
              Watch the film · 70 s
            </ScrollToFilm>
          </div>
        </div>
      </section>

      <section id="film" className="film-section">
        <Film poster={<FilmPoster />} src={filmSource()} />
      </section>

      <section style={{ padding: "0 0 104px" }}>
        <div className="wrap">
          <div className="stats fade">
            {STATS.map((s) => (
              <div className="stat" key={s.text}>
                {s.fixed || s.count === undefined ? (
                  <span className="n">{s.fixed}</span>
                ) : (
                  <span
                    className="n"
                    data-count={s.count}
                    data-dec={s.dec ?? 0}
                    data-suffix={s.suffix}
                  >
                    {s.count.toFixed(s.dec ?? 0)}
                    {s.suffix}
                  </span>
                )}
                <span className="muted small">{s.text}</span>
                <a href={s.source.href}>{s.source.name}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "0 0 104px" }}>
        <div className="wrap stack g40">
          <div className="stack g16" style={{ maxWidth: 720 }}>
            <span className="eyebrow">The hidden problem</span>
            <RevealHeading>Three causes. One bill that can&apos;t tell them apart.</RevealHeading>
            <p className="lead fade">
              The vendor&apos;s easy answer is always &quot;it&apos;s just the pollution.&quot; But
              each cause leaves its own signature in the gap between what the roof should make and
              what it does.
            </p>
          </div>
          <div className="grid c3">
            <article className="card stack g12 draw fade">
              <div className="cause-head">
                <h3>Smog</h3>
                <span className="small muted">Nobody&apos;s problem</span>
              </div>
              <div className="sigbox">
                <svg
                  className="sig"
                  role="img"
                  aria-label="Expected and actual dip together"
                  viewBox="0 0 300 110"
                >
                  <polyline
                    points="16,30 80,32 120,72 170,78 210,36 284,30"
                    fill="none"
                    stroke="var(--blue)"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                  />
                  <polyline
                    points="16,40 80,42 120,82 170,88 210,46 284,40"
                    fill="none"
                    stroke="#F5A524"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="muted" style={{ fontSize: 15.5 }}>
                Expected and actual fall together, and recover together.
              </p>
              <span className="chip self-start">No action needed</span>
            </article>
            <article className="card hot stack g12 draw fade" style={delay(120)}>
              <div className="cause-head">
                <h3>Dust</h3>
                <span className="small muted">The vendor&apos;s problem</span>
              </div>
              <div className="sigbox">
                <svg
                  className="sig"
                  role="img"
                  aria-label="Actual drifts below expected each dry day, recovers after rain"
                  viewBox="0 0 300 110"
                >
                  <rect
                    x="176"
                    y="8"
                    width="20"
                    height="94"
                    rx="5"
                    fill="var(--blue)"
                    opacity=".12"
                  />
                  <polyline
                    points="16,28 284,28"
                    fill="none"
                    stroke="var(--blue)"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                  />
                  <polyline
                    points="16,34 180,82 188,36 284,62"
                    fill="none"
                    stroke="#F5A524"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="muted" style={{ fontSize: 15.5 }}>
                The gap widens every dry day; rain resets it.
              </p>
              <span className="chip a self-start">Free cleaning, owed for 5 years</span>
            </article>
            <article className="card stack g12 draw fade" style={delay(240)}>
              <div className="cause-head">
                <h3>Fault</h3>
                <span className="small muted">The vendor&apos;s problem</span>
              </div>
              <div className="sigbox">
                <svg
                  className="sig"
                  role="img"
                  aria-label="Actual collapses overnight while expected holds"
                  viewBox="0 0 300 110"
                >
                  <polyline
                    points="16,28 284,28"
                    fill="none"
                    stroke="var(--blue)"
                    strokeWidth="3"
                    strokeDasharray="8 6"
                    strokeLinecap="round"
                  />
                  <polyline
                    points="16,34 170,35 186,88 284,90"
                    fill="none"
                    stroke="#F5A524"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="muted" style={{ fontSize: 15.5 }}>
                Output collapses overnight while sunlight doesn&apos;t.
              </p>
              <span className="chip a self-start">Free repair, owed for 5 years</span>
            </article>
          </div>
        </div>
      </section>

      <section className="s alt">
        <div className="wrap stack g40">
          <div className="section-head">
            <div className="stack g16" style={{ maxWidth: 640 }}>
              <span className="eyebrow">How it works</span>
              <RevealHeading>From a reading on a roof to a fixed panel</RevealHeading>
            </div>
            <Link href="/how-it-works" className="btn btn-g">
              See the full walkthrough →
            </Link>
          </div>
          <ol className="grid c4" style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {STEPS.map((s, i) => (
              <li className="card stack g12 fade" key={s.title} style={delay(i * 100)}>
                <span className="num">{i + 1}</span>
                <h3>{s.title}</h3>
                <p className="muted" style={{ fontSize: 15 }}>
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
          <div className="msg fade" style={{ alignSelf: "center" }}>
            <span className="av" />
            <div className="stack">
              <span className="small muted">The only message the family gets</span>
              <span lang="hi" style={{ fontWeight: 500 }}>
                सफाई हो गई! Output वापस 96% पर है।
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap stack g40">
          <div className="aws-head">
            <div className="stack g16">
              <span className="eyebrow">Built on AWS</span>
              <RevealHeading>Serverless, end to end</RevealHeading>
              <p className="lead fade">
                Follow one reading: in through IoT Core, checked by Lambda, explained by an agent on
                Amazon Bedrock, chased by Step Functions, and sent home. All defined in AWS CDK.
              </p>
            </div>
            <Link href="/technology" className="btn btn-g fade">
              Explore the technology →
            </Link>
          </div>
          <AwsFlow />
        </div>
      </section>

      <section style={{ padding: "0 0 40px" }}>
        <div className="wrap">
          <div className="cta fade">
            <div className="cta-l">
              <span className="eyebrow">Live demo · no login</span>
              <RevealHeading>See a whole month on one roof, in a minute.</RevealHeading>
              <p className="lead">
                Dust builds up, the agent catches it, the vendor misses the deadline, the DISCOM
                steps in, and the family gets one message. All in your browser.
              </p>
              <div className="btn-row">
                <Link className="btn btn-p" href="/demo">
                  Try the live demo
                </Link>
                <a className="btn btn-g" href={REPO}>
                  View on GitHub
                </a>
              </div>
            </div>
            <CtaMini />
          </div>
        </div>
      </section>
    </>
  );
}
