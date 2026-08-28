import { NextRequest, NextResponse } from "next/server";
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
 * `.safetensors` URL — stored directly as `weightsUrl`, exactly like a
 * fal.ai-trained model's `diffusers_lora_file.url`, so /api/generate and
 * /api/swap need no changes to consume it.
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
    const weightsUrl = payload.outputs?.[0];
    if (!weightsUrl) {
      await updateLoraModel(loraModel.id, {
        status: "failed",
        error: "wavespeed.ai reported completion but returned no output URL.",
      });
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
