import type { Character } from "@/types/character";
import type { CharacterUpload } from "@/types/character-upload";
import type { LoraModel } from "@/types/lora-model";
import type { GenerationJob } from "@/types/generation-job";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  mapCharacterRow,
  mapCharacterUploadRow,
  mapLoraModelRow,
  mapGenerationJobRow,
} from "@/lib/supabase/mappers";

/**
 * LoRA pipeline data-access layer — Phase 2C.
 *
 * Covers character_uploads, lora_models, and generation_jobs (migration
 * `add_lora_pipeline_tables`). This is the first write path in the app —
 * everything in lib/data/characters.ts and lib/data/studio.ts up to now
 * has been read-only. Same rule as everywhere else: character_id is a
 * plain parameter, no character gets special-cased handling.
 */

// ---------------------------------------------------------------------------
// characters (write side) — createCharacter lives here rather than in
// lib/data/characters.ts to keep that file read-only/Phase-2B-only; this
// file owns every write introduced in Phase 2C.
// ---------------------------------------------------------------------------

export async function getCharacterById(id: string): Promise<Character | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load character: ${error.message}`);
  }
  return data ? mapCharacterRow(data) : null;
}

export interface CreateCharacterInput {
  name: string;
  slug: string;
  shortBio?: string;
}

export async function createCharacter(input: CreateCharacterInput): Promise<Character> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("characters")
    .insert({
      name: input.name,
      slug: input.slug,
      short_bio: input.shortBio ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create character: ${error.message}`);
  }
  return mapCharacterRow(data);
}

/**
 * Permanently deletes a character and everything scoped to it. Most
 * character-referencing tables cascade on delete (character_uploads,
 * lora_models, generation_jobs, reference_sets, scheduled_posts,
 * captions_history — confirmed from the live FK constraints, not
 * assumed), so a plain `DELETE FROM characters` is enough for those.
 * `workflow_runs` and `agent_action_log` are the two exceptions — their
 * FKs are `ON DELETE NO ACTION`, so a populated row there would block the
 * character delete outright; both are cleared first defensively (currently
 * always empty in this app — Workflow Center/OpenClaw integration isn't
 * wired up yet — so this is a no-op today, but cheap insurance against a
 * confusing FK-violation error later). `media_assets` rows for this
 * character survive (their FK is `ON DELETE SET NULL`) since they're
 * shared with the cross-character Media Library — deleting a character
 * shouldn't silently delete images already in that gallery.
 *
 * This does NOT delete the underlying Supabase Storage files (uploaded
 * reference images, if any weren't already re-hosted elsewhere) — out of
 * scope for a personal tool where storage cost is negligible; the DB rows
 * pointing at them are gone either way, so nothing in the app can surface
 * them again.
 */
export async function deleteCharacter(id: string): Promise<void> {
  const supabase = getSupabaseServerClient();

  await supabase.from("agent_action_log").delete().eq("character_id", id);
  await supabase.from("workflow_runs").delete().eq("character_id", id);

  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) {
    throw new Error(`Failed to delete character: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// character_uploads
// ---------------------------------------------------------------------------

export interface CreateCharacterUploadInput {
  characterId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes?: number;
}

export async function createCharacterUpload(
  input: CreateCharacterUploadInput
): Promise<CharacterUpload> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("character_uploads")
    .insert({
      character_id: input.characterId,
      storage_path: input.storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      file_size_bytes: input.fileSizeBytes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to record character upload: ${error.message}`);
  }
  return mapCharacterUploadRow(data);
}

export async function getUploadsForCharacter(characterId: string): Promise<CharacterUpload[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("character_uploads")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load uploads for character: ${error.message}`);
  }
  return (data ?? []).map(mapCharacterUploadRow);
}

// ---------------------------------------------------------------------------
// lora_models
// ---------------------------------------------------------------------------

/** `provider` defaults to "fal" via the DB column default. wavespeed.ai
 *  was tried as a training provider and reverted (unresolved 403
 *  Forbidden on real runs, despite a funded, full-access API key — see
 *  README) but the column stays in case it's revisited later. */
export async function createLoraModel(
  characterId: string,
  provider?: LoraModel["provider"]
): Promise<LoraModel> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lora_models")
    .insert({
      character_id: characterId,
      ...(provider !== undefined && { provider }),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create LoRA model record: ${error.message}`);
  }
  return mapLoraModelRow(data);
}

export interface UpdateLoraModelInput {
  status?: LoraModel["status"];
  falRequestId?: string | null;
  triggerWord?: string | null;
  weightsUrl?: string | null;
  trainingStartedAt?: string | null;
  trainingCompletedAt?: string | null;
  error?: string | null;
}

export async function updateLoraModel(
  id: string,
  input: UpdateLoraModelInput
): Promise<LoraModel> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lora_models")
    .update({
      ...(input.status !== undefined && { status: input.status }),
      ...(input.falRequestId !== undefined && { fal_request_id: input.falRequestId }),
      ...(input.triggerWord !== undefined && { trigger_word: input.triggerWord }),
      ...(input.weightsUrl !== undefined && { weights_url: input.weightsUrl }),
      ...(input.trainingStartedAt !== undefined && {
        training_started_at: input.trainingStartedAt,
      }),
      ...(input.trainingCompletedAt !== undefined && {
        training_completed_at: input.trainingCompletedAt,
      }),
      ...(input.error !== undefined && { error: input.error }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update LoRA model: ${error.message}`);
  }
  return mapLoraModelRow(data);
}

export async function getLatestLoraModelForCharacter(
  characterId: string
): Promise<LoraModel | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lora_models")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load LoRA model for character: ${error.message}`);
  }
  return data ? mapLoraModelRow(data) : null;
}

/** Queried by the training-poll cron for every run still in flight.
 *  Scoped to provider="fal" — the only provider currently in use, see
 *  createLoraModel's doc comment. */
export async function getInFlightLoraModels(): Promise<LoraModel[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lora_models")
    .select("*")
    .eq("provider", "fal")
    .in("status", ["queued", "training"])
    .not("fal_request_id", "is", null);

  if (error) {
    throw new Error(`Failed to load in-flight LoRA models: ${error.message}`);
  }
  return (data ?? []).map(mapLoraModelRow);
}

// ---------------------------------------------------------------------------
// generation_jobs
// ---------------------------------------------------------------------------

export interface CreateGenerationJobInput {
  characterId: string;
  /** Null for a reference-image-based job (nano-banana / nano-banana-pro)
   *  — it has no trained LoRA to reference, identity comes from reference
   *  images passed straight to the provider instead. */
  loraModelId: string | null;
  promptKey: string;
  promptText: string;
  /** Defaults to "fal-ai/flux-lora" (the Image Batch text-to-image
   *  endpoint) via the DB column default — pass "fal-ai/flux-lora/image-to-image"
   *  for a Character Swap job, or a kie.ai model id (e.g.
   *  "google/nano-banana-edit") for a kie.ai job. */
  falEndpoint?: string;
  /** Defaults to "fal" via the DB column default. Pass "kie.ai" for a job
   *  resolved by the kie.ai webhook instead of the fal poll cron — see
   *  types/generation-job.ts and migration add_generation_jobs_provider. */
  provider?: GenerationJob["provider"];
}

export async function createGenerationJob(
  input: CreateGenerationJobInput
): Promise<GenerationJob> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .insert({
      character_id: input.characterId,
      lora_model_id: input.loraModelId,
      prompt_key: input.promptKey,
      prompt_text: input.promptText,
      ...(input.falEndpoint !== undefined && { fal_endpoint: input.falEndpoint }),
      ...(input.provider !== undefined && { provider: input.provider }),
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to create generation job: ${error.message}`);
  }
  return mapGenerationJobRow(data);
}

export interface UpdateGenerationJobInput {
  status?: GenerationJob["status"];
  falRequestId?: string | null;
  resultMediaAssetId?: string | null;
  error?: string | null;
}

export async function updateGenerationJob(
  id: string,
  input: UpdateGenerationJobInput
): Promise<GenerationJob> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .update({
      ...(input.status !== undefined && { status: input.status }),
      ...(input.falRequestId !== undefined && { fal_request_id: input.falRequestId }),
      ...(input.resultMediaAssetId !== undefined && {
        result_media_asset_id: input.resultMediaAssetId,
      }),
      ...(input.error !== undefined && { error: input.error }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to update generation job: ${error.message}`);
  }
  return mapGenerationJobRow(data);
}

/** Queried by the generation-poll cron for every fal job still in flight.
 *  Scoped to provider="fal" — kie.ai jobs are resolved by their own webhook
 *  (/api/webhooks/kie) instead, never by this poll, even though they also
 *  carry a non-null fal_request_id (kie.ai's taskId, reused generically —
 *  see types/generation-job.ts). */
export async function getInFlightGenerationJobs(): Promise<GenerationJob[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("provider", "fal")
    .in("status", ["queued", "processing"])
    .not("fal_request_id", "is", null);

  if (error) {
    throw new Error(`Failed to load in-flight generation jobs: ${error.message}`);
  }
  return (data ?? []).map(mapGenerationJobRow);
}

/** Looked up by /api/webhooks/kie using the taskId kie.ai's callback body
 *  carries — the same id this job's fal_request_id was set to at submit
 *  time (see /api/generate's kie.ai branch). */
export async function getGenerationJobByProviderJobId(
  providerJobId: string
): Promise<GenerationJob | null> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("provider", "kie.ai")
    .eq("fal_request_id", providerJobId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load generation job by provider job id: ${error.message}`);
  }
  return data ? mapGenerationJobRow(data) : null;
}

/** Recent generation jobs for one character — status feedback for the
 *  Image Batch panel. There's no live polling on the client, same as the
 *  training flow: this is a snapshot as of the current page load. */
export async function getGenerationJobsForCharacter(
  characterId: string,
  limit = 20
): Promise<GenerationJob[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load generation jobs for character: ${error.message}`);
  }
  return (data ?? []).map(mapGenerationJobRow);
}

// ---------------------------------------------------------------------------
// media_assets (write side) — the landing spot for a succeeded generation
// job's output image. Reuses the existing generic media store rather than
// a dedicated reference_images table (see Phase 2C schema review).
// ---------------------------------------------------------------------------

export interface CreateGeneratedMediaAssetInput {
  characterId: string;
  /** Omitted for LoRA-generated images — canonicalUrl points at fal.ai's
   *  own hosted output directly rather than a re-uploaded Supabase Storage
   *  object (storage_path is nullable in the schema for exactly this case,
   *  same as lora_models.weights_url never gets re-hosted either). */
  storagePath?: string;
  canonicalUrl: string;
  width?: number;
  height?: number;
  label: string;
}

export async function createGeneratedMediaAsset(
  input: CreateGeneratedMediaAssetInput
): Promise<string> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      type: "image",
      origin: "fal",
      character_id: input.characterId,
      storage_path: input.storagePath ?? null,
      canonical_url: input.canonicalUrl,
      width: input.width ?? null,
      height: input.height ?? null,
      status: "raw",
      meta: { label: input.label },
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to record generated media asset: ${error.message}`);
  }
  return data.id as string;
}
