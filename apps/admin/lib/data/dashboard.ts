import type { DashboardStats } from "@/types/dashboard";
import { MOCK_CHARACTERS } from "@/lib/mock/characters";
import { MOCK_MEDIA_ASSETS } from "@/lib/mock/media-assets";
import { MOCK_WORKFLOW_RUNS } from "@/lib/mock/workflow-runs";
import { MOCK_SCHEDULED_POSTS } from "@/lib/mock/scheduled-posts";
import { delay } from "./delay";

/**
 * MOCK IMPLEMENTATION — Phase 2A. In a later phase this becomes a single
 * Supabase RPC/view rather than four separate queries aggregated in JS.
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  await delay(600);
  return {
    activeCharacterCount: MOCK_CHARACTERS.filter((c) => c.status === "active").length,
    mediaAssetsThisWeek: MOCK_MEDIA_ASSETS.length,
    workflowRunsInProgress: MOCK_WORKFLOW_RUNS.filter((r) => r.status === "running").length,
    pendingApprovals: MOCK_SCHEDULED_POSTS.filter((p) => p.status === "pending_approval").length,
  };
}
