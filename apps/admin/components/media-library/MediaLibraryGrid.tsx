import Link from "next/link";
import { StatusBadge } from "@/components/ui/badge";
import type { MediaLibraryItem } from "@/lib/data/media";

export function MediaLibraryGrid({ items }: { items: MediaLibraryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.characterSlug ? `/characters/${item.characterSlug}/studio` : "#"}
          className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-white/[0.02] transition-colors hover:border-signal/40"
        >
          {item.type === "image" && item.canonicalUrl ? (
            // Plain <img>, not next/image — canonicalUrl is fal.ai's own CDN
            // domain (see OverviewPanel for the same reasoning).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.canonicalUrl} alt={item.label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-mist">
              {item.label}
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-void/90 to-transparent px-2 py-1.5">
            <span className="truncate text-[11px] text-paper">{item.characterName}</span>
            <StatusBadge status={item.status} className="shrink-0 bg-void/70 backdrop-blur-sm" />
          </div>
        </Link>
      ))}
    </div>
  );
}
