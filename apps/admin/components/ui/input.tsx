import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border bg-surface/60 px-3 text-sm text-paper placeholder:text-mist/60",
          "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
          "disabled:pointer-events-none disabled:opacity-40",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
