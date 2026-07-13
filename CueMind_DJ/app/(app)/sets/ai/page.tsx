"use client";

import { SetBuilderPrompt } from "@/components/sets/set-builder-prompt";
import { useTracks } from "@/hooks/use-tracks";

export default function SetsAiPage() {
  const { tracks, loading } = useTracks();

  if (loading) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        Chargement de ta bibliothèque...
      </div>
    );
  }

  const tracksWithBpm = tracks.filter((t) => t.bpm != null);

  return <SetBuilderPrompt trackCount={tracksWithBpm.length} />;
}
