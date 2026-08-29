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
 *  KIE_SEEDREAM_MODEL in particular is still a guess, and already burned
 *  one wrong attempt: "seedream/4-5-edit" (the original guess here) came
 *  back from kie.ai's createTask with "The model name you specified is
 *  not supported" on every real call — confirmed via generation_jobs.error
 *  in production, with fal_request_id staying null on all of them, which
 *  means kie.ai rejects it synchronously before a task/credit is ever
 *  spent, so those failures cost nothing. "seedream/4-5-image-to-image"
 *  below is the next, better-supported guess: kie.ai's docs confirm
 *  "seedream/5-lite-image-to-image" verbatim (full curl example, same
 *  `image_urls` input shape this app already sends) as the reference-image
 *  variant of the newer Seedream 5 Lite model, so "-image-to-image" (not
 *  "-edit") looks like the real suffix convention for this "seedream/"
 *  naming family — "-edit" was only ever confirmed for the older,
 *  differently-prefixed "bytedance/seedream-v4-edit". Still not directly
 *  confirmed for 4.5 specifically. If this also 404s/errors, the confirmed
 *  working fallback is to point this at "seedream/5-lite-image-to-image"
 *  instead (a newer Seedream tier, same reference-image capability). */
const KIE_NANO_BANANA_PRO_MODEL = "nano-banana-pro";
const KIE_SEEDREAM_MODEL = "seedream/4-5-image-to-image";
/** Reference images sent per kie.ai call — more than a handful doesn't
 *  meaningfully improve identity match and only slows the request down. */
const KIE_MAX_REFERENCE_IMAGES = 3;

/**
 * POST /api/generate
 *
 * Submits one or more reference-image generation calls for a character.
 * Body: { characterId: string, promptKeys: string[], provider?: "flux-lora"
 * | "nano-banana-pro" | "seedream" } — defaults to "flux-lora" for
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
 * - "nano-banana-pro" / "seedream" — both on **kie.ai**. Earlier attempts
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
 *   poll cron. The third slot was plain (non-Pro) Nano Banana at first,
 *   swapped for ByteDance's Seedream 4.5 at the user's request — same
 *   reference-image identity pattern, ~$0.032/image, and it's the same
 *   model this operator's existing production n8n pipeline (for a
 *   different persona) already uses successfully, so it's a known
 *   quantity for quality, not just a guess. Identity for both kie.ai
 *   providers comes from up to KIE_MAX_REFERENCE_IMAGES of the
 *   character's own character_uploads, passed as `image_urls`
 *   (short-lived signed read URLs — the character-media bucket isn't
 *   public).
 *
 * `{trigger}` in the prompt template substitutes the LoRA's trigger word
 * for flux-lora, or the generic phrase "this person" for the two
 * reference-image providers — there's no trained token for it to refer to;
 * the reference images alone carry the identity there.
 *
 * All three providers submit and record a job id (`fal_request_id`, reused
 * generically — see types/generation-job.ts) + `fal_endpoint`, then stop.
 * flux-lora is picked up by the generation-poll cron (see
 * /api/cron/poll-generation); nano-banana-pro/seedream are picked up by
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
      body.provider === "nano-banana-pro" || body.provider === "seedream"
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

      const kieModel = provider === "nano-banana-pro" ? KIE_NANO_BANANA_PRO_MODEL : KIE_SEEDREAM_MODEL;
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
