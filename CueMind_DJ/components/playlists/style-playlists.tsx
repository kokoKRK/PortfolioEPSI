"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DjPlaylistBrowser } from "@/components/playlists/dj-playlist-browser";
import type { PlaylistWithTracks } from "@/types/database";

type StylePlaylistsProps = {
  refreshKey?: number;
  fullPage?: boolean;
};

export function StylePlaylists({
  refreshKey = 0,
  fullPage = false,
}: StylePlaylistsProps) {
  const [playlists, setPlaylists] = useState<PlaylistWithTracks[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlaylists = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/playlists");
      const data = await response.json();
      if (response.ok) {
        setPlaylists(data.playlists ?? []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlaylists();
  }, [fetchPlaylists, refreshKey]);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-12rem)] min-h-[520px] items-center justify-center rounded-xl border border-border bg-card">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground font-mono text-xs uppercase">
            Chargement des crates...
          </p>
        </div>
      </div>
    );
  }

  if (playlists.length === 0) {
    return (
      <Card className="border-border bg-card/80">
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <Sparkles className="size-10 text-primary" />
          <p className="text-muted-foreground max-w-md">
            Aucune crate pour l&apos;instant. Importe des morceaux — ils seront
            classés automatiquement par style dans tes playlists.
          </p>
          <Button asChild>
            <Link href="/import">Importer des morceaux</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (fullPage) {
    return <DjPlaylistBrowser playlists={playlists} />;
  }

  return (
    <Card className="border-border overflow-hidden p-0">
      <DjPlaylistBrowser playlists={playlists} />
    </Card>
  );
}
