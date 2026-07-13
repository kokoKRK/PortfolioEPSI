"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import {
  Check,
  Pencil,
  RefreshCw,
  Search,
  Sparkles,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { TrackPlayButton } from "@/components/audio/track-play-button";
import { KeyBadge } from "@/components/dj/key-badge";
import { CuePointsBadge } from "@/components/dj/cue-points-badge";
import { MUSIC_AMBIANCES } from "@/lib/ai/classify-ambiance";
import { MUSIC_STYLES } from "@/lib/ai/classify-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/lib/supabase/client";
import { toPlayableTrack } from "@/types/audio";
import type { Track } from "@/types/database";

type TrackListProps = {
  tracks: Track[];
  loading: boolean;
  onTrackDeleted: (trackId: string) => void;
  onAllDeleted?: () => void;
  onTracksUpdated?: (tracks: Track[]) => void;
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type EnergyTier = {
  label: string;
  className: string;
};

const ENERGY_TIERS: { min: number; label: string; className: string }[] = [
  { min: 80, label: "Intense", className: "bg-red-600/20 text-red-400 border-red-600/30" },
  { min: 62, label: "Énergique", className: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { min: 45, label: "Groovy", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  { min: 28, label: "Modéré", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { min: 0, label: "Chill", className: "bg-sky-500/20 text-sky-400 border-sky-500/30" },
];

function getEnergyTier(track: Track): EnergyTier | null {
  if (track.audio_energy != null) {
    const tier = ENERGY_TIERS.find((t) => track.audio_energy! >= t.min);
    if (tier) return { label: tier.label, className: tier.className };
  }

  // Fallback sur le niveau discret si pas de valeur numérique
  if (track.energy_level === "low") {
    return { label: "Chill", className: ENERGY_TIERS[4].className };
  }
  if (track.energy_level === "medium") {
    return { label: "Modéré", className: ENERGY_TIERS[3].className };
  }
  if (track.energy_level === "high") {
    return { label: "Intense", className: ENERGY_TIERS[0].className };
  }
  return null;
}

const STYLE_DATALIST_ID = "cuemind-style-options";

function getDiscogsGenre(track: Track): string | null {
  const meta = track.audio_features;
  if (
    meta &&
    typeof meta === "object" &&
    "discogsGenre" in meta &&
    typeof meta.discogsGenre === "string"
  ) {
    return meta.discogsGenre;
  }
  return null;
}

function EditableStyleCell({
  track,
  onSaved,
}: {
  track: Track;
  onSaved?: (tracks: Track[]) => void;
}) {
  const discogsGenre = getDiscogsGenre(track);
  const current = track.detected_style ?? track.style ?? "";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === current) {
      setEditing(false);
      setValue(current);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tracks")
      .update({ detected_style: trimmed })
      .eq("id", track.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error(`Erreur mise à jour du style : ${error.message}`);
      return;
    }

    if (data) {
      onSaved?.([data]);
      toast.success("Style mis à jour");
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          autoFocus
          list={STYLE_DATALIST_ID}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleSave();
            if (e.key === "Escape") {
              setEditing(false);
              setValue(current);
            }
          }}
          className="h-8 w-28 text-sm"
          disabled={saving}
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => void handleSave()}
          disabled={saving}
        >
          <Check className="size-4 text-emerald-500" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0"
          onClick={() => {
            setEditing(false);
            setValue(current);
          }}
          disabled={saving}
        >
          <X className="size-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => {
          setValue(current);
          setEditing(true);
        }}
        className="flex items-center gap-1 text-left"
        title="Modifier le style"
      >
        <span className="truncate text-sm">{current || "—"}</span>
        <Pencil className="text-muted-foreground size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
      </button>
      {discogsGenre && (
        <span className="text-primary truncate text-xs">{discogsGenre}</span>
      )}
      {track.detected_style &&
        track.style &&
        track.detected_style !== track.style && (
          <span className="text-muted-foreground truncate text-xs">
            tag: {track.style}
          </span>
        )}
    </div>
  );
}

const AMBIANCE_COLORS: Record<string, string> = {
  Énergique: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Chill: "bg-sky-500/20 text-sky-400 border-sky-500/30",
  Festif: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  Sombre: "bg-slate-500/25 text-slate-300 border-slate-500/40",
  Romantique: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  Dansant: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
  Mélancolique: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  Agressif: "bg-red-600/20 text-red-400 border-red-600/30",
  Nostalgique: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  Hypnotique: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  Uplifting: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Groove: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

function getAmbianceColor(ambiance: string): string {
  const match = Object.keys(AMBIANCE_COLORS).find(
    (key) => key.toLowerCase() === ambiance.toLowerCase()
  );
  return match
    ? AMBIANCE_COLORS[match]
    : "bg-muted text-muted-foreground border-border";
}

function AmbianceCell({
  track,
  onSaved,
}: {
  track: Track;
  onSaved?: (tracks: Track[]) => void;
}) {
  const ambiances = (track.ambiances ?? []).filter(Boolean);
  const [editing, setEditing] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);

  async function save(next: string[]) {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tracks")
      .update({ ambiances: next })
      .eq("id", track.id)
      .select()
      .single();

    if (error) {
      toast.error(`Erreur mise à jour ambiances : ${error.message}`);
      return;
    }
    if (data) onSaved?.([data]);
  }

  async function handleReclassify() {
    setReclassifying(true);
    try {
      const response = await fetch("/api/tracks/classify-ambiances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackIds: [track.id], ambiancesOnly: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur ré-analyse");
      }
      if (data.tracks?.length) {
        onSaved?.(data.tracks);
        toast.success("Ambiances ré-analysées");
      } else {
        toast.warning(
          data.errors?.[0]?.message ?? "Aucune ambiance détectée."
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur ré-analyse ambiances"
      );
    } finally {
      setReclassifying(false);
    }
  }

  function toggle(ambiance: string) {
    const exists = ambiances.some(
      (a) => a.toLowerCase() === ambiance.toLowerCase()
    );
    if (exists) {
      void save(ambiances.filter((a) => a.toLowerCase() !== ambiance.toLowerCase()));
    } else {
      if (ambiances.length >= 3) {
        toast.info("Maximum 3 ambiances par morceau.");
        return;
      }
      void save([...ambiances, ambiance]);
    }
  }

  if (editing) {
    return (
      <div className="flex max-w-[220px] flex-col gap-1.5">
        <div className="flex flex-wrap gap-1">
          {MUSIC_AMBIANCES.map((a) => {
            const active = ambiances.some(
              (x) => x.toLowerCase() === a.toLowerCase()
            );
            return (
              <button
                key={a}
                type="button"
                onClick={() => toggle(a)}
                className={
                  active
                    ? `rounded-md border px-1.5 py-0.5 text-[10px] ${getAmbianceColor(a)}`
                    : "rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary/40"
                }
              >
                {a}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="text-primary self-start text-[10px] hover:underline"
        >
          Terminer
        </button>
      </div>
    );
  }

  return (
    <div className="group flex max-w-[180px] flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1">
        {ambiances.length > 0 ? (
          ambiances.map((a) => (
            <Badge
              key={a}
              variant="outline"
              className={`text-[10px] ${getAmbianceColor(a)}`}
            >
              {a}
            </Badge>
          ))
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>
      <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-muted-foreground flex items-center gap-1 text-[10px] hover:text-foreground"
        >
          <Pencil className="size-3" />
          Modifier
        </button>
        <button
          type="button"
          onClick={() => void handleReclassify()}
          disabled={reclassifying}
          className="text-muted-foreground flex items-center gap-1 text-[10px] hover:text-foreground"
        >
          <RefreshCw
            className={reclassifying ? "size-3 animate-spin" : "size-3"}
          />
          {reclassifying ? "..." : "Ré-analyser"}
        </button>
      </div>
    </div>
  );
}

export function TrackList({
  tracks,
  loading,
  onTrackDeleted,
  onAllDeleted,
  onTracksUpdated,
}: TrackListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [search, setSearch] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [stopping, setStopping] = useState(false);
  const stopRef = useRef(false);

  // Pendant une analyse, on prévient avant un rechargement : la progression en
  // cours serait perdue. L'analyse reste reprenable (basée sur l'état en base),
  // mais on évite d'interrompre le lot en cours par accident.
  useEffect(() => {
    if (!analyzing) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [analyzing]);

  const unanalyzedCount = tracks.filter(
    (t) =>
      !t.audio_analyzed_at &&
      (t.source ?? "upload") === "upload" &&
      Boolean(t.audio_url)
  ).length;

  const ANALYZE_CHUNK_SIZE = 1;

  function handleStopAnalyze() {
    stopRef.current = true;
    setStopping(true);
  }

  async function handleAnalyzeAudio() {
    const queue = tracks
      .filter(
        (t) =>
          !t.audio_analyzed_at &&
          (t.source ?? "upload") === "upload" &&
          Boolean(t.audio_url)
      )
      .map((t) => t.id);
    const total = queue.length;
    if (total === 0) {
      toast.info("Tous les morceaux sont déjà analysés.");
      return;
    }

    stopRef.current = false;
    setStopping(false);
    setAnalyzing(true);
    setProgress({ done: 0, total });

    let done = 0;
    let totalUpdated = 0;
    let lastErrorMessage: string | null = null;
    let stopped = false;

    try {
      for (let i = 0; i < queue.length; i += ANALYZE_CHUNK_SIZE) {
        if (stopRef.current) {
          stopped = true;
          break;
        }

        const chunk = queue.slice(i, i + ANALYZE_CHUNK_SIZE);

        const response = await fetch("/api/tracks/analyze-audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ trackIds: chunk }),
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Erreur analyse audio");
        }

        if (data.updated > 0 && data.tracks?.length) {
          onTracksUpdated?.(data.tracks);
          totalUpdated += data.updated;
        }

        if (data.errors?.[0]?.message) {
          lastErrorMessage = data.errors[0].message;
        }

        done += chunk.length;
        setProgress({ done: Math.min(done, total), total });
      }

      if (stopped) {
        toast.info(
          `Analyse arrêtée — ${totalUpdated} morceau${totalUpdated > 1 ? "x" : ""} traité${totalUpdated > 1 ? "s" : ""} sur ${total}.`
        );
      } else if (totalUpdated > 0) {
        toast.success(
          `${totalUpdated} morceau${totalUpdated > 1 ? "x" : ""} analysé${totalUpdated > 1 ? "s" : ""} (signal audio)`
        );
      } else {
        toast.warning(
          lastErrorMessage ?? "Aucun morceau n'a pu être analysé."
        );
      }

      if (!stopped) {
        const stillUnanalyzed = total - totalUpdated;
        if (stillUnanalyzed > 0 && totalUpdated > 0) {
          toast.info(
            `${stillUnanalyzed} morceau${stillUnanalyzed > 1 ? "x" : ""} n'a pas pu être analysé — réessaie plus tard.`
          );
        }
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur analyse audio"
      );
    } finally {
      setAnalyzing(false);
      setProgress(null);
      setStopping(false);
      stopRef.current = false;
    }
  }

  async function handleDelete(track: Track) {
    if (!confirm(`Supprimer "${track.title}" ?`)) return;

    setDeletingId(track.id);
    const supabase = createClient();

    if (track.audio_url && (track.source ?? "upload") === "upload") {
      const { error: storageError } = await supabase.storage
        .from("audio-tracks")
        .remove([track.audio_url]);

      if (storageError) {
        toast.error("Erreur suppression du fichier audio");
        setDeletingId(null);
        return;
      }
    }

    const { error } = await supabase.from("tracks").delete().eq("id", track.id);

    if (error) {
      toast.error(error.message);
      setDeletingId(null);
      return;
    }

    toast.success("Morceau supprimé");
    onTrackDeleted(track.id);
    setDeletingId(null);
  }

  async function handleDeleteAll() {
    if (
      !confirm(
        `Supprimer définitivement les ${tracks.length} morceaux de ta bibliothèque ? Cette action est irréversible.`
      )
    ) {
      return;
    }

    setDeletingAll(true);
    const supabase = createClient();

    const paths = tracks
      .filter((t) => (t.source ?? "upload") === "upload" && t.audio_url)
      .map((t) => t.audio_url as string);
    if (paths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("audio-tracks")
        .remove(paths);
      if (storageError) {
        toast.error("Erreur suppression des fichiers audio");
        setDeletingAll(false);
        return;
      }
    }

    const ids = tracks.map((t) => t.id);
    const { error } = await supabase.from("tracks").delete().in("id", ids);

    if (error) {
      toast.error(error.message);
      setDeletingAll(false);
      return;
    }

    toast.success("Tous les morceaux ont été supprimés");
    onAllDeleted?.();
    setDeletingAll(false);
  }

  const normalizedSearch = search.trim().toLowerCase();
  const filteredTracks = normalizedSearch
    ? tracks.filter((track) => {
        const haystack = [
          track.title,
          track.artist,
          track.detected_style,
          track.style,
          ...(track.ambiances ?? []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : tracks;

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.done / progress.total) * 100)
      : 0;

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-3">
        <div className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Bibliothèque</CardTitle>
            <CardDescription>
              {tracks.length} morceau{tracks.length !== 1 ? "x" : ""} dans ta
              collection
              {unanalyzedCount > 0
                ? ` · ${unanalyzedCount} sans analyse audio`
                : ""}
            </CardDescription>
          </div>
          {analyzing ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStopAnalyze}
              disabled={stopping}
            >
              <Square className="mr-2 size-4" />
              {stopping ? "Arrêt…" : "Stopper"}
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyzeAudio}
              disabled={loading || unanalyzedCount === 0}
              title={
                unanalyzedCount === 0
                  ? "Tous les morceaux sont déjà analysés"
                  : undefined
              }
            >
              <Sparkles className="mr-2 size-4" />
              {unanalyzedCount > 0
                ? `Analyser l'audio (${unanalyzedCount})`
                : "Tout est analysé"}
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre, artiste, style ou ambiance…"
            className="pl-9"
          />
        </div>
        {progress && (
          <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {stopping ? "Arrêt en cours…" : "Analyse audio en cours…"}
              </span>
              <span className="font-medium text-primary">
                {progress.done}/{progress.total} · {progressPercent}%
              </span>
            </div>
            <Progress value={progressPercent} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <datalist id={STYLE_DATALIST_ID}>
          {MUSIC_STYLES.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-muted/50 h-12 animate-pulse rounded-lg"
              />
            ))}
          </div>
        ) : tracks.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <p className="text-lg font-medium">Aucun morceau</p>
            <p className="text-sm">Upload ton premier track pour commencer</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <p className="text-lg font-medium">Aucun résultat</p>
            <p className="text-sm">
              Aucun morceau ne correspond à «&nbsp;{search}&nbsp;»
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Titre</TableHead>
                <TableHead>Artiste</TableHead>
                <TableHead>BPM</TableHead>
                <TableHead>Clé</TableHead>
                <TableHead>Style</TableHead>
                <TableHead>Ambiances</TableHead>
                <TableHead>Énergie</TableHead>
                <TableHead>Cues</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTracks.map((track) => (
                <TableRow key={track.id}>
                  <TableCell>
                    <TrackPlayButton track={toPlayableTrack(track)} />
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <div className="flex items-center gap-2">
                      {track.artwork_url ? (
                        <div className="bg-muted relative size-8 shrink-0 overflow-hidden rounded">
                          <Image
                            src={track.artwork_url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="32px"
                            unoptimized
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0">
                        <p className="truncate font-medium">{track.title}</p>
                        {track.source === "deezer" && (
                          <Badge
                            variant="outline"
                            className="mt-0.5 text-[9px]"
                          >
                            Découverte · extrait
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[140px] truncate">
                    {track.artist ?? "—"}
                  </TableCell>
                  <TableCell>
                    {track.bpm != null ? (
                      <Badge variant="secondary">{track.bpm}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <KeyBadge camelotKey={track.key} />
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    <EditableStyleCell
                      track={track}
                      onSaved={onTracksUpdated}
                    />
                  </TableCell>
                  <TableCell>
                    <AmbianceCell track={track} onSaved={onTracksUpdated} />
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const tier = getEnergyTier(track);
                      return tier ? (
                        <Badge
                          variant="outline"
                          className={tier.className}
                          title={
                            track.audio_energy != null
                              ? `Énergie ${Math.round(track.audio_energy)}/100`
                              : undefined
                          }
                        >
                          {tier.label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>
                    <CuePointsBadge track={track} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDuration(track.duration_seconds)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(track)}
                      disabled={deletingId === track.id}
                    >
                      <Trash2 className="text-destructive size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && tracks.length > 0 && (
          <div className="border-border/60 mt-4 flex justify-end border-t pt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAll}
              disabled={deletingAll || analyzing}
            >
              <Trash2 className="mr-2 size-4" />
              {deletingAll
                ? "Suppression…"
                : `Tout supprimer (${tracks.length})`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
