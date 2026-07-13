"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  ListPlus,
  Loader2,
  RotateCcw,
  Users,
} from "lucide-react";
import { useAudioPlayer } from "@/components/audio/audio-player-provider";
import { TrackPlayButton } from "@/components/audio/track-play-button";
import { KeyBadge } from "@/components/dj/key-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toPlayableTrack } from "@/types/audio";
import type { Track } from "@/types/database";

type B2bSuggestion = {
  track: Track;
  score: number;
  bpmDelta: number | null;
  explanation: string;
};

type B2bPanelProps = {
  tracks: Track[];
};

export function B2bPanel({ tracks }: B2bPanelProps) {
  const { currentTrack, playTrack } = useAudioPlayer();
  // Historique ordonné du set B2B en cours : le dernier élément est le morceau
  // "actif" depuis lequel on cherche le prochain enchaînement.
  const [history, setHistory] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingSet, setSavingSet] = useState(false);
  const [suggestions, setSuggestions] = useState<B2bSuggestion[]>([]);

  const activeTrack = history[history.length - 1] ?? null;
  const eligible = tracks.filter((t) => t.bpm != null);

  // Fenêtre anti-répétition : on n'exclut QUE les morceaux récemment joués, pas
  // tout l'historique. Ainsi un long set ne finit jamais à court de suggestions
  // (un morceau ancien peut ressortir plus tard, comme en vrai). La fenêtre se
  // réduit pour les petites bibliothèques afin de toujours garder ≥ 3 candidats.
  const MAX_RECENT_WINDOW = 15;
  const recentWindow = Math.max(
    1,
    Math.min(MAX_RECENT_WINDOW, eligible.length - 4)
  );

  const fetchSuggestions = useCallback(
    async (trackId: string, excludeIds: string[]) => {
      setLoading(true);
      setSuggestions([]);
      try {
        const response = await fetch("/api/b2b/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackId, limit: 3, excludeIds }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Erreur suggestions");
        }
        setSuggestions(data.suggestions ?? []);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erreur suggestions B2B"
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Refetch à chaque évolution de la chaîne, en excluant seulement les morceaux
  // joués dans la fenêtre récente (pas tout l'historique).
  useEffect(() => {
    const active = history[history.length - 1];
    if (!active?.id) {
      setSuggestions([]);
      return;
    }
    const recentIds = history.slice(-recentWindow).map((t) => t.id);
    void fetchSuggestions(active.id, recentIds);
  }, [history, recentWindow, fetchSuggestions]);

  // Démarrage auto avec le morceau en lecture si aucune chaîne n'est commencée.
  useEffect(() => {
    if (history.length > 0 || !currentTrack?.id) return;
    const t = tracks.find((x) => x.id === currentTrack.id && x.bpm != null);
    if (t) setHistory([t]);
  }, [currentTrack?.id, history.length, tracks]);

  function startWith(track: Track) {
    setHistory([track]);
  }

  function chainNext(track: Track) {
    setHistory((prev) => [...prev, track]);
    void playTrack(toPlayableTrack(track));
  }

  function reset() {
    setHistory([]);
    setSuggestions([]);
  }

  async function handleSaveAsSet() {
    if (history.length < 2) {
      toast.info("Enchaîne au moins 2 morceaux pour créer un set.");
      return;
    }
    setSavingSet(true);
    try {
      const response = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds: history.map((t) => t.id) }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur création du set");
      }
      toast.success(
        `Set B2B enregistré (${data.trackCount} morceaux) — dans Playlists › Sets générés.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur création du set"
      );
    } finally {
      setSavingSet(false);
    }
  }

  const playedIds = new Set(history.map((t) => t.id));
  const startOptions = eligible.filter((t) => !playedIds.has(t.id));

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Back-to-Back virtuel
          </CardTitle>
          <CardDescription>
            Choisis un morceau de départ — l&apos;IA propose 3 enchaînements.
            Continue la chaîne : les morceaux récemment joués ne sont pas
            reproposés (les plus anciens peuvent ressortir plus tard).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(history.length === 0 ? eligible : startOptions)
              .slice(0, 12)
              .map((track) => (
                <Button
                  key={track.id}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => startWith(track)}
                  className="max-w-[200px] truncate"
                >
                  {track.title}
                </Button>
              ))}
          </div>

          {history.length > 0 && (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-muted-foreground text-xs uppercase tracking-wide">
                  Set B2B en cours · {history.length} morceau
                  {history.length > 1 ? "x" : ""}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleSaveAsSet()}
                    disabled={savingSet || history.length < 2}
                  >
                    <ListPlus className="size-3.5" />
                    {savingSet ? "Création..." : "Générer le set"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={reset}
                  >
                    <RotateCcw className="size-3.5" />
                    Recommencer
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {history.map((track, i) => (
                  <div key={track.id} className="flex items-center gap-2">
                    {i > 0 && (
                      <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
                    )}
                    <Badge
                      variant={
                        i === history.length - 1 ? "default" : "secondary"
                      }
                      className="max-w-[180px] truncate"
                    >
                      {i + 1}. {track.title}
                    </Badge>
                  </div>
                ))}
              </div>

              {activeTrack && (
                <div className="flex items-center gap-3 border-t border-border/60 pt-3">
                  <TrackPlayButton track={toPlayableTrack(activeTrack)} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{activeTrack.title}</p>
                    <p className="text-muted-foreground text-sm">
                      {activeTrack.artist ?? "—"} · {activeTrack.bpm} BPM ·{" "}
                      {activeTrack.style ?? "?"}
                    </p>
                  </div>
                  <KeyBadge camelotKey={activeTrack.key} />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-12">
          <Loader2 className="size-5 animate-spin" />
          L&apos;IA réfléchit à ton prochain move...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {suggestions.map((s, i) => (
            <Card key={s.track.id} className="border-border/60">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary">#{i + 1}</Badge>
                  {s.bpmDelta != null && (
                    <Badge variant="outline">
                      {s.bpmDelta > 0 ? "+" : ""}
                      {s.bpmDelta} BPM
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base leading-snug">
                  {s.track.title}
                </CardTitle>
                <CardDescription>
                  {s.track.artist ?? "—"} · {s.track.bpm} BPM
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm italic">&ldquo;{s.explanation}&rdquo;</p>
                <div className="flex items-center gap-2">
                  <TrackPlayButton track={toPlayableTrack(s.track)} />
                  <KeyBadge camelotKey={s.track.key} />
                  {s.track.style && (
                    <Badge variant="outline" className="text-xs">
                      {s.track.style}
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  onClick={() => chainNext(s.track)}
                >
                  <ArrowRight className="size-4" />
                  Enchaîner ce morceau
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && suggestions.length === 0 && history.length > 0 && (
        <p className="text-muted-foreground text-center text-sm">
          Aucun enchaînement compatible trouvé. Ta bibliothèque est peut-être
          trop petite — ajoute des morceaux ou recommence.
        </p>
      )}

      {!loading && history.length === 0 && eligible.length > 0 && (
        <p className="text-muted-foreground text-center text-sm">
          Sélectionne un morceau de départ pour lancer ton set B2B.
        </p>
      )}
    </div>
  );
}
