/**
 * LoraModel domain type.
 *
 * Mirrors the `lora_models` table (migration `add_lora_pipeline_tables`).
 * One row per LoRA training run for a character, submitted to fal.ai's
 * `flux-lora-fast-training` queue API and polled by the training cron.
 *
 * `provider` (migration `add_lora_models_provider`) also allows
 * "wavespeed" — wavespeed.ai was tried as a webhook-driven, cheaper
 * training provider, but reverted after it kept failing real training
 * runs with an unresolved `403 Forbidden` (confirmed not an API key
 * scope/credit issue — the key had "Full access" and the account had
 * funds). fal.ai is the only provider actually used for training today;
 * the column stays in case wavespeed (or another provider) is revisited
 * later with more room to debug without spending on live test runs.
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
