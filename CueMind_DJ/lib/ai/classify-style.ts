import { chatCompletionJson } from "@/lib/ai/llm-client";

export const MUSIC_STYLES = [
  "House",
  "Techno",
  "Trance",
  "Drum & Bass",
  "Dubstep",
  "Hip-Hop",
  "R&B",
  "Pop",
  "Rock",
  "Reggae",
  "Latino",
  "Afrobeat",
  "Disco",
  "Funk",
  "Ambient",
  "Other",
] as const;

export type MusicStyle = (typeof MUSIC_STYLES)[number];

const GENRE_KEYWORDS: Record<MusicStyle, string[]> = {
  House: ["house", "deep house", "tech house", "progressive house", "electro house"],
  Techno: ["techno", "minimal techno", "industrial", "acid techno"],
  Trance: ["trance", "psytrance", "uplifting"],
  "Drum & Bass": ["drum and bass", "drum & bass", "dnb", "jungle", "neurofunk"],
  Dubstep: ["dubstep", "brostep", "riddim"],
  "Hip-Hop": ["hip hop", "hip-hop", "rap", "trap"],
  "R&B": ["r&b", "rnb", "soul"],
  Pop: ["pop", "dance pop", "synth pop"],
  Rock: ["rock", "indie", "metal", "punk"],
  Reggae: ["reggae", "dancehall", "dub"],
  Latino: ["latin", "reggaeton", "salsa", "bachata"],
  Afrobeat: ["afrobeat", "afro house", "amapiano"],
  Disco: ["disco", "nu disco"],
  Funk: ["funk", "boogie"],
  Ambient: ["ambient", "chillout", "downtempo", "lo-fi"],
  Other: [],
};

export function normalizeStyleLabel(raw: string): MusicStyle {
  const lower = raw.toLowerCase().trim();

  for (const style of MUSIC_STYLES) {
    if (style.toLowerCase() === lower) return style;
  }

  for (const [style, keywords] of Object.entries(GENRE_KEYWORDS) as [
    MusicStyle,
    string[],
  ][]) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return style;
    }
  }

  return "Other";
}

export type StyleClassificationInput = {
  title: string;
  artist: string | null;
  rawGenre: string | null;
  filename: string;
  audioFeatures?: {
    detectedBpm: number | null;
    energy: number;
    energyLevel: string;
    brightness: number;
    bassPresence: number;
    detectedStyle: string;
    styleConfidence: string;
    analysisEngine?: string;
    mlTopTags?: { tag: string; score: number }[];
    mlAmbiances?: string[];
    discogsGenre?: string | null;
    discogsTopGenres?: { tag: string; score: number }[];
  } | null;
};

export type StyleClassificationResult = {
  style: MusicStyle;
  confidence: "high" | "medium" | "low";
  source: "ai" | "rules";
};

const SYSTEM_PROMPT = `Tu es un expert DJ. Classifie le morceau dans UNE seule catégorie parmi : ${MUSIC_STYLES.join(", ")}.
Réponds UNIQUEMENT en JSON valide : {"style":"...","confidence":"high|medium|low"}`;

export async function classifyMusicStyle(
  input: StyleClassificationInput
): Promise<StyleClassificationResult> {
  const rulesGuess = normalizeStyleLabel(input.rawGenre ?? "Unknown");

  try {
    const content = await chatCompletionJson(
      SYSTEM_PROMPT,
      `Titre: ${input.title}
Artiste: ${input.artist ?? "inconnu"}
Genre ID3: ${input.rawGenre ?? "non renseigné"}
Fichier: ${input.filename}`
    );

    const parsed = JSON.parse(content) as {
      style?: string;
      confidence?: string;
    };

    const style = normalizeStyleLabel(parsed.style ?? rulesGuess);
    const confidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "medium";

    return { style, confidence, source: "ai" };
  } catch (error) {
    console.error("Style classification fallback:", error);
    return {
      style: rulesGuess,
      confidence: input.rawGenre && rulesGuess !== "Other" ? "medium" : "low",
      source: "rules",
    };
  }
}
