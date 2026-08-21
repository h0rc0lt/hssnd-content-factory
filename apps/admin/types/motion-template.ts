/**
 * Mirrors the `motion_templates` table.
 *
 * Deliberately has no `characterId` — motion templates are reusable
 * choreography, shared across every character by design (see Phase 1,
 * Section 2). The character/template pairing only exists at the
 * workflow-run level, represented here by `MotionTemplateUsage`.
 */

export interface MotionTemplate {
  id: string;
  name: string;
  description?: string;
  durationSeconds: number;
  aspectRatio: string;
  tags: string[];
  status: "active" | "archived";
}

/** A record of a character having used a given motion template in a past
 *  workflow run — this is what "recently used for this character" means,
 *  without tying the template itself to any one character. */
export interface MotionTemplateUsage {
  motionTemplateId: string;
  characterId: string;
  lastUsedAt: string;
  outputCount: number;
}
