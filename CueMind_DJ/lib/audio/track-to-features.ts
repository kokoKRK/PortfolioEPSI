import type { StyleClassificationInput } from "@/lib/ai/classify-style";
import type { Track } from "@/types/database";

type ReconstructedFeatures = NonNullable<
  StyleClassificationInput["audioFeatures"]
>;

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asTagScores(value: unknown): { tag: string; score: number }[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (t): t is { tag: string; score: number } =>
      typeof t === "object" &&
      t !== null &&
      typeof (t as { tag?: unknown }).tag === "string" &&
      typeof (t as { score?: unknown }).score === "number"
  );
}

/**
 * Reconstruit la forme `audioFeatures` à partir des colonnes stockées sur un Track
 * (audio_energy, energy_level, audio_features…) pour réutiliser le signal déjà
 * analysé lors d'une re-classification.
 */
export function reconstructAudioFeatures(
  track: Track
): ReconstructedFeatures | null {
  const hasAnalysis = Boolean(track.audio_analyzed_at) || track.audio_energy != null;
  if (!hasAnalysis) return null;

  const meta = (track.audio_features ?? {}) as Record<string, unknown>;

  return {
    detectedBpm: track.audio_bpm ?? track.bpm ?? null,
    energy: asNumber(track.audio_energy, 50),
    energyLevel: track.energy_level ?? "medium",
    brightness: asNumber(meta.brightness, 50),
    bassPresence: asNumber(meta.bassPresence, 50),
    detectedStyle: track.detected_style ?? track.style ?? "Other",
    styleConfidence:
      typeof meta.styleConfidence === "string" ? meta.styleConfidence : "low",
    analysisEngine:
      typeof meta.analysisEngine === "string" ? meta.analysisEngine : undefined,
    mlTopTags: asTagScores(meta.mlTopTags),
    mlAmbiances: Array.isArray(meta.mlAmbiances)
      ? (meta.mlAmbiances.filter((a) => typeof a === "string") as string[])
      : [],
    discogsGenre:
      typeof meta.discogsGenre === "string" ? meta.discogsGenre : null,
    discogsTopGenres: asTagScores(meta.discogsTopGenres),
  };
}
