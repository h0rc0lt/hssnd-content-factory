import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import {
  getInFlightGenerationJobs,
  updateGenerationJob,
  createGeneratedMediaAsset,
} from "@/lib/data/lora-pipeline";
import { describeFalError } from "@/lib/fal/describe-error";

/**
 * GET /api/cron/poll-generation
 *
 * Triggered every 5 minutes by .github/workflows/poll-training.yml — same
 * GitHub Actions poller as LoRA training, same CRON_SECRET bearer-token
 * check, for the same reason (Vercel Hobby plan silently doesn't run
 * sub-daily Vercel Cron schedules; see poll-training/route.ts).
 *
 * For every `generation_jobs` row still "queued"/"processing" with
 * provider="fal" and a `fal_request_id` (see getInFlightGenerationJobs),
 * checks fal's queue status on that row's `fal_endpoint` (Image Batch and
 * Character Swap submit to different fal.ai endpoints — see migration
 * add_generation_jobs_fal_endpoint and /api/generate's doc comment). The
 * two kie.ai-backed Image Batch providers, nano-banana and nano-banana-pro,
 * never appear here — they're resolved by kie.ai's webhook instead (see
 * /api/webhooks/kie), and getInFlightGenerationJobs already filters this
 * query down to provider="fal" so a kie.ai job's foreign taskId (also
 * stored in fal_request_id — see types/generation-job.ts) never gets
 * handed to fal.queue.status.
 * `fal.queue.status` accepts a plain string endpoint id, but
 * `fal.queue.result` is generic over a literal endpoint type for
 * input/output inference, so the branch below calls it with a literal at
 * each arm rather than the dynamic `job.falEndpoint` string — both known
 * endpoints return an `images: Array<{ url, width?, height? }>` shape
 * (confirmed from the installed SDK's generated types) so the rest of the
 * handling is identical either way. On COMPLETED, takes `images[0]` from
 * the result (always at least one image since num_images defaults to 1
 * and this app never overrides it) and records a `media_assets` row
 * pointing straight at fal's hosted image URL (no re-upload to Supabase
 * Storage — see createGeneratedMediaAsset), then links it back onto the
 * generation_jobs row via resultMediaAssetId. Same indirect failure
 * detection as the training poller: a result fetch that throws is treated
 * as a failed run.
 */
const IMAGE_TO_IMAGE_ENDPOINT = "fal-ai/flux-lora/image-to-image";
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

  const inFlight = await getInFlightGenerationJobs();
  const results: Array<{ id: string; outcome: string }> = [];

  for (const job of inFlight) {
    if (!job.falRequestId) continue;

    try {
      const status = await fal.queue.status(job.falEndpoint, {
        requestId: job.falRequestId,
        logs: false,
      });

      if (status.status !== "COMPLETED") {
        results.push({ id: job.id, outcome: status.status });
        continue;
      }

      let image: { url: string; width?: number; height?: number } | undefined;
      if (job.falEndpoint === IMAGE_TO_IMAGE_ENDPOINT) {
        const result = await fal.queue.result(IMAGE_TO_IMAGE_ENDPOINT, {
          requestId: job.falRequestId,
        });
        image = result.data.images[0];
      } else {
        const result = await fal.queue.result("fal-ai/flux-lora", {
          requestId: job.falRequestId,
        });
        image = result.data.images[0];
      }
      if (!image) {
        throw new Error("fal.ai returned no images for this job.");
      }

      const mediaAssetId = await createGeneratedMediaAsset({
        characterId: job.characterId,
        canonicalUrl: image.url,
        width: image.width,
        height: image.height,
        label: job.promptKey,
      });

      await updateGenerationJob(job.id, {
        status: "succeeded",
        resultMediaAssetId: mediaAssetId,
      });
      results.push({ id: job.id, outcome: "succeeded" });
    } catch (err) {
      const message = describeFalError(err, "Polling failed.");
      await updateGenerationJob(job.id, { status: "failed", error: message });
      results.push({ id: job.id, outcome: "failed" });
    }
  }

  return NextResponse.json({ checked: inFlight.length, results });
}
