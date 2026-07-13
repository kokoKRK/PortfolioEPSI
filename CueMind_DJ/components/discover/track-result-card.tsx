"use client";

import Image from "next/image";
import { Loader2, Music2, Plus } from "lucide-react";
import { TrackPlayButton } from "@/components/audio/track-play-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { DeezerSearchResult } from "@/lib/deezer/client";
import { toDeezerPreviewTrack } from "@/types/audio";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

type TrackResultCardProps = {
  result: DeezerSearchResult;
  imported: boolean;
  importing: boolean;
  onImport: (result: DeezerSearchResult) => void;
};

export function TrackResultCard({
  result,
  imported,
  importing,
  onImport,
}: TrackResultCardProps) {
  const playable = toDeezerPreviewTrack({
    externalId: result.externalId,
    title: result.title,
    artist: result.artist,
    previewUrl: result.previewUrl ?? "",
    durationSeconds: result.durationSeconds,
  });

  return (
    <Card className="border-border/60 overflow-hidden">
      <CardContent className="flex gap-3 p-3">
        <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
          {result.artworkUrl ? (
            <Image
              src={result.artworkUrl}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
              unoptimized
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <Music2 className="text-muted-foreground size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{result.title}</p>
          <p className="text-muted-foreground truncate text-xs">
            {result.artist}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {formatDuration(result.durationSeconds)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Extrait 30s
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <TrackPlayButton track={playable} size="sm" />
            <Button
              size="sm"
              variant={imported ? "secondary" : "default"}
              className="h-8 flex-1 text-xs"
              disabled={importing || imported}
              onClick={() => onImport(result)}
            >
              {importing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {imported ? "Dans la biblio" : "Ajouter"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
