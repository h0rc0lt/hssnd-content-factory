"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard, Layers, ImagePlus, Repeat, Film, CalendarClock } from "lucide-react";
import { NavItem } from "@/components/shell/NavItem";
import type { NavConfigItem } from "@/components/shell/nav-config";

const SEGMENTS: { label: string; segment: string; icon: NavConfigItem["icon"] }[] = [
  { label: "Overview", segment: "", icon: LayoutDashboard },
  { label: "Reference Sets", segment: "reference-sets", icon: Layers },
  { label: "Image Batch", segment: "image-batch", icon: ImagePlus },
  { label: "Character Swap", segment: "character-swap", icon: Repeat },
  { label: "Motion Control", segment: "motion-control", icon: Film },
  { label: "Scheduler", segment: "scheduler", icon: CalendarClock },
];

/**
 * Tabs inside a single Character Studio. Reuses the same NavItem primitive
 * as the main app Sidebar (same active/inactive styling everywhere) — the
 * only thing specific to this component is building hrefs from the current
 * character's slug, which is the one and only character-specific value
 * that flows through the whole Studio.
 */
export function StudioNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/characters/${slug}/studio`;

  return (
    <nav className="flex gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible">
      {SEGMENTS.map((s) => {
        const href = s.segment ? `${base}/${s.segment}` : base;
        const item: NavConfigItem = { label: s.label, href, icon: s.icon, implemented: true };
        return <NavItem key={s.label} item={item} active={pathname === href} />;
      })}
    </nav>
  );
}
