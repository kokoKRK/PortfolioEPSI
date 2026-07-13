import type { MusicAmbiance } from "@/lib/ai/classify-ambiance";
import type { MusicStyle } from "@/lib/ai/classify-style";
import {
  formatDiscogsGenre,
  getDiscogsLabels,
} from "@/lib/audio/discogs-labels";
import type { EnergyLevel } from "@/lib/audio/extract-features";
import type { MlTagScore } from "@/lib/audio/map-ml-tags";

export type DiscogsInterpretation = {
  style: MusicStyle;
  styleConfidence: "high" | "medium" | "low";
  discogsGenre: string;
  discogsLabel: string;
  topGenres: MlTagScore[];
  ambiances: MusicAmbiance[];
  energyLevel: EnergyLevel;
};

const EXPLICIT_LABEL_STYLE: Record<string, MusicStyle> = {
  "Electronic---Acid House": "House",
  "Electronic---Deep House": "House",
  "Electronic---Electro House": "House",
  "Electronic---Euro House": "House",
  "Electronic---Funky House": "House",
  "Electronic---Future House": "House",
  "Electronic---Garage House": "House",
  "Electronic---Ghetto House": "House",
  "Electronic---Ghettotech": "House",
  "Electronic---Hard House": "House",
  "Electronic---Hip House": "House",
  "Electronic---House": "House",
  "Electronic---Progressive House": "House",
  "Electronic---Tech House": "House",
  "Electronic---Tropical House": "House",
  "Electronic---Acid": "Techno",
  "Electronic---Acid Techno": "Techno",
  "Electronic---Deep Techno": "Techno",
  "Electronic---Dub Techno": "Techno",
  "Electronic---Hard Techno": "Techno",
  "Electronic---Minimal": "Techno",
  "Electronic---Minimal Techno": "Techno",
  "Electronic---Schranz": "Techno",
  "Electronic---Techno": "Techno",
  "Electronic---Trance": "Trance",
  "Electronic---Goa Trance": "Trance",
  "Electronic---Hard Trance": "Trance",
  "Electronic---Progressive Trance": "Trance",
  "Electronic---Psy-Trance": "Trance",
  "Electronic---Drum n Bass": "Drum & Bass",
  "Electronic---Jungle": "Drum & Bass",
  "Electronic---Dubstep": "Dubstep",
  "Electronic---Grime": "Dubstep",
  "Electronic---Ambient": "Ambient",
  "Electronic---Chillwave": "Ambient",
  "Electronic---Dark Ambient": "Ambient",
  "Electronic---Downtempo": "Ambient",
  "Electronic---Illbient": "Ambient",
  "Electronic---Disco": "Disco",
  "Electronic---Euro-Disco": "Disco",
  "Electronic---Italo-Disco": "Disco",
  "Electronic---Nu-Disco": "Disco",
  "Electronic---Electro": "Techno",
  "Electronic---Hip Hop": "Hip-Hop",
  "Funk / Soul---Afrobeat": "Afrobeat",
  "Funk / Soul---Boogie": "Funk",
  "Funk / Soul---Disco": "Disco",
  "Funk / Soul---Funk": "Funk",
  "Funk / Soul---Contemporary R&B": "R&B",
  "Funk / Soul---Neo Soul": "R&B",
  "Funk / Soul---Soul": "R&B",
  "Hip Hop---Trap": "Hip-Hop",
  "Hip Hop---Boom Bap": "Hip-Hop",
  "Latin---Reggaeton": "Latino",
  "Reggae---Dancehall": "Reggae",
  "Reggae---Reggae": "Reggae",
  "Jazz---Afrobeat": "Afrobeat",
};

function styleFromDiscogsLabel(label: string): MusicStyle {
  if (EXPLICIT_LABEL_STYLE[label]) {
    return EXPLICIT_LABEL_STYLE[label];
  }

  const [parent, subRaw] = label.split("---");
  const sub = subRaw?.toLowerCase() ?? "";
  const parentLower = parent?.toLowerCase() ?? "";

  if (sub.includes("drum n bass") || sub.includes("jungle")) {
    return "Drum & Bass";
  }
  if (sub.includes("dubstep") || sub.includes("grime")) return "Dubstep";
  if (sub.includes("trance")) return "Trance";
  if (
    sub.includes("house") ||
    sub.includes("garage") ||
    sub === "uk garage"
  ) {
    return "House";
  }
  if (sub.includes("techno") || sub === "minimal" || sub.includes("schranz")) {
    return "Techno";
  }
  if (
    sub.includes("ambient") ||
    sub.includes("downtempo") ||
    sub.includes("chill")
  ) {
    return "Ambient";
  }
  if (sub.includes("disco")) return "Disco";
  if (sub.includes("funk")) return "Funk";
  if (parentLower === "hip hop") return "Hip-Hop";
  if (parentLower === "funk / soul") return "Funk";
  if (parentLower === "reggae") return "Reggae";
  if (parentLower.startsWith("latin")) return "Latino";
  if (parentLower === "pop") return "Pop";
  if (parentLower === "rock") return "Rock";
  if (parentLower === "electronic") return "Other";

  return "Other";
}

const LOW_ENERGY_KEYWORDS = [
  "ambient",
  "downtempo",
  "chill",
  "illbient",
  "deep house",
  "minimal",
  "trip hop",
];

const HIGH_ENERGY_KEYWORDS = [
  "hard techno",
  "schranz",
  "gabber",
  "hardcore",
  "hard house",
  "drum n bass",
  "jungle",
  "acid",
  "trance",
  "dancehall",
];

function energyFromTopLabels(labels: string[]): EnergyLevel {
  const joined = labels.join(" ").toLowerCase();
  const lowHits = LOW_ENERGY_KEYWORDS.filter((k) => joined.includes(k)).length;
  const highHits = HIGH_ENERGY_KEYWORDS.filter((k) => joined.includes(k)).length;
  if (lowHits > highHits && lowHits > 0) return "low";
  if (highHits > lowHits && highHits > 0) return "high";
  return "medium";
}

function ambiancesFromLabels(labels: string[]): MusicAmbiance[] {
  const joined = labels.join(" ").toLowerCase();
  const result: MusicAmbiance[] = [];

  const push = (a: MusicAmbiance) => {
    if (!result.includes(a)) result.push(a);
  };

  if (
    joined.includes("chill") ||
    joined.includes("ambient") ||
    joined.includes("downtempo") ||
    joined.includes("deep house")
  ) {
    push("Chill");
  }
  if (
    joined.includes("dance") ||
    joined.includes("house") ||
    joined.includes("disco") ||
    joined.includes("funk")
  ) {
    push("Dansant");
  }
  if (joined.includes("party") || joined.includes("euro house")) {
    push("Festif");
  }
  if (
    joined.includes("hard") ||
    joined.includes("gabber") ||
    joined.includes("schranz")
  ) {
    push("Agressif");
  }
  if (joined.includes("minimal") || joined.includes("dub techno")) {
    push("Hypnotique");
  }
  if (joined.includes("soul") || joined.includes("r&b")) {
    push("Romantique");
  }
  if (!result.includes("Énergique")) {
    push("Énergique");
  }

  return result.slice(0, 3);
}

export function interpretDiscogsActivations(
  activationVector: number[]
): DiscogsInterpretation {
  const labels = getDiscogsLabels();
  const topGenres: MlTagScore[] = labels
    .map((label, index) => ({
      tag: formatDiscogsGenre(label),
      label,
      score: activationVector[index] ?? 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(({ tag, score }) => ({ tag, score }));

  const topWithLabels = labels
    .map((label, index) => ({ label, score: activationVector[index] ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const styleScores = new Map<MusicStyle, number>();
  for (const { label, score } of topWithLabels) {
    const style = styleFromDiscogsLabel(label);
    styleScores.set(style, (styleScores.get(style) ?? 0) + score);
  }

  const rankedStyles = [...styleScores.entries()].sort((a, b) => b[1] - a[1]);
  const topStyle = rankedStyles[0];
  const secondStyle = rankedStyles[1]?.[1] ?? 0;
  const margin = (topStyle?.[1] ?? 0) - secondStyle;
  const topScore = topWithLabels[0]?.score ?? 0;

  let styleConfidence: DiscogsInterpretation["styleConfidence"] = "low";
  if (topScore >= 0.25 && margin >= 0.08) {
    styleConfidence = "high";
  } else if (topScore >= 0.12 && margin >= 0.04) {
    styleConfidence = "medium";
  }

  const discogsLabel = topWithLabels[0]?.label ?? "Unknown";
  const discogsGenre = formatDiscogsGenre(discogsLabel);

  return {
    style: topStyle?.[0] ?? styleFromDiscogsLabel(discogsLabel),
    styleConfidence,
    discogsGenre,
    discogsLabel,
    topGenres,
    ambiances: ambiancesFromLabels(topWithLabels.map((t) => t.label)),
    energyLevel: energyFromTopLabels(topWithLabels.map((t) => t.label)),
  };
}
