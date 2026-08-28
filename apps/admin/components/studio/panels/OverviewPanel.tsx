"use client";

import { useEffect, useState, useCallback } from "react";
import { ImageIcon, Workflow, CalendarClock, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/states/EmptyState";
import type { MediaAsset } from "@/types/media-asset";
import type { WorkflowRun } from "@/types/workflow";
import type { ScheduledPost } from "@/types/scheduled-post";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Lightbox({
  images,
  index,
  onClose,
}: {
  images: MediaAsset[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);

  const prev = useCallback(() => setCurrent((i) => (i - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setCurrent((i) => (i + 1) % images.length), [images.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  const asset = images[current];

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close lightbox"
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev(); }}
          aria-label="Previous image"
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.canonicalUrl ?? ""}
          alt={asset.label}
          className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        />
        {asset.label && (
          <p className="mt-2 text-center text-sm text-white/60">{asset.label}</p>
        )}
        {images.length > 1 && (
          <p className="mt-1 text-center text-xs text-white/40">
            {current + 1} / {images.length}
          </p>
        )}
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next(); }}
          aria-label="Next image"
          className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

export function OverviewPanel({
  recentMedia,
  recentRuns,
  upcomingPosts,
}: {
  recentMedia: MediaAsset[];
  recentRuns: WorkflowRun[];
  upcomingPosts: ScheduledPost[];
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Only images with a URL can be shown in the lightbox
  const lightboxImages = recentMedia.filter((m) => m.type === "image" && m.canonicalUrl);

  return (
    <>
      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <DashboardCard title="Recent media" description="Latest images and videos for this character">
          {recentMedia.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="No media generated yet"
              description="Run an image batch or motion workflow to see output here."
            />
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {recentMedia.map((m) => {
                const lbIndex = lightboxImages.findIndex((lb) => lb.id === m.id);
                const clickable = lbIndex !== -1;
                return (
                  <li
                    key={m.id}
                    onClick={clickable ? (e) => { e.preventDefault(); e.stopPropagation(); setLightboxIndex(lbIndex); } : undefined}
                    className={[
                      "group relative aspect-square overflow-hidden rounded-lg border border-border bg-white/[0.02]",
                      clickable ? "cursor-zoom-in" : "",
                    ].join(" ")}
                  >
                    {m.type === "image" && m.canonicalUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.canonicalUrl}
                        alt={m.label}
                        className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-mist">
                        {m.label}
                      </div>
                    )}
                    <div className="absolute bottom-1 right-1">
                      <StatusBadge status={m.status} className="bg-void/70 backdrop-blur-sm" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard title="Recent workflow runs" description="Across image, motion, and swap workflows">
          {recentRuns.length === 0 ? (
            <EmptyState
              icon={Workflow}
              title="No workflow runs yet"
              description="Runs triggered from this Studio or the Content Factory agent will show up here."
            />
          ) : (
            <ul className="space-y-2">
              {recentRuns.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-paper">{r.type.replace("_", " ")}</p>
                    <p className="text-xs text-mist">{formatDateTime(r.startedAt)} · {r.triggerSource.replace("_", " ")}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>

        <DashboardCard
          title="Upcoming scheduled posts"
          description="Across every connected platform"
          className="xl:col-span-2"
        >
          {upcomingPosts.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Nothing scheduled"
              description="Draft a post from the Scheduler tab once you have approved media."
            />
          ) : (
            <ul className="space-y-2">
              {upcomingPosts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white/[0.02] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-paper">{p.caption}</p>
                    <p className="text-xs capitalize text-mist">
                      {p.platform}
                      {p.scheduledAt ? ` · ${formatDateTime(p.scheduledAt)}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      </div>
    </>
  );
}
