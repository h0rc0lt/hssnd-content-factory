/**
 * CharacterUpload domain type.
 *
 * Mirrors the `character_uploads` table (migration `add_lora_pipeline_tables`).
 * A raw reference image the user uploaded for a character, before it's been
 * consumed by a LoRA training run. `character_id` is a plain required field
 * here like everywhere else — no character gets special-cased upload logic.
 */

export type CharacterUploadStatus =
  | "uploaded"
  | "processing"
  | "used_in_training"
  | "failed";

export interface CharacterUpload {
  id: string;
  characterId: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number | null;
  status: CharacterUploadStatus;
  createdAt: string;
}
