/** Mirrors the `media_assets` table (subset of fields needed for Phase 2A UI). */

export type MediaAssetType = "image" | "video" | "audio" | "other";

export type MediaAssetStatus =
  | "raw"
  | "approved"
  | "queued"
  | "used"
  | "rejected"
  | "archived";

export interface MediaAsset {
  id: string;
  characterId: string;
  type: MediaAssetType;
  status: MediaAssetStatus;
  /** Human-readable placeholder label — falls back to this when a real
   *  thumbnail isn't renderable (video/audio, or a row with no canonicalUrl). */
  label: string;
  /** Publicly reachable image URL — for LoRA-generated images this is
   *  fal.ai's own hosted URL (see createGeneratedMediaAsset), not a
   *  Supabase Storage path, so no signed-URL step is needed to render it. */
  canonicalUrl: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}
