"use client";

import { useAudioPlayer } from "@/components/audio/audio-player-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Pause, Play, X } from "lucide-react";
import { useRef } from "react";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    togglePlay,
    pause,
    seek,
  } = useAudioPlayer();

  const progressRef = useRef<HTMLDivElement>(null);

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  function handleSeek(clientX: number) {
    const el = progressRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    seek(ratio);
  }

  return (
    <div
      className={cn(
        "fixed right-0 left-0 z-50 border-t border-border bg-card/95 backdrop-blur",
        "bottom-16 lg:bottom-0"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
        <Button
          type="button"
          variant="default"
          size="icon"
          className="size-9 shrink-0 rounded-full"
          onClick={() => void togglePlay()}
          disabled={isLoading}
          aria-label={isPlaying ? "Pause" : "Lecture"}
        >
          {isPlaying ? (
            <Pause className="size-4 fill-current" />
          ) : (
            <Play className="size-4 fill-current" />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{currentTrack.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {currentTrack.artist ?? "Artiste inconnu"}
          </p>
        </div>

        <div className="hidden min-w-[200px] flex-1 items-center gap-2 sm:flex">
          <span className="text-muted-foreground w-10 text-right font-mono text-[10px]">
            {formatTime(currentTime)}
          </span>
          <div
            ref={progressRef}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
            tabIndex={0}
            className="group relative h-1.5 flex-1 cursor-pointer rounded-full bg-muted"
            onClick={(e) => handleSeek(e.clientX)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                seek((currentTime + 5) / (duration || 1));
              }
              if (e.key === "ArrowLeft") {
                seek((currentTime - 5) / (duration || 1));
              }
            }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-primary opacity-0 shadow transition-opacity group-hover:opacity-100"
              style={{ left: `calc(${progress}% - 6px)` }}
            />
          </div>
          <span className="text-muted-foreground w-10 font-mono text-[10px]">
            {formatTime(duration)}
          </span>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={pause}
          aria-label="Fermer le lecteur"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
