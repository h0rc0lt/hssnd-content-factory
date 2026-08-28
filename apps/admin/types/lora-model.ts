/**
 * LoraModel domain type.
 *
 * Mirrors the `lora_models` table (migration `add_lora_pipeline_tables`).
 * One row per LoRA training run for a character. 'fal' rows are submitted
 * to fal.ai's `flux-lora-fast-training` queue API and polled by the
 * training cron; 'wavespeed' rows are submitted to wavespeed.ai and
 * resolved by /api/webhooks/wavespeed instead (see migration
 * add_lora_models_provider) — both produce a portable `.safetensors`
 * `weightsUrl` that /api/generate and /api/swap consume identically
 * regardless of which provider trained it.
 */

export type LoraModelStatus = "queued" | "training" | "ready" | "failed";
export type LoraModelProvider = "fal" | "wavespeed";

export interface LoraModel {
  id: string;
  characterId: string;
  status: LoraModelStatus;
  provider: LoraModelProvider;
  falRequestId: string | null;
  baseModel: string;
  triggerWord: string | null;
  weightsUrl: string | null;
  trainingStartedAt: string | null;
  trainingCompletedAt: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}
