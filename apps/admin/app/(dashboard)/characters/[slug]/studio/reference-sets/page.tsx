import { notFound } from "next/navigation";
import { ReferenceSetsPanel } from "@/components/studio/panels/ReferenceSetsPanel";
import { getCharacterBySlug } from "@/lib/data/characters";
import { getReferenceSetsForCharacter } from "@/lib/data/studio";

export default async function ReferenceSetsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const referenceSets = await getReferenceSetsForCharacter(character.id);

  return <ReferenceSetsPanel referenceSets={referenceSets} />;
}
