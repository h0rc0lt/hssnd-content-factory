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
import { KIE_PROVIDERS, type KieProviderKey } from "@/lib/kie/providers";

/** fal.ai's own price, not from the KIE_PROVIDERS registry since flux-lora
 *  never goes through kie.ai. Rough megapixel-rate estimate, not a
 *  provider-confirmed flat per-image figure the way most kie.ai entries
 *  are — this app's default Image Batch output size puts a single image
 *  in the ~$0.03-0.06 range already shown on the provider button. */
const FLUX_LORA_PRICE_USD = 0.04;

/**
 * POST /api/generate
 *
 * Submits one or more reference-image generation calls for a character.
 * Body: { characterId: string, promptKeys: string[], provider?: "flux-lora"
 * | one of the KieProviderKey values in lib/kie/providers.ts } — defaults
 * to "flux-lora" for callers that don't pass it. Direct provider call from
 * this Next.js route, same pattern as /api/lora/train — not routed through
 * n8n (see ImageBatchPanel's doc comment for why).
 *
 * "flux-lora" is `fal-ai/flux-lora` on fal.ai (confirmed from the
 * installed SDK's generated types, FluxLoraInput/Output aliased from
 * `unoOutput`). Requires a character's LoRA to be `ready`; its `loras`
 * input takes `lora_models.weights_url` straight through as `path`.
 * ~$0.035/MP once trained, but needs the $2 / 10-40min training step first.
 *
 * Every other provider value is a **kie.ai** model, looked up in
 * KIE_PROVIDERS (lib/kie/providers.ts) — that registry is the single
 * source of truth for each model's id, reference-image field name (NOT
 * "image_urls" for every model — see that file's doc comment for the hard
 * lessons behind this), required extra input (aspect_ratio/resolution/
 * etc.), per-image price, and a confidence note on how solid each of
 * those is. This app's history with these went through Nano Banana Pro
 * (fal.ai directly, then kie.ai after the fal.ai poll cron proved too
 * flaky), a genuinely-free-but-text-to-image-only detour through Together
 * AI/Cloudflare Workers AI that got reverted, plain Nano Banana, Seedream
 * 4.5 (three failed model-id guesses, dropped), and Flux-2 Pro — see the
 * README for the full blow-by-blow. This version adds five more
 * candidates (Nano Banana 2, a fourth Seedream 4.5 guess, UNI 1.1, GPT
 * Image 2, Grok Imagine, Qwen Image 2.0, Wan 2.7 Image Pro) at the user's
 * request, explicitly accepting that the low-confidence ones (Seedream
 * 4.5, UNI 1.1 especially) may just fail — see KIE_PROVIDERS for which.
 *
 * Identity for every kie.ai provider comes from up to
 * config.maxReferenceImages of the character's own character_uploads
 * (short-lived signed read URLs — the character-media bucket isn't
 * public); some models cap this lower than the usual 3 (grok-imagine-image
 * and qwen-image-2 both only accept 1).
 *
 * `{trigger}` in the prompt template substitutes the LoRA's trigger word
 * for flux-lora, or the generic phrase "this person" for every kie.ai
 * provider — there's no trained token for it to refer to; the reference
 * images alone carry the identity there. A provider's `promptPrefix` (see
 * grok-imagine-image) is prepended after that substitution.
 *
 * Every provider submits and records a job id (`fal_request_id`, reused
 * generically — see types/generation-job.ts) + `fal_endpoint` + a
 * best-effort `cost_usd`, then stops. flux-lora is picked up by the
 * generation-poll cron (see /api/cron/poll-generation); every kie.ai
 * provider is picked up by kie.ai's webhook (/api/webhooks/kie) instead —
 * see `provider` on createGenerationJob, which the poll cron's query
 * filters on so it never touches a kie.ai job.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const characterId = String(body.characterId ?? "");
    const promptKeys = Array.isArray(body.promptKeys) ? (body.promptKeys as string[]) : [];
    const provider: "flux-lora" | KieProviderKey =
      typeof body.provider === "string" && body.provider in KIE_PROVIDERS
        ? (body.provider as KieProviderKey)
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
          costUsd: FLUX_LORA_PRICE_USD,
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
      const config = KIE_PROVIDERS[provider];

      const uploads = await getUploadsForCharacter(characterId);
      if (uploads.length === 0) {
        return NextResponse.json(
          { error: "This character has no uploaded reference images yet." },
          { status: 400 }
        );
      }

      const supabase = getSupabaseServerClient();
      const referenceUploads = uploads.slice(0, config.maxReferenceImages);
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

      const callBackUrl = `${process.env.APP_BASE_URL}/api/webhooks/kie?secret=${process.env.KIE_WEBHOOK_SECRET}`;

      submitOne = async (promptKey) => {
        const template = PROMPT_TEMPLATES.find((t) => t.key === promptKey);
        if (!template) {
          return { promptKey, status: "failed", error: "Unknown prompt template key." };
        }
        const promptText =
          (config.promptPrefix ?? "") + template.prompt.replace("{trigger}", "this person");

        const job = await createGenerationJob({
          characterId,
          loraModelId: null,
          promptKey,
          promptText,
          provider: "kie.ai",
          falEndpoint: config.model,
          costUsd: config.priceUsd,
        });

        try {
          const { taskId } = await submitKieTask({
            model: config.model,
            prompt: promptText,
            imageUrls,
            imageUrlsField: config.imageUrlsField,
            singleImage: config.singleImage,
            aspectRatio: config.aspectRatio,
            resolution: config.resolution,
            nsfwChecker: config.nsfwChecker,
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
