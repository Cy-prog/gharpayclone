import type { OperationalLead, OperationalCommitment, OperationalNextAction } from "./types";

export function computeNextBestAction(
  lead: OperationalLead,
  commitment?: OperationalCommitment | null,
): Omit<OperationalNextAction, "id" | "leadId" | "createdAt" | "updatedAt" | "status"> {
  const now = Date.now();
  const owner = lead.currentHandlerName || lead.currentOwner || "Samit Jain";

  // 1. Booked state
  if (lead.stage === "BOOKED" || lead.status === "booked") {
    const moveIn = lead.moveInDate ? new Date(lead.moveInDate) : new Date(now + 86400000 * 3);
    const kycDue = new Date(moveIn.getTime() - 86400000).toISOString();
    return {
      kind: "Generate Booking Receipt & Move-in KYC",
      owner: "Samit Jain",
      dueAt: kycDue,
      reason: "Payment verified and booking confirmed; execute KYC and key handover protocol.",
      urgency: "low",
    };
  }

  // 2. Closing desk active commitment
  if (commitment && commitment.status === "open") {
    const isOverdue = new Date(commitment.dueAt).getTime() < now;
    return {
      kind: "Collect Token Deposit & Settle Close",
      owner: commitment.promisedBy || owner,
      dueAt: commitment.dueAt,
      reason: isOverdue
        ? `Closing promise is OVERDUE! Customer promised close by ${new Date(commitment.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Call immediately or log reason.`
        : `Closing promise active for ${commitment.propertyName || "room"}; collect token before deadline.`,
      urgency: isOverdue ? "critical" : "high",
    };
  }

  // 3. Tour completed or in closing stage without a commitment
  if (lead.stage === "CLOSING" || lead.stage === "TOUR_COMPLETED") {
    return {
      kind: "Create Closing Commitment & Hold Room",
      owner: owner,
      dueAt: new Date(now + 2 * 3600000).toISOString(),
      reason: "Customer completed tour with high intent; set definite close window before room hold expires.",
      urgency: "critical",
    };
  }

  // 4. Tour scheduled
  if (lead.stage === "TOUR_SCHEDULED") {
    return {
      kind: "Execute Site Tour & Capture Decision",
      owner: "TCM (Tour Conversion)",
      dueAt: new Date(now + 4 * 3600000).toISOString(),
      reason: `Tour scheduled for ${lead.selectedPropertyName || "property"}; confirm arrival and capture on-site feedback.`,
      urgency: "high",
    };
  }

  // 5. Property matched / ready for tour
  if (lead.stage === "MATCH" && lead.selectedPropertyId) {
    return {
      kind: "Confirm & Schedule Physical Tour",
      owner: owner,
      dueAt: new Date(now + 3 * 3600000).toISOString(),
      reason: `Customer interested in ${lead.selectedPropertyName || "property"}; lock in tour slot with TCM.`,
      urgency: "high",
    };
  }

  // 6. Connected & qualified in M-POWER call
  if (lead.lastCallOutcome === "connected" || lead.stage === "BUDGET" || lead.stage === "MATCH") {
    return {
      kind: "Move to Booking Flow & Match Properties",
      owner: owner,
      dueAt: new Date(now + 1 * 3600000).toISOString(),
      reason: `Requirements captured (Budget: ₹${lead.budget.toLocaleString()}, Area: ${lead.locationText}); match inventory in Split Flow.`,
      urgency: "high",
    };
  }

  // 7. Unanswered calls
  if (lead.lastCallOutcome === "no-answer" || lead.lastCallOutcome === "busy") {
    const streak = lead.callStreak || 1;
    if (streak >= 3) {
      return {
        kind: "Escalate to Team Lead for WhatsApp Cadence",
        owner: "Team Lead",
        dueAt: new Date(now + 6 * 3600000).toISOString(),
        reason: `3 consecutive unanswered calls; switch to automated WhatsApp cadence or reassign.`,
        urgency: "medium",
      };
    }
    return {
      kind: "Send WhatsApp Follow-up & Retry Call",
      owner: owner,
      dueAt: new Date(now + 2 * 3600000).toISOString(),
      reason: `Customer did not answer (attempt ${streak}); send follow-up message and retry in 2 hours.`,
      urgency: "medium",
    };
  }

  // 8. Default: Fresh / uncontacted lead
  return {
    kind: "Call Customer (M-POWER Call 1)",
    owner: owner,
    dueAt: new Date(now + 15 * 60000).toISOString(),
    reason: "New inbound lead inquiry received; initial contact SLA is 15 minutes.",
    urgency: "high",
  };
}
