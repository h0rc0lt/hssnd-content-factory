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

export async function createLoraModel(characterId: string): Promise<LoraModel> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lora_models")
    .insert({ character_id: characterId })
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

/** Queried by the training-poll cron for every run still in flight. */
export async function getInFlightLoraModels(): Promise<LoraModel[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("lora_models")
    .select("*")
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
  loraModelId: string;
  promptKey: string;
  promptText: string;
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

/** Queried by the generation-poll cron for every job still in flight. */
export async function getInFlightGenerationJobs(): Promise<GenerationJob[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*")
    .in("status", ["queued", "processing"])
    .not("fal_request_id", "is", null);

  if (error) {
    throw new Error(`Failed to load in-flight generation jobs: ${error.message}`);
  }
  return (data ?? []).map(mapGenerationJobRow);
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
