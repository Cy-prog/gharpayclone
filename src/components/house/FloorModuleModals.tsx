import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  PhoneCall,
  Calendar,
  Building,
  CheckCircle2,
  Clock,
  History,
  ArrowRight,
  User,
  ShieldCheck,
  Check,
} from "lucide-react";
import { useOperationalStore } from "@/lib/operational-engine/store";
import {
  executeCallCommit,
  updateBookingFlowStage,
  commitClosingPromise,
  getAuditHistory,
} from "@/lib/operational-engine/actions";
import { FinalizeBookingDialog } from "@/components/commitments/FinalizeBookingDialog";
import type { OperationalLead, PipelineStage } from "@/lib/operational-engine/types";

// ==========================================
// 1. M-POWER CALL MODAL
// ==========================================
interface CallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
}

export function CallModal({ open, onOpenChange, leadId }: CallModalProps) {
  const store = useOperationalStore();
  const leads = store.leads;
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leadId || leads[0]?.id || "");
  const lead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const [agenda, setAgenda] = useState("Location & budget confirmation for move-in");
  const [outcome, setOutcome] = useState<
    "connected" | "no-answer" | "busy" | "rescheduled" | "call-later"
  >("connected");
  const [area, setArea] = useState(lead?.locationText || "Koramangala 4th Block");
  const [budget, setBudget] = useState<number>(lead?.budget || 16000);
  const [moveIn, setMoveIn] = useState(lead?.moveInDate || "Immediate");
  const [note, setNote] = useState("Lead is interested in single room with food and wifi.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleCommitCall = async () => {
    setIsSubmitting(true);
    try {
      const res = await executeCallCommit({
        leadId: lead.id,
        customerName: lead.name,
        operatorName: store.activeOperatorName || "Samit Jain",
        agenda,
        agendaSource: "operator",
        outcome,
        durationSec: outcome === "connected" ? 142 : 15,
        capture: {
          area,
          budget,
          moveIn,
          note,
        },
        messageNow: `Hi ${lead.name}, thanks for speaking with GharPay! We have noted your preference for ${area} within ₹${budget.toLocaleString("en-IN")}.`,
        messageSent: true,
        stageAfter: outcome === "connected" ? "BUDGET" : lead.stage,
      });

      if (res.ok) {
        toast.success(`M-POWER Call logged for ${lead.name}!`, {
          description: `Outcome: ${outcome.toUpperCase()} · Next: ${res.nextAction?.kind || "Follow up"}`,
        });
        onOpenChange(false);
      } else {
        toast.error("Failed to commit call", { description: res.error });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <PhoneCall className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base">M-POWER Call Station</DialogTitle>
              <DialogDescription className="text-xs">
                Level 1 · Connect • Qualify • Engage · Real-time call logging
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Lead Selector */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Select Active Lead
            </Label>
            <select
              value={selectedLeadId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedLeadId(nextId);
                const l = leads.find((item) => item.id === nextId);
                if (l) {
                  setArea(l.locationText);
                  setBudget(l.budget);
                  setMoveIn(l.moveInDate || "Immediate");
                }
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.phone}) — Stage: {l.stage} — ₹{l.budget.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Lead Details Card */}
          <div className="rounded-lg border bg-muted/30 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-xs">{lead.name}</span>
              <Badge variant="outline" className="text-[10px]">
                Stage: {lead.stage}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
              <div>
                Phone: <span className="font-medium text-foreground">{lead.phone}</span>
              </div>
              <div>
                Budget:{" "}
                <span className="font-medium text-foreground">
                  ₹{lead.budget.toLocaleString("en-IN")}
                </span>
              </div>
              <div>
                Sharing: <span className="font-medium text-foreground">{lead.sharingType}</span>
              </div>
            </div>
          </div>

          {/* Call Agenda */}
          <div className="space-y-1">
            <Label className="text-[11px]">Call Agenda</Label>
            <Input
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              className="h-8 text-xs"
              placeholder="e.g. Schedule weekend property tour"
            />
          </div>

          {/* Call Outcome */}
          <div className="space-y-1.5">
            <Label className="text-[11px]">Call Outcome</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                {
                  id: "connected" as const,
                  label: "Connected",
                  color: "bg-emerald-600 hover:bg-emerald-700 text-white",
                },
                {
                  id: "no-answer" as const,
                  label: "No Answer",
                  color: "bg-amber-600 hover:bg-amber-700 text-white",
                },
                {
                  id: "rescheduled" as const,
                  label: "Rescheduled",
                  color: "bg-blue-600 hover:bg-blue-700 text-white",
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOutcome(opt.id)}
                  className={`h-8 rounded-md border text-xs font-medium transition-all ${
                    outcome === opt.id
                      ? `${opt.color} shadow-sm border-transparent`
                      : "border-input bg-background hover:bg-muted text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Captured Information */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Preferred Area</Label>
              <Input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Koramangala"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Agreed Budget (₹)</Label>
              <Input
                type="number"
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="h-8 text-xs"
                placeholder="16000"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Call Notes / Next Step</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-8 text-xs"
              placeholder="Add key highlights from conversation..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            onClick={handleCommitCall}
            disabled={isSubmitting}
          >
            <Check className="h-3.5 w-3.5" />
            {isSubmitting ? "Logging Call..." : "Commit Call & Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 2. BOOKING FLOW MODAL
// ==========================================
interface BookingFlowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
}

export function BookingFlowModal({ open, onOpenChange, leadId }: BookingFlowModalProps) {
  const store = useOperationalStore();
  const leads = store.leads;
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leadId || leads[0]?.id || "");
  const lead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const [stage, setStage] = useState<PipelineStage>(lead?.stage || "WHERE");
  const [propertyName, setPropertyName] = useState(
    lead?.selectedPropertyName || "Gharpayy Emerald Suites",
  );
  const [notes, setNotes] = useState("Property tour confirmed for tomorrow 4:00 PM.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      const res = await updateBookingFlowStage(
        lead.id,
        {
          stage,
          selectedPropertyName: propertyName,
          selectedPropertyId: "prop-emerald-01",
          notes,
        },
        store.activeOperatorName || "Samit Jain",
      );

      if (res.ok) {
        toast.success(`Booking Flow updated for ${lead.name}!`, {
          description: `Stage moved to ${stage} · Property: ${propertyName}`,
        });
        onOpenChange(false);
      } else {
        toast.error("Failed to update booking flow", { description: res.error });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const STAGES: { id: PipelineStage; label: string; desc: string }[] = [
    { id: "WHERE", label: "1. Where", desc: "Location requirement" },
    { id: "BUDGET", label: "2. Budget", desc: "Price & sharing fit" },
    { id: "TOUR_SCHEDULED", label: "3. Tour", desc: "Physical visit scheduled" },
    { id: "CLOSING", label: "4. Closing", desc: "Token commitment stage" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
              <Building className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base">Booking Flow Studio</DialogTitle>
              <DialogDescription className="text-xs">
                Level 2 · Match • Schedule • Tour · Advance candidate in pipeline
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Lead Selector */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">Select Lead</Label>
            <select
              value={selectedLeadId}
              onChange={(e) => {
                const nextId = e.target.value;
                setSelectedLeadId(nextId);
                const l = leads.find((item) => item.id === nextId);
                if (l) {
                  setStage(l.stage);
                  setPropertyName(l.selectedPropertyName || "Gharpayy Emerald Suites");
                }
              }}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} — Current: {l.stage} — {l.selectedPropertyName || "No property yet"}
                </option>
              ))}
            </select>
          </div>

          {/* Stage Step Progress */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Advance Pipeline Stage</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStage(s.id)}
                  className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all ${
                    stage === s.id
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold"
                      : "border-input bg-background hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span className="text-xs">{s.label}</span>
                  <span className="text-[10px] opacity-75">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Property Selection */}
          <div className="space-y-1">
            <Label className="text-[11px]">Assigned Property</Label>
            <select
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="Gharpayy Emerald Suites">Gharpayy Emerald Suites (Koramangala)</option>
              <option value="Gharpayy Bellandur Hub">Gharpayy Bellandur Hub (Outer Ring Rd)</option>
              <option value="Gharpayy Indiranagar Elite">
                Gharpayy Indiranagar Elite (100ft Rd)
              </option>
              <option value="Gharpayy HSR Haven">Gharpayy HSR Haven (Sector 2)</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Tour / Stage Transition Notes</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs"
              placeholder="e.g. Tour with property manager Vikas scheduled"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            onClick={handleUpdate}
            disabled={isSubmitting}
          >
            <ArrowRight className="h-3.5 w-3.5" />
            {isSubmitting ? "Updating..." : "Update Pipeline Stage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// 3. CLOSING DESK MODAL
// ==========================================
interface ClosingDeskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
}

export function ClosingDeskModal({ open, onOpenChange, leadId }: ClosingDeskModalProps) {
  const store = useOperationalStore();
  const leads = store.leads;
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    leadId || leads.find((l) => l.stage === "CLOSING")?.id || leads[0]?.id || "",
  );
  const lead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const [promiseOpen, setPromiseOpen] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [promiseNote, setPromiseNote] = useState(
    "Tenant agreed to pay ₹5,000 token before 6:00 PM today.",
  );
  const [dueHours, setDueHours] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!lead) return null;

  const commitment = store.getLeadCommitment(lead.id);

  const handleCreatePromise = async () => {
    setIsSubmitting(true);
    try {
      const dueAt = new Date(Date.now() + 3600000 * dueHours).toISOString();
      const res = await commitClosingPromise({
        leadId: lead.id,
        windowId: `window-${Date.now()}`,
        dueAt,
        promisedBy: store.activeOperatorName || "Samit Jain",
        steps: [
          "Verify online bank transfer",
          "Issue instant GharPay receipt",
          "Lock room inventory",
        ],
        note: promiseNote,
        propertyName: lead.selectedPropertyName,
        amount: lead.budget,
      });

      if (res.ok) {
        toast.success(`Closing promise created for ${lead.name}!`, {
          description: `Due in ${dueHours} hour(s) · Deadline: ${new Date(dueAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        });
        setPromiseOpen(false);
      } else {
        toast.error("Failed to commit promise", { description: res.error });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div>
                <DialogTitle className="text-base">Closing Desk Command</DialogTitle>
                <DialogDescription className="text-xs">
                  Level 3 · Convert • Collect • Confirm · Settle commitments and finalize bookings
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Lead Selector */}
            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                Select Candidate
              </Label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — Stage: {l.stage} — ₹{l.budget.toLocaleString("en-IN")}/mo
                  </option>
                ))}
              </select>
            </div>

            {/* Commitment Status Card */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Active Closing Commitment</span>
                <Badge
                  className={
                    commitment
                      ? "bg-amber-600 text-white text-[10px]"
                      : "bg-muted text-muted-foreground text-[10px]"
                  }
                >
                  {commitment ? "OPEN COMMITMENT" : "NO ACTIVE COMMITMENT"}
                </Badge>
              </div>

              {commitment ? (
                <div className="space-y-1.5 text-[11px]">
                  <p className="text-foreground">{commitment.note}</p>
                  <div className="flex items-center gap-2 text-muted-foreground text-[10px]">
                    <Clock className="h-3 w-3 text-amber-600" />
                    <span>
                      Deadline:{" "}
                      {new Date(commitment.dueAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span>· Operator: {commitment.promisedBy}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-[11px]">
                  No active commitment. Create a token payment promise or proceed directly to
                  finalize booking.
                </p>
              )}
            </div>

            {/* Create Promise Sub-drawer */}
            {promiseOpen && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/20 p-3 space-y-2.5">
                <span className="font-semibold text-amber-700 dark:text-amber-400 text-xs">
                  Create Payment Commitment Promise
                </span>
                <div className="space-y-1">
                  <Label className="text-[10px]">Commitment Note</Label>
                  <Input
                    value={promiseNote}
                    onChange={(e) => setPromiseNote(e.target.value)}
                    className="h-8 text-xs"
                    placeholder="e.g. Promised ₹5,000 token by 6 PM"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Due In (Hours)</Label>
                  <Input
                    type="number"
                    value={dueHours}
                    onChange={(e) => setDueHours(Number(e.target.value))}
                    className="h-8 text-xs"
                    min={1}
                    max={24}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setPromiseOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={handleCreatePromise}
                    disabled={isSubmitting}
                  >
                    Save Promise
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {!promiseOpen && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setPromiseOpen(true)}
              >
                + Add Closing Promise
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs ml-auto"
              onClick={() => {
                onOpenChange(false);
                setFinalizeOpen(true);
              }}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Finalize Booking & Collect Token (₹5,000)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Embedded Finalize Booking Dialog with the ₹5,000 Token separation */}
      <FinalizeBookingDialog
        lead={lead}
        open={finalizeOpen}
        onOpenChange={setFinalizeOpen}
        onSuccess={() => {
          toast.success("Lead moved to BOOKED!", {
            description: `${lead.name} has been confirmed. View in Bookings or Audit Trail.`,
          });
        }}
      />
    </>
  );
}

// ==========================================
// 4. AUDIT TRAIL MODAL
// ==========================================
interface AuditTrailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string;
}

export function AuditTrailModal({ open, onOpenChange, leadId }: AuditTrailModalProps) {
  const store = useOperationalStore();
  const leads = store.leads;
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leadId || leads[0]?.id || "");
  const lead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const auditLogs = lead ? getAuditHistory(lead.id) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <History className="h-4 w-4" />
            </span>
            <div>
              <DialogTitle className="text-base">Audit Trail & Event History</DialogTitle>
              <DialogDescription className="text-xs">
                Verified end-to-end ledger of all transitions, calls, promises, and bookings
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs flex-1 overflow-y-auto">
          {/* Lead Selector */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-muted-foreground">
              Select Customer
            </Label>
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="h-8 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.phone}) — Current Stage: {l.stage}
                </option>
              ))}
            </select>
          </div>

          {/* Timeline list */}
          <div className="space-y-2 pt-2">
            {auditLogs.length > 0 ? (
              auditLogs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="relative flex items-start gap-3 rounded-lg border bg-card p-3 text-xs"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </span>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{log.action}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    {log.reason && (
                      <p className="text-[11px] text-muted-foreground">{log.reason}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-0.5">
                      <span>
                        Actor: <strong className="text-foreground">{log.actor || "System"}</strong>
                      </span>
                      <span>·</span>
                      <span>Entity: {log.entity}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                <History className="mx-auto h-6 w-6 opacity-40 mb-1" />
                <p>No audit events logged yet for this lead.</p>
                <p className="text-[11px]">
                  Perform an action (Call, Stage Update, or Booking) to record history.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button size="sm" className="text-xs" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
