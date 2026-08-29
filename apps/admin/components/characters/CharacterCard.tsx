"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Trash2 } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CharacterAvatar } from "./CharacterAvatar";
import type { Character } from "@/types/character";

/**
 * One character, rendered identically regardless of which character it is.
 * There is no branch here for "zaranyx" — every card goes through this same
 * component with only data as input.
 *
 * The delete button is the one interactive element that isn't just "go to
 * this character's Studio" — it stops the click from bubbling to the
 * enclosing Link (see onClick's stopPropagation/preventDefault) so it
 * doesn't also navigate, confirms once via the browser's native confirm()
 * (good enough for a single-operator internal tool — no custom modal
 * component exists yet), then calls DELETE /api/characters/[id] and
 * refreshes the list. No undo; see that route's doc comment for exactly
 * what a delete removes.
 */
export function CharacterCard({ character }: { character: Character }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        `Delete ${character.name}? This permanently removes their reference uploads, trained LoRA, generated images, and reference sets. This can't be undone.`
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/characters/${character.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to delete character.");
      }
      router.refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Failed to delete character.");
      setDeleting(false);
    }
  }

  return (
    <Link href={`/characters/${character.slug}/studio`} className="group relative block">
      <Button
        type="button"
        variant="destructive"
        size="icon"
        disabled={deleting}
        onClick={handleDelete}
        title={`Delete ${character.name}`}
        className="absolute right-3 top-3 z-10 h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
      </Button>
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
