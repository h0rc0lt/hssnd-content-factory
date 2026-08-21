import type { WorkflowRun } from "@/types/workflow";

/** MOCK DATA — Phase 2A only. */
export const MOCK_WORKFLOW_RUNS: WorkflowRun[] = [
  { id: "run_zrx_01", characterId: "char_zaranyx", type: "image_batch", status: "succeeded", triggerSource: "manual_ui", startedAt: "2026-08-19T21:58:00.000Z", finishedAt: "2026-08-19T22:02:00.000Z" },
  { id: "run_zrx_02", characterId: "char_zaranyx", type: "image_batch", status: "running", triggerSource: "manual_ui", startedAt: "2026-08-20T08:05:00.000Z" },
  { id: "run_zrx_03", characterId: "char_zaranyx", type: "motion_video", status: "succeeded", triggerSource: "manual_ui", startedAt: "2026-08-17T20:14:00.000Z", finishedAt: "2026-08-17T20:20:00.000Z" },
  { id: "run_evl_01", characterId: "char_echo-vale", type: "image_batch", status: "failed", triggerSource: "cron", startedAt: "2026-08-16T06:00:00.000Z", finishedAt: "2026-08-16T06:03:00.000Z" },
  { id: "run_evl_02", characterId: "char_echo-vale", type: "daily_plan", status: "succeeded", triggerSource: "cron", startedAt: "2026-08-19T06:00:00.000Z", finishedAt: "2026-08-19T06:04:00.000Z" },
  // Nova Kestrel: no workflow runs yet.
];
