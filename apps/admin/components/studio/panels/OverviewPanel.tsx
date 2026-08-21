import { ImageIcon, Workflow, CalendarClock } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import type { MediaAsset } from "@/types/media-asset";
import type { WorkflowRun } from "@/types/workflow";
import type { ScheduledPost } from "@/types/scheduled-post";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OverviewPanel({
  recentMedia,
  recentRuns,
  upcomingPosts,
}: {
  recentMedia: MediaAsset[];
  recentRuns: WorkflowRun[];
  upcomingPosts: ScheduledPost[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <DashboardCard title="Recent media" description="Latest images and videos for this character">
        {recentMedia.length === 0 ? (
          <EmptyState
            icon={ImageIcon}
            title="No media generated yet"
            description="Run an image batch or motion workflow to see output here."
          />
        ) : (
          <ul className="space-y-2">
            {recentMedia.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-3 py-2">
                <span className="truncate text-sm text-paper">{m.label}</span>
                <StatusBadge status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <DashboardCard title="Recent workflow runs" description="Across image, motion, and swap workflows">
        {recentRuns.length === 0 ? (
          <EmptyState
            icon={Workflow}
            title="No workflow runs yet"
            description="Runs triggered from this Studio or the Content Factory agent will show up here."
          />
        ) : (
          <ul className="space-y-2">
            {recentRuns.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{r.type.replace("_", " ")}</p>
                  <p className="text-xs text-mist">{formatDateTime(r.startedAt)} · {r.triggerSource.replace("_", " ")}</p>
                </div>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>

      <DashboardCard
        title="Upcoming scheduled posts"
        description="Across every connected platform"
        className="xl:col-span-2"
      >
        {upcomingPosts.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nothing scheduled"
            description="Draft a post from the Scheduler tab once you have approved media."
          />
        ) : (
          <ul className="space-y-2">
            {upcomingPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper">{p.caption}</p>
                  <p className="text-xs capitalize text-mist">
                    {p.platform}
                    {p.scheduledAt ? ` · ${formatDateTime(p.scheduledAt)}` : ""}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
