/** Mirrors `workflow_definitions` / `workflow_runs`. */

export type WorkflowType =
  | "image_batch"
  | "motion_video"
  | "character_swap"
  | "daily_plan";

export type WorkflowRunStatus = "running" | "succeeded" | "failed" | "partial";

export type WorkflowTriggerSource =
  | "manual_ui"
  | "cron"
  | "telegram_command"
  | "discord_command"
  | "n8n"
  | "api";

export interface WorkflowRun {
  id: string;
  characterId: string;
  type: WorkflowType;
  status: WorkflowRunStatus;
  triggerSource: WorkflowTriggerSource;
  startedAt: string;
  finishedAt?: string;
}
