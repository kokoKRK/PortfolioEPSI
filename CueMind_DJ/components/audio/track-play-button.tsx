"use client";

import { useAudioPlayer } from "@/components/audio/audio-player-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlayableTrack } from "@/types/audio";
import { Loader2, Pause, Play } from "lucide-react";

type TrackPlayButtonProps = {
  track: PlayableTrack;
  className?: string;
  size?: "sm" | "md";
};

export function TrackPlayButton({
  track,
  className,
  size = "sm",
}: TrackPlayButtonProps) {
  const { currentTrack, isPlaying, isLoading, playTrack } = useAudioPlayer();
  const isActive = currentTrack?.id === track.id;
  const playing = isActive && isPlaying;
  const loading = isActive && isLoading;

  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const buttonSize = size === "sm" ? "size-7" : "size-9";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        buttonSize,
        "shrink-0 rounded-full",
        isActive && "bg-primary/20 text-primary hover:bg-primary/30",
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        void playTrack(track);
      }}
      aria-label={playing ? "Pause" : `Lire ${track.title}`}
    >
      {loading ? (
        <Loader2 className={cn(iconSize, "animate-spin")} />
      ) : playing ? (
        <Pause className={cn(iconSize, "fill-current")} />
      ) : (
        <Play className={cn(iconSize, "fill-current")} />
      )}
    </Button>
  );
}
