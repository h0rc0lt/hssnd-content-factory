import type { Character } from "@/types/character";

/**
 * MOCK DATA — Phase 2A only.
 *
 * Three characters, deliberately uneven in how much data they have. This is
 * what lets loading/empty/success states show up naturally across the
 * Studio panels instead of being faked with a manual toggle. "Zaranyx" is
 * just the first row — Nova Kestrel and Echo Vale get identical treatment
 * from every component.
 */
export const MOCK_CHARACTERS: Character[] = [
  {
    id: "char_zaranyx",
    slug: "zaranyx",
    name: "Zaranyx",
    shortBio: "Cyberpunk streetwear muse. High-contrast neon shoots, night-city motion sets.",
    status: "active",
    accent: "signal",
    defaultStyleProfile: { mood: "moody-neon", outfit: "streetwear", scene: "night-city" },
    createdAt: "2026-02-11T09:00:00.000Z",
  },
  {
    id: "char_echo-vale",
    slug: "echo-vale",
    name: "Echo Vale",
    shortBio: "Soft-focus lifestyle and travel content, warm natural light.",
    status: "paused",
    accent: "flow",
    defaultStyleProfile: { mood: "warm-natural", outfit: "casual", scene: "coastal" },
    createdAt: "2026-04-02T09:00:00.000Z",
  },
  {
    id: "char_nova-kestrel",
    slug: "nova-kestrel",
    name: "Nova Kestrel",
    shortBio: "Newest profile — reference sets and motion library still being built out.",
    status: "active",
    accent: "pulse",
    defaultStyleProfile: { mood: "studio-clean", outfit: "editorial", scene: "minimal-studio" },
    createdAt: "2026-08-01T09:00:00.000Z",
  },
];
