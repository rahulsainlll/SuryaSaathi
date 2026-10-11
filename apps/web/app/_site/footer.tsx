import Link from "next/link";
import { REPO, TEAM, YOUTUBE_URL } from "./content";
import { Logo } from "./logo";
import { Sky } from "./sky";

export function SiteFooter() {
  return (
    <footer className="foot">
      <Sky />
      <div className="wrap">
        <div className="fcols">
          <div className="stack g12">
            <Logo mark={false} />
            <p className="muted small" style={{ maxWidth: 320 }}>
              An AI agent that keeps India&rsquo;s rooftop solar working. Built by Team Mythos for
              Environmental Hacks 2026.
            </p>
          </div>
          <div>
            <h2>Product</h2>
            <ul>
              <li>
                <Link href="/how-it-works">How it works</Link>
              </li>
              <li>
                <Link href="/technology">Technology</Link>
              </li>
              <li>
                <Link href="/impact">Impact</Link>
              </li>
              <li>
                <Link href="/demo">Live demo</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Resources</h2>
            <ul>
              <li>
                <a href={YOUTUBE_URL}>The film</a>
              </li>
              <li>
                <Link href="/blog">Blog</Link>
              </li>
              <li>
                <a href={REPO}>GitHub</a>
              </li>
              <li>
                <a href={`${REPO}/blob/main/LICENSE`}>MIT licence</a>
              </li>
            </ul>
          </div>
          <div>
            <h2>Team Mythos</h2>
            <ul>
              {TEAM.map((m) => (
                <li key={m.github}>
                  <a href={`https://github.com/${m.github}`}>{m.name}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="legal">
          <span>
            Environmental Hacks · Waste and Energy track · Bharat Builds Tour by WeMakeDevs × AWS,
            October 2026
          </span>
          <span>
            All systems shown are simulated. AWS service icons from the AWS Architecture Icons.
          </span>
        </div>
      </div>
    </footer>
  );
}
