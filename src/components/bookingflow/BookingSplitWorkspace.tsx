import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  User,
  AlertCircle,
  Home,
  Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useOperationalStore } from "@/lib/operational-engine/store";
import { updateBookingFlowStage } from "@/lib/operational-engine/actions";
import { computeNextBestAction } from "@/lib/operational-engine/next-best-action";
import { CustomerAuditHistory } from "@/components/common/CustomerAuditHistory";
import type { PipelineStage } from "@/lib/operational-engine/types";

interface BookingSplitWorkspaceProps {
  leadId?: string;
}

const STAGES = [
  { id: "BUDGET", label: "Qualified", code: "QUALIFIED" },
  { id: "MATCH", label: "Property Matched", code: "MATCHED" },
  { id: "TOUR_SCHEDULED", label: "Tour Requested", code: "TOUR_REQ" },
  { id: "TOUR_COMPLETED", label: "Tour Completed", code: "TOUR_DONE" },
  { id: "CLOSING", label: "High Intent", code: "HIGH_INTENT" },
  { id: "CLOSING_DESK", label: "Closing", code: "CLOSING" },
] as const;

interface ChatMessage {
  id: string;
  sender: "customer" | "operator";
  text: string;
  time: string;
}

export function BookingSplitWorkspace({ leadId = "lead-aarav-01" }: BookingSplitWorkspaceProps) {
  const store = useOperationalStore();
  const lead = store.getLead(leadId) || store.leads[0];
  const auditLogs = store.getLeadAuditLogs(lead?.id || leadId);

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "m1",
      sender: "customer",
      text: "Hi, I am looking for a single room PG in Koramangala near Sony World Signal. Budget is ₹15,000.",
      time: "10:30 AM",
    },
    {
      id: "m2",
      sender: "operator",
      text: "Hi Aarav! Thanks for reaching out to Gharpayy. We have verified options matching your requirements at Koramangala 5B with high-speed WiFi and meals included.",
      time: "10:32 AM",
    },
    {
      id: "m3",
      sender: "customer",
      text: "Sounds great! What are the room details and when can I visit?",
      time: "10:35 AM",
    },
  ]);

  // Hydrate on mount
  useEffect(() => {
    store.hydrateFromSupabase();
  }, []);

  if (!lead) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Loading customer data for Booking Flow Split...
      </div>
    );
  }

  const nba = computeNextBestAction(lead);
  const owner = lead.currentHandlerName || lead.currentOwner || "Samit Jain";

  // Check deadline (within 4 hours of last action or simulated deadline)
  const deadlineDate = new Date(Date.now() + 4 * 3600 * 1000);
  const isOverdue = nba.urgency === "critical" || false;

  // Determine stage mapping
  const currentStageIndex = (() => {
    switch (lead.stage) {
      case "NEW":
      case "WHERE":
      case "BUDGET":
        return 0; // Qualified
      case "MATCH":
        return 1; // Property Matched
      case "TOUR_SCHEDULED":
        return 2; // Tour Requested
      case "TOUR_COMPLETED":
        return 3; // Tour Completed
      case "CLOSING":
        return 4; // High Intent
      case "BOOKED":
        return 5; // Closing
      default:
        return 1;
    }
  })();

  // Customer message based on stage
  const generatedMessage = (() => {
    switch (currentStageIndex) {
      case 0:
        return `Hi ${lead.name.split(" ")[0]}, we have noted your requirement for ${lead.locationText} with a budget of ₹${lead.budget.toLocaleString()}. Let me share the best options for you!`;
      case 1:
        return `Hi ${lead.name.split(" ")[0]}, I found a property matching your requirements at Gharpayy Koramangala 5B (Room 302-B, ₹15,000/mo). Would you like me to schedule a visit?`;
      case 2:
        return `Hi ${lead.name.split(" ")[0]}, your site visit for Gharpayy Koramangala 5B (Room 302-B) is scheduled. Our property manager will assist you at the location.`;
      case 3:
        return `Hi ${lead.name.split(" ")[0]}, hope you had a great tour of Gharpayy Koramangala 5B! Would you like to lock Room 302-B before it gets reserved?`;
      case 4:
      case 5:
        return `Hi ${lead.name.split(" ")[0]}, Room 302-B at Gharpayy Koramangala 5B is ready for you. Monthly Rent: ₹15,000, Security Deposit: ₹30,000. You can lock it today with a ₹5,000 booking token.`;
      default:
        return `Hi ${lead.name.split(" ")[0]}, I found a property matching your requirements. Would you like me to schedule a visit?`;
    }
  })();

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generatedMessage);
    setCopied(true);
    toast.success("Customer message copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStageAdvance = async (targetStage: PipelineStage, stageLabel: string) => {
    setSaving(true);
    const res = await updateBookingFlowStage(
      lead.id,
      {
        stage: targetStage,
        selectedPropertyName: "Gharpayy Koramangala 5B",
        selectedPropertyId: "prop-km-5b-302",
        budget: 15000,
        locationText: "Koramangala 5th Block",
        sharingType: "Single",
      },
      owner,
    );
    setSaving(false);

    if (!res.ok) {
      toast.error(res.error || "Unable to save this change. Please try again.");
      return;
    }

    toast.success(`Advanced customer to ${stageLabel}!`);
    // Append auto-generated message to the chat view as well
    setMessages((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        sender: "operator",
        text: generatedMessage,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = {
      id: `m-${Date.now()}`,
      sender: "operator",
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    toast.success("Message sent to Aarav Sharma!");
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[750px] w-full border rounded-xl overflow-hidden bg-background shadow-sm">
      {/* ============================================================ */}
      {/* LEFT SIDE: Customer / WhatsApp conversation                  */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r bg-emerald-50/20 dark:bg-emerald-950/10">
        {/* WhatsApp Header */}
        <div className="flex items-center justify-between p-3.5 border-b bg-emerald-700 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-emerald-600 border-2 border-white/40 flex items-center justify-center font-bold text-sm">
                AS
              </div>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-300 border-2 border-emerald-700" />
            </div>
            <div>
              <div className="font-semibold text-sm flex items-center gap-2">
                {lead.name}
                <span className="text-[10px] bg-emerald-800/80 px-1.5 py-0.5 rounded font-mono">
                  WhatsApp Verified
                </span>
              </div>
              <div className="text-xs text-emerald-100 flex items-center gap-2">
                <span>{lead.phone}</span>
                <span>·</span>
                <span className="text-emerald-200 font-medium">Online</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href={`tel:${lead.phone}`}
              className="p-2 rounded-full hover:bg-emerald-600 transition-colors text-white"
              title="Call customer"
            >
              <Phone className="h-4 w-4" />
            </a>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
              onClick={handleCopyMessage}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Script
            </Button>
          </div>
        </div>

        {/* Chat Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:16px_16px] [background-opacity:0.03]">
          <div className="text-center my-2">
            <span className="text-[11px] font-medium bg-background/80 border px-3 py-1 rounded-full text-muted-foreground shadow-xs">
              Today · End-to-End Encryption
            </span>
          </div>

          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex flex-col max-w-[80%]",
                m.sender === "operator" ? "ml-auto items-end" : "mr-auto items-start",
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-2xl text-xs leading-relaxed shadow-xs",
                  m.sender === "operator"
                    ? "bg-emerald-600 text-white rounded-tr-xs"
                    : "bg-card border text-card-foreground rounded-tl-xs",
                )}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-muted-foreground mt-0.5 px-1">{m.time}</span>
            </div>
          ))}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="p-2 bg-muted/40 border-t flex flex-wrap gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground self-center mr-1">
            Quick Insert:
          </span>
          {[
            "Share Property Photos",
            "Confirm Visit Time",
            "Breakup of Rent & Deposit",
            "Send Token Link",
          ].map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setChatInput((prev) => (prev ? `${prev} ${chip}` : chip))}
              className="text-[10px] px-2 py-0.5 rounded-full border bg-background hover:bg-muted transition-colors text-muted-foreground"
            >
              + {chip}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <div className="p-3 bg-card border-t flex items-center gap-2">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message to Aarav Sharma…"
            className="text-xs h-9"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={!chatInput.trim()}
            className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
          >
            <Send className="h-3.5 w-3.5 mr-1" />
            Send
          </Button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT SIDE: CRM Work Panel                                   */}
      {/* ============================================================ */}
      <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto p-4 md:p-5 space-y-4 bg-card">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                Phase 5 · Booking Flow Split
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                ID: {lead.id}
              </span>
            </div>
            <h2 className="text-base font-semibold tracking-tight mt-1">
              CRM Operator Workspace
            </h2>
          </div>

          <Link to="/closing">
            <Button size="sm" variant="outline" className="h-8 text-xs font-semibold gap-1">
              Closing Desk
              <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>

        {/* CUSTOMER CARD */}
        <div className="rounded-lg border bg-muted/20 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-primary" />
              Customer Details
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              Stage: {lead.stage}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <span className="text-muted-foreground text-[10px] block">Name</span>
              <strong className="font-semibold text-foreground">{lead.name}</strong>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Phone</span>
              <span className="font-medium text-foreground">{lead.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Requirements</span>
              <span className="font-medium text-foreground">1RK / Private Room</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Budget</span>
              <strong className="font-bold text-emerald-600 dark:text-emerald-400">
                ₹{lead.budget.toLocaleString()} / mo
              </strong>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Location</span>
              <span className="font-medium text-foreground">{lead.locationText}</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Move-in Date</span>
              <span className="font-medium text-foreground">{lead.moveInDate || "2026-10-01"}</span>
            </div>
          </div>

          <div className="pt-2 border-t text-[11px] text-muted-foreground">
            <strong className="text-foreground">Preferences:</strong> Attached washroom, WiFi, Food included, Single occupancy.
          </div>
        </div>

        {/* PROPERTY MATCH CARD */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5 text-primary" />
              Property Match
            </h3>
            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
              100% Match
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div>
              <span className="text-muted-foreground text-[10px] block">Property</span>
              <strong className="font-semibold text-foreground">Gharpayy Koramangala 5B</strong>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Room</span>
              <span className="font-medium text-foreground">Room 302-B (Executive Single)</span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Monthly Rent</span>
              <strong className="font-bold text-foreground">₹15,000 / mo</strong>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Availability</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Available Immediately
              </span>
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground bg-background/60 p-2 rounded border">
            <strong className="text-foreground">Match reason:</strong> Exact ₹15k budget match, 0.4 km from Sony World Signal, includes 3 meals/day and 100 Mbps WiFi.
          </div>
        </div>

        {/* CURRENT STAGE STEPPER (1-Click Progression without unnecessary navigation) */}
        <div className="rounded-lg border bg-card p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Current Stage Progression (0 Clicks Away)
            </h3>
            <span className="text-[10px] text-muted-foreground">
              Click any stage to advance directly
            </span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
            {STAGES.map((s, idx) => {
              const isCurrent = currentStageIndex === idx;
              const isDone = currentStageIndex > idx;

              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    const targetPipelineStage: PipelineStage =
                      idx === 0
                        ? "BUDGET"
                        : idx === 1
                          ? "MATCH"
                          : idx === 2
                            ? "TOUR_SCHEDULED"
                            : idx === 3
                              ? "TOUR_COMPLETED"
                              : "CLOSING";
                    handleStageAdvance(targetPipelineStage, s.label);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all",
                    isCurrent
                      ? "border-primary bg-primary text-primary-foreground font-semibold shadow-xs"
                      : isDone
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                        : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                  )}
                >
                  <div className="text-[10px] leading-tight font-medium">
                    {idx + 1}. {s.label}
                  </div>
                  <div className="mt-1">
                    {isDone ? (
                      <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                    ) : isCurrent ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* OWNER & DEADLINE CARDS */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-3 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
              Owner
            </span>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <strong className="text-sm font-semibold">{owner}</strong>
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Direct accountability
            </span>
          </div>

          <div
            className={cn(
              "rounded-lg border p-3 space-y-1",
              isOverdue
                ? "border-destructive bg-destructive/10 text-destructive animate-pulse"
                : "bg-card text-foreground",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-medium">
                Deadline
              </span>
              {isOverdue && (
                <Badge variant="destructive" className="h-4 px-1 text-[9px] font-bold">
                  OVERDUE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className={cn("h-3.5 w-3.5", isOverdue ? "text-destructive" : "text-muted-foreground")} />
              <strong className={cn("text-sm font-semibold", isOverdue ? "text-destructive font-bold" : "")}>
                Within 4 hours
              </strong>
            </div>
            <span className="text-[10px] text-muted-foreground block">
              Target: {deadlineDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        </div>

        {/* NEXT BEST ACTION */}
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" />
              Next Best Action
            </span>
            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
              Owner: {owner} · Due: Within 4 hours
            </Badge>
          </div>

          <div>
            <div className="text-sm font-bold text-foreground">
              {currentStageIndex === 1
                ? "Schedule Tour"
                : currentStageIndex === 2
                  ? "Conduct Tour & Capture Feedback"
                  : currentStageIndex === 3
                    ? "Lock Closing Commitment"
                    : nba.kind}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentStageIndex === 1
                ? "Property matched / tour requested for Gharpayy Koramangala 5B"
                : nba.reason}
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <Button
              size="sm"
              disabled={saving}
              onClick={() => {
                const nextPipelineStage: PipelineStage =
                  currentStageIndex <= 1
                    ? "TOUR_SCHEDULED"
                    : currentStageIndex === 2
                      ? "TOUR_COMPLETED"
                      : "CLOSING";
                handleStageAdvance(nextPipelineStage, "Next Stage");
              }}
              className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {currentStageIndex <= 1 ? "SCHEDULE TOUR" : "ADVANCE WORKFLOW"}
            </Button>

            <Link to="/closing">
              <Button size="sm" variant="secondary" className="h-8 text-xs font-semibold">
                Proceed to Closing Desk →
              </Button>
            </Link>
          </div>
        </div>

        {/* AUTOMATIC CUSTOMER MESSAGE */}
        <div className="rounded-lg border bg-card p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              Generated Customer Message
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyMessage}
              className="h-7 text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 mr-1 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" />
                  COPY MESSAGE
                </>
              )}
            </Button>
          </div>

          <div className="p-2.5 rounded bg-muted/50 border text-xs text-foreground font-mono leading-relaxed select-all">
            “{generatedMessage}”
          </div>
        </div>

        {/* CROSS-MODULE AUDIT TRAIL */}
        <div className="border-t pt-3 space-y-2">
          <CustomerAuditHistory leadId={lead.id} />
        </div>
      </div>
    </div>
  );
}
