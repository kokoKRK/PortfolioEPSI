import type { Track } from "@/types/database";
import type { EnergyLevel } from "@/lib/audio/extract-features";

export function trackHasAudioAnalysis(track: Track): boolean {
  return Boolean(track.audio_analyzed_at);
}

export function getTrackPrimaryStyle(track: Track): string {
  if (trackHasAudioAnalysis(track) && track.detected_style) {
    return track.detected_style;
  }
  return track.style ?? "Other";
}

export function getTrackDiscogsGenre(track: Track): string | null {
  const meta = track.audio_features;
  if (meta && typeof meta === "object" && "discogsGenre" in meta) {
    const genre = meta.discogsGenre;
    return typeof genre === "string" ? genre : null;
  }
  return null;
}

export function getTrackEnergyLevel(track: Track): EnergyLevel {
  if (track.energy_level === "low" || track.energy_level === "medium" || track.energy_level === "high") {
    return track.energy_level;
  }
  if (track.audio_energy != null) {
    if (track.audio_energy < 40) return "low";
    if (track.audio_energy < 68) return "medium";
    return "high";
  }
  return "medium";
}

export function getTrackEffectiveBpm(track: Track): number | null {
  if (track.bpm != null) return track.bpm;
  return track.audio_bpm ?? null;
}
