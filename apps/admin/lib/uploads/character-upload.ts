import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Uploads one reference image straight from the browser to Supabase Storage
 * and records its `character_uploads` row — extracted from NewCharacterForm
 * so an existing character (not just one being created) can add more
 * reference images later, from the Image Batch panel's pre-training step.
 *
 * Same three-round-trip flow as everywhere else in this app (never routes
 * file bytes through a Vercel Function — see NewCharacterForm's doc comment
 * for why):
 *   1. POST /api/characters/[id]/upload-url  — get a signed URL (tiny JSON)
 *   2. PUT directly to Supabase Storage      — the actual file bytes
 *   3. POST /api/characters/[id]/uploads     — record the DB row (tiny JSON)
 */
export async function uploadCharacterReferenceFile(
  characterId: string,
  file: File
): Promise<void> {
  const signRes = await fetch(`/api/characters/${characterId}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
  });
  const signBody = await signRes.json();
  if (!signRes.ok) {
    throw new Error(signBody.error ?? `Failed to prepare upload for ${file.name}.`);
  }

  const supabase = getSupabaseBrowserClient();
  const { error: uploadError } = await supabase.storage
    .from("character-media")
    .uploadToSignedUrl(signBody.storagePath, signBody.token, file, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) {
    throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
  }

  const recordRes = await fetch(`/api/characters/${characterId}/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storagePath: signBody.storagePath,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
    }),
  });
  const recordBody = await recordRes.json();
  if (!recordRes.ok) {
    throw new Error(recordBody.error ?? `Failed to record upload for ${file.name}.`);
  }
}
