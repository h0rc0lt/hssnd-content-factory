import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Steps 1+2 of the direct-to-storage upload flow, shared by both uses below
 * (never routes file bytes through a Vercel Function — see
 * NewCharacterForm's doc comment for why):
 *   1. POST /api/characters/[id]/upload-url  — get a signed URL (tiny JSON)
 *   2. PUT directly to Supabase Storage      — the actual file bytes
 *
 * Returns the storage path the file landed at.
 */
async function uploadToCharacterStorage(characterId: string, file: File): Promise<string> {
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

  return signBody.storagePath as string;
}

/**
 * Uploads one reference image and records its `character_uploads` row —
 * extracted from NewCharacterForm so an existing character (not just one
 * being created) can add more reference images later, from the Image Batch
 * panel's pre-training step. Step 3 of the flow:
 *   3. POST /api/characters/[id]/uploads — record the DB row (tiny JSON)
 */
export async function uploadCharacterReferenceFile(
  characterId: string,
  file: File
): Promise<void> {
  const storagePath = await uploadToCharacterStorage(characterId, file);

  const recordRes = await fetch(`/api/characters/${characterId}/uploads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storagePath,
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

/**
 * Uploads a one-off Character Swap source image — same storage mechanism
 * as a reference upload, but deliberately skips step 3: this file is never
 * training material, so it must never appear in getUploadsForCharacter
 * (that queries the character_uploads TABLE, not storage paths — not
 * inserting a row there is what keeps it out of a future training run).
 * Returns the storage path, which the caller passes to POST /api/swap.
 */
export async function uploadCharacterSwapSourceFile(
  characterId: string,
  file: File
): Promise<string> {
  return uploadToCharacterStorage(characterId, file);
}
