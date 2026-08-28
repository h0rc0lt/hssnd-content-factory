"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat, UploadCloud } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { uploadCharacterSwapSourceFile } from "@/lib/uploads/character-upload";
import { TrainingSetup } from "./ImageBatchPanel";
import type { Character } from "@/types/character";
import type { CharacterUpload } from "@/types/character-upload";
import type { LoraModel } from "@/types/lora-model";
import type { GenerationJob } from "@/types/generation-job";

/**
 * Character swap — Phase 2E.
 *
 * Applies a character's trained LoRA identity onto a source image the user
 * supplies: the source's pose/composition/scene is kept, the LoRA's
 * identity replaces whatever was there (fal.ai's
 * `fal-ai/flux-lora/image-to-image`, see POST /api/swap's doc comment).
 * Gated on the same LoRA-readiness check as Image Batch, and reuses that
 * panel's TrainingSetup for the same reason — there's still only one place
 * uploads/training happen for an existing character.
 *
 * Never polls live from the client — same as Image Batch and training:
 * submitting queues one generation_jobs row and the result lands in
 * Overview's Recent media / Media Library once the poll cron (every 5 min)
 * picks up completion.
 */
export function CharacterSwapPanel({
  character,
  uploads,
  loraModel,
  swapJobs,
}: {
  character: Character;
  uploads: CharacterUpload[];
  loraModel: LoraModel | null;
  swapJobs: GenerationJob[];
}) {
  if (!loraModel || loraModel.status === "failed") {
    return <TrainingSetup character={character} uploads={uploads} loraModel={loraModel} />;
  }

  if (loraModel.status === "queued" || loraModel.status === "training") {
    return (
      <DashboardCard title="Character swap" description="Training in progress">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white/[0.02] px-4 py-3">
          <StatusBadge status={loraModel.status} />
          <p className="text-sm text-mist">
            {character.name}&rsquo;s LoRA is training. Refresh this page to check progress —
            the poll cron checks fal.ai every 5 minutes.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return <SwapForm character={character} swapJobs={swapJobs} />;
}

function SwapForm({
  character,
  swapJobs,
}: {
  character: Character;
  swapJobs: GenerationJob[];
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  async function handleSwap() {
    if (!file) return;
    setSubmitting(true);
    setError(null);
    setQueuedMessage(null);
    try {
      const storagePath = await uploadCharacterSwapSourceFile(character.id, file);
      const res = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          storagePath,
          prompt: prompt.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to queue character swap.");

      setQueuedMessage(
        "Swap queued. The result will appear in Overview → Recent media and Media Library " +
          "once the poll cron picks up completion (every 5 minutes)."
      );
      setFile(null);
      setPrompt("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <DashboardCard
        title="Character swap"
        description={`Apply ${character.name}’s trained identity onto a source image`}
      >
        <div className="space-y-4">
          <label
            htmlFor="swap-file-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed border-border bg-white/[0.015] px-6 py-8 text-center transition-colors hover:border-signal/40"
          >
            <UploadCloud className="h-5 w-5 text-mist" strokeWidth={1.75} />
            <span className="text-sm text-paper">
              {file ? file.name : "Click to pick a source image"}
            </span>
            <span className="text-xs text-mist">
              The pose and composition are kept — {character.name}&rsquo;s identity replaces
              the subject.
            </span>
          </label>
          <input
            id="swap-file-input"
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          <div className="space-y-1.5">
            <Label htmlFor="swap-prompt">Extra prompt detail (optional)</Label>
            <Input
              id="swap-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. wearing a red jacket"
            />
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button onClick={handleSwap} disabled={!file || submitting}>
              <Repeat className="h-3.5 w-3.5" />
              {submitting ? "Queuing…" : "Swap"}
            </Button>
          </div>

          {queuedMessage && (
            <p className="rounded-lg border border-signal/30 bg-signal/10 px-3 py-2 text-xs text-signal">
              {queuedMessage}
            </p>
          )}
          {error && <ErrorState title="Couldn't queue swap" description={error} />}
        </div>
      </DashboardCard>

      <DashboardCard title="Recent swaps">
        {swapJobs.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="No swaps yet"
            description="Pick a source image above to run the first one."
          />
        ) : (
          <ul className="space-y-2">
            {swapJobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-3 py-2"
              >
                <span className="truncate text-sm text-paper">{job.promptText}</span>
                <StatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
