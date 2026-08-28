import type { MediaAsset, MediaAssetType } from "@/types/media-asset";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { mapMediaAssetRow } from "@/lib/supabase/mappers";

/**
 * Media Library data-access layer.
 *
 * Cross-character, unlike lib/data/studio.ts's getRecentMediaForCharacter
 * (scoped to one character's Studio Overview) — this is every media_assets
 * row in the system, with an optional character/type filter. Lives in its
 * own file rather than studio.ts since it isn't Studio-scoped.
 */

export interface MediaLibraryItem extends MediaAsset {
  characterName: string;
  characterSlug: string;
}

export interface MediaLibraryFilters {
  characterId?: string;
  type?: MediaAssetType;
}

type MediaAssetRowWithCharacter = Parameters<typeof mapMediaAssetRow>[0] & {
  characters: { name: string; slug: string } | null;
};

export async function getMediaLibrary(
  filters: MediaLibraryFilters = {},
  limit = 60
): Promise<MediaLibraryItem[]> {
  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("media_assets")
    .select("*, characters(name, slug)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.characterId) {
    query = query.eq("character_id", filters.characterId);
  }
  if (filters.type) {
    query = query.eq("type", filters.type);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load media library: ${error.message}`);
  }

  return ((data as unknown as MediaAssetRowWithCharacter[]) ?? []).map((row) => ({
    ...mapMediaAssetRow(row),
    characterName: row.characters?.name ?? "Unknown character",
    characterSlug: row.characters?.slug ?? "",
  }));
}
