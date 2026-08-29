import { NextRequest, NextResponse } from "next/server";
import { deleteCharacter } from "@/lib/data/lora-pipeline";

/**
 * DELETE /api/characters/[id]
 *
 * Permanently removes a character and everything scoped to it (uploads,
 * LoRA models, generation jobs, reference sets, scheduled posts — see
 * deleteCharacter's doc comment for exactly what cascades and what
 * doesn't). No undo — this is a hard delete, not a status flag, since
 * this app has no "archived" character state.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    await deleteCharacter(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
