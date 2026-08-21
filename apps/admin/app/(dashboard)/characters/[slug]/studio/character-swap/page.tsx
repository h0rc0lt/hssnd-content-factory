import { notFound } from "next/navigation";
import { CharacterSwapPanel } from "@/components/studio/panels/CharacterSwapPanel";
import { getCharacterBySlug } from "@/lib/data/characters";

export default async function CharacterSwapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  return <CharacterSwapPanel character={character} />;
}
