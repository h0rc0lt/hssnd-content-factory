import { CalendarClock } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import type { ScheduledPost } from "@/types/scheduled-post";

function formatDateTime(iso?: string) {
  if (!iso) return "Not scheduled";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SchedulerPanel({ posts }: { posts: ScheduledPost[] }) {
  return (
    <DashboardCard title="Scheduler" description="Drafts, approvals, and scheduled posts for this character">
      {posts.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No posts drafted yet"
          description="Approved media from Image Batch or Motion Control can be turned into a draft post here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-mist">
                <th className="pb-2 pr-4 font-medium">Caption</th>
                <th className="pb-2 pr-4 font-medium">Platform</th>
                <th className="pb-2 pr-4 font-medium">Scheduled</th>
                <th className="pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="max-w-xs truncate py-3 pr-4 text-paper">{post.caption}</td>
                  <td className="py-3 pr-4 capitalize text-mist">{post.platform}</td>
                  <td className="py-3 pr-4 text-mist">{formatDateTime(post.scheduledAt)}</td>
                  <td className="py-3">
                    <StatusBadge status={post.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}
