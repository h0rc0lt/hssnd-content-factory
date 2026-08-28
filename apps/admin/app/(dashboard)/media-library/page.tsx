import { Images } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";
import { MediaLibraryFilters } from "@/components/media-library/MediaLibraryFilters";
import { MediaLibraryGrid } from "@/components/media-library/MediaLibraryGrid";
import { getCharacters } from "@/lib/data/characters";
import { getMediaLibrary } from "@/lib/data/media";
import type { MediaAssetType } from "@/types/media-asset";

// Live Supabase reads, same reasoning as app/(dashboard)/page.tsx: force
// dynamic so this always reflects current DB state, not a build-time
// snapshot, and so `next build` never tries to run these queries without
// credentials.
export const dynamic = "force-dynamic";

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ characterId?: string; type?: string }>;
}) {
  const { characterId, type } = await searchParams;

  const [characters, items] = await Promise.all([
    getCharacters(),
    getMediaLibrary({
      characterId: characterId || undefined,
      type: (type || undefined) as MediaAssetType | undefined,
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-paper">Media Library</h1>
        <p className="mt-1 max-w-2xl text-sm text-mist">
          Every generated and uploaded media asset, across every character.
        </p>
      </div>

      <MediaLibraryFilters characters={characters} />

      {items.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No media yet"
          description="Generate an image batch from a character's Studio to see it appear here."
        />
      ) : (
        <MediaLibraryGrid items={items} />
      )}
    </div>
  );
}
