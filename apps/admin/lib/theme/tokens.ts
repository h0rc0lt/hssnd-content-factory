/**
 * Design tokens — HSSND Content Factory.
 *
 * The source of truth for color is the CSS custom properties in
 * `app/globals.css` (consumed by Tailwind via `tailwind.config.ts`). This
 * file exists for the rare case a component needs a raw value in JS/inline
 * style (e.g. an SVG gradient stop) rather than a Tailwind class — keep it
 * in sync with globals.css by hand, there are only a handful of values.
 */

export const ACCENT_HEX = {
  signal: "#22d3ee", // generation / activity — cyan
  flow: "#3b82f6", // data movement / pipelines — blue
  pulse: "#a855f7", // scheduling & publishing heartbeat — violet
} as const;

export type AccentKey = keyof typeof ACCENT_HEX;

/** Status -> token mapping used by badges across the app. Centralized so
 *  every panel renders the same status the same way. */
export const STATUS_TOKEN = {
  // generic active/positive
  active: "success",
  approved: "success",
  succeeded: "success",
  published: "success",
  used: "success",
  // in-progress
  running: "flow",
  queued: "flow",
  scheduled: "pulse",
  training: "flow",
  processing: "flow",
  uploaded: "flow",
  // needs attention
  pending_approval: "amber",
  raw: "amber",
  draft: "mist",
  paused: "mist",
  partial: "amber",
  used_in_training: "mist",
  ready: "success",
  // negative
  rejected: "danger",
  failed: "danger",
  archived: "mist",
} as const;
