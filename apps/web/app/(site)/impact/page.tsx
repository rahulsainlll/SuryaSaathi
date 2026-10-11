import type { Metadata } from "next";
import { SOURCES } from "../../_site/content";
import { delay, RevealHeading } from "../../_site/words";

export const metadata: Metadata = {
  title: "Impact · SuryaSaathi",
  description:
    "Delhi's Solar Energy Policy puts monitoring on the DISCOMs. What SuryaSaathi recovers per roof and across the country, with the estimates explained.",
};

const LIST = [
  { label: "PM Surya Ghar progress, pv magazine India", href: SOURCES.pmSuryaGhar.href },
  { label: "Users who stop monitoring, ETV Bharat", href: SOURCES.monitoring.href },
  { label: "Dust losses in Delhi, Renewable Watch", href: SOURCES.dust.href },
  { label: "Vendor maintenance duty, Delhi Solar Portal", href: SOURCES.maintenance.href },
  { label: "Delhi policy, Second Amendment (summary)", href: SOURCES.delhiPolicy.href },
];

export default function Impact() {
  return (
    <>
      <section className="hero page">
        <div className="wrap stack g20">
          <span className="eyebrow">Why now</span>
          <RevealHeading as="h1" className="h1 page hero-load">
            The duty exists. The tool doesn&apos;t.
          </RevealHeading>
          <p className="lead fade hero-load" style={{ maxWidth: 660 }}>
            Delhi&apos;s Solar Energy Policy, Second Amendment (17 September 2026), puts monitoring
            on the DISCOMs. SuryaSaathi is how they do it.
          </p>
        </div>
      </section>

      <section style={{ padding: "24px 0 104px" }}>
        <div className="wrap stack g28">
          <div className="grid c3">
            <div className="card stack g8 fade">
              <span className="eyebrow">New DISCOM duty</span>
              <h2 className="as-h3">Find under-performing roofs</h2>
              <p className="muted small">
                Monitoring generation and identifying under-performing systems is now the
                DISCOM&apos;s job.
              </p>
            </div>
            <div className="card stack g8 fade" style={delay(100)}>
              <span className="eyebrow">DSAIN</span>
              <h2 className="as-h3">An ID for every roof</h2>
              <p className="muted small">
                Each system gets a Digital Solar Asset Identification Number. SuryaSaathi keeps its
                generation record accurate.
              </p>
            </div>
            <div className="card stack g8 fade" style={delay(200)}>
              <span className="eyebrow">Still owed</span>
              <h2 className="as-h3">5 years of free maintenance</h2>
              <p className="muted small">
                Vendors must clean and repair at their own cost. The evidence is what&apos;s
                missing.
              </p>
            </div>
          </div>
          <div className="card stack g16 fade">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "baseline",
              }}
            >
              <b>Delhi rooftops installed vs targeted by March 2027</b>
              <span className="muted small">10,073 of 2.30 lakh</span>
            </div>
            <div className="prog" role="img" aria-label="10,073 of 2.30 lakh installed, about 4.4%">
              <i />
            </div>
            <p className="muted small">
              About 2.2 lakh more systems are about to need monitoring.{" "}
              <a href={SOURCES.delhiTarget.href}>Source: ANI</a>
            </p>
          </div>
        </div>
      </section>

      <section className="s alt">
        <div className="wrap stack g28">
          <div className="stack g16" style={{ maxWidth: 680 }}>
            <span className="eyebrow">Impact · estimates</span>
            <RevealHeading>Small per roof. Large across the country.</RevealHeading>
          </div>
          <div className="grid c3">
            <div className="card stack g8 fade">
              <span className="big">₹5–6k</span>
              <p className="muted">a year back for a 3 kW home</p>
              <span className="chip self-start">Estimate</span>
            </div>
            <div className="card stack g8 fade" style={delay(100)}>
              <span className="big">~2 TWh</span>
              <p className="muted">a year of clean energy recovered nationally</p>
              <span className="chip self-start">Estimate</span>
            </div>
            <div className="card stack g8 fade" style={delay(200)}>
              <span className="big">5 years</span>
              <p className="muted">of free maintenance, actually claimed</p>
              <span className="chip a self-start">Owed by vendors</span>
            </div>
          </div>
          <div className="card stack g12 fade">
            <b>How we estimate</b>
            <p className="muted small">
              A 3 kW roof in Delhi makes about 4,700 kWh a year. Recovering 15–18% lost to unchecked
              dust and faults is 700–850 kWh, or ₹5–6k at ₹7 per kWh.
            </p>
            <p className="muted small">
              14.8 GW of rooftop solar makes roughly 20 TWh a year; recovering a tenth of it is
              about 2 TWh.
            </p>
          </div>
        </div>
      </section>

      <section className="s">
        <div className="wrap stack g20">
          <span className="eyebrow">Sources</span>
          <ul
            className="stack g8 fade sources"
            style={{ margin: 0, paddingLeft: 20, color: "var(--muted)", listStyle: "disc" }}
          >
            {LIST.map((s) => (
              <li key={s.href}>
                <a href={s.href}>{s.label}</a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
