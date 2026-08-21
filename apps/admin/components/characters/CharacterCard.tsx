import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { StatusBadge } from "@/components/ui/badge";
import { CharacterAvatar } from "./CharacterAvatar";
import type { Character } from "@/types/character";

/**
 * One character, rendered identically regardless of which character it is.
 * There is no branch here for "zaranyx" — every card goes through this same
 * component with only data as input.
 */
export function CharacterCard({ character }: { character: Character }) {
  return (
    <Link href={`/characters/${character.slug}/studio`} className="group block">
      <DashboardCard accent="signal" className="h-full">
        <div className="flex items-start justify-between gap-3">
          <CharacterAvatar name={character.name} accent={character.accent} size="lg" />
          <ArrowUpRight
            className="h-4 w-4 text-mist opacity-0 transition-opacity group-hover:opacity-100"
            strokeWidth={1.75}
          />
        </div>
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-semibold text-paper">{character.name}</h3>
            <StatusBadge status={character.status} />
          </div>
          <p className="line-clamp-2 text-sm text-mist">{character.shortBio}</p>
        </div>
      </DashboardCard>
    </Link>
  );
}
