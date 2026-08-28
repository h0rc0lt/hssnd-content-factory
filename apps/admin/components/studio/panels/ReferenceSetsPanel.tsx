"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Plus, X, Tag } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import type { ReferenceSet } from "@/types/reference-set";

function CreateForm({
  characterId,
  onClose,
}: {
  characterId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const tags = tagsRaw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    try {
      const res = await fetch("/api/reference-sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, name: name.trim(), description: description.trim() || undefined, tags }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to create reference set.");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-3 rounded-xl border border-border bg-white/[0.03] p-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-paper">New reference set</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel"
          className="text-mist hover:text-paper"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Name */}
      <div className="space-y-1">
        <label htmlFor="rs-name" className="text-xs text-mist">
          Name <span className="text-signal">*</span>
        </label>
        <input
          id="rs-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Studio portraits"
          className="w-full rounded-lg border border-border bg-void/40 px-3 py-2 text-sm text-paper placeholder:text-mist focus:border-signal/50 focus:outline-none"
        />
      </div>

      {/* Description */}
      <div className="space-y-1">
        <label htmlFor="rs-desc" className="text-xs text-mist">
          Description <span className="text-mist">(optional)</span>
        </label>
        <textarea
          id="rs-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What makes these images distinctive?"
          className="w-full resize-none rounded-lg border border-border bg-void/40 px-3 py-2 text-sm text-paper placeholder:text-mist focus:border-signal/50 focus:outline-none"
        />
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <label htmlFor="rs-tags" className="flex items-center gap-1 text-xs text-mist">
          <Tag className="h-3 w-3" />
          Tags <span className="text-mist">(comma-separated, optional)</span>
        </label>
        <input
          id="rs-tags"
          type="text"
          value={tagsRaw}
          onChange={(e) => setTagsRaw(e.target.value)}
          placeholder="outdoor, natural light, casual"
          className="w-full rounded-lg border border-border bg-void/40 px-3 py-2 text-sm text-paper placeholder:text-mist focus:border-signal/50 focus:outline-none"
        />
      </div>

      {error && <ErrorState title="Couldn't create set" description={error} />}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" size="sm" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!name.trim() || saving}>
          <Plus className="h-3.5 w-3.5" />
          {saving ? "Creating…" : "Create set"}
        </Button>
      </div>
    </form>
  );
}

export function ReferenceSetsPanel({
  referenceSets,
  characterId,
}: {
  referenceSets: ReferenceSet[];
  characterId: string;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <DashboardCard
      title="Reference sets"
      description="Reference image packs used as generation inputs for this character"
      headerAction={
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
          New set
        </Button>
      }
    >
      {showForm && (
        <CreateForm characterId={characterId} onClose={() => setShowForm(false)} />
      )}

      {referenceSets.length === 0 && !showForm ? (
        <EmptyState
          icon={Layers}
          title="No reference sets yet"
          description="Create a reference set to organise this character's training images into named packs."
          action={
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-3.5 w-3.5" />
              Create reference set
            </Button>
          }
        />
      ) : referenceSets.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {referenceSets.map((set) => (
            <div key={set.id} className="rounded-xl border border-border bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-paper">{set.name}</p>
                <span className="shrink-0 text-xs text-mist">{set.itemCount} items</span>
              </div>
              {set.description && (
                <p className="mt-1 text-sm text-mist">{set.description}</p>
              )}
              {set.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {set.tags.map((tag) => (
                    <Badge key={tag} tone="mist">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </DashboardCard>
  );
}
