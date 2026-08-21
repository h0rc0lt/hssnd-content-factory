import { cache } from "react";
import type { Character } from "@/types/character";
import { MOCK_CHARACTERS } from "@/lib/mock/characters";
import { delay } from "./delay";

/**
 * Character data-access layer.
 *
 * MOCK IMPLEMENTATION — Phase 2A. In Phase 2C this file's exports keep the
 * same signatures but query Supabase (`characters` table) instead of the
 * in-memory array. No caller outside this file should ever import
 * `lib/mock/characters` directly.
 */

export async function getCharacters(): Promise<Character[]> {
  await delay(500);
  return MOCK_CHARACTERS;
}

export const getCharacterBySlug = cache(async (slug: string): Promise<Character | null> => {
  await delay(250);
  return MOCK_CHARACTERS.find((c) => c.slug === slug) ?? null;
});
