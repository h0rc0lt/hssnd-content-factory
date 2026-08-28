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

const NANO_BANANA_ENDPOINT = "fal-ai/nano-banana-pro/edit";
/** Reference images sent per nano-banana-pro/edit call — more than a
 *  handful doesn't meaningfully improve identity match and only slows the
 *  request down. */
const NANO_BANANA_MAX_REFERENCE_IMAGES = 3;

/**
 * POST /api/generate
 *
 * Submits one or more reference-image generation calls for a character.
 * Body: { characterId: string, promptKeys: string[], provider?: "flux-lora"
 * | "nano-banana-pro" } — defaults to "flux-lora" for callers that don't
 * pass it. Direct fal.ai call from this Next.js route, same pattern as
 * /api/lora/train — not routed through n8n (see ImageBatchPanel's doc
 * comment for why).
 *
 * Two providers, deliberately kept side by side rather than one replacing
 * the other — they have opposite tradeoffs (see ImageBatchPanel's doc
 * comment and the README):
 *
 * - "flux-lora" — `fal-ai/flux-lora` (confirmed from the installed SDK's
 *   generated types, FluxLoraInput/Output aliased from `unoOutput`).
 *   Requires a character's LoRA to be `ready`; its `loras` input takes
 *   `lora_models.weights_url` straight through as `path`. ~$0.035/MP once
 *   trained, but needs the $2 / 10-40min training step first.
 * - "nano-banana-pro" — `fal-ai/nano-banana-pro/edit` (Google Gemini 3 Pro
 *   Image via fal, confirmed the same way — NanoBananaProEditInput/Output).
 *   No training, no `loras` field at all: identity comes from up to
 *   NANO_BANANA_MAX_REFERENCE_IMAGES of the character's own
 *   character_uploads, passed as `image_urls` (short-lived signed read
 *   URLs — the character-media bucket isn't public). Works the moment a
 *   character has at least one upload. ~$0.15/image (4-8x flux-lora) —
 *   confirmed against fal's own pricing page, not assumed.
 *
 * `{trigger}` in the prompt template substitutes the LoRA's trigger word
 * for flux-lora, or the generic phrase "this person" for nano-banana-pro —
 * there's no trained token for it to refer to; the reference images alone
 * carry the identity there.
 *
 * Submits and records `fal_request_id` + `fal_endpoint` per job, then
 * stops — completion is picked up by the generation-poll cron (see
 * /api/cron/poll-generation, which branches on fal_endpoint the same way).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const characterId = String(body.characterId ?? "");
    const promptKeys = Array.isArray(body.promptKeys) ? (body.promptKeys as string[]) : [];
    const provider = body.provider === "nano-banana-pro" ? "nano-banana-pro" : "flux-lora";

    if (!characterId || promptKeys.length === 0) {
      return NextResponse.json(
        { error: "characterId and at least one promptKey are required." },
        { status: 400 }
      );
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: "FAL_KEY is not configured on the server." },
        { status: 500 }
      );
    }
    fal.config({ credentials: falKey });

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
      const referenceUploads = uploads.slice(0, NANO_BANANA_MAX_REFERENCE_IMAGES);
      const signedUrls = await Promise.all(
        referenceUploads.map((upload) =>
          supabase.storage.from("character-media").createSignedUrl(upload.storagePath, 60)
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
          falEndpoint: NANO_BANANA_ENDPOINT,
        });

        try {
          const { request_id } = await fal.queue.submit(NANO_BANANA_ENDPOINT, {
            input: { prompt: promptText, image_urls: imageUrls, num_images: 1 },
          });
          await updateGenerationJob(job.id, { status: "processing", falRequestId: request_id });
          return { promptKey, status: "processing" };
        } catch (falErr) {
          const message = describeFalError(falErr, "fal.ai submission failed.");
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
