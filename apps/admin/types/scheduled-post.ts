/** Mirrors `scheduled_posts` (+ a flattened `platform` for Phase 2A display,
 *  ahead of the full `scheduled_post_targets` join landing in a later phase). */

export type ScheduledPostStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected"
  | "failed";

export type Platform =
  | "tiktok"
  | "instagram"
  | "pinterest"
  | "snapchat"
  | "x"
  | "fanvue";

export interface ScheduledPost {
  id: string;
  characterId: string;
  caption: string;
  platform: Platform;
  status: ScheduledPostStatus;
  scheduledAt?: string;
}
