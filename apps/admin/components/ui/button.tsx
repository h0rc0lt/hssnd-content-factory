import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/70 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-signal to-flow text-void font-semibold hover:opacity-90 shadow-glow-signal",
        secondary:
          "bg-surface text-paper border border-border hover:border-signal/40 hover:bg-white/[0.06]",
        ghost: "text-mist hover:text-paper hover:bg-white/[0.06]",
        outline:
          "border border-border text-paper hover:border-signal/50 hover:text-signal bg-transparent",
        destructive: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9 shrink-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
