"""Emails to vendors and the DISCOM through Amazon SES (v2).

Without a verified sender and a recipient configured, the email is logged instead of sent,
so the workflow runs end to end before SES is set up.
"""

from __future__ import annotations

from typing import Any

import boto3
from suryasaathi_core.config import Settings
from suryasaathi_core.logs import log_event


def send_email(settings: Settings, to: str | None, subject: str, body: str, case_id: str) -> bool:
    if not settings.sender_email or not to:
        log_event("email_skipped", case_id=case_id, to=to, subject=subject, body=body)
        return False
    boto3.client("sesv2").send_email(
        FromEmailAddress=settings.sender_email,
        Destination={"ToAddresses": [to]},
        Content={"Simple": {"Subject": {"Data": subject}, "Body": {"Text": {"Data": body}}}},
    )
    log_event("email_sent", case_id=case_id, to=to, subject=subject)
    return True


def readings_table(rows: list[dict[str, Any]]) -> str:
    lines = ["Date        Made (kWh)  Expected (kWh)  Performance"]
    for r in rows:
        lines.append(
            f"{r['date']}  {float(r['energyKwh']):>10.2f}  {float(r.get('expectedKwh', 0)):>14.2f}"
            f"  {float(r.get('performance', 0)) * 100:>10.0f}%"
        )
    return "\n".join(lines)


def vendor_email(
    case: dict[str, Any], system: dict[str, Any], rows: list[dict[str, Any]], vendor: str
) -> tuple[str, str]:
    work = "repair" if case["cause"] == "fault" else "cleaning"
    subject = f"SuryaSaathi case {case['caseId']}: free {work} due by {case['deadlineDate']}"
    body = f"""Dear {vendor},

SuryaSaathi monitors rooftop solar system {system["systemId"]} ({system["capacityKw"]} kW,
zone {system["location"]["zone"]}), which you installed and maintain under the 5-year
operation and maintenance obligation.

Diagnosis: {case["cause"]}.
{case.get("reason", "")}

Please carry out the free {work} by {case["deadlineDate"]}. SuryaSaathi verifies the fix from
the next readings. If output has not recovered by the deadline, the case is escalated to
the DISCOM ({system["discomId"]}) with this evidence.

Recent readings (expected output already accounts for that day's sunlight and haze):

{readings_table(rows)}

Case {case["caseId"]} · opened {case["openedAt"]}
"""
    return subject, body


def discom_email(
    case: dict[str, Any],
    system: dict[str, Any],
    rows: list[dict[str, Any]],
    vendor: str,
    reminder: int = 0,
) -> tuple[str, str]:
    work = "repair" if case["cause"] == "fault" else "cleaning"
    prefix = f"Reminder {reminder}: " if reminder else ""
    subject = f"{prefix}Escalation: case {case['caseId']} – vendor missed the free {work} deadline"
    body = f"""To the DISCOM monitoring cell ({system["discomId"]}),

{vendor} ({system["vendorId"]}) did not fix rooftop solar system {system["systemId"]}
({system["capacityKw"]} kW, zone {system["location"]["zone"]}) by the deadline of
{case["deadlineDate"]}. Output is still below what the roof should make.

Diagnosis: {case["cause"]}.
{case.get("reason", "")}

Please direct the vendor to complete the free {work}. SuryaSaathi will recheck the readings
by {case.get("discomDeadlineDate", "")} and close the case once output recovers.

{readings_table(rows)}

Case {case["caseId"]} · opened {case["openedAt"]} · escalated {case.get("escalatedAt", "")}
"""
    return subject, body
