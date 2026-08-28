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

**Phase 2D — LoRA-driven image generation.** `apps/admin` is wired to real
Supabase data end to end:

- Phase 2A laid down the UI shell (`DashboardShell`, Character Studio, state
  components) on typed mock data.
- Phase 2B replaced that mock layer with live Supabase queries across the
  dashboard, characters list, and every Studio panel — see
  `apps/admin/lib/data/*`.
- Phase 2C added the character creation flow (`NewCharacterForm`), direct
  browser-to-Supabase-Storage reference uploads (bypassing Vercel's 4.5 MB
  Function body limit), the explicit "Start training" action that submits a
  fal.ai LoRA job, and a poller (`/api/cron/poll-training`) that picks up
  training completion.
- Phase 2D added reference-image generation from a trained LoRA
  (`POST /api/generate`, direct fal.ai call against `fal-ai/flux-lora` —
  same pattern as training, not n8n) with a matching poller
  (`/api/cron/poll-generation`), a 28-template prompt catalog
  (`lib/data/prompt-templates.ts`), and the Image Batch Studio tab wired to
  both: it doubles as the only place an *existing* character can add more
  reference uploads or (re)start training, since that flow previously only
  existed during character creation.

Both pollers are triggered every 5 minutes by
`.github/workflows/poll-training.yml` rather than Vercel Cron, since this
team's Vercel Hobby plan silently doesn't run cron schedules more frequent
than once a day. Every page and API route except `/api/cron/*` sits behind
HTTP Basic Auth (`apps/admin/middleware.ts`) — this repo is public and its
routes are guessable, and both `/api/lora/train` and `/api/generate`
trigger real, billed fal.ai jobs per call.

There is still no n8n integration and no OpenClaw integration in this repo.
Character Swap, Motion Control, and the Scheduler remain read-only/unwired
— see the Studio panels for what's left. RLS is enabled with zero policies
on all tables (intentional — blocks all non-service-role access until a
staff-auth model is decided).

Nothing in this codebase is specific to any one character — "Zaranyx" in
the mock data is one example row, not a special case.

See `apps/admin/README.md` for how to run the app locally.
