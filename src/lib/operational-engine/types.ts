export type PipelineStage =
  | "NEW"
  | "WHERE"
  | "BUDGET"
  | "MATCH"
  | "TOUR_SCHEDULED"
  | "TOUR_COMPLETED"
  | "CLOSING"
  | "BOOKED"
  | "LOST";

export interface OperationalLead {
  id: string;
  name: string;
  phone: string;
  locationText: string;
  budget: number;
  sharingType: "Single" | "Double" | "Triple" | "Any";
  moveInDate: string;
  stage: PipelineStage;
  currentOwner: string;
  currentHandlerName: string;
  status: "open" | "qualified" | "touring" | "closing" | "booked" | "dropped";
  priority: "high" | "medium" | "low";
  lastOperatorActionAt: string;
  lastMessagePreview?: string;
  selectedPropertyId?: string;
  selectedPropertyName?: string;
  callStreak: number;
  lastCallOutcome?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalCall {
  id: string;
  leadId: string;
  customerName: string;
  calledAt: string;
  operatorId: string;
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
  movement?: string;
  messageNow?: string;
  messageSent: boolean;
  followUp?: {
    text: string;
    dueAt: string;
  };
  nextStep?: {
    kind: string;
    label: string;
    dueAt: string;
  };
  stageAfter?: string;
  waste?: string[];
}

export interface OperationalNextAction {
  id: string;
  leadId: string;
  kind: string;
  owner: string;
  dueAt: string;
  reason: string;
  urgency: "low" | "medium" | "high" | "critical";
  status: "open" | "done" | "cancelled";
  createdAt: string;
  updatedAt: string;
}

export interface OperationalCommitment {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  windowId: string;
  dueAt: string;
  status: "open" | "kept" | "broken" | "cancelled";
  promisedBy: string;
  promisedAt: string;
  steps: string[];
  note: string;
  problem?: string;
  changeCount: number;
  bookingRef?: string;
  propertyName?: string;
  amount?: number;
  history: Array<{
    at: string;
    by: string;
    kind: string;
    reason?: string;
    note?: string;
  }>;
}

export interface OperationalBooking {
  id: string;
  leadId: string;
  tenantName: string;
  tenantPhone: string;
  propertyId: string;
  propertyName: string;
  roomTypeId: string;
  roomOrBedLabel: string;
  monthlyRent: number;
  securityDeposit: number;
  maintenanceAmount: number;
  agreementStartDate: string;
  lockInPeriod: number;
  noticePeriod: number;
  status: "payment_received" | "verified" | "confirmed";
  token: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface OperationalAuditLog {
  id: string;
  entity: "lead" | "call" | "commitment" | "booking";
  entityId: string;
  action: string;
  actor: string;
  at: string;
  prev?: Record<string, unknown> | null;
  next?: Record<string, unknown> | null;
  reason?: string | null;
}
