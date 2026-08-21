import type { ReferenceSet } from "@/types/reference-set";

/** MOCK DATA — Phase 2A only. Keyed by characterId in lib/data/studio.ts. */
export const MOCK_REFERENCE_SETS: ReferenceSet[] = [
  {
    id: "refset_zrx_neon-alley",
    characterId: "char_zaranyx",
    name: "Neon Alley",
    description: "Core face + body reference pack, wet-asphalt night scenes.",
    tags: ["night", "neon", "streetwear"],
    itemCount: 18,
    status: "active",
    createdAt: "2026-02-14T10:00:00.000Z",
  },
  {
    id: "refset_zrx_rooftop-dusk",
    characterId: "char_zaranyx",
    name: "Rooftop Dusk",
    description: "Golden-hour rooftop set, softer lighting variant.",
    tags: ["dusk", "rooftop"],
    itemCount: 12,
    status: "active",
    createdAt: "2026-03-02T10:00:00.000Z",
  },
  {
    id: "refset_zrx_studio-base",
    characterId: "char_zaranyx",
    name: "Studio Base",
    description: "Neutral studio reference pack used as a fallback for most workflows.",
    tags: ["studio", "neutral"],
    itemCount: 24,
    status: "active",
    createdAt: "2026-02-11T11:00:00.000Z",
  },
  {
    id: "refset_evl_coastline",
    characterId: "char_echo-vale",
    name: "Coastline",
    description: "Beach and boardwalk reference pack.",
    tags: ["coastal", "daylight"],
    itemCount: 9,
    status: "active",
    createdAt: "2026-04-05T10:00:00.000Z",
  },
  // Nova Kestrel intentionally has zero reference sets — demonstrates the
  // Reference Sets panel's empty state.
];
