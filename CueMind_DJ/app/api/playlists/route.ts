import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PlaylistWithTracks, Track } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: playlists, error: playlistsError } = await supabase
      .from("playlists")
      .select("*")
      .order("name", { ascending: true });

    if (playlistsError) {
      return NextResponse.json({ error: playlistsError.message }, { status: 500 });
    }

    if (!playlists || playlists.length === 0) {
      return NextResponse.json({ playlists: [] });
    }

    const playlistIds = playlists.map((p) => p.id);

    const { data: links, error: linksError } = await supabase
      .from("playlist_tracks")
      .select("playlist_id, track_id")
      .in("playlist_id", playlistIds);

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 });
    }

    const trackIds = [...new Set((links ?? []).map((l) => l.track_id))];
    let tracksMap = new Map<string, Track>();

    if (trackIds.length > 0) {
      const { data: tracks, error: tracksError } = await supabase
        .from("tracks")
        .select("*")
        .in("id", trackIds);

      if (tracksError) {
        return NextResponse.json({ error: tracksError.message }, { status: 500 });
      }

      tracksMap = new Map((tracks ?? []).map((t) => [t.id, t]));
    }

    const playlistsWithTracks: PlaylistWithTracks[] = playlists.map((playlist) => {
      const playlistTrackIds = (links ?? [])
        .filter((l) => l.playlist_id === playlist.id)
        .map((l) => l.track_id);

      const tracks = playlistTrackIds
        .map((id) => tracksMap.get(id))
        .filter((t): t is Track => t !== undefined);

      return { ...playlist, tracks };
    });

    return NextResponse.json({ playlists: playlistsWithTracks });
  } catch (error) {
    console.error("Playlists fetch error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des playlists." },
      { status: 500 }
    );
  }
}
