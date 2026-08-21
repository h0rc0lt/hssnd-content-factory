import { Layers, Plus } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";
import type { ReferenceSet } from "@/types/reference-set";

export function ReferenceSetsPanel({ referenceSets }: { referenceSets: ReferenceSet[] }) {
  return (
    <DashboardCard
      title="Reference sets"
      description="Reference image packs used as generation inputs for this character"
      headerAction={
        <Button size="sm" variant="secondary" disabled title="Reference set creation lands in Phase 2C">
          <Plus className="h-3.5 w-3.5" />
          New set
        </Button>
      }
    >
      {referenceSets.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No reference sets yet"
          description="This character has no reference image packs. Create one to unlock the Image Batch and Motion Control workflows."
          action={
            <Button size="sm" disabled title="Reference set creation lands in Phase 2C">
              <Plus className="h-3.5 w-3.5" />
              Create reference set
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {referenceSets.map((set) => (
            <div key={set.id} className="rounded-xl border border-border bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-paper">{set.name}</p>
                <span className="shrink-0 text-xs text-mist">{set.itemCount} items</span>
              </div>
              {set.description && <p className="mt-1 text-sm text-mist">{set.description}</p>}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {set.tags.map((tag) => (
                  <Badge key={tag} tone="mist">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
