import { estimateTrackDurationSeconds } from "@/lib/dj/set-generator";
import type { GeneratedSetTrack, Track } from "@/types/database";

export type SetStoryPoint = {
  trackId: string;
  title: string;
  position: number;
  bpm: number;
  energy: number;
  ambiances: string[];
  primaryAmbiance: string | null;
  startMinute: number;
  durationMinutes: number;
};

export function getTrackEnergyScore(track: Track): number {
  if (track.audio_energy != null) return track.audio_energy;
  if (track.energy_level === "low") return 28;
  if (track.energy_level === "high") return 82;
  return 55;
}

export function buildSetStoryPoints(
  tracks: GeneratedSetTrack[]
): SetStoryPoint[] {
  let elapsedSeconds = 0;

  return tracks.map((track) => {
    const durationSeconds = estimateTrackDurationSeconds(track);
    const startMinute = elapsedSeconds / 60;
    elapsedSeconds += durationSeconds;

    const ambiances = (track.ambiances ?? []).filter(Boolean);

    return {
      trackId: track.id,
      title: track.title,
      position: track.position,
      bpm: track.bpm ?? track.audio_bpm ?? 120,
      energy: getTrackEnergyScore(track),
      ambiances,
      primaryAmbiance: ambiances[0] ?? null,
      startMinute,
      durationMinutes: durationSeconds / 60,
    };
  });
}

export function findPeakTimeIndex(points: SetStoryPoint[]): number {
  if (points.length === 0) return 0;
  let best = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].energy > points[best].energy) best = i;
  }
  return best;
}
