import { familyMessage } from "@suryasaathi/engine";
import Link from "next/link";
import { REPO, SOURCES } from "../../_site/content";
import type { Post } from "./types";

const FAMILY_MESSAGE = familyMessage({ id: "SS-142", cause: "dust", resolvedBy: "discom" }, 96);

function Content() {
  return (
    <>
      <h2 id="tldr">The short version</h2>
      <ul>
        <li>
          When a rooftop solar system makes less, there are three usual suspects: smog, dust on the
          panels, or an inverter or wiring fault. On the electricity bill they look identical.
        </li>
        <li>
          Only smog is nobody’s fault. Dust and faults are the vendor’s to fix, free, for five years
          under PM Surya Ghar.
        </li>
        <li>
          SuryaSaathi compares what each roof made with what it <em>should</em> have made that day,
          reads the shape of the gap, and files the free cleaning or repair with evidence.
        </li>
        <li>
          It runs on AWS: IoT Core brings readings in, Lambda and Bedrock-powered agents decide,
          Step Functions chases the deadline, and DynamoDB remembers everything.
        </li>
      </ul>

      <h2 id="the-excuse">The winter excuse</h2>
      <p>
        India has put solar on more than 50 lakh homes under PM Surya Ghar, about 14.8 GW of
        capacity. Installation gets all the attention. What happens in year two, when output starts
        slipping, gets almost none: industry experts estimate that 99% of users stop monitoring once
        the installer leaves.
      </p>
      <p>
        So when a family in Delhi does notice a smaller saving, and calls the vendor, the answer
        every winter is the same: <strong>“it’s the pollution.”</strong> Sometimes it is. Smog
        really does cut the sunlight reaching a panel. But dust settling on the glass costs 0.3–0.6%
        of output per day in Delhi, and North Indian systems can lose 17–25% of a year’s output to
        it even with monthly cleaning. A failing inverter can halve production overnight. Those two
        are the vendor’s problem, and the free maintenance the family is owed goes unclaimed because
        nobody can prove which one it was.
      </p>

      <h2 id="why-the-bill-cant-tell">Why the bill can’t tell the difference</h2>
      <p>
        A monthly bill, or even a daily kWh figure, is a single number. A smoggy week and a dusty
        week both show up as “less.” To tell them apart you need a second number: how much that
        exact roof <em>should</em> have produced on that exact day, given the sunlight and the haze.
      </p>
      <p>
        That’s the whole idea behind SuryaSaathi. Every reading arrives with its own baseline, so
        the agent isn’t asking “did output drop?” but “did output drop{" "}
        <em>more than the sky explains</em>?”
      </p>

      <h2 id="performance">One number: performance</h2>
      <p>
        For every roof and every day, SuryaSaathi works out an expected output from satellite
        sunlight data (NASA POWER) and air-quality and weather data (Open-Meteo), modelled with
        pvlib for that roof’s location and size. Crucially, the expected value already includes the
        day’s haze. Then:
      </p>
      <blockquote>
        <p>
          <strong>Performance = actual ÷ expected.</strong>
        </p>
      </blockquote>
      <p>
        A healthy roof sits in the high 90s on a clear day and on a smoggy one, because smog lowers
        both numbers together. That is what makes the three causes separable.
      </p>

      <h2 id="three-signatures">Three signatures</h2>
      <p>
        Each cause leaves a different shape in the gap between expected and actual. The rules are
        deliberately simple, so a vendor or a DISCOM engineer can check every decision:
      </p>
      <div className="table-wrap" tabIndex={0} role="region" aria-label="The three signatures">
        <table>
          <thead>
            <tr>
              <th>Cause</th>
              <th>What the data shows</th>
              <th>What SuryaSaathi does</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Smog</td>
              <td>Expected is low, but performance stays above 90%</td>
              <td>Nothing. Output recovers when the air clears</td>
            </tr>
            <tr>
              <td>Dust</td>
              <td>3-day average below 91% and falling over 5 dry days; rain resets it</td>
              <td>Files a free cleaning with the vendor</td>
            </tr>
            <tr>
              <td>Fault</td>
              <td>Performance drops below 60% overnight, or the inverter reports a fault code</td>
              <td>Files a free repair with the vendor</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        Rain matters: overnight rain washes the panels, so a dust case closes on its own if the next
        reading is back to normal. No visit needed, and no false claim against the vendor. A fix
        only counts as verified when performance is back above 93% in a new reading.
      </p>

      <h2 id="from-diagnosis-to-fix">From a diagnosis to a fixed roof</h2>
      <p>Diagnosis is only useful if something happens next. For dust or a fault, SuryaSaathi:</p>
      <ol>
        <li>
          <strong>Files a case</strong> with the vendor, with the readings and chart as evidence,
          citing the five-year operation and maintenance duty.
        </li>
        <li>
          <strong>Starts a 3-day clock.</strong> If the next readings show the problem fixed, the
          case is verified.
        </li>
        <li>
          <strong>Escalates to the DISCOM</strong> if the deadline passes, with the same evidence.
        </li>
        <li>
          <strong>Tells the family once</strong>, in their language, when it’s fixed:
        </li>
      </ol>
      <blockquote lang="hi">
        <p>{FAMILY_MESSAGE}</p>
      </blockquote>
      <p>
        The family never installs an app. That one message is the whole user interface for them. You
        can watch a full month of this, including an escalation, in the{" "}
        <Link href="/demo">live demo</Link>.
      </p>

      <h2 id="how-aws-helps">How AWS makes this work</h2>
      <p>
        SuryaSaathi has to watch lakhs of roofs, wait days for vendors, and stay cheap enough for a
        DISCOM to run. That shaped every choice in the stack, which is defined end to end in AWS
        CDK.
      </p>
      <h3>Getting readings in: AWS IoT Core and Lambda</h3>
      <p>
        Data loggers and camera clips publish one reading a day over MQTT to AWS IoT Core, each with
        its own X.509 certificate and a policy that only allows publishing its own readings. An IoT
        rule hands each message to a Lambda function that validates it against a shared JSON schema,
        checks the system has consent on record, and stores it. Inverter clouds will be pulled once
        a day on an Amazon EventBridge schedule.
      </p>
      <h3>Reasoning you can audit: Amazon Bedrock and Strands Agents</h3>
      <p>
        The diagnosis agent is built with Strands Agents and calls Claude on Amazon Bedrock. The
        split of responsibilities is deliberate:{" "}
        <strong>the rules decide, the model explains.</strong> The agent can only take the action
        the rules allow; Bedrock writes the plain-language reason a vendor or engineer reads. If the
        model is unavailable, the rules still decide and the reason falls back to a template, so
        cases never stall. To keep costs down, the model is only asked on days something happens:
        between one and four calls per system in a 30-day scenario.
      </p>
      <h3>Deadlines that don’t forget: AWS Step Functions</h3>
      <p>
        A vendor deadline is a wait measured in days, which is exactly what Step Functions is good
        at. Every case is one execution, named after the case: notify the vendor, wait, recheck,
        then verify or escalate and wait again. Each step’s input and output is visible in the
        console, which makes the accountability trail easy to show.
      </p>
      <h3>Memory: Amazon DynamoDB</h3>
      <p>
        Systems, readings, cases and the expected-output cache live in DynamoDB. New readings stream
        straight to the agent, and a nightly job rolls readings and cases into summaries by vendor,
        zone and day, so the DISCOM console never scans raw readings, even at 20 lakh systems.
      </p>
      <h3>Consent and visibility: Cedar and Amazon CloudWatch</h3>
      <p>
        Access rules are written as Cedar policies: vendors see only their own customers, and
        readings are used only with the household’s consent. Every agent decision is logged to
        CloudWatch as structured JSON, with the diagnosis, the action, the case and whether the
        reason came from the model or the rules, ready for Logs Insights.
      </p>
      <h3>Cost</h3>
      <p>
        Everything is serverless, so idle costs are close to zero and the system scales with the
        number of roofs rather than with servers. The main variable cost is Bedrock, and the agent
        only calls it when something changes.
      </p>

      <h2 id="whats-next">What’s next</h2>
      <p>
        This is the first post in a series. Next we’ll go deeper into how expected output is
        modelled from sunlight and haze, how the camera clip reads an inverter screen, how the case
        workflow handles vendors who don’t respond, and what the DISCOM console shows. WhatsApp
        delivery and Hindi voice notes are on the roadmap. The code is all{" "}
        <a href={REPO}>on GitHub</a>.
      </p>
    </>
  );
}

export const post: Post = {
  slug: "its-not-the-pollution",
  title: "It’s not the pollution: how SuryaSaathi tells smog, dust and faults apart",
  description:
    "Every winter, a drop in rooftop solar output gets the same excuse. Here is how one number, three signatures and a handful of AWS services turn it into a free cleaning.",
  date: "2026-10-11",
  author: "Team Mythos",
  readingMinutes: 8,
  tag: "How it works",
  image: {
    src: "/images/blog/its-not-the-pollution-cover.jpg",
    alt: "“It’s the pollution.” Usually, it isn’t. Three signature charts for smog, dust and fault, with dust highlighted.",
    width: 1280,
    height: 720,
  },
  toc: [
    { id: "tldr", title: "The short version" },
    { id: "the-excuse", title: "The winter excuse" },
    { id: "why-the-bill-cant-tell", title: "Why the bill can’t tell the difference" },
    { id: "performance", title: "One number: performance" },
    { id: "three-signatures", title: "Three signatures" },
    { id: "from-diagnosis-to-fix", title: "From a diagnosis to a fixed roof" },
    { id: "how-aws-helps", title: "How AWS makes this work" },
    { id: "whats-next", title: "What’s next" },
  ],
  faq: [
    {
      q: "Isn’t lower output in winter just the smog?",
      a: "Sometimes. Smog lowers the sunlight, so it lowers expected output too, and performance (actual ÷ expected) stays above 90%. When performance falls below that while the sky explains it, something else is wrong: dust or a fault.",
    },
    {
      q: "Who pays for cleaning and repairs?",
      a: "For PM Surya Ghar systems, the vendor owes free operation and maintenance for five years. SuryaSaathi files the claim with readings as evidence and escalates to the DISCOM if the vendor misses the deadline.",
    },
    {
      q: "Does the family need an app or new hardware?",
      a: "No app. SuryaSaathi reads data from a DISCOM data logger or the inverter maker’s cloud where one exists, or from a small camera clip that reads the inverter screen. A WhatsApp photo is the fallback.",
    },
    {
      q: "What does the AI actually decide?",
      a: "Nothing on its own. Simple, explainable rules decide the diagnosis and the action; the agent on Amazon Bedrock explains the decision in plain language. Every decision is logged with its reason.",
    },
    {
      q: "What happens when it rains?",
      a: "Rain washes dust off the panels. If an open dust case’s next reading is back to normal after overnight rain, the case closes without a visit.",
    },
    {
      q: "Is the data in the demo real?",
      a: "No. Every system, reading and case in the demo and on this site is simulated, built on real Delhi weather patterns.",
    },
  ],
  sources: [
    SOURCES.pmSuryaGhar,
    SOURCES.monitoring,
    SOURCES.dust,
    SOURCES.maintenance,
    SOURCES.recFramework,
    SOURCES.delhiPolicy,
    { name: "NASA POWER (sunlight data)", href: "https://power.larc.nasa.gov" },
    { name: "Open-Meteo (air quality and weather)", href: "https://open-meteo.com" },
    { name: "pvlib", href: "https://pvlib-python.readthedocs.io" },
  ],
  Content,
};
