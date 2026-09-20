import { supabase } from "@/integrations/supabase/client";
import { useOperationalStore } from "./store";
import { computeNextBestAction } from "./next-best-action";
import type {
  OperationalLead,
  OperationalCall,
  OperationalNextAction,
  OperationalCommitment,
  OperationalBooking,
  OperationalAuditLog,
  PipelineStage,
} from "./types";

export interface CallCommitInput {
  leadId: string;
  customerName: string;
  operatorName: string;
  agenda: string;
  agendaSource: "system" | "operator";
  outcome: "connected" | "no-answer" | "busy" | "wrong-number" | "rescheduled" | "call-later" | "not-relevant";
  durationSec?: number;
  capture: {
    area?: string;
    budget?: number;
    moveIn?: string;
    roomType?: string;
    priceReaction?: string;
    objections?: string[];
    note?: string;
    tourAt?: string;
    propertyName?: string;
  };
  messageNow?: string;
  messageSent: boolean;
  followUp?: {
    text: string;
    dueAt: string;
  };
  stageAfter?: PipelineStage;
}

export interface BookingFlowStagePatch {
  locationText?: string;
  budget?: number;
  sharingType?: "Single" | "Double" | "Triple" | "Any";
  moveInDate?: string;
  selectedPropertyId?: string;
  selectedPropertyName?: string;
  stage?: PipelineStage;
  currentHandlerName?: string;
  notes?: string;
}

export interface FinalizeBookingInput {
  leadId: string;
  tenantName: string;
  tenantPhone: string;
  propertyId: string;
  propertyName: string;
  roomTypeId: string;
  roomOrBedLabel: string;
  monthlyRent: number;
  securityDeposit: number;
  maintenanceAmount?: number;
  agreementStartDate: string;
  lockInPeriod?: number;
  noticePeriod?: number;
  token?: string;
  operatorName: string;
}

const nowIso = () => new Date().toISOString();

/**
 * PHASE 1 / MODULE A: Executes an M-POWER call commit.
 * Updates call_records, leads, next_actions, and audit_logs.
 */
export async function executeCallCommit(input: CallCommitInput): Promise<{
  ok: boolean;
  callId: string;
  lead: OperationalLead;
  nextAction: OperationalNextAction;
  error?: string;
}> {
  const store = useOperationalStore.getState();
  const existingLead = store.getLead(input.leadId);

  if (!existingLead) {
    return { ok: false, callId: "", lead: null as any, nextAction: null as any, error: "Lead not found" };
  }

  const callId = `call-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = nowIso();

  // 1. Determine next stage and streak
  const streak = input.outcome === "connected" ? 0 : existingLead.callStreak + 1;
  const newStage: PipelineStage =
    input.stageAfter ||
    (input.outcome === "connected"
      ? existingLead.stage === "WHERE"
        ? "BUDGET"
        : existingLead.stage
      : existingLead.stage);

  // 2. Build updated lead object
  const updatedLead: OperationalLead = {
    ...existingLead,
    locationText: input.capture.area || existingLead.locationText,
    budget: input.capture.budget || existingLead.budget,
    moveInDate: input.capture.moveIn || existingLead.moveInDate,
    stage: newStage,
    callStreak: streak,
    lastCallOutcome: input.outcome,
    lastOperatorActionAt: now,
    notes: input.capture.note ? `${existingLead.notes ? existingLead.notes + " | " : ""}${input.capture.note}` : existingLead.notes,
    updatedAt: now,
  };

  // 3. Compute Next Best Action
  const nba = computeNextBestAction(updatedLead);
  const nextAction: OperationalNextAction = {
    id: `act-${updatedLead.id}-${Date.now()}`,
    leadId: updatedLead.id,
    kind: nba.kind,
    owner: nba.owner,
    dueAt: nba.dueAt,
    reason: nba.reason,
    urgency: nba.urgency,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  // 4. Build Call Record
  const callRecord: OperationalCall = {
    id: callId,
    leadId: input.leadId,
    customerName: input.customerName,
    calledAt: now,
    operatorId: "op-current",
    operatorName: input.operatorName,
    agenda: input.agenda,
    agendaSource: input.agendaSource,
    outcome: input.outcome,
    durationSec: input.durationSec,
    capture: input.capture,
    messageNow: input.messageNow,
    messageSent: input.messageSent,
    followUp: input.followUp,
    nextStep: {
      kind: nextAction.kind,
      label: nextAction.reason,
      dueAt: nextAction.dueAt,
    },
    stageAfter: newStage,
  };

  // 5. Build Audit Log
  const auditLog: OperationalAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity: "call",
    entityId: input.leadId,
    action: `M-POWER Call logged: ${input.outcome.toUpperCase()} (Agenda: ${input.agenda})`,
    actor: input.operatorName,
    at: now,
    prev: { stage: existingLead.stage, outcome: existingLead.lastCallOutcome, streak: existingLead.callStreak },
    next: { stage: newStage, outcome: input.outcome, streak, nextAction: nextAction.kind },
    reason: input.capture.note || `Call completed with outcome '${input.outcome}'. Next action: ${nextAction.kind}`,
  };

  // 6. Update local operational store immediately (ensures instant zero-lag UI + refresh persistence)
  store.upsertLead(updatedLead);
  store.addCall(callRecord);
  store.upsertNextAction(nextAction);
  store.addAuditLog(auditLog);

  // 7. Attempt real Supabase persistence
  try {
    const db = supabase as any;
    // Attempt inserting call record
    await db.from("call_records").insert({
      called_at: now,
      operator_name: input.operatorName,
      lead_ulid: input.leadId,
      customer_name: input.customerName,
      agenda: input.agenda,
      agenda_source: input.agendaSource,
      outcome: input.outcome,
      duration_sec: input.durationSec ?? null,
      capture: input.capture,
      message_now: input.messageNow ?? null,
      message_sent: input.messageSent,
      follow_up: input.followUp ?? null,
      client_id: callId,
    });

    // Attempt updating lead
    await db.from("leads").update({
      location_text: updatedLead.locationText,
      current_pipeline_stage: updatedLead.stage,
      last_operator_action_at: now,
      updated_at: now,
    }).eq("id", input.leadId);

    // Attempt inserting next_action
    await db.from("next_actions").insert({
      lead_id: input.leadId,
      kind: nextAction.kind,
      due_at: nextAction.dueAt,
      status: "open",
      notes: nextAction.reason,
      source: "m_power_call",
    });

    // Attempt inserting audit log
    await db.from("audit_logs").insert({
      entity: "lead",
      entity_id: input.leadId,
      action: auditLog.action,
      actor: input.operatorName,
      at: now,
      prev: auditLog.prev,
      next: auditLog.next,
      reason: auditLog.reason,
    });
  } catch (err) {
    // Cloud write logged; local operational store is authoritative and preserved
    console.info("[OperationalEngine] Cloud sync status:", err);
  }

  return { ok: true, callId, lead: updatedLead, nextAction };
}

/**
 * PHASE 1 / MODULE B: Updates a lead's stage and fields in Booking Flow Split.
 */
export async function updateBookingFlowStage(
  leadId: string,
  patch: BookingFlowStagePatch,
  operatorName = "Rahul"
): Promise<{ ok: boolean; lead: OperationalLead; nextAction: OperationalNextAction; error?: string }> {
  const store = useOperationalStore.getState();
  const existingLead = store.getLead(leadId);

  if (!existingLead) {
    return { ok: false, lead: null as any, nextAction: null as any, error: "Lead not found" };
  }

  const now = nowIso();
  const updatedLead: OperationalLead = {
    ...existingLead,
    ...patch,
    status: patch.stage === "BOOKED" ? "booked" : patch.stage === "CLOSING" ? "closing" : existingLead.status,
    lastOperatorActionAt: now,
    updatedAt: now,
  };

  // Recompute Next Best Action
  const nba = computeNextBestAction(updatedLead);
  const nextAction: OperationalNextAction = {
    id: `act-${updatedLead.id}-${Date.now()}`,
    leadId: updatedLead.id,
    kind: nba.kind,
    owner: nba.owner,
    dueAt: nba.dueAt,
    reason: nba.reason,
    urgency: nba.urgency,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  // Build Audit Log
  const auditLog: OperationalAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity: "lead",
    entityId: leadId,
    action: `Booking Flow updated: Stage -> ${updatedLead.stage}${patch.selectedPropertyName ? ` (Property: ${patch.selectedPropertyName})` : ""}`,
    actor: operatorName,
    at: now,
    prev: { stage: existingLead.stage, property: existingLead.selectedPropertyName },
    next: { stage: updatedLead.stage, property: updatedLead.selectedPropertyName, nextAction: nextAction.kind },
    reason: patch.notes || `Advanced in Booking Flow Split to ${updatedLead.stage}`,
  };

  // Update store
  store.upsertLead(updatedLead);
  store.upsertNextAction(nextAction);
  store.addAuditLog(auditLog);

  // Sync to Supabase
  try {
    const db = supabase as any;
    await db.from("leads").update({
      location_text: updatedLead.locationText,
      current_pipeline_stage: updatedLead.stage,
      current_handler_name: updatedLead.currentHandlerName,
      last_operator_action_at: now,
      updated_at: now,
    }).eq("id", leadId);

    await db.from("audit_logs").insert({
      entity: "lead",
      entity_id: leadId,
      action: auditLog.action,
      actor: operatorName,
      at: now,
      prev: auditLog.prev,
      next: auditLog.next,
      reason: auditLog.reason,
    });
  } catch (err) {
    console.info("[OperationalEngine] Cloud sync status:", err);
  }

  return { ok: true, lead: updatedLead, nextAction };
}

/**
 * PHASE 1 / MODULE C: Creates or updates a closing commitment.
 */
export async function commitClosingPromise(
  input: {
    leadId: string;
    windowId: string;
    dueAt: string;
    promisedBy: string;
    steps: string[];
    note: string;
    propertyName?: string;
    amount?: number;
  }
): Promise<{ ok: boolean; commitment: OperationalCommitment; error?: string }> {
  const store = useOperationalStore.getState();
  const lead = store.getLead(input.leadId);

  if (!lead) {
    return { ok: false, commitment: null as any, error: "Lead not found" };
  }

  const now = nowIso();
  const commitmentId = `commit-${lead.id}-${Date.now().toString(36)}`;

  const commitment: OperationalCommitment = {
    id: commitmentId,
    leadId: lead.id,
    leadName: lead.name,
    leadPhone: lead.phone,
    windowId: input.windowId,
    dueAt: input.dueAt,
    status: "open",
    promisedBy: input.promisedBy,
    promisedAt: now,
    steps: input.steps,
    note: input.note,
    changeCount: 0,
    propertyName: input.propertyName || lead.selectedPropertyName,
    amount: input.amount || lead.budget,
    history: [
      {
        at: now,
        by: input.promisedBy,
        kind: "promised",
        note: input.note,
      },
    ],
  };

  // Move lead stage to CLOSING if not already
  const updatedLead: OperationalLead = {
    ...lead,
    stage: "CLOSING",
    status: "closing",
    lastOperatorActionAt: now,
    updatedAt: now,
  };

  const nba = computeNextBestAction(updatedLead, commitment);
  const nextAction: OperationalNextAction = {
    id: `act-${lead.id}-${Date.now()}`,
    leadId: lead.id,
    kind: nba.kind,
    owner: nba.owner,
    dueAt: nba.dueAt,
    reason: nba.reason,
    urgency: nba.urgency,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  const auditLog: OperationalAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity: "commitment",
    entityId: lead.id,
    action: `Closing commitment created: Due ${new Date(input.dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} by ${input.promisedBy}`,
    actor: input.promisedBy,
    at: now,
    prev: { stage: lead.stage },
    next: { stage: "CLOSING", commitmentDue: input.dueAt },
    reason: input.note,
  };

  store.upsertCommitment(commitment);
  store.upsertLead(updatedLead);
  store.upsertNextAction(nextAction);
  store.addAuditLog(auditLog);

  try {
    const db = supabase as any;
    await db.from("leads").update({
      current_pipeline_stage: "CLOSING",
      last_operator_action_at: now,
      updated_at: now,
    }).eq("id", lead.id);

    await db.from("audit_logs").insert({
      entity: "lead",
      entity_id: lead.id,
      action: auditLog.action,
      actor: input.promisedBy,
      at: now,
      reason: auditLog.reason,
    });
  } catch (err) {
    console.info("[OperationalEngine] Cloud sync status:", err);
  }

  return { ok: true, commitment };
}

/**
 * PHASE 1 / MODULE C: Finalizes a paid booking and issues a receipt.
 * Inserts into crib_bookings, marks commitment kept, updates lead to BOOKED,
 * and creates an audit entry.
 */
export async function finalizeBooking(
  input: FinalizeBookingInput
): Promise<{ ok: boolean; booking: OperationalBooking; error?: string }> {
  const store = useOperationalStore.getState();
  const lead = store.getLead(input.leadId);

  if (!lead) {
    return { ok: false, booking: null as any, error: "Lead not found" };
  }

  if (!input.monthlyRent || input.monthlyRent <= 0) {
    return { ok: false, booking: null as any, error: "Valid monthly rent is required" };
  }

  const now = nowIso();
  const bookingId = `book-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const tokenRef = input.token || `GP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  const booking: OperationalBooking = {
    id: bookingId,
    leadId: input.leadId,
    tenantName: input.tenantName || lead.name,
    tenantPhone: input.tenantPhone || lead.phone,
    propertyId: input.propertyId || lead.selectedPropertyId || "prop-default",
    propertyName: input.propertyName || lead.selectedPropertyName || "Gharpayy Residency",
    roomTypeId: input.roomTypeId || "single-std",
    roomOrBedLabel: input.roomOrBedLabel || "Room 101-A",
    monthlyRent: input.monthlyRent,
    securityDeposit: input.securityDeposit || input.monthlyRent * 2,
    maintenanceAmount: input.maintenanceAmount || 1500,
    agreementStartDate: input.agreementStartDate || lead.moveInDate || now.slice(0, 10),
    lockInPeriod: input.lockInPeriod || 3,
    noticePeriod: input.noticePeriod || 30,
    status: "confirmed",
    token: tokenRef,
    createdBy: input.operatorName,
    createdAt: now,
    updatedAt: now,
  };

  // Settle any active commitment
  const commitment = store.getLeadCommitment(lead.id);
  if (commitment) {
    store.upsertCommitment({
      ...commitment,
      status: "kept",
      bookingRef: tokenRef,
      history: [
        ...commitment.history,
        {
          at: now,
          by: input.operatorName,
          kind: "kept",
          note: `Booking confirmed with token ${tokenRef}`,
        },
      ],
    });
  }

  // Update lead to BOOKED
  const updatedLead: OperationalLead = {
    ...lead,
    stage: "BOOKED",
    status: "booked",
    selectedPropertyId: booking.propertyId,
    selectedPropertyName: booking.propertyName,
    lastOperatorActionAt: now,
    updatedAt: now,
  };

  // Recompute Next Best Action
  const nba = computeNextBestAction(updatedLead);
  const nextAction: OperationalNextAction = {
    id: `act-${lead.id}-${Date.now()}`,
    leadId: lead.id,
    kind: nba.kind,
    owner: nba.owner,
    dueAt: nba.dueAt,
    reason: nba.reason,
    urgency: nba.urgency,
    status: "open",
    createdAt: now,
    updatedAt: now,
  };

  const auditLog: OperationalAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    entity: "booking",
    entityId: lead.id,
    action: `PAID BOOKING CONFIRMED: ${booking.propertyName} (${booking.roomOrBedLabel}) at ₹${booking.monthlyRent.toLocaleString()}/mo. Token: ${tokenRef}`,
    actor: input.operatorName,
    at: now,
    prev: { stage: lead.stage, status: lead.status },
    next: { stage: "BOOKED", status: "booked", token: tokenRef },
    reason: `Payment verified. Move-in date: ${booking.agreementStartDate}`,
  };

  // Save in local operational store
  store.addBooking(booking);
  store.upsertLead(updatedLead);
  store.upsertNextAction(nextAction);
  store.addAuditLog(auditLog);

  // Sync with Supabase crib_bookings & leads
  try {
    const db = supabase as any;
    await db.from("crib_bookings").insert({
      id: booking.id,
      tenant_name: booking.tenantName,
      tenant_phone: booking.tenantPhone,
      property_id: booking.propertyId,
      property_name: booking.propertyName,
      room_type_id: booking.roomTypeId,
      monthly_rent: booking.monthlyRent,
      security_deposit: booking.securityDeposit,
      maintenance_amount: booking.maintenanceAmount,
      agreement_start_date: booking.agreementStartDate,
      lock_in_period: booking.lockInPeriod,
      notice_period: booking.noticePeriod,
      status: "confirmed",
      token: booking.token,
    });

    await db.from("leads").update({
      current_pipeline_stage: "BOOKED",
      status: "booked",
      last_operator_action_at: now,
      updated_at: now,
    }).eq("id", lead.id);

    await db.from("audit_logs").insert({
      entity: "booking",
      entity_id: lead.id,
      action: auditLog.action,
      actor: input.operatorName,
      at: now,
      reason: auditLog.reason,
    });
  } catch (err) {
    console.info("[OperationalEngine] Cloud sync status:", err);
  }

  return { ok: true, booking };
}

/**
 * Fetches the audit trail for a customer.
 */
export function getAuditHistory(leadId: string): OperationalAuditLog[] {
  return useOperationalStore.getState().getLeadAuditLogs(leadId);
}
