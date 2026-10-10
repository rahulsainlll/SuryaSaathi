import { Button } from "@heroui/react";
import { BrandMark, DiagnosisChip, brand } from "@suryasaathi/ui";

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-24">
      <BrandMark className="text-xl" />
      <h1 className="text-4xl font-bold tracking-tight">{brand.tagline}</h1>
      <p className="text-muted">
        It watches every roof, works out why output dropped, files free-maintenance claims with the
        vendor, and escalates to the DISCOM when the vendor doesn&apos;t show up.
      </p>
      <div className="flex flex-wrap gap-2">
        <DiagnosisChip diagnosis="healthy" />
        <DiagnosisChip diagnosis="smog" />
        <DiagnosisChip diagnosis="dust" />
        <DiagnosisChip diagnosis="fault" />
      </div>
      <div>
        <Button variant="primary" isDisabled>
          Demo coming soon
        </Button>
      </div>
    </main>
  );
}
