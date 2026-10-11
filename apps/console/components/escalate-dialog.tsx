"use client";

import { Button, Modal } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { CaseSummary, VendorRow } from "@suryasaathi/console-data";
import { useState } from "react";
import { day } from "../lib/format";

/** The escalation notice for a vendor with overdue cases, ready to copy or email. */
export function escalationNotice(
  vendor: VendorRow,
  overdue: CaseSummary[],
): { subject: string; body: string } {
  const lines = overdue.map(
    (c) =>
      `- ${c.caseId}: ${c.cause === "fault" ? "inverter/wiring repair" : "panel cleaning"} for system ${c.systemId} (${c.zone}), ` +
      `deadline ${day(c.deadlineDate)}${c.daysOverdue ? `, ${c.daysOverdue} day(s) overdue` : ""}`,
  );
  return {
    subject: `DISCOM escalation: ${overdue.length} overdue free-maintenance case(s) for ${vendor.name}`,
    body: [
      `To ${vendor.name} (${vendor.vendorId}),`,
      "",
      "The following free-maintenance cases under the 5-year O&M obligation are past their deadline.",
      "SuryaSaathi detected each problem from the system's readings and notified you when the case was filed.",
      "",
      ...lines,
      "",
      "Please complete the work within 48 hours and confirm. SuryaSaathi verifies each fix from the next readings.",
      "",
      "DISCOM rooftop solar monitoring cell",
    ].join("\n"),
  };
}

export function EscalateButton({ vendor, overdue }: { vendor: VendorRow; overdue: CaseSummary[] }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const notice = escalationNotice(vendor, overdue);
  const mailto = `mailto:?subject=${encodeURIComponent(notice.subject)}&body=${encodeURIComponent(notice.body)}`;

  return (
    <>
      <Button size="sm" variant="danger-soft" onPress={() => setOpen(true)}>
        Escalate
      </Button>
      <Modal.Backdrop isOpen={open} onOpenChange={setOpen}>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Escalate {vendor.name}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <p className="text-sm text-muted">
                {overdue.length} case{overdue.length === 1 ? " is" : "s are"} past the vendor
                deadline. Each one is already escalated to the DISCOM by the case workflow; this
                notice is for following up with the vendor directly.
              </p>
              <pre className="max-h-72 overflow-auto rounded-xl bg-default p-3 text-xs whitespace-pre-wrap">{`Subject: ${notice.subject}\n\n${notice.body}`}</pre>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onPress={async () => {
                  await navigator.clipboard?.writeText(`${notice.subject}\n\n${notice.body}`);
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy notice"}
              </Button>
              <a href={mailto} className={buttonVariants({ variant: "primary" })}>
                Open in email
              </a>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </>
  );
}
