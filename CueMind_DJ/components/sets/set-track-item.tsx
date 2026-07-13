import { ArrowDown, ArrowUp, Globe, Minus } from "lucide-react";
import { KeyBadge } from "@/components/dj/key-badge";
import { CuePointsBadge } from "@/components/dj/cue-points-badge";
import { TrackPlayButton } from "@/components/audio/track-play-button";
import { Badge } from "@/components/ui/badge";
import { getTransitionQuality } from "@/lib/dj/set-generator";
import type { TransitionTolerance } from "@/lib/dj/transition-tolerance";
import { toPlayableTrack } from "@/types/audio";
import type { GeneratedSetTrack } from "@/types/database";

type SetTrackItemProps = {
  track: GeneratedSetTrack;
  isFirst: boolean;
  transitionTolerance?: TransitionTolerance;
};

export function SetTrackItem({
  track,
  isFirst,
  transitionTolerance = "balanced",
}: SetTrackItemProps) {
  const quality = getTransitionQuality(
    track.transitionScore ?? 0,
    transitionTolerance
  );

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border/60 bg-card/50 p-4">
      <div className="flex size-10 shrink-0 flex-col items-center justify-center gap-1">
        <span className="text-sm font-bold text-primary">{track.position}</span>
        <TrackPlayButton track={toPlayableTrack(track)} size="sm" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{track.title}</p>
          {track.artist && (
            <span className="text-muted-foreground truncate text-sm">
              — {track.artist}
            </span>
          )}
          {track.source === "deezer" && (
            <Badge
              variant="outline"
              className="gap-1 border-violet-500/40 text-violet-400"
            >
              <Globe className="size-3" />
              Découverte · extrait
            </Badge>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {track.bpm != null && (
            <Badge variant="secondary">{track.bpm} BPM</Badge>
          )}
          <KeyBadge camelotKey={track.key} />
          {track.style && (
            <Badge variant="outline" className="text-xs">
              {track.style}
            </Badge>
          )}
          {track.ambiances?.map((ambiance) => (
            <Badge key={ambiance} variant="secondary" className="text-xs">
              {ambiance}
            </Badge>
          ))}
        </div>
        <div className="mt-2">
          <CuePointsBadge track={track} />
        </div>
      </div>

      {!isFirst && (
        <div className="flex shrink-0 flex-col items-end gap-1">
          {track.bpmDelta != null && (
            <div className="flex items-center gap-1 text-xs">
              {track.bpmDelta > 0 ? (
                <ArrowUp className="size-3 text-emerald-400" />
              ) : track.bpmDelta < 0 ? (
                <ArrowDown className="size-3 text-amber-400" />
              ) : (
                <Minus className="size-3 text-muted-foreground" />
              )}
              <span
                className={
                  Math.abs(track.bpmDelta) <= 3
                    ? "text-emerald-400"
                    : Math.abs(track.bpmDelta) <= 6
                      ? "text-amber-400"
                      : "text-red-400"
                }
              >
                {track.bpmDelta > 0 ? "+" : ""}
                {track.bpmDelta} BPM
              </span>
            </div>
          )}
          <Badge variant={quality}>
            {track.keyCompatible === true
              ? "Clé OK"
              : track.keyCompatible === false
                ? "Clé diff."
                : "Clé ?"}
          </Badge>
        </div>
      )}
    </div>
  );
}
