import {
  MUSIC_STYLES,
  normalizeStyleLabel,
  type MusicStyle,
} from "@/lib/ai/classify-style";
import type { DecodedAudio } from "@/lib/audio/decode";

export type EnergyLevel = "low" | "medium" | "high";

export type AudioFeatures = {
  detectedBpm: number | null;
  energy: number;
  energyLevel: EnergyLevel;
  brightness: number;
  bassPresence: number;
  dynamicRange: number;
  detectedStyle: MusicStyle;
  styleConfidence: "high" | "medium" | "low";
  analyzedSeconds: number;
  analysisEngine?: "heuristic" | "essentia" | "essentia+musicnn" | "essentia+discogs";
  mlTopTags?: { tag: string; score: number }[];
  mlAmbiances?: string[];
  discogsGenre?: string | null;
  discogsTopGenres?: { tag: string; score: number }[];
  essentiaBpmConfidence?: number;
  essentiaLoudness?: number | null;
};

const TARGET_SAMPLE_RATE = 11025;
const MAX_ANALYSIS_SECONDS = 90;
const FRAME_SIZE = 2048;
const HOP_SIZE = 512;

function downsample(
  channel: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate <= toRate) return channel;
  const ratio = fromRate / toRate;
  const outLen = Math.floor(channel.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    out[i] = channel[Math.floor(i * ratio)] ?? 0;
  }
  return out;
}

function sliceForAnalysis(
  samples: Float32Array,
  sampleRate: number,
  maxSeconds: number
): Float32Array {
  const maxSamples = Math.min(samples.length, Math.floor(sampleRate * maxSeconds));
  return samples.subarray(0, maxSamples);
}

function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function lowPass(samples: Float32Array, windowSize: number): Float32Array {
  const out = new Float32Array(samples.length);
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    acc += samples[i];
    if (i >= windowSize) acc -= samples[i - windowSize];
    const denom = Math.min(i + 1, windowSize);
    out[i] = acc / denom;
  }
  return out;
}

function computeOnsetEnvelope(samples: Float32Array): Float32Array {
  const numFrames = Math.max(
    0,
    Math.floor((samples.length - FRAME_SIZE) / HOP_SIZE)
  );
  const envelope = new Float32Array(numFrames);
  let prevEnergy = 0;

  for (let f = 0; f < numFrames; f++) {
    const start = f * HOP_SIZE;
    let energy = 0;
    for (let i = 0; i < FRAME_SIZE; i++) {
      const s = samples[start + i] ?? 0;
      energy += s * s;
    }
    energy = Math.sqrt(energy / FRAME_SIZE);
    envelope[f] = Math.max(0, energy - prevEnergy);
    prevEnergy = energy;
  }

  let max = 0;
  for (let i = 0; i < envelope.length; i++) {
    max = Math.max(max, envelope[i]);
  }
  if (max > 0) {
    for (let i = 0; i < envelope.length; i++) {
      envelope[i] /= max;
    }
  }

  return envelope;
}

function estimateBpmFromEnvelope(
  envelope: Float32Array,
  sampleRate: number
): number | null {
  if (envelope.length < 32) return null;

  const hopSeconds = HOP_SIZE / sampleRate;
  const minBpm = 70;
  const maxBpm = 180;
  const minLag = Math.max(2, Math.floor(60 / (maxBpm * hopSeconds)));
  const maxLag = Math.min(
    envelope.length - 1,
    Math.ceil(60 / (minBpm * hopSeconds))
  );

  let bestLag = 0;
  let bestCorr = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    let count = 0;
    for (let i = 0; i < envelope.length - lag; i++) {
      corr += envelope[i] * envelope[i + lag];
      count++;
    }
    if (count === 0) continue;
    corr /= count;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag === 0 || bestCorr < 0.08) return null;

  let bpm = 60 / (bestLag * hopSeconds);
  while (bpm < minBpm) bpm *= 2;
  while (bpm > maxBpm) bpm /= 2;

  return Math.round(bpm * 100) / 100;
}

function reconcileBpm(
  detected: number | null,
  tagBpm: number | null | undefined
): number | null {
  if (detected == null) return tagBpm ?? null;
  if (tagBpm == null) return detected;

  const ratio = detected / tagBpm;
  if (Math.abs(detected - tagBpm) <= 2) return tagBpm;
  if (Math.abs(ratio - 2) < 0.06 || Math.abs(ratio - 0.5) < 0.06) {
    return tagBpm;
  }
  if (Math.abs(detected - tagBpm) <= 5) return tagBpm;

  return detected;
}

function energyLevelFromScore(energy: number): EnergyLevel {
  if (energy < 40) return "low";
  if (energy < 68) return "medium";
  return "high";
}

type StyleScore = { style: MusicStyle; score: number };

function scoreStyles(
  bpm: number,
  energy: number,
  brightness: number,
  bass: number
): StyleScore[] {
  const scores: StyleScore[] = [];

  const add = (style: MusicStyle, score: number) => {
    scores.push({ style, score });
  };

  if (energy < 32) {
    add("Ambient", 18 + (40 - energy) * 0.3);
  }

  if (bpm >= 158) {
    add("Drum & Bass", 14 + Math.min(8, (bpm - 158) * 0.5));
  }

  if (bpm >= 124 && bpm <= 150 && energy >= 58 && bass >= 48) {
    add("Techno", 12 + (energy - 50) * 0.2 + (bpm >= 128 ? 3 : 0));
  }

  if (bpm >= 118 && bpm <= 132 && energy >= 38 && energy <= 78) {
    add("House", 11 + (bpm >= 120 && bpm <= 128 ? 4 : 0));
  }

  if (bpm >= 128 && bpm <= 145 && brightness >= 52 && energy >= 50) {
    add("Trance", 10);
  }

  if (bpm >= 132 && bpm <= 150 && bass >= 62 && energy >= 55) {
    add("Dubstep", 9);
  }

  if ((bpm >= 68 && bpm <= 108) || (bpm >= 128 && bpm <= 145 && bass >= 55)) {
    add("Hip-Hop", 8 + (bass >= 50 ? 3 : 0));
  }

  if (bpm >= 108 && bpm <= 124 && energy >= 42 && energy <= 70) {
    add("Disco", 7);
    add("Funk", 6);
  }

  if (bpm >= 90 && bpm <= 118 && energy < 55) {
    add("R&B", 6);
    add("Pop", 5);
  }

  if (energy >= 45 && energy <= 72 && bpm >= 115 && bpm <= 128) {
    add("Afrobeat", 7);
  }

  return scores.sort((a, b) => b.score - a.score);
}

function inferStyleFromSignal(
  bpm: number | null,
  energy: number,
  brightness: number,
  bass: number
): { style: MusicStyle; confidence: "high" | "medium" | "low" } {
  if (bpm == null) {
    if (energy < 35) return { style: "Ambient", confidence: "medium" };
    return { style: "Other", confidence: "low" };
  }

  const ranked = scoreStyles(bpm, energy, brightness, bass);
  if (ranked.length === 0) {
    return { style: "Other", confidence: "low" };
  }

  const top = ranked[0];
  const second = ranked[1]?.score ?? 0;
  const margin = top.score - second;

  if (top.score >= 14 && margin >= 4) {
    return { style: top.style, confidence: "high" };
  }
  if (top.score >= 10 && margin >= 2) {
    return { style: top.style, confidence: "medium" };
  }

  return { style: top.style, confidence: "low" };
}

export function extractAudioFeatures(
  decoded: DecodedAudio,
  tagBpm?: number | null
): AudioFeatures {
  const analyzedSeconds = Math.min(
    decoded.durationSeconds,
    MAX_ANALYSIS_SECONDS
  );
  const sliced = sliceForAnalysis(
    decoded.channel,
    decoded.sampleRate,
    MAX_ANALYSIS_SECONDS
  );
  const samples = downsample(sliced, decoded.sampleRate, TARGET_SAMPLE_RATE);

  const overallRms = rms(samples);
  const energy = Math.min(100, Math.round(overallRms * 420));

  const bassWindow = Math.max(8, Math.floor(TARGET_SAMPLE_RATE * 0.02));
  const low = lowPass(samples, bassWindow);
  const bassRms = rms(low);
  const bassPresence = Math.min(
    100,
    Math.round((bassRms / Math.max(overallRms, 0.0001)) * 55)
  );

  let highSum = 0;
  for (let i = 1; i < samples.length; i++) {
    const diff = samples[i] - samples[i - 1];
    highSum += diff * diff;
  }
  const highRms = Math.sqrt(highSum / Math.max(1, samples.length - 1));
  const brightness = Math.min(
    100,
    Math.round((highRms / Math.max(overallRms, 0.0001)) * 48)
  );

  const blockCount = 24;
  const blockSize = Math.max(1, Math.floor(samples.length / blockCount));
  const blockEnergies: number[] = [];
  for (let b = 0; b < blockCount; b++) {
    const start = b * blockSize;
    const end = Math.min(start + blockSize, samples.length);
    blockEnergies.push(rms(samples.subarray(start, end)));
  }
  const minBlock = Math.min(...blockEnergies);
  const maxBlock = Math.max(...blockEnergies);
  const dynamicRange = Math.min(
    100,
    Math.round(((maxBlock - minBlock) / Math.max(maxBlock, 0.0001)) * 100)
  );

  const envelope = computeOnsetEnvelope(samples);
  const rawBpm = estimateBpmFromEnvelope(envelope, TARGET_SAMPLE_RATE);
  const detectedBpm = reconcileBpm(rawBpm, tagBpm ?? null);

  const effectiveBpm = detectedBpm ?? tagBpm ?? null;
  const { style, confidence } = inferStyleFromSignal(
    effectiveBpm,
    energy,
    brightness,
    bassPresence
  );

  const normalizedStyle = MUSIC_STYLES.includes(style)
    ? style
    : normalizeStyleLabel(style);

  return {
    detectedBpm,
    energy,
    energyLevel: energyLevelFromScore(energy),
    brightness,
    bassPresence,
    dynamicRange,
    detectedStyle: normalizedStyle,
    styleConfidence: confidence,
    analyzedSeconds: Math.round(analyzedSeconds),
  };
}
