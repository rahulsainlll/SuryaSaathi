import type { Metadata } from "next";
import { VendorBoard } from "./_components/vendor-board";

export const metadata: Metadata = {
  title: "Vendor · SuryaSaathi",
  description:
    "The maintenance cases a vendor owes a visit, filed by the agent with the readings behind each one.",
};

export default function Vendor() {
  return (
    <>
      <section className="hero page-tight">
        <div className="wrap stack g20">
          <span className="eyebrow">Vendor</span>
          <h1 className="h1 page hero-load">What you owe a visit.</h1>
          <p className="lead fade hero-load" style={{ maxWidth: 620 }}>
            Cases the agent filed against the roofs you installed, with the evidence attached.
            Simulated rooftops, real AWS backend.
          </p>
        </div>
      </section>
      <section style={{ padding: "8px 0 104px" }}>
        <div className="wrap">
          <VendorBoard />
        </div>
      </section>
    </>
  );
}
