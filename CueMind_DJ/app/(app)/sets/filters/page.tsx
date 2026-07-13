"use client";

import { SetBuilderFilters } from "@/components/sets/set-builder-filters";
import { useTracks } from "@/hooks/use-tracks";

export default function SetsFiltersPage() {
  const { tracks, loading, fetchTracks } = useTracks();

  if (loading) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        Chargement de ta bibliothèque...
      </div>
    );
  }

  return <SetBuilderFilters tracks={tracks} onTracksUpdated={fetchTracks} />;
}
