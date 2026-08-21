import type { ReferenceSet } from "@/types/reference-set";
import type { MotionTemplate, MotionTemplateUsage } from "@/types/motion-template";
import type { MediaAsset } from "@/types/media-asset";
import type { WorkflowRun } from "@/types/workflow";
import type { ScheduledPost } from "@/types/scheduled-post";

import { MOCK_REFERENCE_SETS } from "@/lib/mock/reference-sets";
import { MOCK_MOTION_TEMPLATES, MOCK_MOTION_USAGE } from "@/lib/mock/motion-templates";
import { MOCK_MEDIA_ASSETS } from "@/lib/mock/media-assets";
import { MOCK_WORKFLOW_RUNS } from "@/lib/mock/workflow-runs";
import { MOCK_SCHEDULED_POSTS } from "@/lib/mock/scheduled-posts";
import { delay } from "./delay";

/**
 * Character Studio data-access layer.
 *
 * MOCK IMPLEMENTATION — Phase 2A. Grouped in one file for now because each
 * query is small; expect this to split into one file per table (mirroring
 * `lib/mock/*`) once these become real Supabase queries with their own
 * filtering/pagination needs.
 *
 * Every function takes `characterId` as a required, first-class parameter —
 * no function here is allowed to special-case a specific character.
 */

export async function getReferenceSetsForCharacter(characterId: string): Promise<ReferenceSet[]> {
  await delay(350);
  return MOCK_REFERENCE_SETS.filter((r) => r.characterId === characterId);
}

export async function getMotionTemplateLibrary(): Promise<MotionTemplate[]> {
  await delay(350);
  return MOCK_MOTION_TEMPLATES;
}

export async function getMotionUsageForCharacter(characterId: string): Promise<MotionTemplateUsage[]> {
  await delay(350);
  return MOCK_MOTION_USAGE.filter((u) => u.characterId === characterId);
}

export async function getRecentMediaForCharacter(characterId: string, limit = 6): Promise<MediaAsset[]> {
  await delay(350);
  return MOCK_MEDIA_ASSETS.filter((m) => m.characterId === characterId).slice(0, limit);
}

export async function getRecentWorkflowRunsForCharacter(characterId: string, limit = 6): Promise<WorkflowRun[]> {
  await delay(350);
  return MOCK_WORKFLOW_RUNS.filter((r) => r.characterId === characterId).slice(0, limit);
}

export async function getScheduledPostsForCharacter(characterId: string): Promise<ScheduledPost[]> {
  await delay(350);
  return MOCK_SCHEDULED_POSTS.filter((p) => p.characterId === characterId);
}
