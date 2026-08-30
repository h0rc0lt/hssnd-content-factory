import { NextRequest, NextResponse } from "next/server";
import {
  getGenerationJobByProviderJobId,
  updateGenerationJob,
  createGeneratedMediaAsset,
} from "@/lib/data/lora-pipeline";
import { parseKieResultUrls, type KieTaskCallbackData } from "@/lib/kie/client";

/**
 * POST /api/webhooks/kie?secret=...
 *
 * kie.ai POSTs here when any kie.ai provider's task finishes — every
 * provider in lib/kie/providers.ts (plus nano-banana-pro) shares this one
 * route, since the lookup below is keyed on kie.ai's own taskId, not
 * anything provider-specific. /api/generate's kie.ai branch sets this
 * route's URL (with KIE_WEBHOOK_SECRET as the `secret` query param) as
 * `callBackUrl` on submit. This replaces the poll-generation cron for
 * these providers to sidestep the GitHub Actions `schedule` trigger's
 * best-effort lag (documented in the README) — kie.ai pushes the result
 * the moment it's ready instead of waiting up to 5 minutes (or longer,
 * per this session's repeated real-world experience) for the next poll.
 *
 * No CRON_SECRET-style bearer auth here since kie.ai can't be configured
 * to send one — the query-param secret is the equivalent gate, and this
 * route is excluded from Basic Auth in middleware.ts for the same reason
 * /api/cron/* is (Basic Auth would just break a caller that can't send
 * it).
 *
 * Body shape (kie.ai's own convention, shared with the GET
 * /jobs/recordInfo poll response): { code, msg, data: { taskId, state,
 * resultJson, failMsg } }. resultJson is a JSON-*encoded string*
 * containing { resultUrls: string[] }, not a nested object — see
 * lib/kie/client.ts's doc comment on how confident this shape is (kie.ai's
 * docs are blocked by this environment's egress proxy, so this is built
 * from cross-referenced third-party sources, not the primary docs).
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  if (!process.env.KIE_WEBHOOK_SECRET || secret !== process.env.KIE_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const data = body?.data as KieTaskCallbackData | undefined;
  if (!data?.taskId) {
    return NextResponse.json(
      { error: "Missing data.taskId in webhook payload." },
      { status: 400 }
    );
  }

  const job = await getGenerationJobByProviderJobId(data.taskId);
  if (!job) {
    // Not necessarily an error — could be a duplicate delivery after the
    // row was already resolved, or a stray call. Acknowledge with 200 so
    // kie.ai doesn't keep retrying a delivery we're not going to use.
    return NextResponse.json({ received: true, matched: false });
  }

  if (data.state === "success") {
    const [firstUrl] = parseKieResultUrls(data.resultJson);
    if (!firstUrl) {
      await updateGenerationJob(job.id, {
        status: "failed",
        error: "kie.ai reported success but returned no result URL.",
      });
      return NextResponse.json({ received: true });
    }

    const mediaAssetId = await createGeneratedMediaAsset({
      characterId: job.characterId,
      canonicalUrl: firstUrl,
      label: job.promptKey,
    });
    await updateGenerationJob(job.id, { status: "succeeded", resultMediaAssetId: mediaAssetId });
  } else if (data.state === "fail") {
    await updateGenerationJob(job.id, {
      status: "failed",
      error: data.failMsg ?? "kie.ai generation failed.",
    });
  }
  // "waiting" / "queuing" / "generating" — intermediate states, nothing to do yet.

  return NextResponse.json({ received: true });
}
