import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";
import {
  getCharacterById,
  getLatestLoraModelForCharacter,
  createGenerationJob,
  updateGenerationJob,
} from "@/lib/data/lora-pipeline";
import { PROMPT_TEMPLATES } from "@/lib/data/prompt-templates";

/**
 * POST /api/generate
 *
 * Submits one or more reference-image generation calls against a
 * character's trained LoRA. Body: { characterId: string, promptKeys:
 * string[] }. Direct fal.ai call from this Next.js route, same pattern as
 * /api/lora/train — not routed through n8n (see ImageBatchPanel's doc
 * comment for why: the LoRA training pipeline already established this
 * pattern, and introducing n8n as a dependency for this one call wasn't
 * worth the extra infra for a single-request generation call).
 *
 * Target endpoint is `fal-ai/flux-lora` — confirmed directly from the
 * installed @fal-ai/client SDK's generated types (FluxLoraInput /
 * FluxLoraOutput, aliased from `unoOutput`), not guessed. Its `loras` input
 * takes an array of `{ path, scale? }`, so `lora_models.weights_url` is
 * passed straight through as `path` — no merging with any other LoRA.
 *
 * Submits and records `fal_request_id` per job, then stops — completion is
 * picked up by the generation-poll cron (see /api/cron/poll-generation),
 * mirroring the training pipeline exactly.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const characterId = String(body.characterId ?? "");
    const promptKeys = Array.isArray(body.promptKeys) ? (body.promptKeys as string[]) : [];

    if (!characterId || promptKeys.length === 0) {
      return NextResponse.json(
        { error: "characterId and at least one promptKey are required." },
        { status: 400 }
      );
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return NextResponse.json(
        { error: "FAL_KEY is not configured on the server." },
        { status: 500 }
      );
    }
    fal.config({ credentials: falKey });

    const character = await getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: "Character not found." }, { status: 404 });
    }

    const loraModel = await getLatestLoraModelForCharacter(characterId);
    if (!loraModel || loraModel.status !== "ready" || !loraModel.weightsUrl) {
      return NextResponse.json(
        { error: "This character doesn't have a ready trained LoRA yet." },
        { status: 400 }
      );
    }
    const weightsUrl = loraModel.weightsUrl;
    const triggerWord = loraModel.triggerWord ?? character.slug;

    const results: Array<{ promptKey: string; status: string; error?: string }> = [];

    await Promise.all(
      promptKeys.map(async (promptKey) => {
        const template = PROMPT_TEMPLATES.find((t) => t.key === promptKey);
        if (!template) {
          results.push({ promptKey, status: "failed", error: "Unknown prompt template key." });
          return;
        }
        const promptText = template.prompt.replace("{trigger}", triggerWord);

        const job = await createGenerationJob({
          characterId,
          loraModelId: loraModel.id,
          promptKey,
          promptText,
          falEndpoint: "fal-ai/flux-lora",
        });

        try {
          const { request_id } = await fal.queue.submit("fal-ai/flux-lora", {
            input: {
              prompt: promptText,
              loras: [{ path: weightsUrl }],
              num_images: 1,
            },
          });
          await updateGenerationJob(job.id, { status: "processing", falRequestId: request_id });
          results.push({ promptKey, status: "processing" });
        } catch (falErr) {
          const message = falErr instanceof Error ? falErr.message : "fal.ai submission failed.";
          await updateGenerationJob(job.id, { status: "failed", error: message });
          results.push({ promptKey, status: "failed", error: message });
        }
      })
    );

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
