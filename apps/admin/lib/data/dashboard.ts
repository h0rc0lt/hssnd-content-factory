import type { DashboardStats } from "@/types/dashboard";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Dashboard stats — LIVE, Phase 2B.
 *
 * Four count-only queries (head: true skips row transfer, just returns
 * counts). Candidate for a single Supabase view/RPC later if this grows,
 * but four small queries is perfectly fine at this scale.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabaseServerClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [activeCharacters, mediaThisWeek, runningWorkflows, pendingApprovals] = await Promise.all([
    supabase.from("characters").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("media_assets").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo),
    supabase.from("workflow_runs").select("id", { count: "exact", head: true }).eq("status", "running"),
    supabase.from("scheduled_posts").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
  ]);

  for (const result of [activeCharacters, mediaThisWeek, runningWorkflows, pendingApprovals]) {
    if (result.error) {
      throw new Error(`Failed to load dashboard stats: ${result.error.message}`);
    }
  }

  return {
    activeCharacterCount: activeCharacters.count ?? 0,
    mediaAssetsThisWeek: mediaThisWeek.count ?? 0,
    workflowRunsInProgress: runningWorkflows.count ?? 0,
    pendingApprovals: pendingApprovals.count ?? 0,
  };
}
