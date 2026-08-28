import { notFound } from "next/navigation";
import { ImageBatchPanel } from "@/components/studio/panels/ImageBatchPanel";
import { getCharacterBySlug } from "@/lib/data/characters";
import {
  getUploadsForCharacter,
  getLatestLoraModelForCharacter,
  getGenerationJobsForCharacter,
} from "@/lib/data/lora-pipeline";

export default async function ImageBatchPage({
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
    <ImageBatchPanel
      character={character}
      uploads={uploads}
      loraModel={loraModel}
      generationJobs={generationJobs}
    />
  );
}
