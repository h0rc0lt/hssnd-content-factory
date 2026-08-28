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

**Phase 2F — dual-provider image generation.** `apps/admin` is wired to
real Supabase data end to end:

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
- Phase 2E added the Media Library (cross-character gallery of every
  generated/uploaded asset, filterable by character and type — the first
  "Soon"-marked nav item to go live) and Character Swap
  (`POST /api/swap`, `fal-ai/flux-lora/image-to-image` — applies a
  character's trained identity onto a user-supplied source image, keeping
  its pose/composition). Character Swap reuses the same generation_jobs /
  poll-generation-cron / media_assets pipeline as Image Batch, distinguished
  by a new `fal_endpoint` column (migration
  `add_generation_jobs_fal_endpoint`) since the two features submit to
  different fal.ai queue endpoints.
- Phase 2F gave Image Batch a second generation provider, chosen per-batch
  in the UI, since the two have opposite tradeoffs and neither strictly
  replaces the other: **Flux LoRA** (existing, needs a trained LoRA first,
  ~$0.035/megapixel once trained) and **Nano Banana Pro**
  (`fal-ai/nano-banana-pro/edit`, Google Gemini 3 Pro Image via fal — no
  training step, works the moment a character has ≥1 reference upload,
  identity comes from up to 3 reference images passed as `image_urls`
  instead of trained weights, ~$0.15/image — confirmed against fal's
  pricing page, not assumed). `generation_jobs.fal_endpoint` now takes a
  third value; the poll-generation cron branches on it the same way it
  already did for Character Swap.

This project's own testing surfaced two real bugs worth knowing about if
something looks stuck: (1) `/api/lora/train` originally built
`images_data_url` as an inline base64 data URI, which fal.ai rejects past a
certain size with a `422 URL too long` — fixed by uploading the zip via
`fal.storage.upload()` and passing the real URL it returns instead; (2) the
GitHub Actions poller's `schedule` trigger is best-effort, not guaranteed —
it has gone quiet for close to two hours in practice. If a training or
generation job looks stuck, manually re-run `.github/workflows/poll-training.yml`
(`workflow_dispatch`) rather than assuming something is broken.

Both pollers are triggered every 5 minutes by
`.github/workflows/poll-training.yml` rather than Vercel Cron, since this
team's Vercel Hobby plan silently doesn't run cron schedules more frequent
than once a day. Every page and API route except `/api/cron/*` sits behind
HTTP Basic Auth (`apps/admin/middleware.ts`) — this repo is public and its
routes are guessable, and `/api/lora/train`, `/api/generate`, and
`/api/swap` all trigger real, billed fal.ai jobs per call — Character Swap,
Nano Banana Pro, and video (Motion Control, not yet built) all cost
meaningfully more per call than a Flux LoRA still image.

There is still no n8n integration and no OpenClaw integration in this repo.
Motion Control and the Scheduler remain read-only/unwired, and Reference
Sets creation is still disabled — see the Studio panels for what's left.
RLS is enabled with zero policies on all tables (intentional — blocks all
non-service-role access until a staff-auth model is decided).

Nothing in this codebase is specific to any one character — "Zaranyx" in
the mock data is one example row, not a special case.

See `apps/admin/README.md` for how to run the app locally.
