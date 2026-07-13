"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Track } from "@/types/database";

export function useTracks() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTracks = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tracks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setTracks(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTracks();
  }, [fetchTracks]);

  function addTrack(track: Track) {
    setTracks((prev) => [track, ...prev]);
  }

  function removeTrack(trackId: string) {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  }

  function clearTracks() {
    setTracks([]);
  }

  function mergeTracks(updated: Track[]) {
    const byId = new Map(updated.map((t) => [t.id, t]));
    setTracks((prev) =>
      prev.map((track) => byId.get(track.id) ?? track)
    );
  }

  return {
    tracks,
    loading,
    fetchTracks,
    addTrack,
    removeTrack,
    clearTracks,
    mergeTracks,
  };
}
