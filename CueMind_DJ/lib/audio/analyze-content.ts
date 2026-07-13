import { decodeAudioBuffer } from "@/lib/audio/decode";
import { extractAdvancedAudioFeatures } from "@/lib/audio/analyze-advanced";
import {
  extractAudioFeatures,
  type AudioFeatures,
} from "@/lib/audio/extract-features";
import { peaksFromChannelData } from "@/lib/audio/waveform-peaks";
import { WAVEFORM_PEAK_COUNT } from "@/lib/audio/waveform-peaks";
import { toCamelotKey } from "@/lib/dj/camelot";

export type AudioContentAnalysis = {
  waveformPeaks: number[];
  features: AudioFeatures;
  detectedKey: string | null;
};

export async function analyzeAudioContent(
  buffer: Buffer,
  tagBpm?: number | null
): Promise<AudioContentAnalysis | null> {
  const decoded = await decodeAudioBuffer(buffer);
  if (!decoded) return null;

  const waveformPeaks = peaksFromChannelData(
    decoded.channel,
    WAVEFORM_PEAK_COUNT
  );

  try {
    const advanced = await extractAdvancedAudioFeatures(decoded, tagBpm);
    return {
      waveformPeaks,
      features: advanced.features,
      detectedKey: signalToCamelotKey(advanced.signal.key, advanced.signal.scale),
    };
  } catch (error) {
    console.warn("Advanced analysis unavailable, fallback heuristics:", error);
    return {
      waveformPeaks,
      features: extractAudioFeatures(decoded, tagBpm),
      detectedKey: null,
    };
  }
}

/** Convertit la clé Essentia (ex: "C" + "minor") en clé Camelot (ex: "5A"). */
function signalToCamelotKey(
  key: string | null,
  scale: string | null
): string | null {
  if (!key) return null;
  const suffix = scale === "minor" ? " minor" : scale === "major" ? " major" : "";
  return toCamelotKey(`${key}${suffix}`);
}

export function audioFeaturesToDbFields(features: AudioFeatures) {
  return {
    detected_style: features.detectedStyle,
    energy_level: features.energyLevel,
    audio_bpm: features.detectedBpm,
    audio_energy: features.energy,
    audio_features: {
      brightness: features.brightness,
      bassPresence: features.bassPresence,
      dynamicRange: features.dynamicRange,
      styleConfidence: features.styleConfidence,
      analyzedSeconds: features.analyzedSeconds,
      analysisEngine: features.analysisEngine ?? "heuristic",
      mlTopTags: features.mlTopTags ?? [],
      mlAmbiances: features.mlAmbiances ?? [],
      discogsGenre: features.discogsGenre ?? null,
      discogsTopGenres: features.discogsTopGenres ?? [],
      essentiaBpmConfidence: features.essentiaBpmConfidence ?? null,
      essentiaLoudness: features.essentiaLoudness ?? null,
    },
    audio_analyzed_at: new Date().toISOString(),
  };
}