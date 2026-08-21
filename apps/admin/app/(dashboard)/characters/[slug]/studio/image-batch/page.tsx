import { notFound } from "next/navigation";
import { ImageBatchPanel } from "@/components/studio/panels/ImageBatchPanel";
import { getCharacterBySlug } from "@/lib/data/characters";
import { getReferenceSetsForCharacter } from "@/lib/data/studio";

export default async function ImageBatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const referenceSets = await getReferenceSetsForCharacter(character.id);

  return <ImageBatchPanel character={character} referenceSets={referenceSets} />;
}
