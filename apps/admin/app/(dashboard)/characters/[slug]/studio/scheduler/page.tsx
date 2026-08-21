import { notFound } from "next/navigation";
import { SchedulerPanel } from "@/components/studio/panels/SchedulerPanel";
import { getCharacterBySlug } from "@/lib/data/characters";
import { getScheduledPostsForCharacter } from "@/lib/data/studio";

export default async function SchedulerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const posts = await getScheduledPostsForCharacter(character.id);

  return <SchedulerPanel posts={posts} />;
}
