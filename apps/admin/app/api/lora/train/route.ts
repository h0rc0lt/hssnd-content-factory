import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import JSZip from "jszip";
import {
  createLoraModel,
  updateLoraModel,
  getUploadsForCharacter,
  getCharacterById,
} from "@/lib/data/lora-pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { describeFalError } from "@/lib/fal/describe-error";

/**
 * POST /api/lora/train
 *
 * The explicit "Start training" action — never called automatically after
 * upload (see NewCharacterForm). Submits to fal.ai's
 * `fal-ai/flux-lora-fast-training` queue. Its real input type (confirmed
 * directly from the installed @fal-ai/client SDK's generated types, not
 * guessed) is `images_data_url` (required — a single archive, not
 * individual file URLs) plus an optional `trigger_word`. trigger_word is
 * technically optional in the schema, but functionally necessary here:
 * fal's own docs state that without per-image caption files, the trigger
 * word is used in their place — and this zip never includes captions. This
 * zips the character's uploaded reference images server-side and uses the
 * character's slug as the trigger word — already a unique, human-readable
 * token thanks to the DB's unique constraint on `characters.slug`, and
 * it's what `{trigger}` in prompt-templates.ts expects at generation time.
 *
 * `images_data_url` is uploaded to fal's own storage (`fal.storage.upload`)
 * and passed as the real URL it returns — NOT built as an inline
 * `data:application/zip;base64,...` string. Confirmed the hard way: fal's
 * API parses this field as an actual URL and rejects an oversized base64
 * data URI with `422 Invalid URL: URL too long` once there are more than a
 * couple of reference images (real production failure, diagnosed via
 * describeFalError once that started surfacing fal's actual validation
 * body instead of a bare "Unprocessable Entity").
 *
 * This submits and records the `fal_request_id`, then stops — completion
 * is picked up by the training-poll cron (see /api/cron/poll-training),
 * not by this request.
 */
export async function POST(request: NextRequest) {
  try {
    const { characterId } = await request.json();
    if (!characterId) {
      return NextResponse.json({ error: "characterId is required." }, { status: 400 });
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

    const loraModel = await createLoraModel(characterId);

    try {
      const imagesDataUrl = await fal.storage.upload(zipBlob);
      const { request_id } = await fal.queue.submit("fal-ai/flux-lora-fast-training", {
        input: { images_data_url: imagesDataUrl, trigger_word: triggerWord },
      });

      const updated = await updateLoraModel(loraModel.id, {
        status: "training",
        falRequestId: request_id,
        triggerWord,
        trainingStartedAt: new Date().toISOString(),
      });

      return NextResponse.json({ loraModel: updated });
    } catch (falErr) {
      const message = describeFalError(falErr, "fal.ai submission failed.");
      await updateLoraModel(loraModel.id, { status: "failed", error: message });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
