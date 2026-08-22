import { Suspense } from "react";
import Link from "next/link";
import { Users, Plus } from "lucide-react";
import { CharacterGrid, CharacterGridSkeleton } from "@/components/characters/CharacterGrid";
import { EmptyState } from "@/components/states/EmptyState";
import { buttonVariants } from "@/components/ui/button";
import { getCharacters } from "@/lib/data/characters";

// See app/(dashboard)/page.tsx for why this route is forced dynamic.
export const dynamic = "force-dynamic";

export default function CharactersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-paper">Characters</h1>
          <p className="mt-1 max-w-2xl text-sm text-mist">
            Every AI influencer profile in the system. Each card opens an
            identical Character Studio — reference sets, generation workflows,
            and scheduling work the same way no matter which character you
            pick.
          </p>
        </div>
        <Link href="/characters/new" className={buttonVariants({ size: "sm" })}>
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          New character
        </Link>
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
          <Link href="/characters/new" className={buttonVariants({ size: "sm" })}>
            New character
          </Link>
        }
      />
    );
  }

  return <CharacterGrid characters={characters} />;
}
