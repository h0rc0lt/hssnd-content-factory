import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
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

/** Together AI FLUX.1-schnell-Free: genuinely free with no daily cap,
 *  confirmed from Together AI's own documentation. OpenAI-compatible
 *  images/generations endpoint — returns base64 image data inline
 *  (synchronous, no queue/poller needed). Text-to-image only — does NOT
 *  support reference-image identity; use Flux LoRA or Nano Banana Pro when
 *  character consistency is required. */
const TOGETHER_FLUX_SCHNELL_FREE_MODEL = "black-forest-labs/FLUX.1-schnell-Free";
const TOGETHER_API_URL = "https://api.together.xyz/v1/images/generations";
/** Long-lived signed URL lifetime for generated images uploaded to
 *  Supabase Storage — the character-media bucket isn't public (see
 *  /api/swap's doc comment), and unlike the fal.ai providers there's no
 *  provider-hosted CDN URL to point canonicalUrl at directly. ~10 years,
 *  effectively permanent for a personal tool with no rotation story. */
const GENERATED_ASSET_SIGNED_URL_SECONDS = 60 * 60 * 24 * 365 * 10;

/**
 * POST /api/generate
 *
 * Submits one or more reference-image generation calls for a character.
 * Body: { characterId: string, promptKeys: string[], provider?: "flux-lora"
 * | "nano-banana-pro" | "flux-schnell-free" } — defaults to "flux-lora"
 * for callers that don't pass it. Direct provider call from this Next.js
 * route, same pattern as /api/lora/train — not routed through n8n (see
 * ImageBatchPanel's doc comment for why).
 *
 * Three providers, deliberately kept side by side rather than one
 * replacing another — they have different tradeoffs:
 *
 * - "flux-lora" — `fal-ai/flux-lora` (FluxLoraInput/Output from the SDK).
 *   Requires a character's LoRA to be `ready`; its `loras` input takes
 *   `lora_models.weights_url` straight through as `path`. ~$0.035/MP once
 *   trained, but needs the $2 / 10-40min training step first.
 * - "nano-banana-pro" — `fal-ai/nano-banana-pro/edit` (Google Gemini 3 Pro
 *   Image via fal). No training, no `loras` field at all: identity comes
 *   from up to NANO_BANANA_MAX_REFERENCE_IMAGES of the character's own
 *   character_uploads, passed as `image_urls`. Works the moment a character
 *   has at least one upload. ~$0.15/image (4-8x flux-lora) — confirmed
 *   against fal's own pricing page, not assumed.
 * - "flux-schnell-free" — Together AI's FLUX.1-schnell-Free endpoint.
 *   Genuinely free with no daily cap (confirmed from Together AI docs).
 *   OpenAI-compatible POST to TOGETHER_API_URL, returns base64 image data
 *   inline. Text-to-image only — does NOT support reference images for
 *   identity consistency; the character's name/description in the prompt
 *   is the only identity signal. Same synchronous/inline-resolve pattern
 *   as the old Gemini branch: no fal queue, no `fal_request_id`, never
 *   seen by the poll-generation cron.
 *
 * `{trigger}` in the prompt template substitutes the LoRA's trigger word
 * for flux-lora, or the generic phrase "this person" for nano-banana-pro,
 * or the character's name for flux-schnell-free (no reference images, so
 * a descriptive name is the only identity hook available).
 *
 * flux-lora and nano-banana-pro submit and record `fal_request_id` +
 * `fal_endpoint` per job, then stop — completion is picked up by the
 * generation-poll cron (see /api/cron/poll-generation). flux-schnell-free
 * resolves inline instead and is never seen by that cron.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const characterId = String(body.characterId ?? "");
    const promptKeys = Array.isArray(body.promptKeys) ? (body.promptKeys as string[]) : [];
    const provider =
      body.provider === "nano-banana-pro" || body.provider === "flux-schnell-free"
        ? body.provider
        : "flux-lora";

    if (!characterId || promptKeys.length === 0) {
      return NextResponse.json(
        { error: "characterId and at least one promptKey are required." },
        { status: 400 }
      );
    }

    if (provider === "flux-schnell-free") {
      if (!process.env.TOGETHER_API_KEY) {
        return NextResponse.json(
          { error: "TOGETHER_API_KEY is not configured on the server." },
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
      // "flux-schnell-free" — Together AI FLUX.1-schnell-Free
      // Text-to-image only; no reference images. Resolves synchronously
      // in this request — no fal queue, no poll cron.
      const supabase = getSupabaseServerClient();

      submitOne = async (promptKey) => {
        const template = PROMPT_TEMPLATES.find((t) => t.key === promptKey);
        if (!template) {
          return { promptKey, status: "failed", error: "Unknown prompt template key." };
        }
        // No trained trigger word and no reference images — use the
        // character's name as the best available identity signal.
        const promptText = template.prompt.replace("{trigger}", character.name);

        const job = await createGenerationJob({
          characterId,
          loraModelId: null,
          promptKey,
          promptText,
          falEndpoint: TOGETHER_FLUX_SCHNELL_FREE_MODEL,
        });

        try {
          const togetherRes = await fetch(TOGETHER_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
            },
            body: JSON.stringify({
              model: TOGETHER_FLUX_SCHNELL_FREE_MODEL,
              prompt: promptText,
              n: 1,
              // Together AI returns base64 by default for this model;
              // explicitly request it to be safe.
              response_format: "b64_json",
            }),
          });

          if (!togetherRes.ok) {
            const errText = await togetherRes.text().catch(() => togetherRes.statusText);
            throw new Error(`Together AI error ${togetherRes.status}: ${errText}`);
          }

          const togetherBody = (await togetherRes.json()) as {
            data?: { b64_json?: string }[];
          };
          const b64 = togetherBody.data?.[0]?.b64_json;
          if (!b64) {
            throw new Error("Together AI returned no image data for this prompt.");
          }

          const outputMimeType = "image/png";
          const storagePath = `${characterId}/generated/${randomUUID()}.png`;
          const imageBuffer = Buffer.from(b64, "base64");

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
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Together AI generation failed.";
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
