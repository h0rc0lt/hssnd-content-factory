import { cn } from "@/lib/utils";
import type { CharacterAccent } from "@/types/character";

const ACCENT_GRADIENT: Record<CharacterAccent, string> = {
  signal: "from-signal to-flow",
  flow: "from-flow to-pulse",
  pulse: "from-pulse to-signal",
};

const SIZE_CLASSES = {
  sm: "h-9 w-9 text-xs",
  md: "h-12 w-12 text-sm",
  lg: "h-16 w-16 text-lg",
} as const;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
  return initials.toUpperCase();
}

/**
 * Placeholder avatar — a gradient-and-initials mark, since no character has
 * a real reference image / avatar_media_id wired up to Supabase Storage
 * yet. Swap for an actual <Image> once media assets are real.
 */
export function CharacterAvatar({
  name,
  accent,
  size = "md",
  className,
}: {
  name: string;
  accent: CharacterAccent;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-semibold text-void",
        ACCENT_GRADIENT[accent],
        SIZE_CLASSES[size],
        className
      )}
      aria-hidden
    >
      {getInitials(name)}
    </div>
  );
}
