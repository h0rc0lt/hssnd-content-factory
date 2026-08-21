import type { MotionTemplate, MotionTemplateUsage } from "@/types/motion-template";

/** MOCK DATA — Phase 2A only. Global library, not tied to any character. */
export const MOCK_MOTION_TEMPLATES: MotionTemplate[] = [
  {
    id: "motion_walk-cycle-9x16",
    name: "Walk Cycle — Vertical",
    description: "Full-body walk-toward-camera, 9:16, loopable.",
    durationSeconds: 6,
    aspectRatio: "9:16",
    tags: ["walk", "full-body"],
    status: "active",
  },
  {
    id: "motion_hair-flip",
    name: "Hair Flip Close-up",
    description: "Head-and-shoulders close-up with a single hair-flip beat.",
    durationSeconds: 3,
    aspectRatio: "9:16",
    tags: ["close-up", "beauty"],
    status: "active",
  },
  {
    id: "motion_turn-around-1x1",
    name: "Slow Turn-Around",
    description: "360 turn, square crop, good for outfit reveals.",
    durationSeconds: 8,
    aspectRatio: "1:1",
    tags: ["outfit", "turn"],
    status: "active",
  },
  {
    id: "motion_wave-greeting",
    name: "Wave Greeting",
    description: "Short waving-at-camera loop for intros/outros.",
    durationSeconds: 4,
    aspectRatio: "9:16",
    tags: ["greeting", "loop"],
    status: "active",
  },
];

/** Per-character usage history — this is what can legitimately be empty
 *  (Nova Kestrel hasn't run a motion workflow yet) even though the template
 *  library above is shared by everyone. */
export const MOCK_MOTION_USAGE: MotionTemplateUsage[] = [
  {
    motionTemplateId: "motion_walk-cycle-9x16",
    characterId: "char_zaranyx",
    lastUsedAt: "2026-08-17T20:15:00.000Z",
    outputCount: 5,
  },
  {
    motionTemplateId: "motion_turn-around-1x1",
    characterId: "char_zaranyx",
    lastUsedAt: "2026-08-12T18:40:00.000Z",
    outputCount: 3,
  },
  {
    motionTemplateId: "motion_wave-greeting",
    characterId: "char_echo-vale",
    lastUsedAt: "2026-08-05T14:00:00.000Z",
    outputCount: 2,
  },
  // Nova Kestrel: no usage yet.
];
