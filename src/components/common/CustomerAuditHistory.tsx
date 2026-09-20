import { useMemo } from "react";
import { useOperationalStore } from "@/lib/operational-engine/store";
import { Badge } from "@/components/ui/badge";
import { History, User, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  leadId: string;
  className?: string;
  maxItems?: number;
}

export function CustomerAuditHistory({ leadId, className, maxItems = 10 }: Props) {
  const auditLogs = useOperationalStore((s) => s.auditLogs);

  const customerLogs = useMemo(() => {
    return auditLogs
      .filter((log) => log.entityId === leadId)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, maxItems);
  }, [auditLogs, leadId, maxItems]);

  if (customerLogs.length === 0) {
    return (
      <div className={cn("rounded-md border bg-muted/20 p-2.5 text-center text-xs text-muted-foreground", className)}>
        <History className="mx-auto mb-1 h-3.5 w-3.5 opacity-50" />
        No activity logged for this customer yet. Every call, stage change, and commitment is recorded here.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2 rounded-md border bg-card p-2.5", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <History className="h-3.5 w-3.5 text-primary" />
          <span>Operational Audit Trail</span>
        </div>
        <Badge variant="outline" className="text-[9px]">
          {customerLogs.length} events
        </Badge>
      </div>

      <div className="space-y-1.5">
        {customerLogs.map((log) => (
          <div
            key={log.id}
            className="flex items-start justify-between gap-2 rounded border border-border/60 bg-background px-2 py-1.5 text-[11px]"
          >
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="font-medium text-foreground">{log.action}</div>
              {log.reason && (
                <div className="text-[10px] text-muted-foreground truncate">{log.reason}</div>
              )}
            </div>
            <div className="shrink-0 text-right space-y-0.5">
              <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                <User className="h-2.5 w-2.5" />
                <span>{log.actor}</span>
              </div>
              <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground/70">
                <Clock className="h-2.5 w-2.5" />
                <span>
                  {new Date(log.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
