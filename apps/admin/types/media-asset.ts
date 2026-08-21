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
  /** Human-readable placeholder label. Real thumbnails arrive once Supabase
   *  Storage / signed URLs are wired up in a later phase. */
  label: string;
  createdAt: string;
}
