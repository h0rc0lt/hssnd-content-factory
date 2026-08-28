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

**Phase 2J — kie.ai for Image Batch's reference-image providers.**
`apps/admin` is wired to real Supabase data end to end:

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
- Phase 2G attempted a third Image Batch provider, plain **Nano Banana**
  (not Pro) via a *direct* call to the **Google Gemini API**
  (`@google/genai`, synchronous `generateContent()`, no fal.ai, no poll
  cron), on the strength of Google's advertised 500-free-requests/day
  tier. Live testing disproved that: every real call came back
  `429 RESOURCE_EXHAUSTED` with `limit: 0` for `gemini-2.5-flash-preview-image`,
  even on a genuine no-billing "Free tier" AI Studio project (confirmed via
  screenshot — $0.00 spent, no payment method attached). The free tier
  apparently doesn't extend to this model over the raw API regardless of
  billing status.
- Phase 2G was then reworked to swap Nano Banana Pro (from Phase 2F) and
  the direct-Gemini Nano Banana attempt for two *genuinely free*
  text-to-image providers instead: **Together AI's FLUX.1-schnell-Free**
  (no daily cap) and **Cloudflare Workers AI's FLUX.1-schnell** (generous
  free daily allowance). Both resolve synchronously inline, same pattern
  as the reverted Gemini attempt. This also didn't hold up under real use:
  neither provider has *any* reference-image mechanism — they're
  text-to-image only, prompted with just the character's name as a string
  — so neither can produce a consistent likeness of the character at all.
  Confirmed by the user's own live testing ("nagyon szar minőség... nem az
  én modellemről csinált képet" — very poor quality, and it isn't even a
  picture of my character), which is the actual point of Image Batch.
  Removed entirely in Phase 2J below.
- Phase 2H added Reference Set creation (`POST /api/reference-sets`,
  `ReferenceSetsPanel`'s inline create form) and a lightbox overlay on the
  Overview panel's Recent media grid (click a thumbnail for a full-screen
  view with arrow-key navigation) — both independent of the image
  generation provider work above.
- Phase 2J replaced **both** Nano Banana Pro (fal.ai) and the two
  text-to-image-only free providers (Phase 2G) with **kie.ai**, a
  third-party reseller of both Nano Banana models that actually supports
  reference images. Two reasons: it's cheaper than fal.ai/Google's own
  pricing ($0.02 vs $0.039 for plain Nano Banana, ~$0.12 vs $0.15 for
  Pro), and — more importantly — its `createTask` API accepts a
  `callBackUrl` and pushes the result the moment it's ready instead of
  requiring a poll, sidestepping the GitHub Actions poller's flaky
  `schedule` trigger entirely for these two providers (see the known-issue
  paragraph below): `/api/webhooks/kie` now resolves them instead of
  `/api/cron/poll-generation`, which is why `generation_jobs` gained a
  `provider` column (migration `add_generation_jobs_provider`) — the poll
  cron's in-flight query filters to `provider="fal"` so it never touches a
  kie.ai job's foreign task id. Flux LoRA training and generation stay on
  fal.ai on purpose: Astria.ai was considered as a training replacement
  too (also webhook-based, would have fixed the training poller's same lag
  issue), but Astria doesn't expose a portable weights file the way fal
  does, which would have broken Character Swap for any newly-trained
  character — not worth it for a personal tool where the training poller
  lag is already tolerable via manual `workflow_dispatch`. One honesty
  note: kie.ai's own docs (`docs.kie.ai`) are blocked by this environment's
  network egress proxy, so `lib/kie/client.ts`'s request/response shape was
  cross-referenced from search results and third-party write-ups rather
  than kie.ai's primary documentation or an installed SDK's types — every
  other provider integration in this app was verified that way, this one
  wasn't, so a live-test mismatch here is more likely than usual.

This project's own testing surfaced two real bugs worth knowing about if
something looks stuck: (1) `/api/lora/train` originally built
`images_data_url` as an inline base64 data URI, which fal.ai rejects past a
certain size with a `422 URL too long` — fixed by uploading the zip via
`fal.storage.upload()` and passing the real URL it returns instead; (2) the
GitHub Actions poller's `schedule` trigger is best-effort, not guaranteed —
it has gone quiet for 20 minutes to close to two hours in practice, on
multiple separate occasions. If a training or Flux LoRA generation job
looks stuck, manually re-run `.github/workflows/poll-training.yml`
(`workflow_dispatch`) rather than assuming something is broken — this is
exactly why Phase 2J moved the two reference-image providers off polling
entirely.

The training poller is still triggered every 5 minutes by
`.github/workflows/poll-training.yml` rather than Vercel Cron, since this
team's Vercel Hobby plan silently doesn't run cron schedules more frequent
than once a day; it also still covers Flux LoRA generation and Character
Swap (both still on fal.ai). Every page and API route except `/api/cron/*`
and `/api/webhooks/*` sits behind HTTP Basic Auth (`apps/admin/middleware.ts`)
— this repo is public and its routes are guessable, `/api/webhooks/kie` is
gated by its own `?secret=` check instead (kie.ai can't send Basic Auth),
and `/api/lora/train`, `/api/generate`, and `/api/swap` all trigger real,
billed jobs per call — Character Swap and video (Motion Control, not yet
built) cost meaningfully more per call than a Flux LoRA still image.

There is still no n8n integration and no OpenClaw integration in this repo.
Motion Control and the Scheduler remain read-only/unwired — see the Studio
panels for what's left. RLS is enabled with zero policies on all tables
(intentional — blocks all non-service-role access until a staff-auth model
is decided).

Nothing in this codebase is specific to any one character — "Zaranyx" in
the mock data is one example row, not a special case.

See `apps/admin/README.md` for how to run the app locally.
