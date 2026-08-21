# HSSND Content Factory

Multi-character AI influencer content operating system. Manages every AI
influencer profile ("character"), reference set, image/motion generation
workflow, scheduling, and publishing approval in one place.

This is a monorepo. Today it contains one app; more will land as later
phases are approved:

```
hssnd-content-factory/
└── apps/
    └── admin/       Next.js 15 App Router admin UI — see apps/admin/README.md
```

Planned, not yet present: `n8n/` (exported workflow definitions) and
`openclaw/` (Content Factory agent config), per the architecture in
Phase 1.

## Status

**Phase 2A — UI shell only.** `apps/admin` is a fully working Next.js app
with no backend wired up: every character, reference set, media asset,
workflow run, and scheduled post you see is typed mock data in
`apps/admin/lib/mock/*`, read through `apps/admin/lib/data/*` — the seam
that later phases replace with real Supabase queries without touching any
component. There is no Supabase runtime integration, no n8n integration,
and no OpenClaw integration in this repo yet.

Nothing in this codebase is specific to any one character — "Zaranyx" in
the mock data is one example row, not a special case.

See `apps/admin/README.md` for how to run the app locally.
