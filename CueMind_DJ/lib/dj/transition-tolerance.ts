export type TransitionTolerance = "strict" | "balanced" | "daring";

export type ToleranceConfig = {
  maxBpmDeltaSoft: number;
  maxBpmDeltaHard: number;
  keyCompatWeight: number;
  keyIncompatPenalty: number;
  sameStyleBonus: number;
  crossGenreBonus: number;
  minAcceptableScore: number;
};

export const TRANSITION_TOLERANCE_OPTIONS: {
  value: TransitionTolerance;
  label: string;
  description: string;
}[] = [
  {
    value: "strict",
    label: "Harmonique",
    description: "Clé Camelot compatible · BPM ±3 max",
  },
  {
    value: "balanced",
    label: "Équilibré",
    description: "Transitions fluides avec quelques écarts BPM (±6)",
  },
  {
    value: "daring",
    label: "Audacieux",
    description: "Cross-genre et sauts d'énergie autorisés (±12 BPM)",
  },
];

export const TOLERANCE_CONFIGS: Record<TransitionTolerance, ToleranceConfig> = {
  strict: {
    maxBpmDeltaSoft: 3,
    maxBpmDeltaHard: 3,
    keyCompatWeight: 4,
    keyIncompatPenalty: 5,
    sameStyleBonus: 1,
    crossGenreBonus: 0,
    minAcceptableScore: 3,
  },
  balanced: {
    maxBpmDeltaSoft: 3,
    maxBpmDeltaHard: 6,
    keyCompatWeight: 3,
    keyIncompatPenalty: 1,
    sameStyleBonus: 1,
    crossGenreBonus: 0,
    minAcceptableScore: 0,
  },
  daring: {
    maxBpmDeltaSoft: 6,
    maxBpmDeltaHard: 12,
    keyCompatWeight: 2,
    keyIncompatPenalty: 0,
    sameStyleBonus: 0,
    crossGenreBonus: 2,
    minAcceptableScore: -2,
  },
};

export const BPM_DELTA_RANGE = { min: 1, max: 20 } as const;

export function getToleranceConfig(
  tolerance: TransitionTolerance = "balanced",
  maxBpmDelta?: number | null
): ToleranceConfig {
  const base = TOLERANCE_CONFIGS[tolerance];
  if (maxBpmDelta == null) return base;

  const hard = Math.min(
    BPM_DELTA_RANGE.max,
    Math.max(BPM_DELTA_RANGE.min, Math.round(maxBpmDelta))
  );
  return {
    ...base,
    maxBpmDeltaHard: hard,
    maxBpmDeltaSoft: Math.min(base.maxBpmDeltaSoft, hard),
  };
}

export function getTransitionQualityForTolerance(
  score: number,
  tolerance: TransitionTolerance = "balanced"
): "success" | "warning" | "danger" {
  const thresholds = {
    strict: { success: 5, warning: 3 },
    balanced: { success: 4, warning: 2 },
    daring: { success: 3, warning: 0 },
  }[tolerance];

  if (score >= thresholds.success) return "success";
  if (score >= thresholds.warning) return "warning";
  return "danger";
}
