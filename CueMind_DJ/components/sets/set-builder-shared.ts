import { getStoredAmbiances } from "@/lib/ai/classify-ambiance";
import type { Track } from "@/types/database";

export const DURATION_OPTIONS = [
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 h", value: 60 },
  { label: "1 h 30", value: 90 },
  { label: "2 h", value: 120 },
  { label: "3 h", value: 180 },
] as const;

export function countByField(
  tracks: Track[],
  getValue: (t: Track) => string | null | undefined
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const track of tracks) {
    if (track.bpm == null) continue;
    const value = getValue(track);
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

export function countAmbiances(tracks: Track[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const track of tracks) {
    if (track.bpm == null) continue;
    for (const ambiance of getStoredAmbiances(track)) {
      counts[ambiance] = (counts[ambiance] ?? 0) + 1;
    }
  }
  return counts;
}
