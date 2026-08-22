import { NextRequest, NextResponse } from "next/server";
import { createCharacterUpload } from "@/lib/data/lora-pipeline";

/**
 * POST /api/characters/[id]/uploads
 *
 * Step 3 of the direct-to-storage upload flow: called after the browser
 * has already PUT the file bytes straight to Supabase Storage using the
 * signed URL from /upload-url. This request is JSON metadata only
 * (storage path, file name, mime type, size) — again, no file bytes,
 * nowhere near the 4.5 MB Function body limit.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params;
    const body = await request.json();
    const storagePath = String(body.storagePath ?? "").trim();
    const fileName = String(body.fileName ?? "").trim();
    const mimeType = String(body.mimeType ?? "application/octet-stream");
    const fileSizeBytes =
      typeof body.fileSizeBytes === "number" ? body.fileSizeBytes : undefined;

    if (!characterId || !storagePath || !fileName) {
      return NextResponse.json(
        { error: "characterId, storagePath, and fileName are required." },
        { status: 400 }
      );
    }

    const upload = await createCharacterUpload({
      characterId,
      storagePath,
      fileName,
      mimeType,
      fileSizeBytes,
    });

    return NextResponse.json({ upload });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
