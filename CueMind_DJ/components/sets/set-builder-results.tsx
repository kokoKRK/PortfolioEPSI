"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ListMusic } from "lucide-react";
import { SetStoryboard } from "@/components/sets/set-storyboard";
import { SetTrackItem } from "@/components/sets/set-track-item";
import { TransitionNote } from "@/components/sets/transition-note";
import type { TransitionNotesMode } from "@/components/sets/transition-notes-picker";
import { Button } from "@/components/ui/button";
import type { TransitionTolerance } from "@/lib/dj/transition-tolerance";
import type { GeneratedSetTrack } from "@/types/database";

type SetBuilderResultsProps = {
  setId?: string | null;
  setName: string | null;
  estimatedDuration: number | null;
  generatedTracks: GeneratedSetTrack[];
  transitionTolerance?: TransitionTolerance;
  notesMode?: TransitionNotesMode;
};

export function SetBuilderResults({
  setId,
  setName,
  estimatedDuration,
  generatedTracks,
  transitionTolerance = "balanced",
  notesMode = "manual",
}: SetBuilderResultsProps) {
  const [notes, setNotes] = useState<Record<number, string | null>>({});
  const notesRetryRef = useRef<string | null>(null);

  // Initialise les notes depuis la réponse API ; si mode IA et notes manquantes,
  // relance une génération côté client (repli si le batch serveur a échoué).
  useEffect(() => {
    if (!setId) {
      setNotes({});
      notesRetryRef.current = null;
      return;
    }

    const initial: Record<number, string | null> = {};
    for (const t of generatedTracks) {
      if (t.transitionNote?.trim()) {
        initial[t.position] = t.transitionNote;
      }
    }
    setNotes(initial);

    if (notesMode !== "ai" || generatedTracks.length < 2) return;
    if (notesRetryRef.current === setId) return;

    const hasMissing = generatedTracks.some(
      (t, i) => i > 0 && !t.transitionNote?.trim()
    );
    if (!hasMissing) return;

    notesRetryRef.current = setId;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/sets/${setId}/suggest-notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ overwrite: false }),
        });
        const data = await response.json();
        if (cancelled) return;

        if (!response.ok) {
          toast.warning(data.error ?? "Notes de transition non générées.");
          return;
        }

        const generated: { position: number; note: string }[] =
          data.notes ?? [];
        if (generated.length > 0) {
          setNotes((prev) => {
            const next = { ...prev };
            for (const n of generated) next[n.position] = n.note;
            return next;
          });
          toast.success(
            `${generated.length} note${generated.length > 1 ? "s" : ""} de transition générée${generated.length > 1 ? "s" : ""}`
          );
        }
        if (data.saveErrors?.[0]) {
          toast.warning(data.saveErrors[0]);
        }
      } catch {
        if (!cancelled) {
          toast.warning("Impossible de générer les notes de transition.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setId, notesMode, generatedTracks]);

  if (generatedTracks.length === 0) return null;

  return (
    <div className="space-y-3 border-t border-border pt-6">
      {setName && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-accent">{setName}</h3>
            {estimatedDuration != null && (
              <p className="text-muted-foreground text-sm">
                ~{estimatedDuration} min · {generatedTracks.length} morceaux
              </p>
            )}
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/playlists/sets">
              <ListMusic className="size-4" />
              Voir dans mes sets
            </Link>
          </Button>
        </div>
      )}

      <SetStoryboard tracks={generatedTracks} />

      <div className="space-y-2">
        {generatedTracks.map((track, index) => (
          <div key={track.id} className="space-y-2">
            {index > 0 && setId && notesMode !== "off" && (
              <TransitionNote
                setId={setId}
                position={track.position}
                note={notes[track.position] ?? track.transitionNote}
                onSaved={(position, note) =>
                  setNotes((prev) => ({ ...prev, [position]: note }))
                }
              />
            )}
            <SetTrackItem
              track={track}
              isFirst={index === 0}
              transitionTolerance={transitionTolerance}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
