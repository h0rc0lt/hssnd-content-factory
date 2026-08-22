import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createCharacter, createCharacterUpload } from "@/lib/data/lora-pipeline";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/characters
 *
 * Creates a character record and uploads any attached reference images to
 * Supabase Storage (`character-media` bucket), recording one
 * `character_uploads` row per file. Does not touch `lora_models` — training
 * is a separate explicit step (see /api/lora/train), never triggered here.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const slug = String(formData.get("slug") ?? "").trim();
    const shortBio = String(formData.get("shortBio") ?? "").trim();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required." }, { status: 400 });
    }

    let character;
    try {
      character = await createCharacter({ name, slug, shortBio: shortBio || undefined });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create character.";
      const friendly = message.includes("duplicate key")
        ? `A character with slug "${slug}" already exists.`
        : message;
      return NextResponse.json({ error: friendly }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    let uploadCount = 0;
    const failedFiles: string[] = [];

    for (const file of files) {
      const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
      const storagePath = `${character.id}/uploads/${randomUUID()}.${ext}`;
      const arrayBuffer = await file.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("character-media")
        .upload(storagePath, arrayBuffer, {
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        // The character record is already saved at this point — a partial
        // upload failure is recoverable (re-upload later), losing the
        // character record on a storage hiccup would not be.
        failedFiles.push(file.name);
        continue;
      }

      await createCharacterUpload({
        characterId: character.id,
        storagePath,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
      });
      uploadCount += 1;
    }

    return NextResponse.json({ character, uploadCount, failedFiles });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
