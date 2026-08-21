import type { ScheduledPost } from "@/types/scheduled-post";

/** MOCK DATA — Phase 2A only. */
export const MOCK_SCHEDULED_POSTS: ScheduledPost[] = [
  { id: "post_zrx_01", characterId: "char_zaranyx", caption: "Neon Alley drop — new set is live 🌆", platform: "instagram", status: "scheduled", scheduledAt: "2026-08-21T17:00:00.000Z" },
  { id: "post_zrx_02", characterId: "char_zaranyx", caption: "Rooftop dusk, part 2.", platform: "tiktok", status: "pending_approval", scheduledAt: "2026-08-21T19:30:00.000Z" },
  { id: "post_zrx_03", characterId: "char_zaranyx", caption: "Walk cycle teaser.", platform: "x", status: "published", scheduledAt: "2026-08-18T15:00:00.000Z" },
  { id: "post_zrx_04", characterId: "char_zaranyx", caption: "Studio set, unedited.", platform: "pinterest", status: "draft" },
  { id: "post_evl_01", characterId: "char_echo-vale", caption: "Coastline morning light.", platform: "instagram", status: "rejected", scheduledAt: "2026-08-15T12:00:00.000Z" },
  { id: "post_nvk_01", characterId: "char_nova-kestrel", caption: "First look — studio test shots.", platform: "instagram", status: "draft" },
];
