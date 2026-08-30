import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import {
  getCharacterById,
  getLatestLoraModelForCharacter,
  getUploadsForCharacter,
  createGenerationJob,
  updateGenerationJob,
} from "@/lib/data/lora-pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PROMPT_TEMPLATES } from "@/lib/data/prompt-templates";
import { describeFalError } from "@/lib/fal/describe-error";
import { submitKieTask } from "@/lib/kie/client";

/** kie.ai model ids — see lib/kie/client.ts's doc comment on how these
 *  were sourced (kie.ai's docs are blocked by this environment's network
 *  egress proxy, so cross-referenced from third-party sources instead of
 *  the primary docs, unlike every other provider in this app).
 *
 *  The third Image Batch slot was ByteDance's Seedream 4.5 until this
 *  point, but every guessed model id for it failed live with kie.ai's
 *  "model name not supported" (confirmed via generation_jobs.error,
 *  fal_request_id staying null each time — kie.ai rejects an unrecognized
 *  model synchronously before any task/credit is spent, so none of these
 *  cost anything): "seedream/4-5-edit", then "seedream/4-5-image-to-image",
 *  then "seedream/4.5-edit". Rather than keep guessing at Seedream 4.5
 *  specifically, swapped the slot to **Flux-2 Pro** (Black Forest Labs),
 *  at the user's request, using the one candidate with a fully confirmed
 *  request body from docs.kie.ai/market/flux2/pro-image-to-image (exact
 *  quoted JSON, not inferred): model "flux-2/pro-image-to-image", and —
 *  important — its reference images go under `input_urls`, not
 *  `image_urls` like every other provider here. Sending the wrong field
 *  name isn't rejected by kie.ai, it's silently dropped (see
 *  lib/kie/client.ts's KieCreateTaskInput.imageUrlsField), so this would
 *  have been a much sneakier failure than the four "model not supported"
 *  errors before it. ~$0.05/image at 1K resolution (5 credits × $0.01),
 *  confirmed against kie.ai's own pricing, not assumed.
 *
 *  The model id itself was right on the first try — a real, different
 *  error confirmed it ("model not supported" never came back again).
 *  What it needed next was `aspect_ratio` in the input: kie.ai's
 *  createTask rejected every real call with "aspect_ratio is required"
 *  (confirmed via generation_jobs.error) until this was added below,
 *  matching kie.ai's own docs example ("1:1"). nano-banana-pro doesn't
 *  need it, so it's only passed for flux2-pro (see `aspectRatio` below
 *  and lib/kie/client.ts's KieCreateTaskInput.aspectRatio).
 *
 *  Two other candidates were researched alongside this one, also with
 *  confirmed model ids and field names, in case Flux-2 Pro doesn't hold
 *  up under real use either:
 *   - Wan 2.7 Image Pro: model "wan/2-7-image-pro", also `input_urls`,
 *     max 3 reference images (docs.kie.ai/market/wan/2-7-image-pro).
 *   - Seedream 5.0 Pro: NOT implemented — no confirmed model id or field
 *     name turned up in search, only that the product exists. Guessing
 *     "seedream/5-pro-image-to-image" by analogy to 5 Lite would be a
 *     fifth blind guess for this slot; skipped rather than risk another
 *     silent-failure or rejected call. */
const KIE_NANO_BANANA_PRO_MODEL = "nano-banana-pro";
const KIE_FLUX2_PRO_MODEL = "flux-2/pro-image-to-image";
/** Reference images sent per kie.ai call — more than a handful doesn't
 *  meaningfully improve identity match and only slows the request down. */
const KIE_MAX_REFERENCE_IMAGES = 3;

/**
 * POST /api/generate
 *
 * Submits one or more reference-image generation calls for a character.
 * Body: { characterId: string, promptKeys: string[], provider?: "flux-lora"
 * | "nano-banana-pro" | "flux2-pro" } — defaults to "flux-lora" for
 * callers that don't pass it. Direct provider call from this Next.js
 * route, same pattern as /api/lora/train — not routed through n8n (see
 * ImageBatchPanel's doc comment for why).
 *
 * Three providers, deliberately kept side by side rather than one
 * replacing another — they have opposite tradeoffs (see ImageBatchPanel's
 * doc comment and the README):
 *
 * - "flux-lora" — `fal-ai/flux-lora` on fal.ai (confirmed from the
 *   installed SDK's generated types, FluxLoraInput/Output aliased from
 *   `unoOutput`). Requires a character's LoRA to be `ready`; its `loras`
 *   input takes `lora_models.weights_url` straight through as `path`.
 *   ~$0.035/MP once trained, but needs the $2 / 10-40min training step
 *   first.
 * - "nano-banana-pro" / "flux2-pro" — both on **kie.ai**. Earlier attempts
 *   were tried and abandoned here (see README for the full history):
 *   fal.ai's `nano-banana-pro/edit` repeatedly sat "processing" for 20+
 *   minutes because of the GitHub Actions poll cron's unreliable schedule
 *   trigger; a genuinely-free swap to Together AI's FLUX.1-schnell-Free
 *   and Cloudflare Workers AI was tried next but is **text-to-image
 *   only** — no reference-image mechanism at all, so it couldn't produce
 *   a consistent likeness and was confirmed useless via live testing.
 *   kie.ai resells both models cheaper than the official pricing and,
 *   more importantly, supports webhook delivery (`callBackUrl`) instead
 *   of requiring a poll — see /api/webhooks/kie, which resolves these
 *   jobs the moment kie.ai is done rather than waiting on the same flaky
 *   poll cron. The third slot was plain (non-Pro) Nano Banana, then
 *   ByteDance's Seedream 4.5, then (this version) **Flux-2 Pro** — see
 *   KIE_FLUX2_PRO_MODEL's doc comment above for why Seedream 4.5 was
 *   dropped. Identity for both kie.ai providers comes from up to
 *   KIE_MAX_REFERENCE_IMAGES of the character's own character_uploads
 *   (short-lived signed read URLs — the character-media bucket isn't
 *   public) — under the `image_urls` field for nano-banana-pro, but
 *   `input_urls` for flux2-pro (see submitKieTask's call below and
 *   lib/kie/client.ts's doc comment).
 *
 * `{trigger}` in the prompt template substitutes the LoRA's trigger word
 * for flux-lora, or the generic phrase "this person" for the two
 * reference-image providers — there's no trained token for it to refer to;
 * the reference images alone carry the identity there.
 *
 * All three providers submit and record a job id (`fal_request_id`, reused
 * generically — see types/generation-job.ts) + `fal_endpoint`, then stop.
 * flux-lora is picked up by the generation-poll cron (see
 * /api/cron/poll-generation); nano-banana-pro/flux2-pro are picked up by
 * kie.ai's webhook (/api/webhooks/kie) instead — see `provider` on
 * createGenerationJob, which the poll cron's query filters on so it never
 * touches a kie.ai job.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const characterId = String(body.characterId ?? "");
    const promptKeys = Array.isArray(body.promptKeys) ? (body.promptKeys as string[]) : [];
    const provider =
      body.provider === "nano-banana-pro" || body.provider === "flux2-pro"
        ? body.provider
        : "flux-lora";

    if (!characterId || promptKeys.length === 0) {
      return NextResponse.json(
        { error: "characterId and at least one promptKey are required." },
        { status: 400 }
      );
    }

    if (provider === "flux-lora") {
      const falKey = process.env.FAL_KEY;
      if (!falKey) {
        return NextResponse.json(
          { error: "FAL_KEY is not configured on the server." },
          { status: 500 }
        );
      }
      fal.config({ credentials: falKey });
    } else {
      if (!process.env.KIE_API_KEY) {
        return NextResponse.json(
          { error: "KIE_API_KEY is not configured on the server." },
          { status: 500 }
        );
      }
      if (!process.env.APP_BASE_URL || !process.env.KIE_WEBHOOK_SECRET) {
        return NextResponse.json(
          { error: "APP_BASE_URL and KIE_WEBHOOK_SECRET are not configured on the server." },
          { status: 500 }
        );
      }
    }

    const character = await getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    let submitOne: (promptKey: string) => Promise<{
      promptKey: string;
      status: string;
      error?: string;
    }>;

    if (provider === "flux-lora") {
      const loraModel = await getLatestLoraModelForCharacter(characterId);
      if (!loraModel || loraModel.status !== "ready" || !loraModel.weightsUrl) {
        return NextResponse.json(
          { error: "This character doesn't have a ready trained LoRA yet." },
          { status: 400 }
        );
      }
      const weightsUrl = loraModel.weightsUrl;
      const triggerWord = loraModel.triggerWord ?? character.slug;

      submitOne = async (promptKey) => {
        const template = PROMPT_TEMPLATES.find((t) => t.key === promptKey);
        if (!template) {
          return { promptKey, status: "failed", error: "Unknown prompt template key." };
        }
        const promptText = template.prompt.replace("{trigger}", triggerWord);

        const job = await createGenerationJob({
          characterId,
          loraModelId: loraModel.id,
          promptKey,
          promptText,
          provider: "fal",
          falEndpoint: "fal-ai/flux-lora",
        });

        try {
          const { request_id } = await fal.queue.submit("fal-ai/flux-lora", {
            input: { prompt: promptText, loras: [{ path: weightsUrl }], num_images: 1 },
          });
          await updateGenerationJob(job.id, { status: "processing", falRequestId: request_id });
          return { promptKey, status: "processing" };
        } catch (falErr) {
          const message = describeFalError(falErr, "fal.ai submission failed.");
          await updateGenerationJob(job.id, { status: "failed", error: message });
          return { promptKey, status: "failed", error: message };
        }
      };
    } else {
      const uploads = await getUploadsForCharacter(characterId);
      if (uploads.length === 0) {
        return NextResponse.json(
          { error: "This character has no uploaded reference images yet." },
          { status: 400 }
        );
      }

      const supabase = getSupabaseServerClient();
      const referenceUploads = uploads.slice(0, KIE_MAX_REFERENCE_IMAGES);
      const signedUrls = await Promise.all(
        referenceUploads.map((upload) =>
          supabase.storage.from("character-media").createSignedUrl(upload.storagePath, 60 * 30)
        )
      );
      const imageUrls = signedUrls
        .map((r) => r.data?.signedUrl)
        .filter((url): url is string => Boolean(url));
      if (imageUrls.length === 0) {
        return NextResponse.json(
          { error: "Failed to read reference images from storage." },
          { status: 500 }
        );
      }

      const kieModel = provider === "nano-banana-pro" ? KIE_NANO_BANANA_PRO_MODEL : KIE_FLUX2_PRO_MODEL;
      const imageUrlsField = provider === "flux2-pro" ? "input_urls" : "image_urls";
      // flux-2/pro-image-to-image rejects a call outright without these —
      // "aspect_ratio is required" then, on the next live call after that
      // was fixed, "resolution is required" too (confirmed via
      // generation_jobs.error both times; kie.ai validates required
      // fields one at a time rather than listing every missing one in a
      // single error). nano-banana-pro needs none of this. Values match
      // kie.ai's own docs example for this model exactly.
      const aspectRatio = provider === "flux2-pro" ? "1:1" : undefined;
      const resolution = provider === "flux2-pro" ? "1K" : undefined;
      const nsfwChecker = provider === "flux2-pro" ? false : undefined;
      const callBackUrl = `${process.env.APP_BASE_URL}/api/webhooks/kie?secret=${process.env.KIE_WEBHOOK_SECRET}`;

      submitOne = async (promptKey) => {
        const template = PROMPT_TEMPLATES.find((t) => t.key === promptKey);
        if (!template) {
          return { promptKey, status: "failed", error: "Unknown prompt template key." };
        }
        const promptText = template.prompt.replace("{trigger}", "this person");

        const job = await createGenerationJob({
          characterId,
          loraModelId: null,
          promptKey,
          promptText,
          provider: "kie.ai",
          falEndpoint: kieModel,
        });

        try {
          const { taskId } = await submitKieTask({
            model: kieModel,
            prompt: promptText,
            imageUrls,
            imageUrlsField,
            aspectRatio,
            resolution,
            nsfwChecker,
            callBackUrl,
          });
          await updateGenerationJob(job.id, { status: "processing", falRequestId: taskId });
          return { promptKey, status: "processing" };
        } catch (kieErr) {
          const message = kieErr instanceof Error ? kieErr.message : "kie.ai submission failed.";
          await updateGenerationJob(job.id, { status: "failed", error: message });
          return { promptKey, status: "failed", error: message };
        }
      };
    }

    const results = await Promise.all(promptKeys.map((promptKey) => submitOne(promptKey)));
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
