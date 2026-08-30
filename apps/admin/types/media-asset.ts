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
  /** Which provider generated this image and roughly what it cost —
   *  looked up from the generation_jobs row whose result_media_asset_id
   *  points at this asset (see getRecentMediaForCharacter). Undefined for
   *  an asset with no matching job (e.g. a manually uploaded reference
   *  image) or one this query didn't bother joining for. */
  generatedBy?: {
    /** Human-readable label, e.g. "Flux-2 Pro" — falls back to the raw
     *  fal_endpoint model id if it isn't in the known label map. */
    providerLabel: string;
    /** Best-effort USD estimate, null if the job predates cost tracking. */
    costUsd: number | null;
  };
}
