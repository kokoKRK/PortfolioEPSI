import type { MusicAmbiance } from "@/lib/ai/classify-ambiance";
import type { MusicStyle } from "@/lib/ai/classify-style";
import type { EnergyLevel } from "@/lib/audio/extract-features";
import { getMusicnnModelPath } from "@/lib/audio/model-paths";
import { MSD_MUSICNN_LABELS } from "@/lib/audio/msd-musicnn-labels";

export type MlTagScore = {
  tag: string;
  score: number;
};

export type MlInterpretation = {
  style: MusicStyle;
  styleConfidence: "high" | "medium" | "low";
  ambiances: MusicAmbiance[];
  energyLevel: EnergyLevel;
  topTags: MlTagScore[];
};

const STYLE_TAG_WEIGHTS: Record<MusicStyle, Record<string, number>> = {
  House: {
    House: 3,
    dance: 2,
    electro: 1.5,
    electronica: 1.5,
    electronic: 1,
    party: 1,
    funk: 1,
  },
  Techno: {
    electro: 2.5,
    electronic: 2,
    electronica: 1.5,
    dance: 1.5,
    instrumental: 1,
    experimental: 1,
  },
  Trance: {
    electronic: 2,
    electronica: 2,
    dance: 1.5,
    "Progressive rock": 1,
    beautiful: 0.5,
  },
  "Drum & Bass": {
    electronic: 1.5,
    dance: 1,
  },
  Dubstep: {
    electronic: 2,
    electro: 2,
    experimental: 1,
    "heavy metal": 0.5,
  },
  "Hip-Hop": {
    "Hip-Hop": 3,
    rnb: 1,
    funk: 1,
  },
  "R&B": {
    rnb: 3,
    soul: 2.5,
    sexy: 1,
    Mellow: 1,
  },
  Pop: {
    pop: 3,
    catchy: 2,
    dance: 1,
    "indie pop": 2,
  },
  Rock: {
    rock: 3,
    "alternative rock": 2,
    "classic rock": 2,
    "hard rock": 2,
    metal: 1.5,
    punk: 2,
  },
  Reggae: {},
  Latino: {
    dance: 1,
  },
  Afrobeat: {
    funk: 1.5,
    dance: 1.5,
  },
  Disco: {
    dance: 2.5,
    funk: 2,
    party: 1.5,
    "70s": 1,
  },
  Funk: {
    funk: 3,
    dance: 1.5,
    soul: 1.5,
    party: 1,
  },
  Ambient: {
    ambient: 3,
    chillout: 2.5,
    chill: 2.5,
    Mellow: 2,
    instrumental: 1.5,
    beautiful: 1,
    experimental: 1,
  },
  Other: {},
};

const AMBIANCE_TAG_WEIGHTS: Record<MusicAmbiance, Record<string, number>> = {
  Énergique: {
    dance: 2,
    party: 2.5,
    electronic: 1,
    electro: 1.5,
    happy: 1,
    catchy: 1,
  },
  Chill: {
    chill: 3,
    chillout: 3,
    Mellow: 2.5,
    ambient: 2,
    beautiful: 1,
    "easy listening": 1.5,
  },
  Festif: {
    party: 3,
    dance: 2.5,
    happy: 2,
    catchy: 1.5,
    House: 1,
  },
  Sombre: {
    sad: 3,
    blues: 1.5,
    experimental: 1,
    metal: 1,
  },
  Romantique: {
    beautiful: 2,
    sexy: 2,
    soul: 1.5,
    Mellow: 1,
  },
  Nostalgique: {
    oldies: 2.5,
    "60s": 2,
    "70s": 2,
    "80s": 2,
    "90s": 1.5,
    "00s": 1.5,
    "classic rock": 1,
  },
  Agressif: {
    metal: 2.5,
    "heavy metal": 3,
    punk: 2,
    "hard rock": 2,
    electro: 1,
  },
  Hypnotique: {
    electronic: 2,
    electronica: 2,
    ambient: 1.5,
    instrumental: 1.5,
    experimental: 1,
  },
  Uplifting: {
    happy: 2.5,
    dance: 2,
    party: 1.5,
    catchy: 1.5,
  },
  Groove: {
    funk: 2.5,
    dance: 2,
    House: 1.5,
    groovy: 0,
  },
  Dansant: {
    dance: 3,
    House: 2,
    electro: 1.5,
    party: 2,
    funk: 1.5,
  },
  Mélancolique: {
    sad: 3,
    Mellow: 2,
    blues: 1.5,
    chill: 1,
  },
};

function scoreFromWeights(
  activations: Map<string, number>,
  weights: Record<string, number>
): number {
  let score = 0;
  for (const [tag, weight] of Object.entries(weights)) {
    const key = tag.toLowerCase();
    for (const [label, value] of activations) {
      if (label.toLowerCase() === key) {
        score += value * weight;
      }
    }
  }
  return score;
}

export function interpretMusicnnActivations(
  activationVector: number[]
): MlInterpretation {
  const activations = new Map<string, number>();
  for (let i = 0; i < MSD_MUSICNN_LABELS.length; i++) {
    activations.set(MSD_MUSICNN_LABELS[i], activationVector[i] ?? 0);
  }

  const topTags = [...activations.entries()]
    .map(([tag, score]) => ({ tag, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const styleScores = (
    Object.keys(STYLE_TAG_WEIGHTS) as MusicStyle[]
  ).map((style) => ({
    style,
    score: scoreFromWeights(activations, STYLE_TAG_WEIGHTS[style]),
  }));
  styleScores.sort((a, b) => b.score - a.score);

  const topStyle = styleScores[0];
  const secondStyle = styleScores[1]?.score ?? 0;
  const margin = (topStyle?.score ?? 0) - secondStyle;

  let styleConfidence: MlInterpretation["styleConfidence"] = "low";
  if ((topStyle?.score ?? 0) >= 0.45 && margin >= 0.12) {
    styleConfidence = "high";
  } else if ((topStyle?.score ?? 0) >= 0.28 && margin >= 0.06) {
    styleConfidence = "medium";
  }

  const ambianceScores = (
    Object.keys(AMBIANCE_TAG_WEIGHTS) as MusicAmbiance[]
  ).map((ambiance) => ({
    ambiance,
    score: scoreFromWeights(activations, AMBIANCE_TAG_WEIGHTS[ambiance]),
  }));
  ambianceScores.sort((a, b) => b.score - a.score);

  const ambiances = ambianceScores
    .filter((a) => a.score > 0.15)
    .slice(0, 3)
    .map((a) => a.ambiance);

  const chillScore =
    (activations.get("chill") ?? 0) +
    (activations.get("chillout") ?? 0) +
    (activations.get("Mellow") ?? 0);
  const energyScore =
    (activations.get("dance") ?? 0) +
    (activations.get("party") ?? 0) +
    (activations.get("electro") ?? 0) +
    (activations.get("electronic") ?? 0);

  let energyLevel: EnergyLevel = "medium";
  if (chillScore > energyScore + 0.15) energyLevel = "low";
  else if (energyScore > chillScore + 0.12) energyLevel = "high";

  return {
    style: topStyle?.style ?? "Other",
    styleConfidence,
    ambiances,
    energyLevel,
    topTags,
  };
}

export function getModelPaths() {
  return { onnx: getMusicnnModelPath() };
}
