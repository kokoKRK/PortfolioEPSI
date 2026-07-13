import type { SupabaseClient } from "@supabase/supabase-js";
import type { MusicStyle } from "@/lib/ai/classify-style";

export async function assignTrackToStylePlaylist(
  supabase: SupabaseClient,
  userId: string,
  trackId: string,
  style: MusicStyle
) {
  const { data: existing } = await supabase
    .from("playlists")
    .select("id")
    .eq("user_id", userId)
    .eq("style", style)
    .maybeSingle();

  let playlistId = existing?.id;

  if (!playlistId) {
    const { data: created, error: createError } = await supabase
      .from("playlists")
      .insert({
        user_id: userId,
        name: style,
        style,
      })
      .select("id")
      .single();

    if (createError || !created) {
      throw new Error(createError?.message ?? "Impossible de créer la playlist");
    }

    playlistId = created.id;
  }

  const { error: linkError } = await supabase.from("playlist_tracks").upsert(
    {
      playlist_id: playlistId,
      track_id: trackId,
    },
    { onConflict: "playlist_id,track_id" }
  );

  if (linkError) {
    throw new Error(linkError.message);
  }

  const { data: playlist } = await supabase
    .from("playlists")
    .select("*")
    .eq("id", playlistId)
    .single();

  return playlist;
}
