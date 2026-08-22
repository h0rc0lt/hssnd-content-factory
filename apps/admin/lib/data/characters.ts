import { cache } from "react";
import type { Character } from "@/types/character";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { mapCharacterRow } from "@/lib/supabase/mappers";

/**
 * Character data-access layer — LIVE, Phase 2B.
 *
 * Replaces the Phase 2A mock implementation with real Supabase queries.
 * Exported function signatures are unchanged from the mock version — no
 * component anywhere had to change for this cutover.
 */

export async function getCharacters(): Promise<Character[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .neq("status", "archived")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to load characters: ${error.message}`);
  }
  return (data ?? []).map(mapCharacterRow);
}

export const getCharacterBySlug = cache(async (slug: string): Promise<Character | null> => {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load character "${slug}": ${error.message}`);
  }
  return data ? mapCharacterRow(data) : null;
});
