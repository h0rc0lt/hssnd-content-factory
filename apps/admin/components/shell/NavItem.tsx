import Link from "next/link";
import { cn } from "@/lib/utils";
import type { NavConfigItem } from "./nav-config";

export function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: NavConfigItem;
  active: boolean;
  /** Called after a real (implemented) nav item is clicked — used to close
   *  the mobile drawer on navigation. */
  onNavigate?: () => void;
}) {
  const Icon = item.icon;

  if (!item.implemented || !item.href) {
    return (
      <div
        aria-disabled
        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-mist/50"
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          {item.label}
        </span>
        <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-mist/60">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "text-paper" : "text-mist hover:bg-white/[0.05] hover:text-paper"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-gradient-to-b from-signal to-flow" />
      )}
      {active && <span className="absolute inset-0 rounded-lg bg-white/[0.06]" />}
      <Icon className="relative h-4 w-4" strokeWidth={1.75} />
      <span className="relative">{item.label}</span>
    </Link>
  );
}
