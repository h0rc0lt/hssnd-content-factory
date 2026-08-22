"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { UploadCloud, ImageOff, Sparkles, X } from "lucide-react";
import { DashboardCard } from "@/components/shell/DashboardCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/badge";
import { ErrorState } from "@/components/states/ErrorState";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Character creation + reference upload — Phase 2C.
 *
 * Two explicit steps, matching the reviewed plan: (1) create the character
 * and upload raw reference images, (2) a separate "Start training" action —
 * training is never kicked off automatically after upload.
 *
 * Uploads go directly from the browser to Supabase Storage (signed upload
 * URL), never through a Vercel Function as multipart form data. Vercel
 * Functions cap request bodies at 4.5 MB — routing file bytes through
 * POST /api/characters broke as soon as more than a couple of reference
 * images were selected (413 FUNCTION_PAYLOAD_TOO_LARGE, a non-JSON
 * response that surfaced as a confusing "not valid JSON" error). Each file
 * now takes three small round trips instead of one large one:
 *   1. POST /api/characters/[id]/upload-url  — get a signed URL (tiny JSON)
 *   2. PUT directly to Supabase Storage      — the actual file bytes
 *   3. POST /api/characters/[id]/uploads     — record the DB row (tiny JSON)
 *
 * Nothing here is character-specific. This same form and these same API
 * routes handle the first character in the system and the fiftieth.
 */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type Step = "form" | "created";

export function NewCharacterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [shortBio, setShortBio] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createdCharacterId, setCreatedCharacterId] = useState<string | null>(null);
  const [createdCharacterName, setCreatedCharacterName] = useState<string>("");
  const [uploadCount, setUploadCount] = useState(0);

  const [trainingStatus, setTrainingStatus] = useState<
    "idle" | "starting" | "started" | "error"
  >("idle");
  const [trainingError, setTrainingError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleFilesSelected(selected: FileList | null) {
    if (!selected) return;
    setFiles((prev) => [...prev, ...Array.from(selected)]);
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadOneFile(characterId: string, file: File): Promise<void> {
    // Step 1: ask the server for a signed upload URL (small JSON).
    const signRes = await fetch(`/api/characters/${characterId}/upload-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
    });
    const signBody = await signRes.json();
    if (!signRes.ok) {
      throw new Error(signBody.error ?? `Failed to prepare upload for ${file.name}.`);
    }

    // Step 2: upload the actual bytes straight to Supabase Storage —
    // never touches a Vercel Function.
    const supabase = getSupabaseBrowserClient();
    const { error: uploadError } = await supabase.storage
      .from("character-media")
      .uploadToSignedUrl(signBody.storagePath, signBody.token, file, {
        contentType: file.type || "application/octet-stream",
      });
    if (uploadError) {
      throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
    }

    // Step 3: record the character_uploads row (small JSON).
    const recordRes = await fetch(`/api/characters/${characterId}/uploads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storagePath: signBody.storagePath,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSizeBytes: file.size,
      }),
    });
    const recordBody = await recordRes.json();
    if (!recordRes.ok) {
      throw new Error(recordBody.error ?? `Failed to record upload for ${file.name}.`);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !slug.trim()) {
      setError("Name and slug are required.");
      return;
    }

    setSubmitting(true);
    try {
      setProgressLabel("Creating character…");
      const createRes = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          shortBio: shortBio.trim(),
        }),
      });
      const createBody = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createBody.error ?? "Failed to create character.");
      }
      const character = createBody.character;

      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        setProgressLabel(`Uploading image ${i + 1} of ${files.length}…`);
        try {
          await uploadOneFile(character.id, files[i]);
          successCount += 1;
        } catch (fileErr) {
          // One failed file shouldn't lose the character record or the
          // other successful uploads — surface it and keep going.
          console.error(fileErr);
        }
      }

      setCreatedCharacterId(character.id);
      setCreatedCharacterName(character.name);
      setUploadCount(successCount);
      setStep("created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
      setProgressLabel(null);
    }
  }

  async function handleStartTraining() {
    if (!createdCharacterId) return;
    setTrainingStatus("starting");
    setTrainingError(null);
    try {
      const res = await fetch("/api/lora/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: createdCharacterId }),
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error ?? "Failed to start training.");
      }
      setTrainingStatus("started");
    } catch (err) {
      setTrainingStatus("error");
      setTrainingError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (step === "created" && createdCharacterId) {
    return (
      <DashboardCard
        accent="signal"
        title={createdCharacterName}
        description={`${uploadCount} reference image${uploadCount === 1 ? "" : "s"} uploaded`}
      >
        <div className="space-y-4">
          <p className="text-sm text-mist">
            The character record and reference uploads are saved. LoRA training is a
            separate, explicit step — nothing has been submitted to fal.ai yet.
          </p>

          {trainingStatus === "started" ? (
            <div className="flex items-center gap-2">
              <StatusBadge status="queued" />
              <span className="text-sm text-mist">
                Training queued. Progress is picked up by the training-poll cron.
              </span>
            </div>
          ) : (
            <Button onClick={handleStartTraining} disabled={trainingStatus === "starting"}>
              <Sparkles className="h-4 w-4" strokeWidth={1.75} />
              {trainingStatus === "starting" ? "Starting training…" : "Start training"}
            </Button>
          )}

          {trainingStatus === "error" && trainingError && (
            <ErrorState
              title="Couldn't start training"
              description={trainingError}
              onRetry={handleStartTraining}
            />
          )}

          <div className="flex gap-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/characters/${createdCharacterId}`)}
            >
              View character
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push("/characters")}>
              Back to Characters
            </Button>
          </div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <DashboardCard title="Character details" description="Every field here works the same for every character">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Zaranyx"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. zaranyx"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="shortBio">Short bio</Label>
            <Textarea
              id="shortBio"
              value={shortBio}
              onChange={(e) => setShortBio(e.target.value)}
              placeholder="One or two sentences — shown on the character card"
              rows={3}
            />
          </div>
        </div>
      </DashboardCard>

      <DashboardCard
        className="mt-4"
        title="Reference images"
        description="Raw uploads for LoRA training — add as many as you have"
      >
        <div className="space-y-4">
          <label
            htmlFor="file-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl2 border border-dashed border-border bg-white/[0.015] px-6 py-10 text-center transition-colors hover:border-signal/40"
          >
            <UploadCloud className="h-5 w-5 text-mist" strokeWidth={1.75} />
            <span className="text-sm text-paper">Click to select images</span>
            <span className="text-xs text-mist">PNG or JPG, multiple files supported</span>
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/png,image/jpeg"
            multiple
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          {files.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-mist">
              <ImageOff className="h-3.5 w-3.5" />
              No files selected yet
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {files.map((file, i) => (
                <li
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs text-paper"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-mist hover:text-danger"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DashboardCard>

      {error && (
        <div className="mt-4">
          <ErrorState title="Couldn't create character" description={error} />
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? progressLabel ?? "Working…" : "Create character"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/characters")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
