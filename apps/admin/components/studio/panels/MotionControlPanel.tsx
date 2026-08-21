import { Film, Clock3 } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import type { MotionTemplate, MotionTemplateUsage } from "@/types/motion-template";

export function MotionControlPanel({
  library,
  usage,
}: {
  library: MotionTemplate[];
  usage: MotionTemplateUsage[];
}) {
  const usageByTemplate = new Map(usage.map((u) => [u.motionTemplateId, u]));

  return (
    <div className="space-y-4">
      <DashboardCard
        title="Motion template library"
        description="Shared across every character — motion templates aren't tied to one influencer"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {library.map((template) => {
            const used = usageByTemplate.get(template.id);
            return (
              <div key={template.id} className="rounded-xl border border-border bg-white/[0.02] p-4">
                <div className="flex aspect-[9/12] items-center justify-center rounded-lg border border-dashed border-border bg-void/40 text-mist">
                  <Film className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <p className="mt-3 text-sm font-medium text-paper">{template.name}</p>
                <p className="text-xs text-mist">
                  {template.aspectRatio} · {template.durationSeconds}s
                </p>
                {used && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-signal">
                    <Clock3 className="h-3 w-3" />
                    Used {used.outputCount}× for this character
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </DashboardCard>

      <DashboardCard title="Recently used for this character" description="Pairing happens per workflow run, not on the template itself">
        {usage.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No motion runs yet"
            description="Pick a template above and a reference set to generate the first motion video for this character."
          />
        ) : (
          <ul className="space-y-2">
            {usage.map((u) => {
              const template = library.find((t) => t.id === u.motionTemplateId);
              return (
                <li key={u.motionTemplateId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-3 py-2">
                  <span className="text-sm text-paper">{template?.name ?? u.motionTemplateId}</span>
                  <Badge tone="flow">{u.outputCount} outputs</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
