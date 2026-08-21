import { cn } from "@/lib/utils";

export interface DashboardCardProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Optional accent used for the card's hover glow + top hairline. Omit
   *  for a neutral card (most cards should be neutral — reserve accents
   *  for cards that represent something actually active/notable). */
  accent?: "signal" | "flow" | "pulse" | "none";
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned header slot — actions, a status badge, a count. */
  headerAction?: React.ReactNode;
  /** Renders content directly with no internal padding, for cards that
   *  manage their own layout (e.g. a table or a media grid). */
  bare?: boolean;
}

const ACCENT_GLOW: Record<NonNullable<DashboardCardProps["accent"]>, string> = {
  signal: "hover:shadow-glow-signal hover:border-signal/30",
  flow: "hover:shadow-glow-flow hover:border-flow/30",
  pulse: "hover:shadow-glow-pulse hover:border-pulse/30",
  none: "",
};

/**
 * The base glass panel used everywhere in the product. Business logic never
 * lives here — this component only knows about layout and visual style.
 */
export function DashboardCard({
  accent = "none",
  title,
  description,
  headerAction,
  bare = false,
  className,
  children,
  ...props
}: DashboardCardProps) {
  const hasHeader = title || description || headerAction;
  return (
    <div
      className={cn(
        "rounded-xl2 border border-border bg-surface/60 shadow-glass backdrop-blur-sm transition-[box-shadow,border-color] duration-300",
        accent !== "none" && ACCENT_GLOW[accent],
        className
      )}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="space-y-1">
            {title && <h3 className="font-display text-sm font-semibold tracking-wide text-paper">{title}</h3>}
            {description && <p className="text-xs text-mist">{description}</p>}
          </div>
          {headerAction}
        </div>
      )}
      <div className={bare ? undefined : "p-5"}>{children}</div>
    </div>
  );
}
