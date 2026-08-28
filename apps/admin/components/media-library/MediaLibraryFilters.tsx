"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Character } from "@/types/character";
import type { MediaAssetType } from "@/types/media-asset";

const TYPE_OPTIONS: MediaAssetType[] = ["image", "video", "audio", "other"];

/** Two plain <select>s that drive the page's server-side filtering via URL
 *  search params — no client-side data fetching, just navigation. */
export function MediaLibraryFilters({ characters }: { characters: Character[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`/media-library?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={searchParams.get("characterId") ?? ""}
        onChange={(e) => updateParam("characterId", e.target.value)}
        className="rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm text-paper"
      >
        <option value="">All characters</option>
        {characters.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={searchParams.get("type") ?? ""}
        onChange={(e) => updateParam("type", e.target.value)}
        className="rounded-lg border border-border bg-white/[0.03] px-3 py-2 text-sm text-paper"
      >
        <option value="">All types</option>
        {TYPE_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
