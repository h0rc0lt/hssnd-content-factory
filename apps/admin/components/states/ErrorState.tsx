import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Error state: state what happened and how to recover, in the interface's
 *  voice — no apologizing, no vagueness about what went wrong. */
export function ErrorState({
  title = "Couldn't load this",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl2 border border-danger/25 bg-danger/[0.04] px-6 py-14 text-center",
        className
      )}
    >
      <div className="rounded-full border border-danger/30 bg-danger/10 p-3 text-danger">
        <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-paper">{title}</p>
        {description && <p className="max-w-sm text-sm text-mist">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="destructive" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
