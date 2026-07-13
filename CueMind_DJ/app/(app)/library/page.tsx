"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";
import { TrackList } from "@/components/tracks/track-list";
import { Button } from "@/components/ui/button";
import { useTracks } from "@/hooks/use-tracks";

export default function LibraryPage() {
  const { tracks, loading, removeTrack, clearTracks, mergeTracks } =
    useTracks();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Bibliothèque</h1>
          <p className="text-muted-foreground mt-1">
            Tous tes morceaux uploadés — {tracks.length} au total. L&apos;analyse
            audio détecte le style réel et l&apos;énergie du signal.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/genres">
            <BookOpen className="mr-2 size-4" />
            Genres détectables
          </Link>
        </Button>
      </div>

      <TrackList
        tracks={tracks}
        loading={loading}
        onTrackDeleted={removeTrack}
        onAllDeleted={clearTracks}
        onTracksUpdated={mergeTracks}
      />
    </div>
  );
}
