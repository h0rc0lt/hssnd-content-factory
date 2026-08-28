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
 *  the primary docs, unlike every other provider in this app). */
const KIE_NANO_BANANA_MODEL = "google/nano-banana-edit";
const KIE_NANO_BANANA_PRO_MODEL = "nano-banana-pro";
/** Reference images sent per kie.ai call — more than a handful doesn't
 *  meaningfully improve identity match and only slows the request down. */
const KIE_MAX_REFERENCE_IMAGES = 3;

/**
 * POST /api/generate
 *
 * Submits one or more reference-image generation calls for a character.
 * Body: { characterId: string, promptKeys: string[], provider?: "flux-lora"
 * | "nano-banana-pro" | "nano-banana" } — defaults to "flux-lora" for
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
 *   first (still on fal.ai — Astria.ai was considered as a training
 *   replacement too, but Astria doesn't expose a portable weights file
 *   the way fal does, which would have broken Character Swap for any
 *   newly-trained character; keeping training on fal.ai sidesteps that).
 * - "nano-banana-pro" / "nano-banana" — both on **kie.ai**, not fal.ai and
 *   not a direct Google API call (two earlier approaches, both replaced
 *   here — see README for why): fal.ai's nano-banana-pro/edit repeatedly
 *   sat "processing" for 20+ minutes because of the GitHub Actions poll
 *   cron's unreliable schedule trigger, and the direct Gemini API's
 *   advertised 500-free-requests/day turned out not to apply to this
 *   project's API key (confirmed via real 429 RESOURCE_EXHAUSTED
 *   responses with limit:0, even on a genuine no-billing "Free tier"
 *   project — the free tier apparently doesn't cover the image-preview
 *   model over the raw API). kie.ai resells both models cheaper than
 *   fal.ai/Google's own pricing ($0.02 vs $0.039 for plain Nano Banana,
 *   ~$0.12 vs $0.15 for Pro) and, more importantly, supports webhook
 *   delivery (`callBackUrl`) instead of requiring a poll — see
 *   /api/webhooks/kie, which resolves these jobs the moment kie.ai is
 *   done rather than waiting on the same flaky poll cron. Identity comes
 *   from up to KIE_MAX_REFERENCE_IMAGES of the character's own
 *   character_uploads, passed as `image_urls` (short-lived signed read
 *   URLs — the character-media bucket isn't public).
 *
 * `{trigger}` in the prompt template substitutes the LoRA's trigger word
 * for flux-lora, or the generic phrase "this person" for the two
 * reference-image providers — there's no trained token for it to refer to;
 * the reference images alone carry the identity there.
 *
 * All three providers submit and record a job id (`fal_request_id`, reused
 * generically — see types/generation-job.ts) + `fal_endpoint`, then stop.
 * flux-lora is picked up by the generation-poll cron (see
 * /api/cron/poll-generation); nano-banana-pro/nano-banana are picked up by
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
      body.provider === "nano-banana-pro" || body.provider === "nano-banana"
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

      const kieModel = provider === "nano-banana-pro" ? KIE_NANO_BANANA_PRO_MODEL : KIE_NANO_BANANA_MODEL;
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
