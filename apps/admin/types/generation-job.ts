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

/** 'fal' jobs are polled by /api/cron/poll-generation; 'kie.ai' jobs are
 *  resolved by kie.ai POSTing to /api/webhooks/kie instead — see migration
 *  add_generation_jobs_provider and /api/generate's doc comment. */
export type GenerationJobProvider = "fal" | "kie.ai";

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
  provider: GenerationJobProvider;
  /** fal.ai's request_id for a 'fal' job, or kie.ai's taskId for a 'kie.ai'
   *  job — either way, the id the completion callback (poll or webhook)
   *  uses to find this row again. */
  falRequestId: string | null;
  /** Which endpoint/model this job was submitted to, scoped by `provider`
   *  (e.g. "fal-ai/flux-lora" or "flux-2/pro-image-to-image") — see
   *  migration add_generation_jobs_fal_endpoint. */
  falEndpoint: string;
  resultMediaAssetId: string | null;
  /** Best-effort per-image USD estimate, set at submission time from a
   *  static price table (lib/kie/providers.ts, or FLUX_LORA_PRICE_USD in
   *  app/api/generate/route.ts for flux-lora) — not read back from any
   *  provider invoice. Null for older jobs created before this column
   *  existed. See migration add_generation_jobs_cost_usd. */
  costUsd: number | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
