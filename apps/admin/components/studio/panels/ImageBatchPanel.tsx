import Link from "next/link";
import { Layers, Sparkles } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";
import type { ReferenceSet } from "@/types/reference-set";
import type { Character } from "@/types/character";

/**
 * Form UI only — Phase 2A. Submitting this calls
 * POST /api/workflows/image-batch -> n8n in Phase 2D. Every field here maps
 * 1:1 to that route's request body (see Phase 1, Section 5).
 */
export function ImageBatchPanel({
  character,
  referenceSets,
}: {
  character: Character;
  referenceSets: ReferenceSet[];
}) {
  if (referenceSets.length === 0) {
    return (
      <DashboardCard title="Image batch generator">
        <EmptyState
          icon={Layers}
          title="No reference sets to generate from"
          description={`${character.name} doesn't have any reference sets yet. Create one first — every image batch needs a reference set as its input.`}
          action={
            <Link href={`/characters/${character.slug}/studio/reference-sets`}>
              <Button size="sm" variant="secondary">
                Go to Reference Sets
              </Button>
            </Link>
          }
        />
      </DashboardCard>
    );
  }

  return (
    <DashboardCard
      title="Image batch generator"
      description="Generate a new batch of images from a reference set"
    >
      <div className="space-y-5">
        <Field label="Reference set">
          <select
            disabled
            className="w-full rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm text-paper disabled:cursor-not-allowed"
            defaultValue={referenceSets[0].id}
          >
            {referenceSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name} ({set.itemCount} items)
              </option>
            ))}
          </select>
        </Field>

        <Field label="Batch size">
          <select
            disabled
            defaultValue={8}
            className="w-full rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm text-paper disabled:cursor-not-allowed"
          >
            {[4, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n} images
              </option>
            ))}
          </select>
        </Field>

        <Field label="Style preset">
          <select
            disabled
            className="w-full rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm text-paper disabled:cursor-not-allowed"
          >
            <option>Default ({String(character.defaultStyleProfile.mood ?? "character default")})</option>
          </select>
        </Field>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-mist">Wired to the generation pipeline in Phase 2D.</p>
          <Button disabled title="Enabled once /api/workflows/image-batch is wired to n8n">
            <Sparkles className="h-3.5 w-3.5" />
            Generate batch
          </Button>
        </div>
      </div>
    </DashboardCard>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-mist">{label}</label>
      {children}
    </div>
  );
}
