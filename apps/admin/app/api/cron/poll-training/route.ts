import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import { getInFlightLoraModels, updateLoraModel } from "@/lib/data/lora-pipeline";

/**
 * GET /api/cron/poll-training
 *
 * Vercel Cron target (see vercel.json). Vercel signs cron requests with
 * `Authorization: Bearer $CRON_SECRET` (confirmed against Vercel's own
 * docs) — this route rejects anything else, so it can't be triggered by a
 * stray public GET.
 *
 * For every `lora_models` row still "queued"/"training" with a
 * `fal_request_id`, checks fal's queue status. On COMPLETED, fetches the
 * result and records `weights_url` from `diffusers_lora_file.url`. Both
 * the field name and its type (a required `url: string` on a `File`
 * object) come directly from the installed @fal-ai/client SDK's own
 * generated types for this endpoint — not guessed, and not manually cast.
 * A result fetch that throws is treated as a failed run — fal's queue
 * status values for in-progress states are documented and typed
 * (IN_QUEUE / IN_PROGRESS / COMPLETED), but there's no documented FAILED
 * status value, so failure is only detected this indirect way. Worth
 * tightening once a real failed run is observed.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return NextResponse.json({ error: "FAL_KEY is not configured." }, { status: 500 });
  }
  fal.config({ credentials: falKey });

  const inFlight = await getInFlightLoraModels();
  const results: Array<{ id: string; outcome: string }> = [];

  for (const model of inFlight) {
    if (!model.falRequestId) continue;

    try {
      const status = await fal.queue.status("fal-ai/flux-lora-fast-training", {
        requestId: model.falRequestId,
        logs: false,
      });

      if (status.status !== "COMPLETED") {
        results.push({ id: model.id, outcome: status.status });
        continue;
      }

      const result = await fal.queue.result("fal-ai/flux-lora-fast-training", {
        requestId: model.falRequestId,
      });

      await updateLoraModel(model.id, {
        status: "ready",
        weightsUrl: result.data.diffusers_lora_file.url,
        trainingCompletedAt: new Date().toISOString(),
      });
      results.push({ id: model.id, outcome: "ready" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Polling failed.";
      await updateLoraModel(model.id, { status: "failed", error: message });
      results.push({ id: model.id, outcome: "failed" });
    }
  }

  return NextResponse.json({ checked: inFlight.length, results });
}
