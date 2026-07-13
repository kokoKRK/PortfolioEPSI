"use client";

import { TrackWaveform } from "@/components/audio/track-waveform";
import { TrackPlayButton } from "@/components/audio/track-play-button";
import { useAudioPlayer } from "@/components/audio/audio-player-provider";
import { KeyBadge } from "@/components/dj/key-badge";
import { cn } from "@/lib/utils";
import { toPlayableTrack } from "@/types/audio";
import type { PlaylistWithTracks, Track } from "@/types/database";
import { Disc3, FolderOpen, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

const STYLE_ACCENT: Record<string, string> = {
  House: "border-l-orange-500",
  Techno: "border-l-violet-500",
  Trance: "border-l-cyan-500",
  "Drum & Bass": "border-l-lime-500",
  Dubstep: "border-l-red-500",
  "Hip-Hop": "border-l-amber-500",
  "R&B": "border-l-pink-500",
  Pop: "border-l-sky-500",
  Rock: "border-l-stone-400",
  Reggae: "border-l-emerald-500",
  Latino: "border-l-orange-400",
  Afrobeat: "border-l-yellow-500",
  Disco: "border-l-fuchsia-500",
  Funk: "border-l-amber-400",
  Ambient: "border-l-slate-400",
  Other: "border-l-primary",
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—:——";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTotalDuration(tracks: Track[]): string {
  const total = tracks.reduce((sum, t) => sum + (t.duration_seconds ?? 0), 0);
  if (total === 0) return "—";
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m} min`;
}

type DjPlaylistBrowserProps = {
  playlists: PlaylistWithTracks[];
};

export function DjPlaylistBrowser({ playlists }: DjPlaylistBrowserProps) {
  const { currentTrack, isPlaying, playTrack } = useAudioPlayer();
  const [selectedId, setSelectedId] = useState<string | null>(
    playlists[0]?.id ?? null
  );
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const selected = playlists.find((p) => p.id === selectedId) ?? playlists[0];

  const filteredTracks = useMemo(() => {
    if (!selected) return [];
    const q = search.toLowerCase().trim();
    if (!q) return selected.tracks;
    return selected.tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist?.toLowerCase().includes(q) ||
        t.style?.toLowerCase().includes(q)
    );
  }, [selected, search]);

  const totalTracks = playlists.reduce((n, p) => n + p.tracks.length, 0);

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[520px] flex-col overflow-hidden rounded-xl border border-border bg-card lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-border bg-background/60 lg:w-56 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <FolderOpen className="size-4 text-primary" />
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Crates
          </span>
          <span className="text-muted-foreground ml-auto font-mono text-xs">
            {playlists.length}
          </span>
        </div>

        <div className="max-h-40 overflow-y-auto lg:max-h-none lg:flex-1">
          {playlists.map((playlist) => {
            const active = selected?.id === playlist.id;
            const accent =
              STYLE_ACCENT[playlist.style] ?? STYLE_ACCENT.Other;

            return (
              <button
                key={playlist.id}
                type="button"
                onClick={() => {
                  setSelectedId(playlist.id);
                  setSelectedTrackId(null);
                  setSearch("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 border-l-2 px-3 py-2.5 text-left transition-colors",
                  accent,
                  active
                    ? "border-l-primary bg-primary/15 text-foreground"
                    : "border-l-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Disc3
                  className={cn(
                    "size-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {playlist.name}
                </span>
                <span className="font-mono text-xs opacity-70">
                  {playlist.tracks.length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-auto hidden border-t border-border px-3 py-2 lg:block">
          <p className="text-muted-foreground font-mono text-[10px] uppercase">
            {totalTracks} tracks · {playlists.length} crates
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {selected && (
          <>
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold text-primary">
                  {selected.name}
                </h2>
                <p className="text-muted-foreground font-mono text-xs">
                  {selected.tracks.length} tracks ·{" "}
                  {formatTotalDuration(selected.tracks)}
                </p>
              </div>
              <div className="relative w-full sm:w-48">
                <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                <Input
                  placeholder="Rechercher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 border-border bg-background pl-8 font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full min-w-[900px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left">
                    <th className="text-muted-foreground w-10 px-1 py-2 font-mono text-[10px] font-semibold uppercase" />
                    <th className="text-muted-foreground w-10 px-2 py-2 font-mono text-[10px] font-semibold uppercase">
                      #
                    </th>
                    <th className="text-muted-foreground w-64 min-w-[14rem] px-2 py-2 font-mono text-[10px] font-semibold uppercase">
                      Waveform
                    </th>
                    <th className="text-muted-foreground px-3 py-2 font-mono text-[10px] font-semibold uppercase">
                      Titre
                    </th>
                    <th className="text-muted-foreground hidden px-3 py-2 font-mono text-[10px] font-semibold uppercase sm:table-cell">
                      Artiste
                    </th>
                    <th className="text-muted-foreground w-16 px-2 py-2 text-right font-mono text-[10px] font-semibold uppercase">
                      BPM
                    </th>
                    <th className="text-muted-foreground w-16 px-2 py-2 text-center font-mono text-[10px] font-semibold uppercase">
                      Key
                    </th>
                    <th className="text-muted-foreground w-14 px-3 py-2 text-right font-mono text-[10px] font-semibold uppercase">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTracks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="text-muted-foreground px-4 py-12 text-center text-sm"
                      >
                        {search
                          ? "Aucun résultat"
                          : "Crate vide — importe des morceaux de ce style"}
                      </td>
                    </tr>
                  ) : (
                    filteredTracks.map((track, index) => {
                      const isSelected = selectedTrackId === track.id;
                      const isPlayingTrack =
                        currentTrack?.id === track.id && isPlaying;
                      const playable = toPlayableTrack(track);

                      return (
                        <tr
                          key={track.id}
                          onClick={() => setSelectedTrackId(track.id)}
                          onDoubleClick={() => void playTrack(playable)}
                          className={cn(
                            "cursor-pointer border-b border-border/40 transition-colors",
                            index % 2 === 0 ? "bg-background/20" : "bg-transparent",
                            isSelected || isPlayingTrack
                              ? "bg-primary/20 hover:bg-primary/25"
                              : "hover:bg-primary/10"
                          )}
                        >
                          <td className="px-1 py-1">
                            <TrackPlayButton track={playable} />
                          </td>
                          <td className="text-muted-foreground px-2 py-1.5 font-mono text-xs">
                            {index + 1}
                          </td>
                          <td
                            className="w-64 min-w-[14rem] px-2 py-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              void playTrack(playable);
                            }}
                          >
                            <TrackWaveform
                              audioPath={track.audio_url}
                              peaks={track.waveform_peaks}
                              isActive={isPlayingTrack}
                              className="cursor-pointer"
                            />
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-1.5 font-medium">
                            {track.title}
                          </td>
                          <td className="text-muted-foreground hidden max-w-[160px] truncate px-3 py-1.5 sm:table-cell">
                            {track.artist ?? "—"}
                          </td>
                          <td className="px-2 py-1.5 text-right font-mono text-xs text-primary">
                            {track.bpm != null ? track.bpm.toFixed(0) : "—"}
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <KeyBadge camelotKey={track.key} />
                          </td>
                          <td className="text-muted-foreground px-3 py-1.5 text-right font-mono text-xs">
                            {formatDuration(track.duration_seconds)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between border-t border-border bg-background/80 px-4 py-1.5">
              <span className="text-muted-foreground font-mono text-[10px] uppercase">
                CueMind DJ · Crate view
              </span>
              <span className="font-mono text-[10px] text-primary">
                {filteredTracks.length} / {selected.tracks.length} affichés ·
                double-clic pour lire
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
