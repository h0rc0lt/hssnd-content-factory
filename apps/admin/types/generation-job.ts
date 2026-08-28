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
  /** Key into the static prompt template catalog (lib/data/prompt-templates.ts)
   *  for an Image Batch job, or "character_swap" for a Character Swap job
   *  (which has no catalog entry — its promptText is user-authored). */
  promptKey: string;
  promptText: string;
  status: GenerationJobStatus;
  falRequestId: string | null;
  /** Which fal.ai queue endpoint this job was submitted to — the
   *  poll-generation cron needs this to call fal.queue.status/result on the
   *  right endpoint per job (Image Batch and Character Swap use different
   *  ones; see migration add_generation_jobs_fal_endpoint). */
  falEndpoint: string;
  resultMediaAssetId: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
