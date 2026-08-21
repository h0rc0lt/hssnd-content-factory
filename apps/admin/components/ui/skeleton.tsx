import { cn } from "@/lib/utils";

/** Base loading placeholder. Compose into shapes (lines, avatars, cards)
 *  with className rather than building one-off skeleton components. */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-white/[0.06]", className)}
      {...props}
    />
  );
}

export { Skeleton };
