"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, UploadCloud, X, Layers } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { uploadCharacterReferenceFile } from "@/lib/uploads/character-upload";
import {
  PROMPT_TEMPLATES,
  PROMPT_TEMPLATE_CATEGORY_LABEL,
  type PromptTemplateCategory,
} from "@/lib/data/prompt-templates";
import type { Character } from "@/types/character";
import type { CharacterUpload } from "@/types/character-upload";
import type { LoraModel } from "@/types/lora-model";
import type { GenerationJob } from "@/types/generation-job";

/**
 * Image batch generator — Phase 2D.
 *
 * Two different jobs share this one tab, deliberately: (1) getting a
 * character to a ready trained LoRA (upload references, start training) if
 * it doesn't have one yet, and (2) generating reference images from that
 * LoRA once it does. There's no other page in the Studio where uploads or
 * (re)training can happen for an EXISTING character — only character
 * creation has that flow (NewCharacterForm) — so this panel closes that gap
 * rather than adding a whole separate tab for it.
 *
 * Generation calls fal.ai directly from POST /api/generate (see that
 * route's doc comment for why, not n8n) and — like LoRA training — never
 * polls live from the client. Submitting queues one generation_jobs row per
 * selected prompt template; the poll cron (every 5 min, same GitHub Actions
 * workflow as training) picks up completion and results land in the
 * Overview tab's Recent media once ready.
 */
export function ImageBatchPanel({
  character,
  uploads,
  loraModel,
  generationJobs,
}: {
  character: Character;
  uploads: CharacterUpload[];
  loraModel: LoraModel | null;
  generationJobs: GenerationJob[];
}) {
  if (!loraModel || loraModel.status === "failed") {
    return <TrainingSetup character={character} uploads={uploads} loraModel={loraModel} />;
  }

  if (loraModel.status === "queued" || loraModel.status === "training") {
    return (
      <DashboardCard title="Image batch generator" description="Training in progress">
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

  return <GenerationForm character={character} generationJobs={generationJobs} />;
}

function TrainingSetup({
  character,
  uploads,
  loraModel,
}: {
  character: Character;
  uploads: CharacterUpload[];
  loraModel: LoraModel | null;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedCount, setUploadedCount] = useState(uploads.length);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFilesSelected(selected: FileList | null) {
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      setUploadProgress(`Uploading image ${i + 1} of ${files.length}…`);
      try {
        await uploadCharacterReferenceFile(character.id, files[i]);
        successCount += 1;
      } catch (err) {
        // One failed file shouldn't block the rest — same policy as
        // NewCharacterForm's initial upload flow.
        console.error(err);
        setError(err instanceof Error ? err.message : `Failed to upload ${files[i].name}.`);
      }
    }
    setUploadedCount((prev) => prev + successCount);
    setFiles([]);
    setUploading(false);
    setUploadProgress(null);
    router.refresh();
  }

  async function handleStartTraining() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/lora/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to start training.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <DashboardCard
      title="Train a LoRA first"
      description={`${character.name} needs a trained LoRA before it can generate reference images`}
    >
      <div className="space-y-5">
        {loraModel?.status === "failed" && (
          <ErrorState
            title="Last training run failed"
            description={loraModel.error ?? "Unknown error."}
          />
        )}

        <div className="space-y-3">
          <label
            htmlFor="batch-file-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed border-border bg-white/[0.015] px-6 py-8 text-center transition-colors hover:border-signal/40"
          >
            <UploadCloud className="h-5 w-5 text-mist" strokeWidth={1.75} />
            <span className="text-sm text-paper">Click to add reference images</span>
            <span className="text-xs text-mist">
              {uploadedCount} already uploaded · PNG or JPG, multiple files supported
            </span>
          </label>
          <input
            id="batch-file-input"
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          {files.length > 0 && (
            <>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {files.map((file, i) => (
                  <li
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-paper"
                  >
                    <span className="truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-mist hover:text-danger"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <Button size="sm" onClick={handleUpload} disabled={uploading}>
                {uploading
                  ? uploadProgress ?? "Uploading…"
                  : `Upload ${files.length} image${files.length === 1 ? "" : "s"}`}
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-mist">
            {uploadedCount === 0
              ? "Add at least one reference image to start training."
              : `Ready to train on ${uploadedCount} reference image${uploadedCount === 1 ? "" : "s"}.`}
          </p>
          <Button onClick={handleStartTraining} disabled={uploadedCount === 0 || starting}>
            <Sparkles className="h-3.5 w-3.5" />
            {starting ? "Starting…" : "Start training"}
          </Button>
        </div>

        {error && <ErrorState title="Something went wrong" description={error} />}
      </div>
    </DashboardCard>
  );
}

interface GenerateApiResult {
  promptKey: string;
  status: string;
  error?: string;
}

function GenerationForm({
  character,
  generationJobs,
}: {
  character: Character;
  generationJobs: GenerationJob[];
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);

  const categories = Array.from(
    new Set(PROMPT_TEMPLATES.map((t) => t.category))
  ) as PromptTemplateCategory[];

  async function submitBatch(promptKeys: string[], submittingKey: string) {
    setSubmitting(submittingKey);
    setError(null);
    setQueuedMessage(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id, promptKeys }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to queue generation.");

      const results = (body.results ?? []) as GenerateApiResult[];
      const failedCount = results.filter((r) => r.status === "failed").length;
      const queuedCount = promptKeys.length - failedCount;
      setQueuedMessage(
        `Queued ${queuedCount} of ${promptKeys.length} image${promptKeys.length === 1 ? "" : "s"}. ` +
          "They'll appear in Overview → Recent media once the poll cron picks up completion (every 5 minutes)."
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(null);
    }
  }

  const recentJobs = generationJobs.slice(0, 8);

  return (
    <div className="space-y-4">
      <DashboardCard
        title="Image batch generator"
        description={`Generate reference images from ${character.name}’s trained LoRA`}
        headerAction={
          <Button
            size="sm"
            onClick={() => submitBatch(PROMPT_TEMPLATES.map((t) => t.key), "all")}
            disabled={submitting !== null}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {submitting === "all" ? "Queuing…" : `Generate all ${PROMPT_TEMPLATES.length}`}
          </Button>
        }
      >
        <div className="space-y-3">
          {categories.map((category) => {
            const templatesInCategory = PROMPT_TEMPLATES.filter((t) => t.category === category);
            return (
              <div
                key={category}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-4 py-3"
              >
                <div>
                  <p className="text-sm text-paper">{PROMPT_TEMPLATE_CATEGORY_LABEL[category]}</p>
                  <p className="text-xs text-mist">{templatesInCategory.length} images</p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => submitBatch(templatesInCategory.map((t) => t.key), category)}
                  disabled={submitting !== null}
                >
                  {submitting === category ? "Queuing…" : "Generate"}
                </Button>
              </div>
            );
          })}
        </div>

        {queuedMessage && (
          <p className="mt-4 rounded-lg border border-signal/30 bg-signal/10 px-3 py-2 text-xs text-signal">
            {queuedMessage}
          </p>
        )}
        {error && (
          <div className="mt-4">
            <ErrorState title="Couldn't queue generation" description={error} />
          </div>
        )}
      </DashboardCard>

      <DashboardCard title="Recent generation jobs">
        {recentJobs.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No generation jobs yet"
            description="Generate a batch above to see status here."
          />
        ) : (
          <ul className="space-y-2">
            {recentJobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-3 py-2"
              >
                <span className="truncate text-sm text-paper">
                  {PROMPT_TEMPLATES.find((t) => t.key === job.promptKey)?.label ?? job.promptKey}
                </span>
                <StatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </DashboardCard>
    </div>
  );
}
