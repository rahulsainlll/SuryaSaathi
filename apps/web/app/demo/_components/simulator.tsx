"use client";

import { Button, Card, Switch, ToggleButton, ToggleButtonGroup, Label } from "@heroui/react";
import { formatDay, isFinished, lossInr, type DeviceSource } from "@suryasaathi/engine";
import { Logo } from "@suryasaathi/ui";
import Link from "next/link";
import { CasePanel } from "./case-panel";
import { DecisionLog } from "./decision-log";
import { DevicePanel } from "./device-panel";
import { OutputChart } from "./output-chart";
import { Pipeline } from "./pipeline";
import { SOURCES } from "./sources";
import { useReducedMotion } from "./use-reduced-motion";
import { SPEEDS, useSimulation, type Speed } from "./use-simulation";

export function Simulator() {
  const s = useSimulation();
  const reducedMotion = useReducedMotion();
  const { sim } = s;
  const today = sim.days.at(-1);
  const finished = isFinished(sim);
  const dayMs = SPEEDS[s.speed];
  const latestDecision = sim.log.at(-1)?.text ?? "";

  return (
    <main className="mx-auto max-w-6xl px-4 pt-6 pb-12 sm:px-5">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/" className="mb-1.5 inline-block rounded-lg">
            <Logo height={26} />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Device and agent simulator
          </h1>
          <p className="mt-1 max-w-[62ch] text-muted">
            One Delhi rooftop, 30 days, simulated readings. Watch each reading travel from the roof
            to the agents, and see what the agents do about it. The family does nothing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleButtonGroup
            aria-label="Data source"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[sim.source]}
            onSelectionChange={(keys) => {
              const [key] = keys;
              if (key) s.setSource(key as DeviceSource);
            }}
          >
            {(Object.keys(SOURCES) as DeviceSource[]).map((key, i) => (
              <ToggleButton key={key} id={key} className="max-sm:px-2.5">
                {i > 0 && <ToggleButtonGroup.Separator />}
                {SOURCES[key].label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <span
            aria-live="polite"
            className="flex h-10 items-center rounded-xl bg-surface px-3.5 font-semibold tabular-nums shadow-sm"
          >
            {sim.day < 0
              ? "Day 0"
              : `Day ${sim.day + 1} · ${formatDay(sim.config.startDate, sim.day)}`}
          </span>
          <Button variant="primary" onPress={s.togglePlay} className="min-w-20">
            {s.playing ? "Pause" : finished ? "Replay" : "Play"}
          </Button>
          <Button variant="secondary" onPress={s.nextDay} isDisabled={finished}>
            Next day
          </Button>
          <Button variant="secondary" onPress={s.reset}>
            Reset
          </Button>
        </div>
      </header>

      <Card className="mb-4">
        <Card.Header className="flex flex-row flex-wrap items-center justify-between gap-2">
          <Card.Title>How one reading travels</Card.Title>
          <ToggleButtonGroup
            aria-label="Speed"
            size="sm"
            selectionMode="single"
            disallowEmptySelection
            selectedKeys={[s.speed]}
            onSelectionChange={(keys) => {
              const [key] = keys;
              if (key) s.setSpeed(key as Speed);
            }}
          >
            <ToggleButton id="normal">Normal</ToggleButton>
            <ToggleButton id="fast">
              <ToggleButtonGroup.Separator />
              Fast
            </ToggleButton>
          </ToggleButtonGroup>
        </Card.Header>
        <Card.Content>
          <Pipeline
            sim={sim}
            lastStepAt={s.lastStepAt}
            dayMs={dayMs}
            reducedMotion={reducedMotion}
          />
        </Card.Content>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <Card className="min-w-0">
          <Card.Header>
            <Card.Title>Expected vs actual, kWh per day</Card.Title>
          </Card.Header>
          <Card.Content className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat label="Made today" value={today ? `${today.actualKwh.toFixed(1)} kWh` : "–"} />
              <Stat
                label="Should have made"
                value={today ? `${today.expectedKwh.toFixed(1)} kWh` : "–"}
              />
              <Stat
                label="Performance"
                value={today ? `${Math.round(today.performance * 100)}%` : "–"}
              />
              <Stat label="Lost so far" value={`₹${lossInr(sim).toLocaleString("en-IN")}`} />
            </dl>
            <OutputChart
              key={s.epoch}
              sim={sim}
              playing={s.playing}
              lastStepAt={s.lastStepAt}
              dayMs={dayMs}
              reducedMotion={reducedMotion}
            />
            <div
              role="group"
              aria-label="Make something happen"
              className="flex flex-wrap items-center gap-2"
            >
              <Button variant="outline" onPress={s.rainTonight} isDisabled={finished}>
                Rain tonight
              </Button>
              <Button variant="outline" onPress={s.smogTomorrow} isDisabled={finished}>
                Smog tomorrow
              </Button>
              <Button variant="danger-soft" onPress={s.breakInverter} isDisabled={finished}>
                Break the inverter
              </Button>
              <Switch
                className="ml-auto min-h-10 justify-center"
                isSelected={sim.vendorFixesOnTime}
                onChange={s.setVendorFixesOnTime}
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Label>Vendor fixes on time</Label>
                </Switch.Content>
              </Switch>
            </div>
          </Card.Content>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <Card.Content>
              <CasePanel sim={sim} />
            </Card.Content>
          </Card>
          <Card>
            <Card.Content>
              <DevicePanel sim={sim} />
            </Card.Content>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <Card.Content>
          <DecisionLog sim={sim} />
        </Card.Content>
      </Card>

      <p className="sr-only" aria-live="polite">
        {latestDecision}
      </p>
      <p className="mt-4 text-xs text-muted">
        All readings are simulated for a 3 kW system in Dwarka, Delhi, starting 29 Sep 2026. Rupee
        loss uses ₹7 per unit for illustration. In production, readings come from the DISCOM data
        logger, the inverter maker’s cloud, or a camera clip, with the family’s consent.
      </p>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-default px-3 py-2.5">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}
