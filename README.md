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

**Phase 2C — character creation, uploads, and LoRA training.** `apps/admin`
is wired to real Supabase data end to end:

- Phase 2A laid down the UI shell (`DashboardShell`, Character Studio, state
  components) on typed mock data.
- Phase 2B replaced that mock layer with live Supabase queries across the
  dashboard, characters list, and every Studio panel — see
  `apps/admin/lib/data/*`.
- Phase 2C added the character creation flow (`NewCharacterForm`), direct
  browser-to-Supabase-Storage reference uploads (bypassing Vercel's 4.5 MB
  Function body limit), the explicit "Start training" action that submits a
  fal.ai LoRA job, and a Vercel Cron poller (`/api/cron/poll-training`)
  that picks up training completion. Every page and API route except
  `/api/cron/*` sits behind HTTP Basic Auth (`apps/admin/middleware.ts`) —
  this repo is public and its routes are guessable, and `/api/lora/train`
  triggers a real, billed fal.ai job per call.

There is still no n8n integration and no OpenClaw integration in this repo.
RLS is enabled with zero policies on all tables (intentional — blocks all
non-service-role access until a staff-auth model is decided).

Nothing in this codebase is specific to any one character — "Zaranyx" in
the mock data is one example row, not a special case.

See `apps/admin/README.md` for how to run the app locally.
