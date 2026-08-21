import { DashboardCard } from "@/components/shell/DashboardCard";
import { Skeleton } from "@/components/ui/skeleton";
import { CharacterCard } from "./CharacterCard";
import type { Character } from "@/types/character";

export function CharacterGrid({ characters }: { characters: Character[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {characters.map((character) => (
        <CharacterCard key={character.id} character={character} />
      ))}
    </div>
  );
}

/** Layout-matching skeleton — used while getCharacters() is in flight. */
export function CharacterGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <DashboardCard key={i}>
          <div className="flex items-start justify-between">
            <Skeleton className="h-16 w-16 rounded-full" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </DashboardCard>
      ))}
    </div>
  );
}
