import { trackMatchesAmbianceFilter } from "@/lib/ai/classify-ambiance";
import type { PhaseAssignments } from "@/lib/ai/assign-tracks-to-phases";
import { scoreTrackForPhase, isTrackEligibleForPhase } from "@/lib/dj/phase-scoring";
import type { SetPlan } from "@/lib/dj/set-plan";
import { areKeysCompatible } from "@/lib/dj/camelot";
import {
  getToleranceConfig,
  getTransitionQualityForTolerance,
  type TransitionTolerance,
} from "@/lib/dj/transition-tolerance";
import type { GeneratedSetTrack, Track } from "@/types/database";

const MIN_TRACKS = 3;
const DEFAULT_TRACK_DURATION_SECONDS = 210;
/** Score rédhibitoire : transition au-delà de l'écart BPM maximal autorisé. */
const HARD_BPM_DISQUALIFY = -100;

/** Réglages de transition résolus, threadés dans tout le générateur. */
type TransitionSettings = {
  tolerance: TransitionTolerance;
  maxBpmDelta?: number | null;
};

const DEFAULT_SETTINGS: TransitionSettings = { tolerance: "balanced" };

export type SetGeneratorOptions = {
  /** Styles dans l'ordre souhaité du set (ex: Hip-Hop → Pop → House) */
  styleOrder?: string[];
  /** Filtre ambiances — le morceau doit matcher au moins une ambiance */
  ambiances?: string[];
  targetDurationMinutes?: number;
  /** Prise de risque des transitions (BPM + clé) */
  transitionTolerance?: TransitionTolerance;
  /** Écart BPM max personnalisé entre deux morceaux (override de la tolérance) */
  maxBpmDelta?: number | null;
};

type ScoreResult = {
  track: Track;
  score: number;
};

export function estimateTrackDurationSeconds(track: Track): number {
  return track.duration_seconds ?? DEFAULT_TRACK_DURATION_SECONDS;
}

export function filterTracksForSet(
  tracks: Track[],
  options: SetGeneratorOptions
): Track[] {
  let filtered = tracks.filter((t) => t.bpm != null);

  if (options.styleOrder && options.styleOrder.length > 0) {
    const styleSet = new Set(options.styleOrder.map((s) => s.toLowerCase()));
    filtered = filtered.filter(
      (t) => t.style && styleSet.has(t.style.toLowerCase())
    );
  }

  if (options.ambiances && options.ambiances.length > 0) {
    filtered = filtered.filter((t) =>
      trackMatchesAmbianceFilter(t, options.ambiances!)
    );
  }

  return filtered;
}

export function scoreTransition(
  current: Track,
  candidate: Track,
  options?: {
    preferStyle?: string;
    tolerance?: TransitionTolerance;
    maxBpmDelta?: number | null;
  }
): number {
  let score = 0;
  const { preferStyle, tolerance = "balanced", maxBpmDelta } = options ?? {};
  const config = getToleranceConfig(tolerance, maxBpmDelta);

  if (current.bpm != null && candidate.bpm != null) {
    const delta = Math.abs(current.bpm - candidate.bpm);
    if (delta > config.maxBpmDeltaHard) {
      // Au-delà de la limite dure, la transition est disqualifiée : aucun bonus
      // de clé ou de style ne doit rattraper un écart de BPM trop important.
      return HARD_BPM_DISQUALIFY;
    }
    if (delta <= config.maxBpmDeltaSoft) score += 3;
    else score += 1;
  }

  const keyCompat = areKeysCompatible(current.key, candidate.key);
  if (keyCompat === true) score += config.keyCompatWeight;
  else if (keyCompat === false) score -= config.keyIncompatPenalty;

  const sameStyle =
    current.style &&
    candidate.style &&
    current.style.toLowerCase() === candidate.style.toLowerCase();

  if (sameStyle) {
    score += config.sameStyleBonus;
  } else if (config.crossGenreBonus > 0 && current.style && candidate.style) {
    score += config.crossGenreBonus;
  }

  if (
    preferStyle &&
    candidate.style?.toLowerCase() === preferStyle.toLowerCase()
  ) {
    score += 2;
  }

  if (current.ambiances?.length && candidate.ambiances?.length) {
    const shared = current.ambiances.filter((a) =>
      candidate.ambiances?.some((b) => b.toLowerCase() === a.toLowerCase())
    );
    if (shared.length > 0) score += 1;
  }

  return score;
}

function pickStartingTrack(tracks: Track[]): Track {
  const withBpm = [...tracks].sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0));
  return withBpm[0];
}

function greedyChainFromPool(
  pool: Track[],
  used: Set<string>,
  startFrom: Track | null,
  preferStyle: string | undefined,
  settings: TransitionSettings
): Track[] {
  const { tolerance, maxBpmDelta } = settings;
  const config = getToleranceConfig(tolerance, maxBpmDelta);
  const available = pool.filter((t) => !used.has(t.id));
  if (available.length === 0) return [];

  const chain: Track[] = [];
  let current: Track;

  if (startFrom && available.some((t) => t.id === startFrom.id)) {
    current = startFrom;
  } else if (startFrom) {
    let best: ScoreResult | null = null;
    for (const track of available) {
      const score = scoreTransition(startFrom, track, {
        preferStyle,
        tolerance,
        maxBpmDelta,
      });
      if (!best || score > best.score) best = { track, score };
    }
    current = best?.track ?? pickStartingTrack(available);
  } else {
    current = pickStartingTrack(available);
  }

  chain.push(current);
  used.add(current.id);

  while (true) {
    let best: ScoreResult | null = null;
    for (const track of available) {
      if (used.has(track.id)) continue;
      const score = scoreTransition(current, track, {
        preferStyle,
        tolerance,
        maxBpmDelta,
      });
      if (score < config.minAcceptableScore) continue;
      if (!best || score > best.score) best = { track, score };
    }
    if (!best) break;
    current = best.track;
    chain.push(current);
    used.add(current.id);
  }

  return chain;
}

function pickPhaseOpener(
  pool: Track[],
  phase: SetPlan["phases"][number],
  bridge: Track | null,
  settings: TransitionSettings
): Track {
  const { tolerance, maxBpmDelta } = settings;
  const config = getToleranceConfig(tolerance, maxBpmDelta);

  if (bridge) {
    let best: { track: Track; score: number } | null = null;
    for (const track of pool) {
      const score = scoreTransition(bridge, track, {
        preferStyle: phase.primaryStyles[0],
        tolerance,
        maxBpmDelta,
      });
      if (!best || score > best.score) best = { track, score };
    }
    if (best && best.score >= config.minAcceptableScore) return best.track;
  }

  const sorted = [...pool];
  if (phase.energy === "low") {
    sorted.sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0));
  } else if (phase.energy === "high") {
    sorted.sort((a, b) => (b.bpm ?? 0) - (a.bpm ?? 0));
  } else {
    sorted.sort((a, b) => (a.bpm ?? 0) - (b.bpm ?? 0));
  }
  return sorted[0];
}

function orderTracksInPhase(
  pool: Track[],
  phase: SetPlan["phases"][number],
  bridge: Track | null,
  targetSeconds: number,
  settings: TransitionSettings
): Track[] {
  if (pool.length === 0) return [];

  const { tolerance, maxBpmDelta } = settings;
  const used = new Set<string>();
  const result: Track[] = [];
  let current = pickPhaseOpener(pool, phase, bridge, settings);
  result.push(current);
  used.add(current.id);
  let totalSec = estimateTrackDurationSeconds(current);

  while (true) {
    let best: ScoreResult | null = null;
    for (const track of pool) {
      if (used.has(track.id)) continue;
      const fit = scoreTrackForPhase(track, phase);
      if (fit < 0) continue;
      const trans = scoreTransition(current, track, {
        preferStyle: phase.primaryStyles[0],
        tolerance,
        maxBpmDelta,
      });
      const combined = trans + fit * 0.3;
      if (!best || combined > best.score) best = { track, score: combined };
    }
    if (!best) break;
    const dur = estimateTrackDurationSeconds(best.track);
    if (result.length > 0 && totalSec + dur > targetSeconds) break;
    current = best.track;
    result.push(current);
    used.add(current.id);
    totalSec += dur;
  }

  return result;
}

function buildPhasePlaylist(
  allTracks: Track[],
  phase: SetPlan["phases"][number],
  used: Set<string>,
  bridge: Track | null,
  preselected: Track[] | undefined,
  settings: TransitionSettings
): Track[] {
  const targetSec = phase.durationMinutes * 60;

  let pool: Track[];
  if (preselected?.length) {
    pool = preselected
      .filter((t) => !used.has(t.id) && t.bpm != null)
      .filter((t) => scoreTrackForPhase(t, phase) >= 0);
  } else {
    const available = allTracks.filter((t) => !used.has(t.id) && t.bpm != null);
    pool = available
      .filter((t) => isTrackEligibleForPhase(t, phase))
      .sort(
        (a, b) => scoreTrackForPhase(b, phase) - scoreTrackForPhase(a, phase)
      );

    if (pool.length < 2) {
      pool = available
        .filter((t) => scoreTrackForPhase(t, phase) > 0)
        .sort(
          (a, b) => scoreTrackForPhase(b, phase) - scoreTrackForPhase(a, phase)
        )
        .slice(0, 15);
    }
  }

  if (pool.length === 0) return [];

  const result = orderTracksInPhase(pool, phase, bridge, targetSec, settings);
  for (const track of result) {
    used.add(track.id);
  }

  return result;
}

export async function generateSetFromPlan(
  tracks: Track[],
  plan: SetPlan,
  aiAssignments?: PhaseAssignments | null,
  transitionTolerance: TransitionTolerance = "balanced",
  maxBpmDelta?: number | null
): Promise<GeneratedSetTrack[]> {
  const settings: TransitionSettings = {
    tolerance: transitionTolerance,
    maxBpmDelta,
  };
  const eligible = tracks.filter((t) => t.bpm != null);

  if (plan.phases.length === 0) {
    return generateSetOrder(eligible, {
      targetDurationMinutes: plan.totalDurationMinutes,
      transitionTolerance,
      maxBpmDelta,
    });
  }

  if (eligible.length < MIN_TRACKS) {
    throw new Error(
      `Au moins ${MIN_TRACKS} morceaux avec un BPM sont nécessaires pour ce set.`
    );
  }

  const used = new Set<string>();
  const ordered: Track[] = [];
  let bridge: Track | null = null;

  for (let i = 0; i < plan.phases.length; i++) {
    const phase = plan.phases[i];
    const preselected = aiAssignments?.get(i);
    const phaseTracks = buildPhasePlaylist(
      eligible,
      phase,
      used,
      bridge,
      preselected,
      settings
    );
    ordered.push(...phaseTracks);
    bridge = ordered.at(-1) ?? bridge;
  }

  if (ordered.length < MIN_TRACKS) {
    const remaining = eligible.filter((t) => !used.has(t.id));
    ordered.push(
      ...greedyChainFromPool(remaining, used, bridge, undefined, settings)
    );
  }

  const targetSec = plan.totalDurationMinutes * 60;
  const trimmed: Track[] = [];
  let totalSec = 0;
  for (const track of ordered) {
    const dur = estimateTrackDurationSeconds(track);
    if (trimmed.length >= MIN_TRACKS && totalSec + dur > targetSec) break;
    trimmed.push(track);
    totalSec += dur;
  }

  const finalOrder =
    trimmed.length >= MIN_TRACKS ? trimmed : ordered.slice(0, MIN_TRACKS);

  return annotateSet(finalOrder, settings);
}

function generatePhasedSet(
  eligible: Track[],
  styleOrder: string[],
  settings: TransitionSettings
): Track[] {
  const used = new Set<string>();
  const ordered: Track[] = [];
  let bridge: Track | null = null;

  for (const style of styleOrder) {
    const pool = eligible.filter(
      (t) =>
        !used.has(t.id) && t.style?.toLowerCase() === style.toLowerCase()
    );
    if (pool.length === 0) continue;

    const phase = greedyChainFromPool(pool, used, bridge, style, settings);
    ordered.push(...phase);
    bridge = ordered.at(-1) ?? bridge;
  }

  const remaining = eligible.filter((t) => !used.has(t.id));
  if (remaining.length > 0) {
    ordered.push(
      ...greedyChainFromPool(remaining, used, bridge, undefined, settings)
    );
  }

  return ordered;
}

function trimToTargetDuration(
  ordered: Track[],
  targetDurationMinutes: number
): Track[] {
  const targetSeconds = targetDurationMinutes * 60;
  const trimmed: Track[] = [];
  let totalSeconds = 0;

  for (const track of ordered) {
    const duration = estimateTrackDurationSeconds(track);
    if (
      trimmed.length >= MIN_TRACKS &&
      totalSeconds + duration > targetSeconds
    ) {
      break;
    }
    trimmed.push(track);
    totalSeconds += duration;
  }

  return trimmed.length >= MIN_TRACKS ? trimmed : ordered.slice(0, MIN_TRACKS);
}

function annotateSet(
  finalOrder: Track[],
  settings: TransitionSettings = DEFAULT_SETTINGS
): GeneratedSetTrack[] {
  const { tolerance, maxBpmDelta } = settings;
  return finalOrder.map((track, index) => {
    const prev = index > 0 ? finalOrder[index - 1] : null;
    const bpmDelta =
      prev && prev.bpm != null && track.bpm != null
        ? Math.round((track.bpm - prev.bpm) * 100) / 100
        : null;
    const keyCompatible = prev
      ? areKeysCompatible(prev.key, track.key)
      : null;

    let transitionScore = 0;
    if (prev) {
      transitionScore = scoreTransition(prev, track, { tolerance, maxBpmDelta });
    }

    return {
      ...track,
      position: index + 1,
      bpmDelta,
      keyCompatible,
      transitionScore,
    };
  });
}

export function generateSetOrder(
  tracks: Track[],
  options: SetGeneratorOptions = {}
): GeneratedSetTrack[] {
  const eligible = filterTracksForSet(tracks, options);

  if (eligible.length < MIN_TRACKS) {
    const hints: string[] = [];
    if (options.styleOrder?.length) {
      hints.push(`styles: ${options.styleOrder.join(" → ")}`);
    }
    if (options.ambiances?.length) {
      hints.push(`ambiances: ${options.ambiances.join(", ")}`);
    }
    const hint = hints.length > 0 ? ` (${hints.join(" · ")})` : "";
    throw new Error(
      `Au moins ${MIN_TRACKS} morceaux avec un BPM sont nécessaires${hint}.`
    );
  }

  const settings: TransitionSettings = {
    tolerance: options.transitionTolerance ?? "balanced",
    maxBpmDelta: options.maxBpmDelta,
  };

  let ordered: Track[];

  if (options.styleOrder && options.styleOrder.length > 0) {
    ordered = generatePhasedSet(eligible, options.styleOrder, settings);
  } else {
    const used = new Set<string>();
    ordered = greedyChainFromPool(eligible, used, null, undefined, settings);
  }

  const finalOrder =
    options.targetDurationMinutes != null
      ? trimToTargetDuration(ordered, options.targetDurationMinutes)
      : ordered;

  return annotateSet(finalOrder, settings);
}

export function getTransitionQuality(
  score: number,
  tolerance: TransitionTolerance = "balanced"
): "success" | "warning" | "danger" {
  return getTransitionQualityForTolerance(score, tolerance);
}

export function estimateSetDurationMinutes(tracks: Track[]): number {
  const totalSeconds = tracks.reduce(
    (sum, t) => sum + estimateTrackDurationSeconds(t),
    0
  );
  return Math.round(totalSeconds / 60);
}
