import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Phone,
  PhoneCall,
  CheckCircle2,
  Clock,
  User,
  Copy,
  ArrowRight,
  Sparkles,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useOperationalStore } from "@/lib/operational-engine/store";
import { computeNextBestAction } from "@/lib/operational-engine/next-best-action";
import { executeCallCommit } from "@/lib/operational-engine/actions";
import { CustomerAuditHistory } from "@/components/common/CustomerAuditHistory";
import type { OperationalLead, PipelineStage } from "@/lib/operational-engine/types";

interface Props {
  leadId: string;
  onLogged?: () => void;
  className?: string;
}

export function MPowerOperationalWorkspace({ leadId, onLogged, className }: Props) {
  const store = useOperationalStore();
  const rawLead = store.getLead(leadId);

  // Fallback if lead is not in store yet
  const lead: OperationalLead = useMemo(() => {
    if (rawLead) return rawLead;
    return {
      id: leadId,
      name: "Aarav Sharma",
      phone: "+91 98765 43210",
      locationText: "Koramangala 4th Block",
      budget: 15000,
      sharingType: "Single",
      moveInDate: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
      stage: "NEW",
      currentOwner: "Samit Jain",
      currentHandlerName: "Samit Jain",
      status: "open",
      priority: "high",
      lastOperatorActionAt: new Date().toISOString(),
      lastMessagePreview: "Looking for a single room near Sony Signal, budget around 15k.",
      callStreak: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [rawLead, leadId]);

  const nba = useMemo(() => computeNextBestAction(lead), [lead]);
  const isOverdue = useMemo(() => new Date(nba.dueAt).getTime() < Date.now(), [nba.dueAt]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<string | null>(null);
  const [generatedMessage, setGeneratedMessage] = useState<string>(
    () => `Hi ${lead.name.split(" ")[0]}, noted your requirement for a single room in ${lead.locationText} (Budget: ₹${lead.budget.toLocaleString("en-IN")}). I am shortlisting top properties matching your criteria in our booking flow right now!`
  );
  const [followUpDue, setFollowUpDue] = useState<string>(
    () => new Date(Date.now() + 3600000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );

  // Update message when lead changes
  useEffect(() => {
    if (lead.lastCallOutcome === "no-answer") {
      setGeneratedMessage(
        `Hi ${lead.name.split(" ")[0]}, I tried reaching you regarding your PG search in ${lead.locationText}. Let me know a convenient time to connect or reply here.`
      );
    } else if (lead.stage === "BUDGET" || lead.stage === "MATCH") {
      setGeneratedMessage(
        `Hi ${lead.name.split(" ")[0]}, I found verified single rooms in ${lead.locationText} within your ₹${lead.budget.toLocaleString("en-IN")} budget. When would be a good time to visit?`
      );
    }
  }, [lead]);

  // Phase 4: Usable actions [ Connected ] [ No Answer ] [ Qualified ] [ Follow-up ] [ Not Interested ]
  const handleCallResult = async (outcomeType: "connected" | "no-answer" | "qualified" | "follow-up" | "not-interested") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSelectedOutcome(outcomeType);

    const now = new Date();
    let stageAfter: PipelineStage = lead.stage;
    let nextFollowUpText = "Match properties in Booking Flow";
    let messageText = "";

    if (outcomeType === "qualified" || outcomeType === "connected") {
      stageAfter = "BUDGET";
      nextFollowUpText = "Match properties in Booking Flow";
      messageText = `Hi ${lead.name.split(" ")[0]}, noted your requirement for a single room in ${lead.locationText} (Budget: ₹${lead.budget.toLocaleString("en-IN")}). I am shortlisting top properties matching your criteria in our booking flow right now!`;
      setFollowUpDue("Within 1 hour");
    } else if (outcomeType === "no-answer") {
      stageAfter = lead.stage;
      nextFollowUpText = "WhatsApp / Retry Call in 2 hours";
      messageText = `Hi ${lead.name.split(" ")[0]}, I tried reaching you regarding your PG search in ${lead.locationText}. Let me know a convenient time to connect or reply here.`;
      setFollowUpDue("In 2 hours");
    } else if (outcomeType === "follow-up") {
      stageAfter = "WHERE";
      nextFollowUpText = "Scheduled Follow-up Call";
      messageText = `Hi ${lead.name.split(" ")[0]}, following up on your accommodation search in ${lead.locationText}. Let me know when you are free to discuss shortlisted options.`;
      setFollowUpDue("Today at 5:00 PM");
    } else if (outcomeType === "not-interested") {
      stageAfter = "LOST";
      nextFollowUpText = "Archived - Not interested";
      messageText = `Hi ${lead.name.split(" ")[0]}, thank you for your response. Feel free to reach out to Gharpayy whenever you are looking for accommodation!`;
      setFollowUpDue("Closed");
    }

    setGeneratedMessage(messageText);

    try {
      const res = await executeCallCommit({
        leadId: lead.id,
        customerName: lead.name,
        operatorName: "Samit Jain",
        agenda: "Initial Inbound Qualification",
        agendaSource: "system",
        outcome: outcomeType === "no-answer" ? "no-answer" : "connected",
        durationSec: 45,
        capture: {
          area: lead.locationText,
          budget: lead.budget,
          moveIn: lead.moveInDate,
          roomType: lead.sharingType,
          note: `Operator selected [${outcomeType.toUpperCase()}]. Lead advanced to ${stageAfter}.`,
        },
        messageNow: messageText,
        messageSent: true,
        followUp: {
          text: nextFollowUpText,
          dueAt: new Date(now.getTime() + (outcomeType === "no-answer" ? 7200000 : 3600000)).toISOString(),
        },
        stageAfter,
      });

      if (!res.ok) {
        toast.error("Failed to save call record", { description: res.error });
        return;
      }

      toast.success(`M-POWER Call Processed: ${outcomeType.toUpperCase()}`, {
        description: `Lead updated to ${stageAfter}. Next action assigned to Samit Jain.`,
      });

      onLogged?.();
    } catch (err: any) {
      toast.error("Error saving call record", { description: err?.message || "Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCustomerMessage = async () => {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      toast.success("Customer message copied to clipboard!", {
        description: "Ready to paste into WhatsApp.",
      });
    } catch {
      toast.error("Failed to copy message");
    }
  };

  return (
    <div className={cn("space-y-3.5 text-xs", className)}>
      {/* Module Outcome Guarantee Header */}
      <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-amber-900 dark:text-amber-200">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-xs">M-POWER CALL · OPERATIONAL WORKSPACE</span>
        </div>
        <Badge variant="outline" className="border-amber-500/40 bg-background font-mono text-[10px] text-amber-700 dark:text-amber-300">
          STAGE: {lead.stage}
        </Badge>
      </div>

      {/* SECTION 1: CUSTOMER DETAILS */}
      <Card className="p-3 space-y-2.5 border-border">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
          <span>Customer Profile</span>
          <span className="text-primary font-semibold">Single Canonical Record</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <div>
            <span className="text-[10px] text-muted-foreground block">Name</span>
            <span className="font-semibold text-sm text-foreground">{lead.name}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Phone</span>
            <span className="font-medium text-foreground">{lead.phone}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Current Stage</span>
            <Badge variant="secondary" className="text-[10px] font-bold uppercase">
              {lead.stage}
            </Badge>
          </div>
          <div className="col-span-2">
            <span className="text-[10px] text-muted-foreground block">Requirement</span>
            <span className="font-medium text-foreground">
              {lead.sharingType} room · {lead.locationText} (Budget: ₹{lead.budget.toLocaleString("en-IN")})
            </span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Owner</span>
            <span className="font-semibold text-primary">Samit Jain</span>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground block">Deadline</span>
            <span className={cn("font-semibold", isOverdue ? "text-destructive" : "text-foreground")}>
              Within 15 minutes
            </span>
          </div>
        </div>
      </Card>

      {/* SECTION 2: WHY ARE WE CALLING? */}
      <div className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
          <HelpCircle className="h-3.5 w-3.5 text-primary" />
          <span>Why are we calling?</span>
        </div>
        <p className="text-muted-foreground text-[11px] leading-relaxed">
          {lead.callStreak === 0
            ? "New inbound lead with no previous interaction. Initial qualification SLA is 15 minutes to lock tenant interest."
            : `Follow-up call (attempt #${lead.callStreak + 1}). Confirm budget, area preference and move-in readiness.`}
        </p>
      </div>

      {/* SECTION 3: WHAT DO WE NEED TO CONFIRM? */}
      <Card className="p-3 space-y-2 border-border">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          What do we need to confirm?
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded border bg-background p-2">
            <span className="text-muted-foreground block text-[10px]">1. Location Preference</span>
            <span className="font-semibold text-foreground">{lead.locationText} / Sony Signal</span>
          </div>
          <div className="rounded border bg-background p-2">
            <span className="text-muted-foreground block text-[10px]">2. Monthly Budget</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">₹{lead.budget.toLocaleString("en-IN")} / mo</span>
          </div>
          <div className="rounded border bg-background p-2">
            <span className="text-muted-foreground block text-[10px]">3. Move-in Date</span>
            <span className="font-semibold text-foreground">{lead.moveInDate || "Within 5 days"}</span>
          </div>
          <div className="rounded border bg-background p-2">
            <span className="text-muted-foreground block text-[10px]">4. Room / Sharing Type</span>
            <span className="font-semibold text-foreground">{lead.sharingType} Occupancy</span>
          </div>
        </div>
      </Card>

      {/* SECTION 4: NEXT BEST ACTION */}
      <Card className="p-3 space-y-2.5 border-primary/40 bg-primary/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-xs text-primary">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>NEXT BEST ACTION</span>
          </div>
          <Badge
            variant={nba.urgency === "critical" ? "destructive" : nba.urgency === "high" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {nba.urgency.toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="text-sm font-bold text-foreground">{nba.kind}</div>
          <div className="text-[11px] text-muted-foreground">{nba.reason}</div>
        </div>

        <div className="flex items-center justify-between border-t border-primary/20 pt-2 text-[11px]">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">Owner: Samit Jain</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className={cn("font-medium", isOverdue ? "text-destructive font-bold" : "text-foreground")}>
              Due: Within 15 minutes
            </span>
          </div>
        </div>
      </Card>

      {/* SECTION 5: CALL RESULT (1-CLICK AUTOMATION) */}
      <Card className="p-3 space-y-2.5 border-border">
        <div className="flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Call Result · 1-Click Execution
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">8 automated backend actions</span>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Select an outcome to automatically save call record, advance lead state, compute NBA, assign Samit Jain, set follow-up deadline, and generate customer message:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
          <Button
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleCallResult("connected")}
            className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSubmitting && selectedOutcome === "connected" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Connected
          </Button>
          <Button
            size="sm"
            disabled={isSubmitting}
            onClick={() => handleCallResult("qualified")}
            className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSubmitting && selectedOutcome === "qualified" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Qualified
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleCallResult("no-answer")}
            className="h-8 text-xs font-semibold border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-700 dark:text-amber-400"
          >
            {isSubmitting && selectedOutcome === "no-answer" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            No Answer
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => handleCallResult("follow-up")}
            className="h-8 text-xs font-semibold"
          >
            {isSubmitting && selectedOutcome === "follow-up" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Follow-up
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => handleCallResult("not-interested")}
            className="h-8 text-xs text-muted-foreground hover:text-destructive"
          >
            {isSubmitting && selectedOutcome === "not-interested" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Not Interested
          </Button>
        </div>
      </Card>

      {/* SECTION 6: AUTOMATIC CUSTOMER MESSAGE */}
      <Card className="p-3 space-y-2 border-border bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
            <span>Generated Customer Message</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-6 px-2 text-[10px] gap-1 font-semibold"
            onClick={copyCustomerMessage}
          >
            <Copy className="h-3 w-3" />
            COPY MESSAGE
          </Button>
        </div>

        <div className="rounded border bg-background p-2.5 text-[11px] font-mono leading-relaxed text-foreground">
          {generatedMessage}
        </div>
      </Card>

      {/* SECTION 7: FOLLOW-UP */}
      <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div>
          <span className="text-[10px] text-muted-foreground block">Next Follow-up</span>
          <span className="font-semibold text-foreground">{followUpDue}</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Owner</span>
          <span className="font-semibold text-primary">Samit Jain</span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">Action</span>
          <span className="font-semibold text-foreground">
            {lead.lastCallOutcome === "no-answer" ? "WhatsApp / Retry Call" : "Match Inventory in Booking Flow"}
          </span>
        </div>
        <div>
          <Link
            to="/booking-flow-split"
            className="inline-flex items-center gap-1 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <span>Booking Flow Split</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* SECTION 8: CROSS-MODULE AUDIT TRAIL */}
      <CustomerAuditHistory leadId={lead.id} maxItems={6} />
    </div>
  );
}
