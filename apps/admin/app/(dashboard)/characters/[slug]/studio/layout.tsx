import { notFound } from "next/navigation";
import { StudioHeader } from "@/components/studio/StudioHeader";
import { StudioNav } from "@/components/studio/StudioNav";
import { getCharacterBySlug } from "@/lib/data/characters";

export default async function StudioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = await getCharacterBySlug(slug);

  if (!character) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <StudioHeader character={character} />
      <div className="flex flex-col gap-6 lg:flex-row">
        <StudioNav slug={slug} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
