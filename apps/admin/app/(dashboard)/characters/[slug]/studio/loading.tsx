import { Skeleton } from "@/components/ui/skeleton";

/**
 * File-based loading UI for the whole Studio segment — covers the initial
 * character lookup in layout.tsx plus whichever tab was requested. Panels
 * that fetch additional data of their own compose further inside this
 * boundary rather than adding a second one.
 */
export default function StudioLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading character studio">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex gap-1 lg:w-56 lg:shrink-0 lg:flex-col">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full lg:w-56" />
          ))}
        </div>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
