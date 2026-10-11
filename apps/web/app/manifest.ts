import { brandManifest } from "@suryasaathi/ui";
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return brandManifest({
    name: "SuryaSaathi",
    shortName: "SuryaSaathi",
    description: "An AI agent that keeps India's rooftop solar working.",
  });
}
