import type { MediaAsset } from "@/types/media-asset";

/** MOCK DATA — Phase 2A only. */
export const MOCK_MEDIA_ASSETS: MediaAsset[] = [
  { id: "media_zrx_01", characterId: "char_zaranyx", type: "image", status: "approved", label: "Neon Alley — batch 4, frame 2", createdAt: "2026-08-19T21:10:00.000Z" },
  { id: "media_zrx_02", characterId: "char_zaranyx", type: "image", status: "queued", label: "Neon Alley — batch 5, frame 1", createdAt: "2026-08-19T22:02:00.000Z" },
  { id: "media_zrx_03", characterId: "char_zaranyx", type: "video", status: "approved", label: "Walk Cycle — Rooftop Dusk", createdAt: "2026-08-17T20:20:00.000Z" },
  { id: "media_zrx_04", characterId: "char_zaranyx", type: "image", status: "raw", label: "Studio Base — batch 2, frame 6", createdAt: "2026-08-15T12:00:00.000Z" },
  { id: "media_evl_01", characterId: "char_echo-vale", type: "image", status: "approved", label: "Coastline — batch 1, frame 3", createdAt: "2026-08-10T09:30:00.000Z" },
  { id: "media_evl_02", characterId: "char_echo-vale", type: "video", status: "used", label: "Wave Greeting — intro loop", createdAt: "2026-08-05T14:05:00.000Z" },
  // Nova Kestrel: no media generated yet.
];
