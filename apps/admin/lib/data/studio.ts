import type { ReferenceSet } from "@/types/reference-set";
import type { MotionTemplate, MotionTemplateUsage } from "@/types/motion-template";
import type { MediaAsset } from "@/types/media-asset";
import type { WorkflowRun } from "@/types/workflow";
import type { ScheduledPost } from "@/types/scheduled-post";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getProviderLabel } from "@/lib/kie/providers";
import {
  mapReferenceSetRow,
  mapMotionTemplateRow,
  mapMediaAssetRow,
  mapWorkflowRunRow,
  mapScheduledPostRow,
  type ReferenceSetRowWithCount,
  type WorkflowRunRowWithDefinition,
  type ScheduledPostRowWithTarget,
} from "@/lib/supabase/mappers";

/**
 * Character Studio data-access layer — LIVE, Phase 2B (continued).
 *
 * Replaces the remaining mock implementations with real Supabase queries.
 * Function signatures are unchanged — no component changed for this cutover.
 *
 * All five underlying tables (reference_sets, motion_templates, media_assets,
 * workflow_runs, scheduled_posts) are genuinely empty right now — no fake
 * seed data was added for these, deliberately. Unlike `characters` (a real
 * business entity worth seeding for continuity), rows in these tables would
 * represent generated media, executed workflows, and scheduled posts that
 * never actually happened — fabricating them would misrepresent real
 * system activity. Every panel already has an EmptyState built for exactly
 * this case (see components/studio/panels/*), so real emptiness renders
 * correctly rather than needing to be simulated.
 */

export async function getReferenceSetsForCharacter(characterId: string): Promise<ReferenceSet[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_sets")
    .select("*, reference_set_items(count)")
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load reference sets: ${error.message}`);
  }
  return ((data as unknown as ReferenceSetRowWithCount[]) ?? []).map(mapReferenceSetRow);
}

/**
 * Creates a new reference set for a character.
 * Returns the freshly inserted row mapped to the ReferenceSet type.
 */
export async function createReferenceSet({
  characterId,
  name,
  description,
  tags = [],
}: {
  characterId: string;
  name: string;
  description?: string;
  tags?: string[];
}): Promise<ReferenceSet> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("reference_sets")
    .insert({
      character_id: characterId,
      name,
      description: description ?? null,
      tags,
      status: "active",
    })
    .select("*, reference_set_items(count)")
    .single();

  if (error) {
    throw new Error(`Failed to create reference set: ${error.message}`);
  }
  return mapReferenceSetRow(data as unknown as ReferenceSetRowWithCount);
}

export async function getMotionTemplateLibrary(): Promise<MotionTemplate[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("motion_templates")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load motion template library: ${error.message}`);
  }
  return (data ?? []).map(mapMotionTemplateRow);
}

/**
 * "Usage" isn't its own table (see types/motion-template.ts) — it's derived
 * by aggregating media_assets rows for this character that have a
 * motion_template_id set. Aggregated in JS rather than SQL GROUP BY since
 * the Supabase JS client's query builder doesn't expose GROUP BY directly
 * and the expected row counts here are small.
 */
export async function getMotionUsageForCharacter(characterId: string): Promise<MotionTemplateUsage[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("motion_template_id, created_at")
    .eq("character_id", characterId)
    .not("motion_template_id", "is", null);

  if (error) {
    throw new Error(`Failed to load motion usage: ${error.message}`);
  }

  const rows = (data ?? []) as { motion_template_id: string | null; created_at: string }[];

  const byTemplate = new Map<string, { outputCount: number; lastUsedAt: string }>();
  for (const row of rows) {
    const templateId = row.motion_template_id as string;
    const existing = byTemplate.get(templateId);
    if (!existing) {
      byTemplate.set(templateId, { outputCount: 1, lastUsedAt: row.created_at });
    } else {
      existing.outputCount += 1;
      if (row.created_at > existing.lastUsedAt) existing.lastUsedAt = row.created_at;
    }
  }

  return Array.from(byTemplate.entries()).map(([motionTemplateId, agg]) => ({
    motionTemplateId,
    characterId,
    lastUsedAt: agg.lastUsedAt,
    outputCount: agg.outputCount,
  }));
}

export async function getRecentMediaForCharacter(characterId: string, limit = 6): Promise<MediaAsset[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load recent media: ${error.message}`);
  }
  const assets = (data ?? []).map(mapMediaAssetRow);

  // Which provider/cost produced each of these, for the Overview lightbox
  // (see MediaAsset.generatedBy) — a separate query rather than an
  // embedded join, since generation_jobs.result_media_asset_id is a
  // reverse FK (zero or one job per asset) and this keeps that lookup
  // explicit instead of relying on Supabase's embed-relation inference.
  const assetIds = assets.map((a) => a.id);
  if (assetIds.length === 0) return assets;

  const { data: jobs, error: jobsError } = await supabase
    .from("generation_jobs")
    .select("result_media_asset_id, fal_endpoint, cost_usd")
    .in("result_media_asset_id", assetIds);

  if (jobsError || !jobs) return assets;

  const byAssetId = new Map(
    jobs
      .filter((j) => j.result_media_asset_id)
      .map((j) => [j.result_media_asset_id as string, j])
  );

  return assets.map((asset) => {
    const job = byAssetId.get(asset.id);
    if (!job) return asset;
    return {
      ...asset,
      generatedBy: {
        providerLabel: getProviderLabel(job.fal_endpoint),
        costUsd: job.cost_usd,
      },
    };
  });
}

export async function getRecentWorkflowRunsForCharacter(characterId: string, limit = 6): Promise<WorkflowRun[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("workflow_runs")
    .select("*, workflow_definitions(type)")
    .eq("character_id", characterId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load recent workflow runs: ${error.message}`);
  }
  return ((data as unknown as WorkflowRunRowWithDefinition[]) ?? []).map(mapWorkflowRunRow);
}

export async function getScheduledPostsForCharacter(characterId: string): Promise<ScheduledPost[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("scheduled_posts")
    .select("*, scheduled_post_targets(platform_accounts(platform))")
    .eq("character_id", characterId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load scheduled posts: ${error.message}`);
  }
  return ((data as unknown as ScheduledPostRowWithTarget[]) ?? []).map(mapScheduledPostRow);
}
