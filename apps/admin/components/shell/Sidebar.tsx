"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { NAV_ITEMS } from "./nav-config";
import { NavItem } from "./NavItem";
import { cn } from "@/lib/utils";

function isItemActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full w-64 flex-col border-r border-border bg-surface/40 backdrop-blur-sm", className)}>
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 border-b border-border px-5 py-5"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-signal to-pulse shadow-glow-signal">
          <Sparkles className="h-4 w-4 text-void" strokeWidth={2.25} />
        </span>
        <span className="font-display text-sm font-semibold leading-tight tracking-wide text-paper">
          HSSND
          <span className="block text-[10px] font-normal uppercase tracking-[0.2em] text-mist">
            Content Factory
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.label}
            item={item}
            active={isItemActive(pathname, item.href)}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="border-t border-border px-5 py-4 text-[11px] leading-relaxed text-mist/70">
        Every character has identical capabilities — Zaranyx is one example
        record, not a special case.
      </div>
    </div>
  );
}
