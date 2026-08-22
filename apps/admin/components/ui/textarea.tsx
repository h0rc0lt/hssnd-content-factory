import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-20 w-full rounded-lg border border-border bg-surface/60 px-3 py-2 text-sm text-paper placeholder:text-mist/60",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
          "disabled:pointer-events-none disabled:opacity-40",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
