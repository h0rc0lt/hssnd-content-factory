import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import JSZip from "jszip";
import {
  createLoraModel,
  updateLoraModel,
  getUploadsForCharacter,
} from "@/lib/data/lora-pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/lora/train
 *
 * The explicit "Start training" action — never called automatically after
 * upload (see NewCharacterForm). Submits to fal.ai's
 * `fal-ai/flux-lora-fast-training` queue, whose `images_data_url` input
 * expects a single archive rather than individual file URLs (confirmed
 * against fal's own API docs), so this zips the character's uploaded
 * reference images server-side and hands it a base64 data URL of the zip.
 *
 * This submits and records the `fal_request_id`, then stops — there is no
 * training-poll cron in this checkpoint yet, so `lora_models.status` stays
 * "training" until a follow-up phase adds polling (or a webhook receiver).
 * Flagged explicitly, not silently left half-wired.
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
    const zipBase64 = await zip.generateAsync({ type: "base64" });
    const imagesDataUrl = `data:application/zip;base64,${zipBase64}`;

    const loraModel = await createLoraModel(characterId);

    try {
      const { request_id } = await fal.queue.submit("fal-ai/flux-lora-fast-training", {
        input: { images_data_url: imagesDataUrl },
      });

      const updated = await updateLoraModel(loraModel.id, {
        status: "training",
        falRequestId: request_id,
        trainingStartedAt: new Date().toISOString(),
      });

      return NextResponse.json({ loraModel: updated });
    } catch (falErr) {
      const message = falErr instanceof Error ? falErr.message : "fal.ai submission failed.";
      await updateLoraModel(loraModel.id, { status: "failed", error: message });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
