import { Suspense } from "react";
import { Users } from "lucide-react";
import { CharacterGrid, CharacterGridSkeleton } from "@/components/characters/CharacterGrid";
import { EmptyState } from "@/components/states/EmptyState";
import { Button } from "@/components/ui/button";
import { getCharacters } from "@/lib/data/characters";

export default function CharactersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-paper">Characters</h1>
        <p className="mt-1 max-w-2xl text-sm text-mist">
          Every AI influencer profile in the system. Each card opens an
          identical Character Studio — reference sets, generation workflows,
          and scheduling work the same way no matter which character you
          pick.
        </p>
      </div>

      <Suspense fallback={<CharacterGridSkeleton />}>
        <CharactersGridSection />
      </Suspense>
    </div>
  );
}

async function CharactersGridSection() {
  const characters = await getCharacters();

  if (characters.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No characters yet"
        description="Add a character record to see it appear here — every field in the Studio works the same for the first character as the fiftieth."
        action={
          <Button disabled size="sm" title="Character creation lands in Phase 2C">
            New character
          </Button>
        }
      />
    );
  }

  return <CharacterGrid characters={characters} />;
}
