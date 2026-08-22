import { NextRequest, NextResponse } from "next/server";
import { createCharacter } from "@/lib/data/lora-pipeline";

/**
 * POST /api/characters
 *
 * Creates a character record. JSON body only — { name, slug, shortBio }.
 * Reference image uploads are a separate flow entirely (see
 * app/api/characters/[id]/upload-url and app/api/characters/[id]/uploads):
 * files go directly from the browser to Supabase Storage via a signed
 * upload URL, never through this — or any — Vercel Function. Vercel
 * Functions have a hard 4.5 MB request body limit (confirmed against
 * Vercel's own docs, not assumed); routing multipart file uploads through
 * here broke as soon as more than a couple of images were selected.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? "").trim();
    const shortBio = String(body.shortBio ?? "").trim();

    if (!name || !slug) {
      return NextResponse.json({ error: "Name and slug are required." }, { status: 400 });
    }

    try {
      const character = await createCharacter({ name, slug, shortBio: shortBio || undefined });
      return NextResponse.json({ character });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create character.";
      const friendly = message.includes("duplicate key")
        ? `A character with slug "${slug}" already exists.`
        : message;
      return NextResponse.json({ error: friendly }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
