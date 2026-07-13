import type { DecodedAudio } from "@/lib/audio/decode";
import {
  extractAudioFeatures,
  type AudioFeatures,
  type EnergyLevel,
} from "@/lib/audio/extract-features";
import {
  downsampleTo16k,
  getEssentiaRuntime,
  sliceChannel,
} from "@/lib/audio/essentia-runtime";
import { predictDiscogsFromMelFeatures } from "@/lib/audio/ml-discogs-effnet";
import { predictMusicnnFromMelFeatures } from "@/lib/audio/ml-musicnn";
import type { MlTagScore } from "@/lib/audio/map-ml-tags";
import type { MusicAmbiance } from "@/lib/ai/classify-ambiance";

const MAX_ANALYSIS_SECONDS = 90;

export type EssentiaSignalAnalysis = {
  bpm: number | null;
  bpmConfidence: number;
  key: string | null;
  scale: string | null;
  keyStrength: number;
  loudness: number | null;
};

function reconcileBpm(
  essentiaBpm: number | null,
  essentiaConfidence: number,
  tagBpm: number | null | undefined,
  fallbackBpm: number | null
): number | null {
  if (essentiaBpm != null && essentiaConfidence >= 0.35) {
    if (tagBpm == null) return essentiaBpm;
    if (Math.abs(essentiaBpm - tagBpm) <= 3) return tagBpm;
    if (Math.abs(essentiaBpm / tagBpm - 2) < 0.06) return tagBpm;
    if (Math.abs(essentiaBpm / tagBpm - 0.5) < 0.06) return tagBpm;
    return essentiaBpm;
  }
  return tagBpm ?? fallbackBpm ?? essentiaBpm;
}

function loudnessToEnergy(loudness: number | null): number | null {
  if (loudness == null) return null;
  const normalized = Math.round(((loudness + 36) / 31) * 100);
  return Math.max(0, Math.min(100, normalized));
}

function mergeEnergyLevel(
  heuristic: EnergyLevel,
  ml: EnergyLevel | undefined,
  loudnessEnergy: number | null
): EnergyLevel {
  if (ml) return ml;
  if (loudnessEnergy != null) {
    if (loudnessEnergy < 40) return "low";
    if (loudnessEnergy < 68) return "medium";
    return "high";
  }
  return heuristic;
}

function mergeAmbiances(
  discogs: MusicAmbiance[] | undefined,
  musicnn: string[] | undefined
): string[] | undefined {
  const set = new Set<string>();
  for (const a of discogs ?? []) set.add(a);
  for (const a of musicnn ?? []) set.add(a);
  return set.size > 0 ? [...set].slice(0, 3) : undefined;
}

function resolveAnalysisEngine(
  hasDiscogs: boolean,
  hasMusicnn: boolean
): AudioFeatures["analysisEngine"] {
  if (hasDiscogs) return "essentia+discogs";
  if (hasMusicnn) return "essentia+musicnn";
  return "essentia";
}

export async function extractAdvancedAudioFeatures(
  decoded: DecodedAudio,
  tagBpm?: number | null
): Promise<{
  features: AudioFeatures;
  signal: EssentiaSignalAnalysis;
  mlTopTags: MlTagScore[];
}> {
  const heuristic = extractAudioFeatures(decoded, tagBpm);
  const analyzedSeconds = Math.min(
    decoded.durationSeconds,
    MAX_ANALYSIS_SECONDS
  );

  let signal: EssentiaSignalAnalysis = {
    bpm: null,
    bpmConfidence: 0,
    key: null,
    scale: null,
    keyStrength: 0,
    loudness: null,
  };

  let mlTopTags: MlTagScore[] = [];
  let mlStyle = heuristic.detectedStyle;
  let mlStyleConfidence = heuristic.styleConfidence;
  let mlEnergyLevel = heuristic.energyLevel;
  let mlAmbiances: string[] | undefined;
  let discogsGenre: string | null = null;
  let discogsTopGenres: MlTagScore[] = [];
  let hasDiscogs = false;
  let hasMusicnn = false;

  try {
    const { essentia, extractor } = await getEssentiaRuntime();
    const sliced = sliceChannel(
      decoded.channel,
      decoded.sampleRate,
      MAX_ANALYSIS_SECONDS
    );
    const vector = essentia.arrayToVector(sliced);

    const rhythm = essentia.RhythmExtractor2013(vector);
    signal = {
      bpm: rhythm.bpm ?? null,
      bpmConfidence: rhythm.confidence ?? 0,
      key: null,
      scale: null,
      keyStrength: 0,
      loudness: null,
    };

    try {
      const keyResult = essentia.KeyExtractor(vector);
      signal.key = keyResult.key ?? null;
      signal.scale = keyResult.scale ?? null;
      signal.keyStrength = keyResult.strength ?? 0;
    } catch {
      // Key detection can fail on short/noisy excerpts
    }

    try {
      const loudness = essentia.LoudnessEBUR128(
        vector,
        vector,
        256,
        decoded.sampleRate
      );
      signal.loudness =
        loudness.integratedLoudness ?? loudness.loudness ?? null;
    } catch {
      // Loudness optional on short excerpts
    }

    const mono16k = downsampleTo16k(sliced, decoded.sampleRate);
    const melFeatures = extractor.computeFrameWise(mono16k);
    const melInput = {
      melSpectrum: melFeatures.melSpectrum,
      frameSize: melFeatures.frameSize,
      melBandsSize: melFeatures.melBandsSize,
    };

    const [discogs, musicnn] = await Promise.all([
      predictDiscogsFromMelFeatures(melInput),
      predictMusicnnFromMelFeatures(melInput),
    ]);

    if (discogs) {
      hasDiscogs = true;
      discogsGenre = discogs.discogsGenre;
      discogsTopGenres = discogs.topGenres;
      mlStyle = discogs.style;
      mlStyleConfidence = discogs.styleConfidence;
      mlEnergyLevel = discogs.energyLevel;
      mlAmbiances = mergeAmbiances(discogs.ambiances, undefined);
    }

    if (musicnn) {
      hasMusicnn = true;
      mlTopTags = musicnn.topTags;

      if (!discogs || discogs.styleConfidence === "low") {
        if (musicnn.styleConfidence !== "low") {
          mlStyle = musicnn.style;
          mlStyleConfidence = musicnn.styleConfidence;
        }
      }

      if (!discogs) {
        mlEnergyLevel = musicnn.energyLevel;
      }

      mlAmbiances = mergeAmbiances(
        discogs?.ambiances,
        musicnn.ambiances
      );
    }
  } catch (error) {
    console.warn("Advanced audio analysis failed, using heuristics:", error);
  }

  const loudnessEnergy = loudnessToEnergy(signal.loudness);
  const detectedBpm = reconcileBpm(
    signal.bpm,
    signal.bpmConfidence,
    tagBpm ?? null,
    heuristic.detectedBpm
  );

  const energy =
    loudnessEnergy != null
      ? Math.round(heuristic.energy * 0.35 + loudnessEnergy * 0.65)
      : heuristic.energy;

  const features: AudioFeatures = {
    detectedBpm,
    energy,
    energyLevel: mergeEnergyLevel(
      heuristic.energyLevel,
      mlEnergyLevel,
      loudnessEnergy
    ),
    brightness: heuristic.brightness,
    bassPresence: heuristic.bassPresence,
    dynamicRange: heuristic.dynamicRange,
    detectedStyle: mlStyle,
    styleConfidence: mlStyleConfidence,
    analyzedSeconds: Math.round(analyzedSeconds),
    analysisEngine: resolveAnalysisEngine(hasDiscogs, hasMusicnn),
    mlTopTags,
    mlAmbiances,
    discogsGenre,
    discogsTopGenres,
    essentiaBpmConfidence: signal.bpmConfidence,
    essentiaLoudness: signal.loudness,
  };

  return { features, signal, mlTopTags };
}
