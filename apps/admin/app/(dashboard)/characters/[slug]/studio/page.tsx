import { notFound } from "next/navigation";
import { OverviewPanel } from "@/components/studio/panels/OverviewPanel";
import { getCharacterBySlug } from "@/lib/data/characters";
import {
  getRecentMediaForCharacter,
  getRecentWorkflowRunsForCharacter,
  getScheduledPostsForCharacter,
} from "@/lib/data/studio";

export default async function StudioOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);
  if (!character) notFound();

  const [recentMedia, recentRuns, upcomingPosts] = await Promise.all([
    getRecentMediaForCharacter(character.id),
    getRecentWorkflowRunsForCharacter(character.id),
    getScheduledPostsForCharacter(character.id),
  ]);

  return (
    <OverviewPanel
      recentMedia={recentMedia}
      recentRuns={recentRuns}
      upcomingPosts={upcomingPosts.filter((p) => p.status !== "draft")}
    />
  );
}
