import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Generic loading placeholder: a label plus a few skeleton lines/blocks.
 *  Prefer a layout-matching skeleton (see e.g. CharacterGrid's own skeleton)
 *  where the shape of the loaded content is known in advance — use this
 *  as the default when it isn't. */
export function LoadingState({
  label = "Loading…",
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}
