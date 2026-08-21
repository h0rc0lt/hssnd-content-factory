import { notFound } from "next/navigation";
import { MotionControlPanel } from "@/components/studio/panels/MotionControlPanel";
import { getCharacterBySlug } from "@/lib/data/characters";
import { getMotionTemplateLibrary, getMotionUsageForCharacter } from "@/lib/data/studio";

export default async function MotionControlPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const [library, usage] = await Promise.all([
    getMotionTemplateLibrary(),
    getMotionUsageForCharacter(character.id),
  ]);

  return <MotionControlPanel library={library} usage={usage} />;
}
