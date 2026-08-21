# HSSND Content Factory — Admin (apps/admin)

Multi-character AI influencer content operating system. This is the Next.js
App Router admin UI.

## Phase 2A scope

This checkpoint contains **only** the visual/UI foundation:

- `DashboardShell`, `DashboardCard`, `NavItem` and the dark/neon glass theme.
- Characters overview grid and a Character Studio shell with six tabs
  (Overview, Reference Sets, Image Batch, Character Swap, Motion Control,
  Scheduler).
- Loading / empty / error state components, demonstrated in context.

There are **no Supabase calls, no n8n calls, no OpenClaw integration, and no
API keys** anywhere in this checkpoint. All data comes from
`lib/mock/*` via a `lib/data/*` access layer whose function signatures are
designed to be swapped for real Supabase queries without touching any
component. Nothing here is character-specific — every character in
`lib/mock/characters.ts` (including the example "Zaranyx" record) renders
through identical components.

## Getting started

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run lint` — ESLint (next/core-web-vitals + next/typescript)
- `npm run typecheck` — `tsc --noEmit`
