/**
 * Minimal kie.ai REST client.
 *
 * kie.ai has no official Node SDK (unlike fal.ai's @fal-ai/client or
 * Google's @google/genai), so this wraps their plain REST API directly
 * with fetch. The request/response shape below was cross-referenced from
 * kie.ai's own docs pages and third-party integration write-ups — this
 * environment's network egress proxy blocks docs.kie.ai and kie.ai
 * directly, so unlike every other provider integration in this app, this
 * couldn't be verified against the primary source or an installed SDK's
 * type definitions. If a live call gets rejected, the shape below (field
 * names, model ids) is the first thing to check against kie.ai's actual
 * response.
 */

const KIE_API_BASE = "https://api.kie.ai/api/v1";

export interface KieCreateTaskInput {
  /** e.g. "flux-2/pro-image-to-image", "wan/2-7-image-pro", or
   *  "nano-banana-pro" — see /api/generate's doc comment for how
   *  confident each model id is. */
  model: string;
  prompt: string;
  imageUrls?: string[];
  /** The JSON field name kie.ai expects the reference image URLs under —
   *  NOT the same across every model. Confirmed from real docs.kie.ai
   *  request-body examples: nano-banana-pro and the "seedream/"-prefixed
   *  models use "image_urls"; flux-2/* and wan/* use "input_urls"
   *  instead. Sending the wrong key isn't rejected by kie.ai — it's
   *  silently dropped, so the call "succeeds" but generates without any
   *  reference image at all (wrong identity, not an error). Defaults to
   *  "image_urls" for backward compatibility with existing callers. */
  imageUrlsField?: "image_urls" | "input_urls";
  /** Required by some models and rejected outright if omitted — confirmed
   *  live for flux-2/pro-image-to-image, whose createTask call failed with
   *  "aspect_ratio is required" until this was added (kie.ai's own docs
   *  example uses "1:1"). nano-banana-pro and the "seedream/"-prefixed
   *  models didn't need it. Omit for models that don't require it. */
  aspectRatio?: string;
  callBackUrl: string;
}

export interface KieCreateTaskResult {
  taskId: string;
}

export async function submitKieTask(input: KieCreateTaskInput): Promise<KieCreateTaskResult> {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) {
    throw new Error("KIE_API_KEY is not configured on the server.");
  }

  const res = await fetch(`${KIE_API_BASE}/jobs/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: input.model,
      callBackUrl: input.callBackUrl,
      input: {
        prompt: input.prompt,
        ...(input.imageUrls &&
          input.imageUrls.length > 0 && {
            [input.imageUrlsField ?? "image_urls"]: input.imageUrls,
          }),
        ...(input.aspectRatio && { aspect_ratio: input.aspectRatio }),
      },
    }),
  });

  const body = await res.json().catch(() => null);
  const taskId = body?.data?.taskId;
  if (!res.ok || typeof taskId !== "string" || !taskId) {
    const message =
      typeof body?.msg === "string" ? body.msg : `kie.ai createTask failed with HTTP ${res.status}.`;
    throw new Error(message);
  }
  return { taskId };
}

/**
 * kie.ai's task status shape — identical whether it arrives via webhook
 * push (see /api/webhooks/kie) or a GET /jobs/recordInfo?taskId=... poll,
 * per kie.ai's own docs. `resultJson` is a JSON-*encoded string*, not a
 * nested object — parse it with parseKieResultUrls below.
 */
export interface KieTaskCallbackData {
  taskId: string;
  state: "waiting" | "queuing" | "generating" | "success" | "fail";
  resultJson?: string | null;
  failMsg?: string | null;
}

export function parseKieResultUrls(resultJson: string | null | undefined): string[] {
  if (!resultJson) return [];
  try {
    const parsed = JSON.parse(resultJson) as { resultUrls?: string[] };
    return Array.isArray(parsed.resultUrls) ? parsed.resultUrls : [];
  } catch {
    return [];
  }
}
