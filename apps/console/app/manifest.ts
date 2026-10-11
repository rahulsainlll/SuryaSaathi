import { brandManifest } from "@suryasaathi/ui";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return brandManifest({
    name: "SuryaSaathi Console",
    shortName: "SS Console",
    description:
      "DISCOM admin console for SuryaSaathi: vendors, cases and systems across the fleet.",
  });
}
