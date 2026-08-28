import type { Character, CharacterAccent, CharacterStatus } from "@/types/character";
import type { ReferenceSet, ReferenceSetStatus } from "@/types/reference-set";
import type { MotionTemplate } from "@/types/motion-template";
import type { MediaAsset, MediaAssetStatus, MediaAssetType } from "@/types/media-asset";
import type { WorkflowRun, WorkflowRunStatus, WorkflowTriggerSource, WorkflowType } from "@/types/workflow";
import type { ScheduledPost, ScheduledPostStatus, Platform } from "@/types/scheduled-post";
import type { CharacterUpload, CharacterUploadStatus } from "@/types/character-upload";
import type { LoraModel, LoraModelStatus } from "@/types/lora-model";
import type { GenerationJob, GenerationJobStatus, GenerationJobProvider } from "@/types/generation-job";
import type { Database } from "./database.types";

/**
 * DB row -> domain type converters.
 *
 * This is the one seam where snake_case (DB) meets camelCase (app layer) —
 * no component or lib/data/* consumer ever sees a raw row.
 */

type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];

const ACCENTS: CharacterAccent[] = ["signal", "flow", "pulse"];

/** `accent` has no DB column — it's a cosmetic-only value (see
 *  types/character.ts). Deriving it deterministically from the row id
 *  means the same character always renders with the same accent across
 *  requests/renders without needing a column or client-side state. */
function deriveAccent(id: string): CharacterAccent {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return ACCENTS[sum % ACCENTS.length];
}

export function mapCharacterRow(row: CharacterRow): Character {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortBio: row.short_bio ?? "",
    status: row.status as CharacterStatus,
    accent: deriveAccent(row.id),
    defaultStyleProfile: (row.default_style_profile as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// reference_sets — itemCount comes from a `reference_set_items(count)`
// embedded select (see lib/data/studio.ts), not a column on the table
// itself, so the row type here is widened locally to include it.
// ---------------------------------------------------------------------------
type ReferenceSetRow = Database["public"]["Tables"]["reference_sets"]["Row"];
export type ReferenceSetRowWithCount = ReferenceSetRow & {
  reference_set_items: { count: number }[];
};

export function mapReferenceSetRow(row: ReferenceSetRowWithCount): ReferenceSet {
  return {
    id: row.id,
    characterId: row.character_id,
    name: row.name,
    description: row.description ?? undefined,
    tags: row.tags,
    itemCount: row.reference_set_items?.[0]?.count ?? 0,
    status: row.status as ReferenceSetStatus,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// motion_templates — no character_id by design (see types/motion-template.ts)
// ---------------------------------------------------------------------------
type MotionTemplateRow = Database["public"]["Tables"]["motion_templates"]["Row"];

export function mapMotionTemplateRow(row: MotionTemplateRow): MotionTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    durationSeconds: row.duration_seconds ?? 0,
    aspectRatio: row.aspect_ratio ?? "",
    tags: row.tags,
    status: row.status as "active" | "archived",
  };
}

// ---------------------------------------------------------------------------
// media_assets — the domain type's `label` has no direct DB column; it's
// derived from meta.label when present (set by the future generation
// workflow), falling back to a generic "<type> asset" description.
// ---------------------------------------------------------------------------
type MediaAssetRow = Database["public"]["Tables"]["media_assets"]["Row"];

export function mapMediaAssetRow(row: MediaAssetRow): MediaAsset {
  const meta = (row.meta as Record<string, unknown>) ?? {};
  const label = typeof meta.label === "string" ? meta.label : `${row.type} asset`;
  return {
    id: row.id,
    characterId: row.character_id ?? "",
    type: row.type as MediaAssetType,
    status: row.status as MediaAssetStatus,
    label,
    canonicalUrl: row.canonical_url,
    width: row.width,
    height: row.height,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// workflow_runs — `type` lives on the related workflow_definitions row, not
// on workflow_runs itself, so the row here is widened for the embedded join.
// ---------------------------------------------------------------------------
type WorkflowRunRow = Database["public"]["Tables"]["workflow_runs"]["Row"];
export type WorkflowRunRowWithDefinition = WorkflowRunRow & {
  workflow_definitions: { type: string } | null;
};

export function mapWorkflowRunRow(row: WorkflowRunRowWithDefinition): WorkflowRun {
  return {
    id: row.id,
    characterId: row.character_id,
    type: (row.workflow_definitions?.type ?? "image_batch") as WorkflowType,
    status: row.status as WorkflowRunStatus,
    triggerSource: row.trigger_source as WorkflowTriggerSource,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// scheduled_posts — `platform` lives two hops away
// (scheduled_post_targets -> platform_accounts.platform), not on
// scheduled_posts itself. The Phase 2A domain type flattens this to a
// single platform per post (documented in types/scheduled-post.ts as
// "ahead of the full scheduled_post_targets join"). Until the Scheduler's
// real CRUD lands, this only ever sees the first target, if any.
// ---------------------------------------------------------------------------
type ScheduledPostRow = Database["public"]["Tables"]["scheduled_posts"]["Row"];
export type ScheduledPostRowWithTarget = ScheduledPostRow & {
  scheduled_post_targets: { platform_accounts: { platform: string } | null }[];
};

export function mapScheduledPostRow(row: ScheduledPostRowWithTarget): ScheduledPost {
  const firstTargetPlatform = row.scheduled_post_targets?.[0]?.platform_accounts?.platform;
  return {
    id: row.id,
    characterId: row.character_id,
    caption: row.caption ?? "",
    platform: (firstTargetPlatform ?? "instagram") as Platform,
    status: row.status as ScheduledPostStatus,
    scheduledAt: row.scheduled_at ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// character_uploads / lora_models / generation_jobs — Phase 2C LoRA pipeline.
// Same character_id-as-plain-field convention as every other table; no row
// here ever branches on which character it belongs to.
// ---------------------------------------------------------------------------
type CharacterUploadRow = Database["public"]["Tables"]["character_uploads"]["Row"];

export function mapCharacterUploadRow(row: CharacterUploadRow): CharacterUpload {
  return {
    id: row.id,
    characterId: row.character_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    status: row.status as CharacterUploadStatus,
    createdAt: row.created_at,
  };
}

type LoraModelRow = Database["public"]["Tables"]["lora_models"]["Row"];

export function mapLoraModelRow(row: LoraModelRow): LoraModel {
  return {
    id: row.id,
    characterId: row.character_id,
    status: row.status as LoraModelStatus,
    falRequestId: row.fal_request_id,
    baseModel: row.base_model,
    triggerWord: row.trigger_word,
    weightsUrl: row.weights_url,
    trainingStartedAt: row.training_started_at,
    trainingCompletedAt: row.training_completed_at,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type GenerationJobRow = Database["public"]["Tables"]["generation_jobs"]["Row"];

export function mapGenerationJobRow(row: GenerationJobRow): GenerationJob {
  return {
    id: row.id,
    characterId: row.character_id,
    loraModelId: row.lora_model_id,
    promptKey: row.prompt_key,
    promptText: row.prompt_text,
    status: row.status as GenerationJobStatus,
    provider: row.provider as GenerationJobProvider,
    falRequestId: row.fal_request_id,
    falEndpoint: row.fal_endpoint,
    resultMediaAssetId: row.result_media_asset_id,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
