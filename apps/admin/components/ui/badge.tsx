import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { STATUS_TOKEN } from "@/lib/theme/tokens";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        signal: "border-signal/30 bg-signal/10 text-signal",
        flow: "border-flow/30 bg-flow/10 text-flow",
        pulse: "border-pulse/30 bg-pulse/10 text-pulse",
        amber: "border-amber/30 bg-amber/10 text-amber",
        success: "border-success/30 bg-success/10 text-success",
        danger: "border-danger/30 bg-danger/10 text-danger",
        mist: "border-border bg-white/[0.03] text-mist",
      },
    },
    defaultVariants: {
      tone: "mist",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/** Renders a status string (e.g. a ScheduledPostStatus, WorkflowRunStatus,
 *  MediaAssetStatus...) with the shared status -> color mapping, and a
 *  human-readable label ("pending_approval" -> "Pending approval"). Use this
 *  instead of <Badge> directly whenever the value is a domain status, so
 *  every panel renders the same status the same way. */
function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = (STATUS_TOKEN as Record<string, BadgeProps["tone"]>)[status] ?? "mist";
  const label = status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return (
    <Badge tone={tone} className={className}>
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "signal" && "bg-signal",
          tone === "flow" && "bg-flow",
          tone === "pulse" && "bg-pulse",
          tone === "amber" && "bg-amber",
          tone === "success" && "bg-success",
          tone === "danger" && "bg-danger",
          tone === "mist" && "bg-mist"
        )}
      />
      {label}
    </Badge>
  );
}

export { Badge, StatusBadge, badgeVariants };
