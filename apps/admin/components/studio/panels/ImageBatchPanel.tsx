"use client";

import { useEffect, useState } from "react";
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
import { KIE_PROVIDERS, type KieProviderKey } from "@/lib/kie/providers";

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
  const loraReady = loraModel?.status === "ready";

  if (uploads.length === 0) {
    return <TrainingSetup character={character} uploads={uploads} loraModel={loraModel} />;
  }

  return (
    <div className="space-y-4">
      {!loraReady && (
        <TrainingSetup character={character} uploads={uploads} loraModel={loraModel} />
      )}
      <GenerationForm character={character} loraReady={loraReady} generationJobs={generationJobs} />
    </div>
  );
}

export function TrainingSetup({
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

  const isTraining = loraModel?.status === "queued" || loraModel?.status === "training";

  return (
    <DashboardCard
      title={isTraining ? "Training in progress" : "Train a Flux LoRA"}
      description={
        isTraining
          ? `${character.name}'s LoRA is training — the kie.ai providers below work in the meantime`
          : `Optional — the kie.ai providers below work from reference images alone, but a trained LoRA is cheaper for high-volume generation`
      }
    >
      <div className="space-y-5">
        {isTraining && loraModel && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-white/[0.02] px-4 py-3">
            <StatusBadge status={loraModel.status} />
            <p className="text-sm text-mist">
              Refresh this page to check progress — the poll cron checks fal.ai every 5 minutes.
            </p>
          </div>
        )}

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

        {!isTraining && (
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
        )}

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

type Provider = "flux-lora" | KieProviderKey;

/** Upper bound on how many images a single category "Generate" click can
 *  queue — a sanity cap on the number input below, not a technical limit
 *  from any provider. */
const MAX_IMAGES_PER_BATCH = 10;

/** flux-lora plus every registered kie.ai provider (lib/kie/providers.ts)
 *  — rendered as buttons below in this order. Several of these are
 *  low-confidence guesses (see each config's `confidence` note, shown as
 *  a hover title on its button) added at the user's request to see what
 *  actually works, not because they're all expected to. */
const PROVIDER_LABEL: Record<Provider, string> = {
  "flux-lora": "Flux LoRA",
  ...Object.fromEntries(Object.values(KIE_PROVIDERS).map((p) => [p.key, p.label])),
} as Record<Provider, string>;

function GenerationForm({
  character,
  loraReady,
  generationJobs,
}: {
  character: Character;
  loraReady: boolean;
  generationJobs: GenerationJob[];
}) {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>(loraReady ? "flux-lora" : "nano-banana-pro");
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [queuedMessage, setQueuedMessage] = useState<string | null>(null);
  /** How many images to generate per category, keyed by category — defaults
   *  to that category's own template count (its prior fixed behavior) but
   *  the user can override it to anything from 1 to MAX_IMAGES_PER_BATCH.
   *  Missing entries fall back to the category's template count at render
   *  time (see the `count ?? templatesInCategory.length` below) rather than
   *  being pre-seeded, so this only needs updating when the user actually
   *  changes a value. */
  const [counts, setCounts] = useState<Record<string, number>>({});

  // generationJobs is a server-fetched prop, snapshotted at render time —
  // a job's status only ever changes here via router.refresh() re-running
  // the server render, never on its own. Without this, "Processing" jobs
  // sit stuck on screen until the user manually reloads the page, even
  // once kie.ai's webhook (or the poll cron, for flux-lora) has long since
  // resolved them. Poll every 5s while any job here is still in flight;
  // stops itself once none are (this effect re-runs whenever
  // generationJobs changes, i.e. after every successful refresh).
  useEffect(() => {
    const hasInFlightJob = generationJobs.some(
      (job) => job.status === "queued" || job.status === "processing"
    );
    if (!hasInFlightJob) return;
    const interval = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(interval);
  }, [generationJobs, router]);

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
        body: JSON.stringify({ characterId: character.id, promptKeys, provider }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to queue generation.");

      const results = (body.results ?? []) as GenerateApiResult[];
      const failedCount = results.filter((r) => r.status === "failed").length;
      const okCount = promptKeys.length - failedCount;
      const isKie = provider !== "flux-lora";
      setQueuedMessage(
        `Queued ${okCount} of ${promptKeys.length} image${promptKeys.length === 1 ? "" : "s"} ` +
          `via ${PROVIDER_LABEL[provider]}. They'll appear in Overview → Recent media once ` +
          (isKie
            ? "kie.ai's webhook delivers the result (usually well under a minute)."
            : "the poll cron picks up completion (every 5 minutes).")
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
        description={`Generate reference images for ${character.name}`}
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
        <div className="mb-4 space-y-1.5">
          <p className="text-xs font-medium text-mist">Provider</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={provider === "flux-lora" ? "default" : "secondary"}
              disabled={!loraReady}
              title={loraReady ? undefined : "Needs a ready trained LoRA — see the card above"}
              onClick={() => setProvider("flux-lora")}
            >
              Flux LoRA · ~$0.03-0.06/image
            </Button>
            {Object.values(KIE_PROVIDERS).map((config) => (
              <Button
                key={config.key}
                type="button"
                size="sm"
                variant={provider === config.key ? "default" : "secondary"}
                title={config.confidence}
                onClick={() => setProvider(config.key)}
              >
                {config.label} · ~${config.priceUsd}/image
              </Button>
            ))}
          </div>
          <p className="text-xs text-mist">
            {provider === "flux-lora"
              ? "Uses the character's trained LoRA weights — cheapest for high-volume generation."
              : `Uses up to ${KIE_PROVIDERS[provider].maxReferenceImages} of the character's ` +
                "reference uploads directly, no training needed. Via kie.ai (not the provider " +
                "directly) — cheaper, and delivers results by webhook instead of waiting on the " +
                "poll cron. Hover a provider button above for how confident its model id is — " +
                "several of these are unverified guesses and may just fail."}
          </p>
        </div>

        <div className="space-y-3">
          {categories.map((category) => {
            const templatesInCategory = PROMPT_TEMPLATES.filter((t) => t.category === category);
            const count = counts[category] ?? templatesInCategory.length;
            return (
              <div
                key={category}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-4 py-3"
              >
                <div>
                  <p className="text-sm text-paper">{PROMPT_TEMPLATE_CATEGORY_LABEL[category]}</p>
                  <p className="text-xs text-mist">
                    {templatesInCategory.length} unique pose{templatesInCategory.length === 1 ? "" : "s"}
                    {count > templatesInCategory.length ? " — poses repeat past that" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={MAX_IMAGES_PER_BATCH}
                    value={count}
                    onChange={(e) => {
                      const next = Math.min(
                        MAX_IMAGES_PER_BATCH,
                        Math.max(1, Number(e.target.value) || 1)
                      );
                      setCounts((prev) => ({ ...prev, [category]: next }));
                    }}
                    className="h-8 w-14 rounded-md border border-border bg-white/[0.02] px-2 text-center text-sm text-paper"
                    aria-label={`Number of images for ${PROMPT_TEMPLATE_CATEGORY_LABEL[category]}`}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const promptKeys = Array.from(
                        { length: count },
                        (_, i) => templatesInCategory[i % templatesInCategory.length].key
                      );
                      submitBatch(promptKeys, category);
                    }}
                    disabled={submitting !== null}
                  >
                    {submitting === category ? "Queuing…" : "Generate"}
                  </Button>
                </div>
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
