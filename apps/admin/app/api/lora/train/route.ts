import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import {
  createLoraModel,
  updateLoraModel,
  getUploadsForCharacter,
  getCharacterById,
} from "@/lib/data/lora-pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { uploadWavespeedFile, submitWavespeedTask } from "@/lib/wavespeed/client";

const WAVESPEED_TRAINER_MODEL = "wavespeed-ai/flux-dev-lora-trainer";

/**
 * POST /api/lora/train
 *
 * The explicit "Start training" action — never called automatically after
 * upload (see NewCharacterForm). Submits to **wavespeed.ai**'s
 * `flux-dev-lora-trainer`, not fal.ai (see README for the full history):
 * fal.ai's `flux-lora-fast-training` worked, but the GitHub Actions poll
 * cron's unreliable `schedule` trigger repeatedly left training runs
 * sitting "training" for 20+ minutes with no way to know completion short
 * of a manual `workflow_dispatch`. wavespeed.ai is also cheaper (~$1/run
 * vs fal's ~$2) and, more importantly, supports webhook delivery
 * (`?webhook=` query param) instead of requiring a poll — see
 * /api/webhooks/wavespeed, which resolves training the moment wavespeed
 * is done.
 *
 * This is a **training-only** provider swap. Generation
 * (`POST /api/generate`) and Character Swap (`POST /api/swap`) are
 * completely unchanged: both already only ever consume `weights_url` as
 * an opaque, portable `.safetensors` URL passed straight through to
 * fal.ai's `loras: [{ path: weightsUrl }]` input — wavespeed's trainer
 * produces the same file format on the same Flux base model, so nothing
 * downstream needed to know the weights came from a different trainer.
 *
 * wavespeed's `flux-dev-lora-trainer` takes a `data` field — a URL to a
 * *zip archive* of training images (not individual `image_urls`), plus an
 * optional `trigger_word`. Same as the former fal.ai integration, this
 * zips the character's uploaded reference images server-side and uses the
 * character's slug as the trigger word — already a unique, human-readable
 * token thanks to the DB's unique constraint on `characters.slug`, and
 * it's what `{trigger}` in prompt-templates.ts expects at generation time.
 *
 * The zip is uploaded to wavespeed's own storage
 * (`POST /media/upload/binary`, see uploadWavespeedFile) and passed as the
 * real `download_url` it returns — not an inline base64 data URI. fal.ai's
 * training route hit a real `422 Invalid URL: URL too long` doing exactly
 * that (see README); no reason to risk the same failure mode here.
 *
 * This submits and records `provider: "wavespeed"` + the task id (reusing
 * `fal_request_id` generically — see types/lora-model.ts), then stops —
 * completion is picked up by wavespeed's webhook
 * (/api/webhooks/wavespeed), not by this request and not by
 * /api/cron/poll-training (which now only polls provider="fal" rows).
 */
export async function POST(request: NextRequest) {
  try {
    const { characterId } = await request.json();
    if (!characterId) {
      return NextResponse.json({ error: "characterId is required." }, { status: 400 });
    }

    if (!process.env.WAVESPEED_API_KEY) {
      return NextResponse.json(
        { error: "WAVESPEED_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }
    if (!process.env.APP_BASE_URL || !process.env.WAVESPEED_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "APP_BASE_URL and WAVESPEED_WEBHOOK_SECRET are not configured on the server." },
        { status: 500 }
      );
    }

    const character = await getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    const uploads = await getUploadsForCharacter(characterId);
    if (uploads.length === 0) {
      return NextResponse.json(
        { error: "This character has no uploaded reference images yet." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const zip = new JSZip();
    for (const upload of uploads) {
      const { data, error } = await supabase.storage
        .from("character-media")
        .download(upload.storagePath);
      if (error || !data) {
        return NextResponse.json(
          { error: `Failed to read ${upload.fileName} from storage: ${error?.message}` },
          { status: 500 }
        );
      }
      zip.file(upload.fileName, await data.arrayBuffer());
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const triggerWord = character.slug;

    const loraModel = await createLoraModel(characterId, "wavespeed");

    try {
      const zipUrl = await uploadWavespeedFile(zipBlob, `${character.slug}-training-set.zip`);
      const webhookUrl = `${process.env.APP_BASE_URL}/api/webhooks/wavespeed?secret=${process.env.WAVESPEED_WEBHOOK_SECRET}`;
      const { taskId } = await submitWavespeedTask({
        model: WAVESPEED_TRAINER_MODEL,
        input: { data: zipUrl, trigger_word: triggerWord },
        webhookUrl,
      });

      const updated = await updateLoraModel(loraModel.id, {
        status: "training",
        falRequestId: taskId,
        triggerWord,
        trainingStartedAt: new Date().toISOString(),
      });

      return NextResponse.json({ loraModel: updated });
    } catch (wavespeedErr) {
      const message =
        wavespeedErr instanceof Error ? wavespeedErr.message : "wavespeed.ai submission failed.";
      await updateLoraModel(loraModel.id, { status: "failed", error: message });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
