/**
 * Minimal wavespeed.ai REST client.
 *
 * wavespeed.ai does have an official Node SDK (`wavespeed` on npm), but
 * its `Client.run()`/`runNoThrow()` are polling wrappers (internal
 * `_submit`/`_getResult` are private) — this app wants webhook-driven
 * submission instead (see /api/lora/train's wavespeed branch and
 * /api/webhooks/wavespeed), so this talks to the plain REST API directly
 * rather than going through the SDK.
 *
 * The request/response shapes below were confirmed two ways: the SDK's
 * own installed `.d.ts` (`npm install wavespeed` into a scratch
 * directory and reading `dist/api/client.d.ts`) confirms the general
 * submit-and-poll pattern and error types, but wavespeed.ai's actual
 * docs site is blocked by this environment's network egress proxy, so
 * the *exact* field names below (the `?webhook=` query param, the
 * `{code, data: {id, status, urls}}` submit response, the flat
 * `{id, outputs, status, error}` webhook payload, and the
 * `/media/upload/binary` endpoint) are cross-referenced from search
 * results and third-party write-ups rather than the primary docs or the
 * SDK's types — same caveat as lib/kie/client.ts. If a live call gets
 * rejected, this is the first place to check against wavespeed's actual
 * response.
 */

const WAVESPEED_API_BASE = "https://api.wavespeed.ai/api/v3";

function requireApiKey(): string {
  const apiKey = process.env.WAVESPEED_API_KEY;
  if (!apiKey) {
    throw new Error("WAVESPEED_API_KEY is not configured on the server.");
  }
  return apiKey;
}

/**
 * Uploads a file to wavespeed's own storage (7-day retention) and returns
 * a URL other wavespeed API calls can reference — same role as
 * `fal.storage.upload()` in the fal.ai integration. Used to host the
 * zipped training image set (see /api/lora/train's wavespeed branch).
 */
export async function uploadWavespeedFile(blob: Blob, filename: string): Promise<string> {
  const apiKey = requireApiKey();
  const form = new FormData();
  form.append("file", blob, filename);

  const res = await fetch(`${WAVESPEED_API_BASE}/media/upload/binary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const body = await res.json().catch(() => null);
  const downloadUrl = body?.data?.download_url ?? body?.download_url;
  if (!res.ok || typeof downloadUrl !== "string" || !downloadUrl) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : `wavespeed.ai upload failed with HTTP ${res.status}.`;
    throw new Error(message);
  }
  return downloadUrl;
}

export interface SubmitWavespeedTaskInput {
  /** Model path, e.g. "wavespeed-ai/flux-dev-lora-trainer". */
  model: string;
  input: Record<string, unknown>;
  webhookUrl: string;
}

export interface SubmitWavespeedTaskResult {
  taskId: string;
}

export async function submitWavespeedTask(
  input: SubmitWavespeedTaskInput
): Promise<SubmitWavespeedTaskResult> {
  const apiKey = requireApiKey();
  const url = `${WAVESPEED_API_BASE}/${input.model}?webhook=${encodeURIComponent(input.webhookUrl)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(input.input),
  });

  const body = await res.json().catch(() => null);
  const taskId = body?.data?.id;
  if (!res.ok || typeof taskId !== "string" || !taskId) {
    const message =
      typeof body?.message === "string"
        ? body.message
        : `wavespeed.ai submission failed with HTTP ${res.status}.`;
    throw new Error(message);
  }
  return { taskId };
}

/**
 * wavespeed.ai's webhook payload — flat (not wrapped in `data`, unlike
 * the submit response). `outputs` is present on success (an array of
 * result URLs — for the LoRA trainer, `outputs[0]` is a downloadable
 * `.safetensors` URL); `error` is present on failure.
 */
export interface WavespeedWebhookPayload {
  id: string;
  model: string;
  status: "created" | "processing" | "completed" | "failed";
  outputs?: string[];
  error?: string | null;
}
