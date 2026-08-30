/**
 * kie.ai reference-image provider registry for Image Batch.
 *
 * Every entry here was researched the same way (kie.ai's own docs.kie.ai
 * are blocked by this environment's network egress proxy on every direct
 * fetch attempt, so all of this is cross-referenced from search results,
 * not the primary source or an installed SDK) — confidence varies a lot
 * per entry, see each one's `confidence` note. Two hard lessons baked into
 * this shape, both discovered live against real generation_jobs.error
 * values on the flux2-pro slot before this registry existed:
 *
 * 1. The reference-image field name is NOT "image_urls" for every model —
 *    flux-2/pro-image-to-image and gpt-image-2-image-to-image use
 *    "input_urls" instead, nano-banana-2's edit mode uses "image_input",
 *    and qwen2/image-edit takes a single "image_url" string, not an array
 *    at all. Sending the wrong key isn't rejected by kie.ai, it's silently
 *    dropped — the call "succeeds" but generates with no reference image
 *    at all (wrong identity, not an error). See imageUrlsField/singleImage.
 * 2. Some models reject a call outright with "X is required" for fields
 *    that aren't in every example (flux-2/pro-image-to-image needed
 *    aspect_ratio, then resolution, discovered one at a time on separate
 *    live calls). Preemptively setting aspectRatio/resolution below from
 *    each model's own confirmed-or-best-guess docs example is meant to
 *    avoid repeating that one-field-at-a-time discovery process.
 */

export type KieProviderKey =
  | "nano-banana-pro"
  | "nano-banana-2"
  | "seedream-4-5"
  | "uni-1-1"
  | "gpt-image-2"
  | "grok-imagine-image"
  | "qwen-image-2"
  | "wan-2-7";

export interface KieProviderConfig {
  key: KieProviderKey;
  /** Button/display label. */
  label: string;
  /** The kie.ai `model` field value for createTask. */
  model: string;
  /** Which JSON field the reference image URL(s) go under. */
  imageUrlsField: string;
  /** true if this model takes ONE image url as a plain string under
   *  imageUrlsField, rather than an array of urls. */
  singleImage?: boolean;
  /** How many of the character's reference uploads to send — most models
   *  support up to 3-10, but singleImage models obviously cap at 1. */
  maxReferenceImages: number;
  aspectRatio?: string;
  resolution?: string;
  nsfwChecker?: boolean;
  /** Text prepended to the prompt before sending, for models with a
   *  non-standard reference-image convention (see grok-imagine-image). */
  promptPrefix?: string;
  /** Best-effort per-image USD estimate for display and generation_jobs.cost_usd
   *  — not read back from any provider invoice, not billing-reconciliation-grade. */
  priceUsd: number;
  /** Free-text confidence note — shown in the UI title attribute and kept
   *  here so the reasoning travels with the config, not just in a commit
   *  message. */
  confidence: string;
}

export const KIE_PROVIDERS: Record<KieProviderKey, KieProviderConfig> = {
  "nano-banana-pro": {
    key: "nano-banana-pro",
    label: "Nano Banana Pro",
    model: "nano-banana-pro",
    imageUrlsField: "image_urls",
    maxReferenceImages: 3,
    priceUsd: 0.12,
    confidence:
      "Confirmed live in production — this app's original kie.ai provider, in real use since " +
      "Phase 2J with no field-name or required-field issues.",
  },
  "nano-banana-2": {
    key: "nano-banana-2",
    label: "Nano Banana 2",
    model: "nano-banana-2",
    imageUrlsField: "image_input",
    maxReferenceImages: 10,
    aspectRatio: "auto",
    priceUsd: 0.04,
    confidence:
      "Good — model id, image_input field name, and $0.04 base price all confirmed from kie.ai's own product page/docs search results.",
  },
  "seedream-4-5": {
    key: "seedream-4-5",
    label: "Seedream 4.5",
    model: "seedream-4-5-edit",
    imageUrlsField: "image_urls",
    maxReferenceImages: 10,
    aspectRatio: "1:1",
    resolution: "1K",
    priceUsd: 0.032,
    confidence:
      "Low — 4th attempt at this model id. Three prior slash-prefixed guesses " +
      '("seedream/4-5-edit", "seedream/4-5-image-to-image", "seedream/4.5-edit") all ' +
      'failed live with "model name not supported". This guess drops the slash entirely ' +
      '("seedream-4-5-edit", fully flat) on the theory that kie.ai\'s model field doesn\'t ' +
      "always mirror its docs URL slug — confirmed true for gpt-image-2, whose real model " +
      'id ("gpt-image-2-image-to-image") is flat despite living at a slash-containing docs ' +
      "URL. aspectRatio/resolution set preemptively from the flux2-pro lesson, not confirmed " +
      "required for this model specifically.",
  },
  "uni-1-1": {
    key: "uni-1-1",
    label: "UNI 1.1",
    model: "uni-1-1",
    imageUrlsField: "image_urls",
    maxReferenceImages: 5,
    aspectRatio: "1:1",
    priceUsd: 0.04,
    confidence:
      "Very low — UNI 1.1 is a Luma Labs model; no evidence found that kie.ai carries it at " +
      "all (kie.ai's own catalog listing found via search names Z-image, Grok Imagine, Flux-2, " +
      "Google Imagen, Ideogram, GPT Image, Nano Banana, Seedream, Qwen Image, Flux — no Uni/Luma " +
      "entry), and Luma's own announced API partners (Fal, Runware, Comfy, Freepik/Magnific, " +
      "LovArt, Krea, Envato) don't list kie.ai either. Model id and price ($0.04, Luma's own " +
      '"uni-1" base tier price, NOT confirmed as kie.ai\'s) are both fabricated best guesses — ' +
      'expect "model name not supported" here more likely than not.',
  },
  "gpt-image-2": {
    key: "gpt-image-2",
    label: "GPT Image 2",
    model: "gpt-image-2-image-to-image",
    imageUrlsField: "input_urls",
    maxReferenceImages: 10,
    aspectRatio: "auto",
    priceUsd: 0.05,
    confidence:
      "Strong — full request body quoted verbatim from a docs.kie.ai search result: " +
      '{ model: "gpt-image-2-image-to-image", input: { prompt, input_urls, aspect_ratio: "auto" } }. ' +
      "Price tiered by resolution ($0.03 at 1K / $0.05 at 2K / $0.08 at 4K, all confirmed) — " +
      "using the 2K figure since no resolution field was in the confirmed example.",
  },
  "grok-imagine-image": {
    key: "grok-imagine-image",
    label: "Grok Imagine",
    model: "grok-imagine/image-to-image",
    imageUrlsField: "image_urls",
    maxReferenceImages: 1,
    // Confirmed detail from search: prompts reference uploaded images with
    // an "@image(n)" token rather than the image being implicitly "the
    // subject" the way every other provider here treats it. Without this,
    // the reference image may be silently ignored — same failure shape as
    // the wrong-field-name lesson above, just prompt-side instead of
    // field-side. Not independently verified live.
    promptPrefix: "@image(1) ",
    priceUsd: 0.05,
    confidence:
      "Medium on model id/field (docs.kie.ai page + a request-shape summary confirm " +
      "grok-imagine/image-to-image and image_urls, capped at 1 reference image — noticeably " +
      "less than every other provider here). Low on the @image(1) prompt convention (mentioned " +
      "in a search summary, not seen as a literal quoted example) and on price (~$0.02-0.07/image " +
      "range from third-party platforms, not a kie.ai-confirmed number — $0.05 is a midpoint guess).",
  },
  "qwen-image-2": {
    key: "qwen-image-2",
    label: "Qwen Image 2.0",
    model: "qwen2/image-edit",
    imageUrlsField: "image_url",
    singleImage: true,
    maxReferenceImages: 1,
    priceUsd: 0.02,
    confidence:
      'Low — no kie.ai docs page for anything named "Qwen Image 2.0" or "qwen-image-2" turned up; ' +
      '"qwen2/image-edit" is the closest real, confirmed kie.ai endpoint (the "2" in its namespace ' +
      "matching the requested \"2.0\"), but it may just be plain Qwen2, not whatever ByteDance/Alibaba " +
      "markets separately as Qwen Image 2.0. Its image field is also structurally different from " +
      "every other provider here — a single image_url string, not an array — so this can only ever " +
      "use 1 of the character's reference uploads. Price ($0.02) is a rough estimate from a " +
      "credit-rate/megapixel mention, not a confirmed per-image figure.",
  },
  "wan-2-7": {
    key: "wan-2-7",
    label: "Wan 2.7 Image Pro",
    model: "wan/2-7-image-pro",
    imageUrlsField: "input_urls",
    maxReferenceImages: 3,
    priceUsd: 0.1,
    confidence:
      "Good on model id/field — docs.kie.ai confirmed both directly. Price is a tier estimate " +
      "(10 credits at 1K; using this app's flux2-pro precedent of $0.01/credit gives $0.10 — a " +
      "different search result implied a $0.005/credit rate elsewhere on kie.ai, so treat this as " +
      "approximate, not confirmed).",
  },
};

/** fal.ai endpoints this app submits to, outside the kie.ai registry above
 *  — used by getProviderLabel below so every generation_jobs.fal_endpoint
 *  value this app has ever written has a human-readable label, not just
 *  the kie.ai ones. */
const FAL_ENDPOINT_LABELS: Record<string, string> = {
  "fal-ai/flux-lora": "Flux LoRA",
  "fal-ai/flux-lora/image-to-image": "Flux LoRA (Character Swap)",
};

/** Human-readable label for a generation_jobs.fal_endpoint value, for
 *  display (e.g. the Overview lightbox) — checks the kie.ai registry and
 *  the fal.ai endpoint map above, falling back to the raw model id
 *  verbatim for anything older or unrecognized (e.g. a since-abandoned
 *  Seedream 4.5 guess from before this registry existed). */
export function getProviderLabel(falEndpoint: string): string {
  const kieMatch = Object.values(KIE_PROVIDERS).find((p) => p.model === falEndpoint);
  if (kieMatch) return kieMatch.label;
  return FAL_ENDPOINT_LABELS[falEndpoint] ?? falEndpoint;
}
