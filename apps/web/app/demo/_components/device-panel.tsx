import { deviceMessage, type SimState } from "@suryasaathi/engine";
import { SOURCES } from "./sources";

/** The raw message the chosen device sent for the latest day. */
export function DevicePanel({ sim }: { sim: SimState }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <h2 className="text-base font-semibold">Latest message from the device</h2>
      <p className="font-mono text-xs break-all text-muted">{SOURCES[sim.source].topic}</p>
      <pre className="overflow-x-auto rounded-xl bg-default p-3 font-mono text-xs leading-relaxed">
        {sim.day < 0
          ? "Press Play or Next day to send the first reading."
          : JSON.stringify(deviceMessage(sim, sim.day, sim.source), null, 2)}
      </pre>
    </div>
  );
}
