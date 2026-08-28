import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getLoraModelByProviderJobId, updateLoraModel } from "@/lib/data/lora-pipeline";
import type { WavespeedWebhookPayload } from "@/lib/wavespeed/client";

/**
 * POST /api/webhooks/wavespeed?secret=...
 *
 * wavespeed.ai POSTs here when a LoRA training run finishes —
 * /api/lora/train's wavespeed branch appends `?webhook=<this route's URL,
 * with WAVESPEED_WEBHOOK_SECRET as the `secret` query param>` to the
 * submit request. This replaces the poll-training cron for wavespeed
 * runs specifically, for the same reason /api/webhooks/kie replaced it
 * for two of the Image Batch providers — the GitHub Actions poller's
 * `schedule` trigger is best-effort, not guaranteed (see the README), and
 * this session's training runs have repeatedly sat "training" for 20+
 * minutes waiting on it.
 *
 * No CRON_SECRET-style bearer auth here since wavespeed can't be
 * configured to send one — the query-param secret is the equivalent
 * gate, and this route is excluded from Basic Auth in middleware.ts
 * (already true for the whole /api/webhooks/* prefix).
 *
 * Body shape (see lib/wavespeed/client.ts's doc comment on how confident
 * this is — wavespeed.ai's docs are blocked by this environment's egress
 * proxy): flat JSON `{ id, model, status, outputs?, error? }`. On
 * "completed", `outputs[0]` is the trained LoRA's downloadable
 * `.safetensors` URL.
 *
 * That URL is NOT stored as `weightsUrl` directly — real-world testing
 * (this app's first live wavespeed training run) hit fal.ai returning a
 * bare `403 Forbidden` when /api/generate passed the wavespeed CDN URL
 * straight through as `loras[0].path`. This is a known fal.ai behavior,
 * not specific to wavespeed: fal.ai's own community has reported the same
 * 403 for third-party LoRA URLs (Civitai, Cloudflare R2 — see
 * github.com/fal-ai/fal/issues/903), apparently trusting only its own
 * storage. The fix mirrors what /api/lora/train already does for the
 * training zip: download the `.safetensors` bytes and re-upload them to
 * **fal's own storage** (`fal.storage.upload`), then store that fal-hosted
 * URL as `weightsUrl` instead. This keeps /api/generate and /api/swap
 * completely unchanged — they still just consume an opaque URL — at the
 * cost of one extra download+upload hop per training run.
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.WAVESPEED_WEBHOOK_SECRET || secret !== process.env.WAVESPEED_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as WavespeedWebhookPayload | null;
  if (!payload?.id) {
    return NextResponse.json({ error: "Missing id in webhook payload." }, { status: 400 });
  }

  const loraModel = await getLoraModelByProviderJobId(payload.id);
  if (!loraModel) {
    // Not necessarily an error — could be a duplicate delivery after the
    // row was already resolved, or a stray call. Acknowledge with 200 so
    // wavespeed doesn't keep retrying a delivery we're not going to use.
    return NextResponse.json({ received: true, matched: false });
  }

  if (payload.status === "completed") {
    const wavespeedWeightsUrl = payload.outputs?.[0];
    if (!wavespeedWeightsUrl) {
      await updateLoraModel(loraModel.id, {
        status: "failed",
        error: "wavespeed.ai reported completion but returned no output URL.",
      });
      return NextResponse.json({ received: true });
    }

    let weightsUrl: string;
    try {
      const falKey = process.env.FAL_KEY;
      if (!falKey) throw new Error("FAL_KEY is not configured on the server.");
      fal.config({ credentials: falKey });

      const fileRes = await fetch(wavespeedWeightsUrl);
      if (!fileRes.ok) {
        throw new Error(`Failed to download trained weights from wavespeed.ai (HTTP ${fileRes.status}).`);
      }
      const fileBlob = await fileRes.blob();
      weightsUrl = await fal.storage.upload(fileBlob);
    } catch (rehostErr) {
      const message =
        rehostErr instanceof Error
          ? rehostErr.message
          : "Failed to re-host trained weights on fal.ai storage.";
      await updateLoraModel(loraModel.id, { status: "failed", error: message });
      return NextResponse.json({ received: true });
    }

    await updateLoraModel(loraModel.id, {
      status: "ready",
      weightsUrl,
      trainingCompletedAt: new Date().toISOString(),
    });
  } else if (payload.status === "failed") {
    await updateLoraModel(loraModel.id, {
      status: "failed",
      error: payload.error ?? "wavespeed.ai training failed.",
    });
  }
  // "created" / "processing" — intermediate states, nothing to do yet.

  return NextResponse.json({ received: true });
}
