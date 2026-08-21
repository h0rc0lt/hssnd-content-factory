/**
 * Character domain type.
 *
 * Mirrors the `characters` table from the Phase 1 schema. Field names are
 * camelCase here (app layer) — the future Supabase repository in
 * `lib/data/characters.ts` is the single place that maps snake_case DB rows
 * to this shape, so no component ever has to know which backend it's on.
 */

export type CharacterStatus = "active" | "paused" | "archived";

/** Cosmetic-only accent used for avatar gradients and small UI flourishes.
 *  Not a schema field — derived/assigned client-side so every character
 *  gets visual variety without any character-specific logic. */
export type CharacterAccent = "signal" | "flow" | "pulse";

export interface Character {
  id: string;
  slug: string;
  name: string;
  shortBio: string;
  status: CharacterStatus;
  accent: CharacterAccent;
  defaultStyleProfile: Record<string, unknown>;
  createdAt: string;
}
