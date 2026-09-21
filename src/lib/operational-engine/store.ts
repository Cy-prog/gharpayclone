import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  OperationalLead,
  OperationalCall,
  OperationalNextAction,
  OperationalCommitment,
  OperationalBooking,
  OperationalAuditLog,
  PipelineStage,
} from "./types";
import { computeNextBestAction } from "./next-best-action";
import { supabase } from "@/integrations/supabase/client";

const INITIAL_LEADS: OperationalLead[] = [
  {
    id: "lead-aarav-01",
    name: "Aarav Sharma",
    phone: "+919876543210",
    locationText: "Koramangala 4th Block",
    budget: 15000,
    sharingType: "Single",
    moveInDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    stage: "WHERE",
    currentOwner: "Samit Jain",
    currentHandlerName: "Samit Jain",
    status: "open",
    priority: "high",
    lastOperatorActionAt: new Date(Date.now() - 1800000).toISOString(),
    lastMessagePreview: "Looking for a single room near Sony Signal, budget around 15-18k.",
    callStreak: 0,
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: "lead-diya-02",
    name: "Diya Patel",
    phone: "+919812345678",
    locationText: "HSR Layout Sector 2",
    budget: 13500,
    sharingType: "Double",
    moveInDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    stage: "BUDGET",
    currentOwner: "Priya",
    currentHandlerName: "Priya",
    status: "qualified",
    priority: "high",
    lastOperatorActionAt: new Date(Date.now() - 7200000).toISOString(),
    lastMessagePreview: "Need double sharing with food included in HSR.",
    callStreak: 1,
    lastCallOutcome: "connected",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "lead-rohan-03",
    name: "Rohan Verma",
    phone: "+919765432109",
    locationText: "Indiranagar 100ft Road",
    budget: 22000,
    sharingType: "Single",
    moveInDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
    stage: "TOUR_SCHEDULED",
    currentOwner: "Amit",
    currentHandlerName: "Amit",
    status: "touring",
    priority: "high",
    selectedPropertyId: "prop-indira-01",
    selectedPropertyName: "Gharpayy Indiranagar Elite",
    lastOperatorActionAt: new Date(Date.now() - 3600000).toISOString(),
    lastMessagePreview: "Confirmed for tour today at 4:30 PM with TCM.",
    callStreak: 1,
    lastCallOutcome: "connected",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "lead-sneha-04",
    name: "Sneha Reddy",
    phone: "+919654321098",
    locationText: "Bellandur Outer Ring Road",
    budget: 14000,
    sharingType: "Double",
    moveInDate: new Date(Date.now() + 86400000 * 1).toISOString().slice(0, 10),
    stage: "CLOSING",
    currentOwner: "Rahul",
    currentHandlerName: "Rahul",
    status: "closing",
    priority: "high",
    selectedPropertyId: "prop-bell-02",
    selectedPropertyName: "Gharpayy Bellandur Hub",
    lastOperatorActionAt: new Date(Date.now() - 900000).toISOString(),
    lastMessagePreview: "Tour completed, agreed to pay token by 6:00 PM.",
    callStreak: 2,
    lastCallOutcome: "connected",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: "lead-vikas-05",
    name: "Vikas Nair",
    phone: "+919543210987",
    locationText: "Whitefield ITPL",
    budget: 18000,
    sharingType: "Single",
    moveInDate: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
    stage: "WHERE",
    currentOwner: "Priya",
    currentHandlerName: "Priya",
    status: "open",
    priority: "medium",
    lastOperatorActionAt: new Date(Date.now() - 5400000).toISOString(),
    lastMessagePreview: "Inquired on website for single room.",
    callStreak: 1,
    lastCallOutcome: "no-answer",
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    updatedAt: new Date(Date.now() - 5400000).toISOString(),
  },
];

interface OperationalStoreState {
  leads: OperationalLead[];
  calls: OperationalCall[];
  nextActions: OperationalNextAction[];
  commitments: OperationalCommitment[];
  bookings: OperationalBooking[];
  auditLogs: OperationalAuditLog[];
  activeOperatorName: string;

  // Actions
  setActiveOperatorName: (name: string) => void;
  getLead: (id: string) => OperationalLead | undefined;
  getLeadByPhone: (phone: string) => OperationalLead | undefined;
  getLeadCommitment: (leadId: string) => OperationalCommitment | undefined;
  getLeadNextAction: (leadId: string) => OperationalNextAction | undefined;
  getLeadCalls: (leadId: string) => OperationalCall[];
  getLeadAuditLogs: (leadId: string) => OperationalAuditLog[];

  // Mutations
  upsertLead: (lead: OperationalLead) => void;
  patchLead: (id: string, patch: Partial<OperationalLead>) => void;
  addCall: (call: OperationalCall) => void;
  upsertNextAction: (action: OperationalNextAction) => void;
  upsertCommitment: (commitment: OperationalCommitment) => void;
  addBooking: (booking: OperationalBooking) => void;
  addAuditLog: (log: OperationalAuditLog) => void;
  resetToDefaults: () => void;
}

export const useOperationalStore = create<OperationalStoreState>()(
  persist(
    (set, get) => ({
      leads: INITIAL_LEADS,
      calls: [],
      nextActions: INITIAL_LEADS.map((lead) => {
        const nba = computeNextBestAction(lead);
        return {
          id: `act-${lead.id}-${Date.now()}`,
          leadId: lead.id,
          kind: nba.kind,
          owner: nba.owner,
          dueAt: nba.dueAt,
          reason: nba.reason,
          urgency: nba.urgency,
          status: "open",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }),
      commitments: [
        {
          id: "commit-sneha-01",
          leadId: "lead-sneha-04",
          leadName: "Sneha Reddy",
          leadPhone: "+919654321098",
          windowId: "today-close",
          dueAt: new Date(Date.now() + 3600000 * 2).toISOString(),
          status: "open",
          promisedBy: "Rahul",
          promisedAt: new Date(Date.now() - 3600000).toISOString(),
          steps: ["Send payment QR", "Verify bank transaction", "Issue instant confirmation"],
          note: "Customer confirmed after physical tour; requested double sharing room 204.",
          changeCount: 0,
          propertyName: "Gharpayy Bellandur Hub",
          amount: 14000,
          history: [
            {
              at: new Date(Date.now() - 3600000).toISOString(),
              by: "Rahul",
              kind: "promised",
              note: "Customer promised to pay ₹5,000 token by 6:00 PM.",
            },
          ],
        },
      ],
      bookings: [],
      auditLogs: [
        {
          id: "audit-seed-1",
          entity: "lead",
          entityId: "lead-aarav-01",
          action: "Lead received from WhatsApp inquiry",
          actor: "System",
          at: new Date(Date.now() - 3600000 * 4).toISOString(),
          reason: "Inbound campaign: Koramangala PGs",
        },
        {
          id: "audit-seed-2",
          entity: "lead",
          entityId: "lead-sneha-04",
          action: "Tour completed at Gharpayy Bellandur Hub",
          actor: "TCM Vikas",
          at: new Date(Date.now() - 3600000 * 2).toISOString(),
          reason: "Customer liked room 204 ventilation and meal plan.",
        },
      ],
      activeOperatorName: "Rahul",

      setActiveOperatorName: (name) => set({ activeOperatorName: name }),

      getLead: (id) => get().leads.find((l) => l.id === id),
      getLeadByPhone: (phone) => get().leads.find((l) => l.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")),
      getLeadCommitment: (leadId) => get().commitments.find((c) => c.leadId === leadId && c.status === "open"),
      getLeadNextAction: (leadId) => get().nextActions.find((a) => a.leadId === leadId && a.status === "open"),
      getLeadCalls: (leadId) => get().calls.filter((c) => c.leadId === leadId),
      getLeadAuditLogs: (leadId) => get().auditLogs.filter((a) => a.entityId === leadId),

      upsertLead: (lead) =>
        set((state) => {
          const index = state.leads.findIndex((l) => l.id === lead.id);
          const nextLeads = index >= 0
            ? state.leads.map((l) => (l.id === lead.id ? lead : l))
            : [lead, ...state.leads];
          return { leads: nextLeads };
        }),

      patchLead: (id, patch) =>
        set((state) => {
          const nextLeads = state.leads.map((l) =>
            l.id === id ? { ...l, ...patch, updatedAt: new Date().toISOString() } : l
          );
          return { leads: nextLeads };
        }),

      addCall: (call) =>
        set((state) => ({
          calls: [call, ...state.calls].slice(0, 1000),
        })),

      upsertNextAction: (action) =>
        set((state) => {
          const others = state.nextActions.filter((a) => a.leadId !== action.leadId || a.status !== "open");
          return { nextActions: [action, ...others].slice(0, 1000) };
        }),

      upsertCommitment: (commitment) =>
        set((state) => {
          const index = state.commitments.findIndex((c) => c.id === commitment.id);
          const nextCommits = index >= 0
            ? state.commitments.map((c) => (c.id === commitment.id ? commitment : c))
            : [commitment, ...state.commitments];
          return { commitments: nextCommits };
        }),

      addBooking: (booking) =>
        set((state) => ({
          bookings: [booking, ...state.bookings].slice(0, 1000),
        })),

      addAuditLog: (log) =>
        set((state) => ({
          auditLogs: [log, ...state.auditLogs].slice(0, 2000),
        })),

      resetToDefaults: () =>
        set({
          leads: INITIAL_LEADS,
          calls: [],
          commitments: [],
          bookings: [],
          auditLogs: [],
        }),
    }),
    {
      name: "gharpayy.operational.engine.v2",
    }
  )
);
