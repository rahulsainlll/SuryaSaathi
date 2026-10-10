"use client";

import {
  breakInverter,
  createSimulation,
  isFinished,
  scheduleRain,
  scheduleSmog,
  setSource,
  setVendorFixesOnTime,
  step,
  type DeviceSource,
  type SimState,
} from "@suryasaathi/engine";
import { useCallback, useEffect, useState } from "react";

/** Milliseconds between simulated days while playing. */
export const SPEEDS = { normal: 1800, fast: 700 } as const;
export type Speed = keyof typeof SPEEDS;

export interface Simulation {
  sim: SimState;
  playing: boolean;
  speed: Speed;
  /** Wall-clock time of the latest reading, ms, or null before the first. */
  lastStepAt: number | null;
  /** Increments on reset so views can drop their own state. */
  epoch: number;
  togglePlay(): void;
  nextDay(): void;
  reset(): void;
  setSpeed(speed: Speed): void;
  setSource(source: DeviceSource): void;
  setVendorFixesOnTime(value: boolean): void;
  rainTonight(): void;
  smogTomorrow(): void;
  breakInverter(): void;
}

/** Drives the engine from the demo's controls. All rules live in @suryasaathi/engine. */
export function useSimulation(): Simulation {
  const [sim, setSim] = useState(() => createSimulation());
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [lastStepAt, setLastStepAt] = useState<number | null>(null);
  const [epoch, setEpoch] = useState(0);

  const advance = useCallback(() => {
    setSim((s) => step(s));
    setLastStepAt(Date.now());
  }, []);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(advance, SPEEDS[speed]);
    return () => clearInterval(id);
  }, [playing, speed, advance]);

  const finished = isFinished(sim);
  if (playing && finished) setPlaying(false);

  /** A fresh run that keeps the viewer's data source and vendor setting. */
  const restart = useCallback(() => {
    setSim((s) =>
      setVendorFixesOnTime(setSource(createSimulation(), s.source), s.vendorFixesOnTime),
    );
    setLastStepAt(null);
    setEpoch((e) => e + 1);
  }, []);

  return {
    sim,
    playing,
    speed,
    lastStepAt,
    epoch,
    togglePlay() {
      if (playing) return setPlaying(false);
      if (finished) restart();
      advance();
      setPlaying(true);
    },
    nextDay() {
      setPlaying(false);
      advance();
    },
    reset() {
      setPlaying(false);
      restart();
    },
    setSpeed,
    setSource: (source) => setSim((s) => setSource(s, source)),
    setVendorFixesOnTime: (value) => setSim((s) => setVendorFixesOnTime(s, value)),
    rainTonight: () => setSim(scheduleRain),
    smogTomorrow: () => setSim(scheduleSmog),
    breakInverter: () => setSim(breakInverter),
  };
}
