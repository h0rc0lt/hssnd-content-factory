import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Users, ImagePlus, Workflow, CheckSquare } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { CharacterAvatar } from "@/components/characters/CharacterAvatar";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getCharacters } from "@/lib/data/characters";
import type { DashboardStats } from "@/types/dashboard";
import type { LucideIcon } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-paper">Dashboard</h1>
        <p className="mt-1 max-w-2xl text-sm text-mist">
          Cross-character overview. Every number below is aggregated across
          all characters in the system — nothing on this page is specific to
          one influencer.
        </p>
      </div>

      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsGrid />
      </Suspense>

      <DashboardCard
        title="Characters"
        description="Jump into a Character Studio"
        headerAction={
          <Link href="/characters">
            <Button variant="secondary" size="sm">
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <Suspense fallback={<CharacterListSkeleton />}>
          <CharacterQuickList />
        </Suspense>
      </DashboardCard>
    </div>
  );
}

type StatItem = {
  label: string;
  value: number;
  icon: LucideIcon;
  accent: "signal" | "flow" | "pulse";
};

async function StatsGrid() {
  const stats: DashboardStats = await getDashboardStats();
  const items: StatItem[] = [
    { label: "Active characters", value: stats.activeCharacterCount, icon: Users, accent: "signal" },
    { label: "Media assets this week", value: stats.mediaAssetsThisWeek, icon: ImagePlus, accent: "flow" },
    { label: "Workflow runs in progress", value: stats.workflowRunsInProgress, icon: Workflow, accent: "pulse" },
    { label: "Pending approvals", value: stats.pendingApprovals, icon: CheckSquare, accent: "signal" },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <DashboardCard key={item.label} accent={item.accent}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-mist">{item.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-paper">{item.value}</p>
            </div>
            <item.icon className="h-5 w-5 text-mist" strokeWidth={1.75} />
          </div>
        </DashboardCard>
      ))}
    </div>
  );
}

function StatsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading dashboard stats">
      {Array.from({ length: 4 }).map((_, i) => (
        <DashboardCard key={i}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-12" />
        </DashboardCard>
      ))}
    </div>
  );
}

async function CharacterQuickList() {
  const characters = await getCharacters();
  return (
    <ul className="divide-y divide-border">
      {characters.map((c) => (
        <li key={c.id}>
          <Link
            href={`/characters/${c.slug}/studio`}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 transition-opacity hover:opacity-80"
          >
            <CharacterAvatar name={c.name} accent={c.accent} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-paper">{c.name}</p>
              <p className="truncate text-xs text-mist">{c.shortBio}</p>
            </div>
            <StatusBadge status={c.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CharacterListSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading characters">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      ))}
    </div>
  );
}
