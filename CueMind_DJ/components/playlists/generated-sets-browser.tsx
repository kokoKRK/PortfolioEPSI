"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Disc3, FolderOpen, Sparkles } from "lucide-react";
import { SetStoryboard } from "@/components/sets/set-storyboard";
import { SetTrackItem } from "@/components/sets/set-track-item";
import { TransitionNote } from "@/components/sets/transition-note";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DjSet, GeneratedSetTrack } from "@/types/database";

type DjSetSummary = DjSet & {
  track_count: number;
  total_duration_seconds: number;
};

function formatDuration(seconds: number): string {
  if (seconds === 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m} min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GeneratedSetsBrowser() {
  const [sets, setSets] = useState<DjSetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<GeneratedSetTrack[]>([]);
  const [loadingTracks, setLoadingTracks] = useState(false);
  const [generatingNotes, setGeneratingNotes] = useState(false);

  const fetchSets = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/sets");
      const data = await response.json();
      if (response.ok) {
        const list = (data.sets ?? []) as DjSetSummary[];
        setSets(list);
        if (list.length > 0) {
          setSelectedId((prev) => prev ?? list[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSets();
  }, [fetchSets]);

  const selected = sets.find((s) => s.id === selectedId) ?? sets[0];

  const handleNoteSaved = useCallback(
    (position: number, note: string | null) => {
      setTracks((prev) =>
        prev.map((track) =>
          track.position === position
            ? { ...track, transitionNote: note }
            : track
        )
      );
    },
    []
  );

  async function handleGenerateAllNotes() {
    if (!selected?.id) return;
    setGeneratingNotes(true);
    try {
      const response = await fetch(`/api/sets/${selected.id}/suggest-notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overwrite: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur génération IA");
      }
      const notes: { position: number; note: string }[] = data.notes ?? [];
      if (notes.length > 0) {
        const byPosition = new Map(notes.map((n) => [n.position, n.note]));
        setTracks((prev) =>
          prev.map((track) =>
            byPosition.has(track.position)
              ? { ...track, transitionNote: byPosition.get(track.position)! }
              : track
          )
        );
        toast.success(
          `${notes.length} transition${notes.length > 1 ? "s" : ""} générée${notes.length > 1 ? "s" : ""} par l'IA`
        );
      } else {
        toast.warning(data.message ?? "Aucune transition générée.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur génération IA"
      );
    } finally {
      setGeneratingNotes(false);
    }
  }

  useEffect(() => {
    if (!selected?.id) {
      setTracks([]);
      return;
    }

    let cancelled = false;
    setLoadingTracks(true);

    fetch(`/api/sets/${selected.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.tracks) {
          setTracks(data.tracks);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoadingTracks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-14rem)] min-h-[400px] items-center justify-center rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground font-mono text-xs uppercase">
            Chargement des sets...
          </p>
        </div>
      </div>
    );
  }

  if (sets.length === 0) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <Sparkles className="size-10 text-primary" />
          <p className="text-muted-foreground max-w-md">
            Aucun set généré pour l&apos;instant. Chaque génération est
            automatiquement sauvegardée ici.
          </p>
          <Button asChild>
            <Link href="/sets/ai">Générer un set</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-card lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-background/60 lg:w-72 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <FolderOpen className="size-4 text-primary" />
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Sets générés
          </span>
          <span className="text-muted-foreground ml-auto font-mono text-xs">
            {sets.length}
          </span>
        </div>

        <div className="max-h-48 overflow-y-auto lg:max-h-none lg:flex-1">
          {sets.map((set) => {
            const active = selected?.id === set.id;
            return (
              <button
                key={set.id}
                type="button"
                onClick={() => setSelectedId(set.id)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-l-2 border-l-primary px-3 py-2.5 text-left transition-colors",
                  active
                    ? "bg-primary/10"
                    : "border-l-transparent hover:bg-muted/50"
                )}
              >
                <span className="truncate text-sm font-medium">{set.name}</span>
                <span className="text-muted-foreground text-xs">
                  {set.track_count} morceau{set.track_count !== 1 ? "x" : ""} ·{" "}
                  {formatDuration(set.total_duration_seconds)}
                </span>
                <span className="text-muted-foreground text-[10px]">
                  {formatDate(set.created_at)}
                </span>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        {selected && (
          <>
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-start gap-2">
                <Disc3 className="mt-0.5 size-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-semibold">{selected.name}</h2>
                  {selected.description && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {selected.description}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {selected.track_count} morceaux ·{" "}
                    {formatDuration(selected.total_duration_seconds)} ·{" "}
                    {formatDate(selected.created_at)}
                  </p>
                </div>
                {selected.track_count >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAllNotes}
                    disabled={generatingNotes || loadingTracks}
                    className="shrink-0"
                  >
                    <Sparkles
                      className={
                        generatingNotes ? "size-4 animate-spin" : "size-4"
                      }
                    />
                    {generatingNotes
                      ? "Génération…"
                      : "Transitions IA"}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingTracks ? (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  Chargement des morceaux...
                </div>
              ) : (
                <div className="space-y-4">
                  <SetStoryboard tracks={tracks} />
                  <div className="space-y-2">
                    {tracks.map((track, index) => (
                      <div key={track.id} className="space-y-2">
                        {index > 0 && selected && (
                          <TransitionNote
                            setId={selected.id}
                            position={track.position}
                            note={track.transitionNote}
                            onSaved={handleNoteSaved}
                          />
                        )}
                        <SetTrackItem track={track} isFirst={index === 0} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
