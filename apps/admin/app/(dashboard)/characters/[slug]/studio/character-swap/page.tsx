import { notFound } from "next/navigation";
import { CharacterSwapPanel } from "@/components/studio/panels/CharacterSwapPanel";
import { getCharacterBySlug } from "@/lib/data/characters";
import {
  getUploadsForCharacter,
  getLatestLoraModelForCharacter,
  getGenerationJobsForCharacter,
} from "@/lib/data/lora-pipeline";

export default async function CharacterSwapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const [uploads, loraModel, generationJobs] = await Promise.all([
    getUploadsForCharacter(character.id),
    getLatestLoraModelForCharacter(character.id),
    getGenerationJobsForCharacter(character.id),
  ]);

  return (
    <CharacterSwapPanel
      character={character}
      uploads={uploads}
      loraModel={loraModel}
      swapJobs={generationJobs.filter((job) => job.promptKey === "character_swap")}
    />
  );
}
