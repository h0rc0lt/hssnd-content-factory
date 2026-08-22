import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/characters/[id]/upload-url
 *
 * Step 1 of the direct-to-storage upload flow: generates one Supabase
 * Storage signed upload URL, server-side, using the service_role key.
 * This request/response is tiny JSON — no file bytes — so it stays far
 * under Vercel's 4.5 MB Function body limit regardless of how large the
 * actual image is.
 *
 * Per storage-js's own docs, `uploadToSignedUrl` (called client-side with
 * the token this returns) requires no RLS policy on `storage.objects` —
 * the token itself is the authorization. So this bucket needing no
 * policies (see migration `create_character_media_bucket`) is fine.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: characterId } = await params;
    const body = await request.json();
    const fileName = String(body.fileName ?? "").trim();
    const mimeType = String(body.mimeType ?? "application/octet-stream");

    if (!characterId || !fileName) {
      return NextResponse.json(
        { error: "characterId and fileName are required." },
        { status: 400 }
      );
    }

    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    const storagePath = `${characterId}/uploads/${randomUUID()}.${ext}`;

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.storage
      .from("character-media")
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return NextResponse.json(
        { error: `Failed to create signed upload URL: ${error?.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      storagePath,
      fileName,
      mimeType,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
