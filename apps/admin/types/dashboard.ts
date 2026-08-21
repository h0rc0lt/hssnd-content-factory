/** Aggregate stats shown on the top-level Dashboard — not a DB table,
 *  computed (later: via a Supabase view/RPC) from several tables at once. */

export interface DashboardStats {
  activeCharacterCount: number;
  mediaAssetsThisWeek: number;
  workflowRunsInProgress: number;
  pendingApprovals: number;
}
