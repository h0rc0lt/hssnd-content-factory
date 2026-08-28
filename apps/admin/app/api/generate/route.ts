import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { GoogleGenAI } from "@google/genai";
import {
  getCharacterById,
  getLatestLoraModelForCharacter,
  getUploadsForCharacter,
  createGenerationJob,
  updateGenerationJob,
  createGeneratedMediaAsset,
} from "@/lib/data/lora-pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PROMPT_TEMPLATES } from "@/lib/data/prompt-templates";
import { describeFalError } from "@/lib/fal/describe-error";

const NANO_BANANA_ENDPOINT = "fal-ai/nano-banana-pro/edit";
/** Reference images sent per nano-banana-pro/edit call — more than a
 *  handful doesn't meaningfully improve identity match and only slows the
 *  request down. */
const NANO_BANANA_MAX_REFERENCE_IMAGES = 3;

/** Marker stored in generation_jobs.fal_endpoint for the direct-Gemini
 *  provider — not actually a fal.ai endpoint (this provider never touches
 *  fal), but the column doubles as "which API/model produced this job" and
 *  the poll-generation cron only ever looks at jobs with a fal_request_id,
 *  which this provider never sets (see submitOne below), so it's a safe
 *  reuse rather than a schema change for one more provider. */
const GEMINI_FLASH_IMAGE_MODEL = "gemini-2.5-flash-image";
/** Same reasoning as NANO_BANANA_MAX_REFERENCE_IMAGES — plain Nano Banana
 *  (Gemini 2.5 Flash Image) via the direct Google API, same identity
 *  pattern as nano-banana-pro (reference images, no trained LoRA). */
const GEMINI_MAX_REFERENCE_IMAGES = 3;
/** Long-lived signed URL lifetime for generated images uploaded to
 *  Supabase Storage — the character-media bucket isn't public (see
 *  /api/swap's doc comment), and unlike the fal.ai providers there's no
 *  provider-hosted CDN URL to point canonicalUrl at directly, since Gemini
 *  returns raw image bytes in the response body. ~10 years, effectively
 *  permanent for a personal tool with no rotation story. */
const GENERATED_ASSET_SIGNED_URL_SECONDS = 60 * 60 * 24 * 365 * 10;

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
 * - "nano-banana" — the base (non-Pro) Gemini 2.5 Flash Image model,
 *   called *directly* against the Google Gemini API (`@google/genai`, NOT
 *   fal.ai — there's no fal wrapper needed since Gemini's own free tier is
 *   the entire point). 500 requests/day free, then per-image billing —
 *   confirmed against Google's own published rate limits, not assumed.
 *   Same reference-image identity pattern as nano-banana-pro, but the
 *   images have to be downloaded from Supabase Storage and base64-inlined
 *   into the request (`inlineData`) rather than passed as URLs — Gemini
 *   has no equivalent of fal's `image_urls`. Also architecturally
 *   different from the other two: `generateContent()` is synchronous and
 *   returns the finished image bytes in the same HTTP response, so this
 *   branch resolves the generation_jobs row to succeeded/failed inline
 *   rather than submitting to a queue and leaving it for the poller (see
 *   GEMINI_FLASH_IMAGE_MODEL above).
 *
 * `{trigger}` in the prompt template substitutes the LoRA's trigger word
 * for flux-lora, or the generic phrase "this person" for the two
 * reference-image providers — there's no trained token for it to refer to;
 * the reference images alone carry the identity there.
 *
 * flux-lora and nano-banana-pro submit and record `fal_request_id` +
 * `fal_endpoint` per job, then stop — completion is picked up by the
 * generation-poll cron (see /api/cron/poll-generation, which branches on
 * fal_endpoint the same way). nano-banana resolves inline instead (see
 * above) and is never seen by that cron.
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

    if (provider === "nano-banana") {
      if (!process.env.GEMINI_API_KEY) {
        return NextResponse.json(
          { error: "GEMINI_API_KEY is not configured on the server." },
          { status: 500 }
        );
      }
    } else {
      const falKey = process.env.FAL_KEY;
      if (!falKey) {
        return NextResponse.json(
          { error: "FAL_KEY is not configured on the server." },
          { status: 500 }
        );
      }
      fal.config({ credentials: falKey });
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
    } else if (provider === "nano-banana-pro") {
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
    } else {
      const uploads = await getUploadsForCharacter(characterId);
      if (uploads.length === 0) {
        return NextResponse.json(
          { error: "This character has no uploaded reference images yet." },
          { status: 400 }
        );
      }

      const supabase = getSupabaseServerClient();
      const referenceUploads = uploads.slice(0, GEMINI_MAX_REFERENCE_IMAGES);
      const referenceImages = await Promise.all(
        referenceUploads.map(async (upload) => {
          const { data, error } = await supabase.storage
            .from("character-media")
            .download(upload.storagePath);
          if (error || !data) return null;
          const buffer = Buffer.from(await data.arrayBuffer());
          return { mimeType: upload.mimeType, data: buffer.toString("base64") };
        })
      );
      const validReferenceImages = referenceImages.filter(
        (img): img is { mimeType: string; data: string } => img !== null
      );
      if (validReferenceImages.length === 0) {
        return NextResponse.json(
          { error: "Failed to read reference images from storage." },
          { status: 500 }
        );
      }

      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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
          falEndpoint: GEMINI_FLASH_IMAGE_MODEL,
        });

        try {
          const response = await genAI.models.generateContent({
            model: GEMINI_FLASH_IMAGE_MODEL,
            contents: [
              {
                role: "user",
                parts: [
                  { text: promptText },
                  ...validReferenceImages.map((img) => ({
                    inlineData: { mimeType: img.mimeType, data: img.data },
                  })),
                ],
              },
            ],
          });

          const parts = response.candidates?.[0]?.content?.parts ?? [];
          const imagePart = parts.find((part) => part.inlineData?.data);
          if (!imagePart?.inlineData?.data) {
            throw new Error("Gemini returned no image data for this prompt.");
          }

          const outputMimeType = imagePart.inlineData.mimeType ?? "image/png";
          const ext = outputMimeType === "image/jpeg" ? "jpg" : "png";
          const storagePath = `${characterId}/generated/${randomUUID()}.${ext}`;
          const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");

          const { error: uploadError } = await supabase.storage
            .from("character-media")
            .upload(storagePath, imageBuffer, { contentType: outputMimeType });
          if (uploadError) {
            throw new Error(`Failed to store generated image: ${uploadError.message}`);
          }

          const { data: signedUrlData, error: signError } = await supabase.storage
            .from("character-media")
            .createSignedUrl(storagePath, GENERATED_ASSET_SIGNED_URL_SECONDS);
          if (signError || !signedUrlData) {
            throw new Error(
              `Failed to create a read URL for the generated image: ${signError?.message}`
            );
          }

          const mediaAssetId = await createGeneratedMediaAsset({
            characterId,
            storagePath,
            canonicalUrl: signedUrlData.signedUrl,
            label: promptKey,
          });

          await updateGenerationJob(job.id, {
            status: "succeeded",
            resultMediaAssetId: mediaAssetId,
          });
          return { promptKey, status: "succeeded" };
        } catch (geminiErr) {
          const message =
            geminiErr instanceof Error ? geminiErr.message : "Gemini generation failed.";
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
