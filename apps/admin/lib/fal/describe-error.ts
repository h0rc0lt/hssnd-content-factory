/**
 * Extracts a useful message from a fal.ai SDK error.
 *
 * Found via a real production failure: a plain `err.message` on the SDK's
 * `ApiError` was just "Unprocessable Entity" — useless for diagnosing
 * anything. The actual cause (e.g. "Failed to download archive: Invalid
 * URL: URL too long") lives in `err.body.detail[].msg`, which fal's API
 * returns as a FastAPI-style validation error body. Duck-types on
 * `body.detail` rather than checking `instanceof ApiError` so this doesn't
 * break across @fal-ai/client versions that change their error class
 * hierarchy.
 */
export function describeFalError(err: unknown, fallback = "fal.ai request failed."): string {
  if (err && typeof err === "object" && "body" in err) {
    const body = (err as { body?: unknown }).body;
    if (body && typeof body === "object" && "detail" in body) {
      const detail = (body as { detail?: unknown }).detail;
      if (Array.isArray(detail)) {
        const messages = detail
          .map((d) =>
            d && typeof d === "object" && "msg" in d ? String((d as { msg: unknown }).msg) : null
          )
          .filter((m): m is string => Boolean(m));
        if (messages.length > 0) return messages.join("; ");
      }
    }
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
