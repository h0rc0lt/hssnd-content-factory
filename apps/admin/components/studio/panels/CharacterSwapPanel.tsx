"use client";

import { useEffect, useState } from "react";
import { Repeat } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/states/LoadingState";
import { ErrorState } from "@/components/states/ErrorState";
import type { Character } from "@/types/character";

type LoadState = "loading" | "error";

/**
 * Character Swap doesn't have a real backend yet (that's Phase 2D+), so
 * this panel intentionally simulates one specific, realistic failure —
 * fetching source media for the swap failed — rather than a static mock-up.
 * It's the deliberate example of the Loading -> Error -> Retry loop for
 * this checkpoint: press Retry and it re-runs the same simulated fetch.
 *
 * Nothing here is character-specific: the same simulated failure plays for
 * every character, by design.
 */
export function CharacterSwapPanel({ character }: { character: Character }) {
  const [state, setState] = useState<LoadState>("loading");
  const [attempt, setAttempt] = useState(1);

  useEffect(() => {
    setState("loading");
    const timer = setTimeout(() => setState("error"), 900);
    return () => clearTimeout(timer);
  }, [attempt]);

  return (
    <DashboardCard
      title="Character swap"
      description="Apply this character's identity to another character's source images"
      headerAction={<Badge tone="mist">Preview — not wired to a workflow yet</Badge>}
    >
      {state === "loading" && (
        <LoadingState label="Loading source media for character swap…" rows={3} />
      )}
      {state === "error" && (
        <ErrorState
          title="Couldn't load source media"
          description={`This is a simulated failure — Character Swap doesn't call a real provider yet. In Phase 2D+, a real failure here would mean the source media for ${character.name} couldn't be reached from Supabase Storage.`}
          onRetry={() => setAttempt((n) => n + 1)}
        />
      )}
      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-xs text-mist">
        <Repeat className="h-3.5 w-3.5" />
        Retries attempted this session: {attempt}
      </div>
    </DashboardCard>
  );
}
