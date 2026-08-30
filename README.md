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

**Phase 2P — Image Batch expands to 8 providers, cost/provider shown per image.** `apps/admin` is
wired to real Supabase data end to end:

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
  kie.ai job's foreign task id. Flux LoRA *generation* and Character Swap
  stayed on fal.ai at this point — Astria.ai was considered as a training
  replacement too (also webhook-based, would have fixed the training
  poller's same lag issue), but Astria doesn't expose a portable weights
  file the way fal does, which would have broken Character Swap for any
  newly-trained character. (Phase 2K below tried moving training to a
  provider that *does* expose portable weights, wavespeed.ai — and
  reverted it after real failures; training stayed on fal.ai in the end.)
  One honesty note: kie.ai's own docs (`docs.kie.ai`) are blocked by this environment's
  network egress proxy, so `lib/kie/client.ts`'s request/response shape was
  cross-referenced from search results and third-party write-ups rather
  than kie.ai's primary documentation or an installed SDK's types — every
  other provider integration in this app was verified that way, this one
  wasn't, so a live-test mismatch here is more likely than usual.
- Phase 2K tried moving LoRA **training** itself to **wavespeed.ai**
  (`flux-dev-lora-trainer`), leaving fal.ai for generation and Character
  Swap unchanged — cheaper (~$1/run vs fal's ~$2), and its `?webhook=`
  query param would have fixed the *other* half of the poller-lag problem
  (training runs had sat "training" for 20+ minutes on this same flaky
  schedule trigger, same as the generation jobs Phase 2J already fixed).
  The first live training run genuinely worked end to end via
  `/api/webhooks/wavespeed`, but its weights URL then got a bare
  `403 Forbidden` from fal.ai when used for generation — a known fal.ai
  behavior toward third-party LoRA URLs, not wavespeed-specific (see
  github.com/fal-ai/fal/issues/903) — so the webhook was patched to
  download and re-host the `.safetensors` file on fal's own storage
  instead of handing fal a foreign URL. That fix deployed and was
  confirmed live (verified via Vercel deployment timestamps and runtime
  logs, not assumed), but every training run after that failed with a
  *different*, unresolved `403 Forbidden` — this time from wavespeed
  itself, mid-training, with no clear cause: not an API key scope issue
  (the key was confirmed "Full access") and not insufficient credit (the
  account had funds). Reverted back to fal.ai for training entirely after
  several failed paid runs — not worth the uncertainty and real cost for
  a personal tool, especially with wavespeed's own docs blocked by this
  environment's network egress proxy the whole time, making the failure
  impossible to fully diagnose from here. `lora_models.provider` and its
  `wavespeed` variant stay in the schema/types in case this gets
  revisited later with more room to debug outside of paid live runs, but
  `/api/lora/train`, `/api/webhooks/wavespeed` (deleted), and
  `lib/wavespeed/client.ts` (deleted) are back to fal.ai only.
- Phase 2L added character deletion (`DELETE /api/characters/[id]`, a
  hover-revealed delete button on each Characters grid card) — a hard
  delete, no undo, no archived state. Most character-referencing tables
  cascade on delete (character_uploads, lora_models, generation_jobs,
  reference_sets, scheduled_posts, captions_history — confirmed from the
  live FK constraints); `media_assets` rows survive with `character_id`
  set to null instead, since Media Library is a shared cross-character
  gallery that shouldn't lose images just because the character behind
  them got deleted. Underlying Supabase Storage files aren't cleaned up
  (out of scope for a personal tool — negligible storage cost, and no
  code path can surface them again once the DB rows pointing at them are
  gone).
- Phase 2M swapped plain (non-Pro) Nano Banana — the third Image Batch
  provider — for **ByteDance's Seedream 4.5**, at the user's request, on
  the strength of it being the same model this operator's other, n8n-based
  persona pipeline already uses successfully in production. It never
  worked: three separate model-id guesses (`seedream/4-5-edit`,
  `seedream/4-5-image-to-image`, `seedream/4.5-edit`) all failed live with
  kie.ai's "model name not supported" — each confirmed free via
  `generation_jobs.error`/`fal_request_id` staying null, kie.ai rejects an
  unrecognized model synchronously before any task/credit is spent, but
  three rounds of guess-deploy-test with no working result was still the
  wrong way to chase this. `docs.kie.ai` stayed blocked by this
  environment's network egress proxy through every attempt, so none of the
  three guesses could ever be checked against the primary source before
  shipping.
- Phase 2O replaced Seedream 4.5 with **Flux-2 Pro** (Black Forest Labs)
  in that same slot, at the user's request, after Seedream 4.5 kept
  failing. Chosen over two other candidates researched alongside it
  (Seedream 5.0 Pro and Wan 2.7 Image Pro) because it's the only one with
  a fully confirmed request body quoted from
  `docs.kie.ai/market/flux2/pro-image-to-image` — model
  `flux-2/pro-image-to-image`, ~$0.05/image at 1K (5 credits × $0.01,
  confirmed against kie.ai's pricing). One real gotcha this surfaced:
  Flux-2 Pro's reference images go under `input_urls`, not `image_urls`
  like every other provider here — sending the wrong field name isn't
  rejected by kie.ai, it's silently dropped, so the call "succeeds" but
  generates with no reference image at all (wrong identity, not an
  error). `submitKieTask` (`lib/kie/client.ts`) now takes an
  `imageUrlsField` param per model instead of hardcoding `image_urls`.
  Wan 2.7 Image Pro (`wan/2-7-image-pro`, also confirmed, also
  `input_urls`) is the next candidate to try if Flux-2 Pro doesn't hold up
  either; Seedream 5.0 Pro was left out entirely — no confirmed model id
  or field name turned up for it, only that the product exists, so using
  it would have been a fourth blind guess for this slot.
- Phase 2P dropped Flux-2 Pro (which, after Phase 2O shipped, did in fact
  need two more real fields before it worked — `resolution` alongside
  `aspect_ratio`, discovered the same way: a live call failing with
  `"resolution is required"` after the first missing field was fixed;
  kie.ai validates required input one field at a time rather than listing
  every gap in a single error) and expanded Image Batch from 3 providers
  to **8**, at the user's request: `flux-lora`, `nano-banana-pro`,
  **Nano Banana 2**, a fourth attempt at **Seedream 4.5**, **UNI 1.1**,
  **GPT Image 2**, **Grok Imagine**, **Qwen Image 2.0**, and
  **Wan 2.7 Image Pro**. Every kie.ai provider now lives in one registry,
  `lib/kie/providers.ts` (`KIE_PROVIDERS`), instead of hardcoded
  if/else branches per provider in `/api/generate` — each entry carries
  its model id, reference-image field name, required extra input
  (`aspect_ratio`/`resolution`/etc.), per-image price, and a `confidence`
  note the Image Batch provider buttons now surface as a hover tooltip,
  since several of these are unverified guesses added explicitly to see
  what happens rather than because they're expected to work:
  - **Confirmed or strong**: `nano-banana-pro` (already in production),
    Nano Banana 2 (`nano-banana-2`, `image_input` field — yet another
    field-name variant, distinct from both `image_urls` and `input_urls`),
    GPT Image 2 (`gpt-image-2-image-to-image`, `input_urls`, full request
    body quoted verbatim from docs.kie.ai), Wan 2.7 Image Pro (unchanged
    from Phase 2O's research).
  - **Medium**: Grok Imagine (`grok-imagine/image-to-image`) — capped at
    1 reference image, and its prompts reportedly need an `@image(1) `
    prefix to actually use the reference image at all (a search-summary
    detail, not seen as a literal quoted example — if identity comes out
    wrong rather than erroring outright, this convention is the first
    thing to check).
  - **Low**: a 4th Seedream 4.5 guess (`seedream-4-5-edit` — flat, no
    slash, on the theory that kie.ai's `model` field doesn't always mirror
    its docs URL slug, which GPT Image 2's confirmed flat id already
    proved true once); Qwen Image 2.0 (`qwen2/image-edit` is the closest
    real, confirmed kie.ai endpoint, but nothing named exactly "Qwen Image
    2.0" was found, and its image field is a single `image_url` string,
    not an array, capping it at 1 reference image like Grok Imagine).
  - **Very low**: UNI 1.1 (`uni-1-1`, fabricated) — this is a Luma Labs
    model with no evidence it's on kie.ai's catalog at all (kie.ai's own
    listing names Z-image, Grok Imagine, Flux-2, Google Imagen, Ideogram,
    GPT Image, Nano Banana, Seedream, Qwen Image, Flux; Luma's own
    announced API partners don't include kie.ai either) — expect
    `"model name not supported"` here more likely than not.

  Two other pieces landed alongside the provider expansion, both at the
  user's request:
  - **Per-category image count.** Each Image Batch category ("Base — grey
    background turnaround", etc.) used to always generate exactly as many
    images as it has distinct pose templates (4, 6, or 8, no way to
    change it). Now each category has a 1-10 number input next to
    Generate; asking for more than the category's own template count
    cycles through those templates again (modulo) rather than capping
    silently.
  - **Provider + cost shown per image.** `generation_jobs` gained a
    `cost_usd` column (migration `add_generation_jobs_cost_usd`), a
    best-effort per-image USD estimate set at submission time from each
    provider's static price (`KIE_PROVIDERS[...].priceUsd`, or
    `FLUX_LORA_PRICE_USD` for flux-lora) — never read back from an actual
    provider invoice, so treat it as approximate, not billing-grade.
    `getRecentMediaForCharacter` (`lib/data/studio.ts`) now looks up each
    displayed asset's originating `generation_jobs` row (by
    `result_media_asset_id`) and the Overview panel's lightbox shows the
    provider label and `~$cost` under the image.

This project's own testing surfaced two real bugs worth knowing about if
something looks stuck: (1) `/api/lora/train` builds `images_data_url` by
uploading the zip via `fal.storage.upload()` and passing the real URL it
returns — never as an inline base64 data URI, which fal.ai rejects past a
certain size with a `422 URL too long` (a real production failure this
project hit once already); (2) the GitHub Actions poller's `schedule`
trigger is best-effort, not guaranteed — it has gone quiet for 20 minutes
to close to two hours in practice, on multiple separate occasions, for
both training and generation jobs. If a Flux LoRA training/generation or
Character Swap job looks stuck, manually re-run
`.github/workflows/poll-training.yml` (`workflow_dispatch`) rather than
assuming something is broken — the two kie.ai Image Batch providers are
the only ones not affected by this (see Phase 2J).

The training poller is still triggered every 5 minutes by
`.github/workflows/poll-training.yml` rather than Vercel Cron, since this
team's Vercel Hobby plan silently doesn't run cron schedules more frequent
than once a day; it covers Flux LoRA training, generation, and Character
Swap (all on fal.ai) — only the two kie.ai providers are webhook-resolved
and skip this poller. Every page and API route except `/api/cron/*` and
`/api/webhooks/*` was meant to sit behind HTTP Basic Auth
(`apps/admin/middleware.ts`) — this repo is public and its routes are
guessable, `/api/webhooks/kie` is gated by its own `?secret=` check
instead (kie.ai can't send Basic Auth), and `/api/lora/train`,
`/api/generate`, and `/api/swap` all trigger real, billed jobs per call —
Character Swap and video (Motion Control, not yet built) cost
meaningfully more per call than a Flux LoRA still image. **The gate is
currently disabled** (`middleware.ts` is a pass-through) — a mistyped
`BASIC_AUTH_PASSWORD` in Vercel locked the operator out with no way to
recover the working value, so the whole app is temporarily open to
anyone with the URL while the credentials get reset. Re-enable it (or
replace it with Vercel's own Password Protection) once
`BASIC_AUTH_USER`/`BASIC_AUTH_PASSWORD` are set to known values again.

There is still no n8n integration and no OpenClaw integration in this repo.
Motion Control and the Scheduler remain read-only/unwired — see the Studio
panels for what's left. RLS is enabled with zero policies on all tables
(intentional — blocks all non-service-role access until a staff-auth model
is decided).

Nothing in this codebase is specific to any one character — "Zaranyx" in
the mock data is one example row, not a special case.

See `apps/admin/README.md` for how to run the app locally.
