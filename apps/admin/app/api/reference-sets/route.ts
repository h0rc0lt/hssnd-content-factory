import { NextRequest, NextResponse } from "next/server";
import { createReferenceSet } from "@/lib/data/studio";

/**
 * POST /api/reference-sets
 *
 * Creates a new reference set for a character.
 * Body: { characterId: string, name: string, description?: string, tags?: string[] }
 *
 * Returns the newly created ReferenceSet row.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const characterId = String(body.characterId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const description = body.description ? String(body.description).trim() : undefined;
    const tags: string[] = Array.isArray(body.tags)
      ? body.tags.map((t: unknown) => String(t).trim()).filter(Boolean)
      : [];

    if (!characterId || !name) {
      return NextResponse.json(
        { error: "characterId and name are required." },
        { status: 400 }
      );
    }

    const referenceSet = await createReferenceSet({ characterId, name, description, tags });
    return NextResponse.json(referenceSet, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
