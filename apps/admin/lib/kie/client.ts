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
  /** e.g. "seedream/4.5-edit" (ByteDance Seedream 4.5, reference-image
   *  editing — see /api/generate's doc comment for how confident this
   *  specific slug is, it's on its third guess) or "nano-banana-pro"
   *  (Nano Banana Pro). */
  model: string;
  prompt: string;
  imageUrls?: string[];
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
        ...(input.imageUrls && input.imageUrls.length > 0 && { image_urls: input.imageUrls }),
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
