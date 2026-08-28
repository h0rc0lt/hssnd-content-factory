import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import {
  getCharacterById,
  getLatestLoraModelForCharacter,
  createGenerationJob,
  updateGenerationJob,
} from "@/lib/data/lora-pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { describeFalError } from "@/lib/fal/describe-error";

/**
 * POST /api/swap
 *
 * Character Swap: applies a character's trained LoRA identity onto a
 * source image the user supplies — the source's pose/composition/scene is
 * kept, the character's face/identity replaces whatever was there. Body:
 * { characterId: string, storagePath: string, prompt?: string }.
 * `storagePath` comes from uploadCharacterSwapSourceFile (browser -> signed
 * URL -> Supabase Storage, reusing POST /api/characters/[id]/upload-url —
 * it doesn't care what the upload is for, only step 3 recording it as a
 * character_uploads row would, and this deliberately skips that step).
 *
 * Target endpoint is `fal-ai/flux-lora/image-to-image` — confirmed
 * directly from the installed @fal-ai/client SDK's generated types
 * (FluxLoraImageToImageInput / -Output), not guessed. Its `image_url` is
 * the source image; since the character-media bucket isn't public, this
 * mints a short-lived signed READ URL for fal.ai to fetch it with (fal
 * fetches immediately at submission time, so a 60s expiry is plenty).
 *
 * Same direct-fal.ai, submit-then-poll pattern as /api/generate and
 * /api/lora/train (see /api/generate's doc comment for why not n8n) —
 * reuses the exact same generation_jobs / poll-generation-cron / media_assets
 * pipeline Image Batch already has, distinguished by
 * fal_endpoint = "fal-ai/flux-lora/image-to-image" (see migration
 * add_generation_jobs_fal_endpoint) and promptKey = "character_swap" (not a
 * lib/data/prompt-templates.ts catalog entry — this prompt is user-authored,
 * not templated).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const characterId = String(body.characterId ?? "");
    const storagePath = String(body.storagePath ?? "").trim();
    const userPrompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

    if (!characterId || !storagePath) {
      return NextResponse.json(
        { error: "characterId and storagePath are required." },
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

    const loraModel = await getLatestLoraModelForCharacter(characterId);
    if (!loraModel || loraModel.status !== "ready" || !loraModel.weightsUrl) {
      return NextResponse.json(
        { error: "This character doesn't have a ready trained LoRA yet." },
        { status: 400 }
      );
    }
    const triggerWord = loraModel.triggerWord ?? character.slug;
    const promptText = userPrompt || triggerWord;

    const supabase = getSupabaseServerClient();
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("character-media")
      .createSignedUrl(storagePath, 60);
    if (signedUrlError || !signedUrlData) {
      return NextResponse.json(
        { error: `Failed to read source image from storage: ${signedUrlError?.message}` },
        { status: 500 }
      );
    }

    const job = await createGenerationJob({
      characterId,
      loraModelId: loraModel.id,
      promptKey: "character_swap",
      promptText,
      falEndpoint: "fal-ai/flux-lora/image-to-image",
    });

    try {
      const { request_id } = await fal.queue.submit("fal-ai/flux-lora/image-to-image", {
        input: {
          prompt: promptText,
          image_url: signedUrlData.signedUrl,
          loras: [{ path: loraModel.weightsUrl }],
        },
      });
      const updated = await updateGenerationJob(job.id, {
        status: "processing",
        falRequestId: request_id,
      });
      return NextResponse.json({ job: updated });
    } catch (falErr) {
      const message = describeFalError(falErr, "fal.ai submission failed.");
      await updateGenerationJob(job.id, { status: "failed", error: message });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
