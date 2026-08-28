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

/** Cloudflare Workers AI — FLUX.1-schnell.
 *  Free with a generous daily allowance, no credit card required.
 *  REST endpoint: POST /accounts/{CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell
 *  Response shape: { result: { image: "<base64 png>" } }
 *  Text-to-image only — no reference-image support. */
const CF_AI_MODEL = "@cf/black-forest-labs/flux-1-schnell";
const CF_AI_BASE_URL = "https://api.cloudflare.com/client/v4/accounts";

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
 * | "nano-banana-pro" | "flux-schnell-free" | "cf-flux-schnell" } —
 * defaults to "flux-lora" for callers that don't pass it.
 *
 * Four providers, deliberately kept side by side — they have different
 * tradeoffs:
 *
 * - "flux-lora" — `fal-ai/flux-lora`. Requires a ready trained LoRA.
 *   ~$0.035/MP once trained, but needs the $2 / 10-40min training step.
 * - "nano-banana-pro" — `fal-ai/nano-banana-pro/edit` (Gemini 3 Pro Image
 *   via fal). No training needed: identity from reference uploads directly.
 *   ~$0.15/image. Works the moment a character has at least one upload.
 * - "flux-schnell-free" — Together AI FLUX.1-schnell-Free. Genuinely free,
 *   no daily cap. Text-to-image only, resolves synchronously inline.
 * - "cf-flux-schnell" — Cloudflare Workers AI FLUX.1-schnell. Free with a
 *   generous daily allowance, no credit card required. Text-to-image only,
 *   resolves synchronously inline. Requires CF_ACCOUNT_ID + CF_AI_TOKEN.
 *
 * flux-lora and nano-banana-pro submit and record `fal_request_id` +
 * `fal_endpoint` per job, then stop — completion is picked up by the
 * generation-poll cron. flux-schnell-free and cf-flux-schnell resolve
 * inline and are never seen by that cron.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const characterId = String(body.characterId ?? "");
    const promptKeys = Array.isArray(body.promptKeys) ? (body.promptKeys as string[]) : [];
    const provider =
      body.provider === "nano-banana-pro"
        ? "nano-banana-pro"
        : body.provider === "flux-schnell-free"
          ? "flux-schnell-free"
          : body.provider === "cf-flux-schnell"
            ? "cf-flux-schnell"
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
    } else if (provider === "cf-flux-schnell") {
      if (!process.env.CF_ACCOUNT_ID || !process.env.CF_AI_TOKEN) {
        return NextResponse.json(
          { error: "CF_ACCOUNT_ID and CF_AI_TOKEN must both be set for Cloudflare Workers AI." },
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
    } else if (provider === "flux-schnell-free") {
      // Together AI FLUX.1-schnell-Free — synchronous, no poll cron.
      const supabase = getSupabaseServerClient();

      submitOne = async (promptKey) => {
        const template = PROMPT_TEMPLATES.find((t) => t.key === promptKey);
        if (!template) {
          return { promptKey, status: "failed", error: "Unknown prompt template key." };
        }
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

          const storagePath = `${characterId}/generated/${randomUUID()}.png`;
          const imageBuffer = Buffer.from(b64, "base64");

          const { error: uploadError } = await supabase.storage
            .from("character-media")
            .upload(storagePath, imageBuffer, { contentType: "image/png" });
          if (uploadError) {
            throw new Error(`Failed to store generated image: ${uploadError.message}`);
          }

          const { data: signedUrlData, error: signError } = await supabase.storage
            .from("character-media")
            .createSignedUrl(storagePath, GENERATED_ASSET_SIGNED_URL_SECONDS);
          if (signError || !signedUrlData) {
            throw new Error(`Failed to create a read URL: ${signError?.message}`);
          }

          const mediaAssetId = await createGeneratedMediaAsset({
            characterId,
            storagePath,
            canonicalUrl: signedUrlData.signedUrl,
            label: promptKey,
          });

          await updateGenerationJob(job.id, { status: "succeeded", resultMediaAssetId: mediaAssetId });
          return { promptKey, status: "succeeded" };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Together AI generation failed.";
          await updateGenerationJob(job.id, { status: "failed", error: message });
          return { promptKey, status: "failed", error: message };
        }
      };
    } else {
      // "cf-flux-schnell" — Cloudflare Workers AI FLUX.1-schnell
      // Synchronous inline resolve, no fal queue, no poll cron.
      const supabase = getSupabaseServerClient();
      const cfUrl = `${CF_AI_BASE_URL}/${process.env.CF_ACCOUNT_ID}/ai/run/${CF_AI_MODEL}`;

      submitOne = async (promptKey) => {
        const template = PROMPT_TEMPLATES.find((t) => t.key === promptKey);
        if (!template) {
          return { promptKey, status: "failed", error: "Unknown prompt template key." };
        }
        const promptText = template.prompt.replace("{trigger}", character.name);

        const job = await createGenerationJob({
          characterId,
          loraModelId: null,
          promptKey,
          promptText,
          falEndpoint: CF_AI_MODEL,
        });

        try {
          const cfRes = await fetch(cfUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.CF_AI_TOKEN}`,
            },
            body: JSON.stringify({ prompt: promptText }),
          });

          if (!cfRes.ok) {
            const errText = await cfRes.text().catch(() => cfRes.statusText);
            throw new Error(`Cloudflare Workers AI error ${cfRes.status}: ${errText}`);
          }

          // Cloudflare returns { result: { image: "<base64 png>" } }
          const cfBody = (await cfRes.json()) as {
            result?: { image?: string };
          };
          const b64 = cfBody.result?.image;
          if (!b64) {
            throw new Error("Cloudflare Workers AI returned no image data.");
          }

          const storagePath = `${characterId}/generated/${randomUUID()}.png`;
          const imageBuffer = Buffer.from(b64, "base64");

          const { error: uploadError } = await supabase.storage
            .from("character-media")
            .upload(storagePath, imageBuffer, { contentType: "image/png" });
          if (uploadError) {
            throw new Error(`Failed to store generated image: ${uploadError.message}`);
          }

          const { data: signedUrlData, error: signError } = await supabase.storage
            .from("character-media")
            .createSignedUrl(storagePath, GENERATED_ASSET_SIGNED_URL_SECONDS);
          if (signError || !signedUrlData) {
            throw new Error(`Failed to create a read URL: ${signError?.message}`);
          }

          const mediaAssetId = await createGeneratedMediaAsset({
            characterId,
            storagePath,
            canonicalUrl: signedUrlData.signedUrl,
            label: promptKey,
          });

          await updateGenerationJob(job.id, { status: "succeeded", resultMediaAssetId: mediaAssetId });
          return { promptKey, status: "succeeded" };
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Cloudflare Workers AI generation failed.";
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
