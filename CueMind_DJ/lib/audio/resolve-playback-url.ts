import { getSignedAudioUrl } from "@/lib/audio/signed-url";
import type { PlayableTrack } from "@/types/audio";

export async function resolvePlaybackUrl(track: PlayableTrack): Promise<string> {
  if (track.source === "deezer") {
    if (track.preview_url && track.id.startsWith("deezer-")) {
      return track.preview_url;
    }
    const externalId = track.external_id;
    if (!externalId) {
      throw new Error("Morceau Deezer sans identifiant externe");
    }
    const response = await fetch(
      `/api/deezer/preview?id=${encodeURIComponent(externalId)}`
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error ?? "Extrait Deezer indisponible");
    }
    return data.previewUrl as string;
  }

  if (!track.audio_url) {
    throw new Error("Aucun fichier audio pour ce morceau");
  }

  return getSignedAudioUrl(track.audio_url);
}
