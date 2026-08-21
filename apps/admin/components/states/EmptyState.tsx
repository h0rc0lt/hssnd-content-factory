import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

/** Empty state: what's missing, and what to do about it — an empty screen
 *  is an invitation to act, not just a dead end. */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl2 border border-dashed border-border bg-white/[0.015] px-6 py-14 text-center",
        className
      )}
    >
      <div className="rounded-full border border-border bg-surface p-3 text-mist">
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-paper">{title}</p>
        {description && <p className="max-w-sm text-sm text-mist">{description}</p>}
      </div>
      {action}
    </div>
  );
}
