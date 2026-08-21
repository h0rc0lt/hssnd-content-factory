import Link from "next/link";
import { ImagePlus, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { CharacterAvatar } from "@/components/characters/CharacterAvatar";
import type { Character } from "@/types/character";

export function StudioHeader({ character }: { character: Character }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-4">
        <CharacterAvatar name={character.name} accent={character.accent} size="lg" />
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-xl font-semibold text-paper">{character.name}</h1>
            <StatusBadge status={character.status} />
          </div>
          <p className="mt-0.5 max-w-xl text-sm text-mist">{character.shortBio}</p>
        </div>
      </div>

      <div className="flex shrink-0 gap-2">
        <Link href={`/characters/${character.slug}/studio/image-batch`}>
          <Button variant="secondary" size="sm">
            <ImagePlus className="h-3.5 w-3.5" />
            New image batch
          </Button>
        </Link>
        <Link href={`/characters/${character.slug}/studio/motion-control`}>
          <Button variant="secondary" size="sm">
            <Film className="h-3.5 w-3.5" />
            New motion video
          </Button>
        </Link>
      </div>
    </div>
  );
}
