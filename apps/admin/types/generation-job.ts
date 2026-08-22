/**
 * GenerationJob domain type.
 *
 * Mirrors the `generation_jobs` table (migration `add_lora_pipeline_tables`).
 * One row per reference-image generation call against a trained LoRA
 * (`fal-ai/flux-lora` inference), submitted to fal.ai's queue API and polled
 * by the generation cron. On success, `resultMediaAssetId` points at the
 * `media_assets` row holding the actual image — generated images are not
 * stored in a separate table, they reuse the same generic media store as
 * every other asset in the system.
 */

export type GenerationJobStatus = "queued" | "processing" | "succeeded" | "failed";

export interface GenerationJob {
  id: string;
  characterId: string;
  loraModelId: string | null;
  /** Key into the static prompt template catalog (lib/data/prompt-templates.ts). */
  promptKey: string;
  promptText: string;
  status: GenerationJobStatus;
  falRequestId: string | null;
  resultMediaAssetId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
