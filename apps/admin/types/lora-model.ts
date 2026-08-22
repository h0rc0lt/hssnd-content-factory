/**
 * LoraModel domain type.
 *
 * Mirrors the `lora_models` table (migration `add_lora_pipeline_tables`).
 * One row per LoRA training run for a character, submitted to fal.ai's
 * `flux-lora-fast-training` queue API and polled by the training cron.
 */

export type LoraModelStatus = "queued" | "training" | "ready" | "failed";

export interface LoraModel {
  id: string;
  characterId: string;
  status: LoraModelStatus;
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
