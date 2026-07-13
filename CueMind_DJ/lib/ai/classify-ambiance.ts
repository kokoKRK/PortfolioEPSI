import { chatCompletionJson } from "@/lib/ai/llm-client";
import type { StyleClassificationInput } from "@/lib/ai/classify-style";

export const MUSIC_AMBIANCES = [
  "Énergique",
  "Chill",
  "Festif",
  "Sombre",
  "Romantique",
  "Dansant",
  "Mélancolique",
  "Agressif",
  "Nostalgique",
  "Hypnotique",
  "Uplifting",
  "Groove",
] as const;

export type MusicAmbiance = (typeof MUSIC_AMBIANCES)[number];

const AMBIANCE_KEYWORDS: Record<MusicAmbiance, string[]> = {
  Énergique: ["energ", "power", "intense", "dynamic", "uptempo"],
  Chill: ["chill", "relax", "laid back", "downtempo", "lo-fi", "smooth"],
  Festif: ["party", "festif", "club", "celebration", "anthem"],
  Sombre: ["dark", "sombre", "moody", "noir", "ominous"],
  Romantique: ["romant", "love", "sensual", "intimate", "ballad"],
  Dansant: ["dance", "dansant", "groovy", "floor", "bounce"],
  Mélancolique: ["melanc", "sad", "emotional", "blue", "somber"],
  Agressif: ["aggress", "hard", "brutal", "heavy", "rage"],
  Nostalgique: ["nostalg", "retro", "vintage", "throwback", "classic"],
  Hypnotique: ["hypnot", "trance", "minimal", "repetitive", "mesmer"],
  Uplifting: ["uplift", "euphor", "happy", "positive", "feel good"],
  Groove: ["groove", "funky", "swing", "rhythmic", "pocket"],
};

const STYLE_DEFAULT_AMBIANCES: Record<string, MusicAmbiance[]> = {
  House: ["Dansant", "Groove"],
  Techno: ["Hypnotique", "Énergique"],
  Trance: ["Uplifting", "Hypnotique"],
  "Drum & Bass": ["Énergique", "Agressif"],
  Dubstep: ["Agressif", "Sombre"],
  "Hip-Hop": ["Groove", "Énergique"],
  "R&B": ["Romantique", "Chill"],
  Pop: ["Festif", "Dansant"],
  Rock: ["Énergique", "Agressif"],
  Reggae: ["Chill", "Groove"],
  Latino: ["Festif", "Dansant"],
  Afrobeat: ["Groove", "Festif"],
  Disco: ["Festif", "Dansant"],
  Funk: ["Groove", "Festif"],
  Ambient: ["Chill", "Hypnotique"],
  Other: ["Groove"],
};

export function normalizeAmbianceLabel(raw: string): MusicAmbiance | null {
  const lower = raw.toLowerCase().trim();

  for (const ambiance of MUSIC_AMBIANCES) {
    if (ambiance.toLowerCase() === lower) return ambiance;
  }

  for (const [ambiance, keywords] of Object.entries(AMBIANCE_KEYWORDS) as [
    MusicAmbiance,
    string[],
  ][]) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return ambiance;
    }
  }

  return null;
}

export function normalizeAmbianceList(raw: unknown): MusicAmbiance[] {
  if (!Array.isArray(raw)) return [];

  const result: MusicAmbiance[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const normalized = normalizeAmbianceLabel(item);
    if (normalized && !result.includes(normalized)) {
      result.push(normalized);
    }
    if (result.length >= 3) break;
  }
  return result;
}

export function guessAmbiancesFromStyle(style: string): MusicAmbiance[] {
  return STYLE_DEFAULT_AMBIANCES[style] ?? STYLE_DEFAULT_AMBIANCES.Other;
}

const AMBIANCE_SYSTEM_PROMPT = `Tu es un expert DJ et musicologue. Analyse l'ambiance émotionnelle et l'énergie RESSENTIE du morceau (pas le genre musical).
Si une analyse AUDIO du signal est fournie (énergie, brightness, tags d'humeur), PRIORISE-LA : elle décrit le vrai feeling du son, au-delà du titre ou du style.
Repères :
- Énergie basse + nappes/peu d'aigus = Chill, Hypnotique, Mélancolique (morceau planant).
- Énergie haute + aigus = Énergique, Festif, Uplifting.
- Sombre = peu lumineux et tendu ; Groove/Dansant = rythme marqué.
Réponds UNIQUEMENT en JSON valide :
{"ambiances":["<1 à 3 valeurs EXACTES parmi: ${MUSIC_AMBIANCES.join(", ")}>"]}`;

type AudioFeaturesInput = NonNullable<StyleClassificationInput["audioFeatures"]>;

/** Ambiances dérivées directement du signal (énergie, brightness, basses). */
export function deriveAmbiancesFromSignal(
  audio: AudioFeaturesInput
): MusicAmbiance[] {
  const result: MusicAmbiance[] = [];
  const { energy, brightness, bassPresence } = audio;

  if (energy < 38) {
    result.push("Chill");
    if (brightness < 50) result.push("Hypnotique");
  } else if (energy >= 72) {
    result.push("Énergique");
  }

  if (brightness < 40 && energy < 62) {
    if (!result.includes("Sombre")) result.push("Sombre");
  }

  if (brightness >= 62 && energy >= 55) {
    if (!result.includes("Uplifting")) result.push("Uplifting");
  }

  if (energy >= 45 && energy <= 78 && bassPresence >= 52) {
    if (!result.includes("Groove")) result.push("Groove");
  }

  return result.slice(0, 3);
}

function buildAmbianceAudioContext(audio: AudioFeaturesInput): string {
  const moodTags = audio.mlTopTags?.length
    ? `\n- Tags d'humeur (MusiCNN): ${audio.mlTopTags
        .slice(0, 5)
        .map((t) => `${t.tag} ${Math.round(t.score * 100)}%`)
        .join(", ")}`
    : "";

  const mlAmbiances = audio.mlAmbiances?.length
    ? `\n- Ambiances détectées par le modèle : ${audio.mlAmbiances.join(", ")}`
    : "";

  return `
Analyse AUDIO (signal réellement écouté — source fiable) :
- Énergie : ${audio.energy}/100 (${audio.energyLevel})
- Brightness/aigus : ${audio.brightness}% · Basses : ${audio.bassPresence}%${mlAmbiances}${moodTags}`;
}

function mergeAmbianceLists(...lists: MusicAmbiance[][]): MusicAmbiance[] {
  const result: MusicAmbiance[] = [];
  for (const list of lists) {
    for (const a of list) {
      if (!result.includes(a)) result.push(a);
      if (result.length >= 3) return result;
    }
  }
  return result;
}

export async function classifyTrackAmbiances(
  input: StyleClassificationInput & { style?: string | null }
): Promise<{ ambiances: MusicAmbiance[]; source: "ai" | "rules" }> {
  const audio = input.audioFeatures;
  const mlAmbiances = audio?.mlAmbiances?.length
    ? normalizeAmbianceList(audio.mlAmbiances)
    : [];
  const signalAmbiances = audio ? deriveAmbiancesFromSignal(audio) : [];

  const rulesFallback = guessAmbiancesFromStyle(
    input.style ?? input.rawGenre ?? "Other"
  );

  try {
    const content = await chatCompletionJson(
      AMBIANCE_SYSTEM_PROMPT,
      `Titre: ${input.title}
Artiste: ${input.artist ?? "inconnu"}
Style musical: ${input.style ?? input.rawGenre ?? "inconnu"}
Fichier: ${input.filename}${audio ? buildAmbianceAudioContext(audio) : ""}`
    );

    const parsed = JSON.parse(content) as { ambiances?: unknown };
    const aiAmbiances = normalizeAmbianceList(parsed.ambiances);

    // L'IA décide en priorité (avec le contexte audio), puis on complète
    // avec les ambiances issues du signal pour ne rien manquer.
    const merged = mergeAmbianceLists(
      aiAmbiances,
      mlAmbiances,
      signalAmbiances
    );
    if (merged.length > 0) {
      return { ambiances: merged, source: "ai" };
    }
  } catch (error) {
    console.error("Ambiance AI classification error:", error);
  }

  // Sans IA : on s'appuie sur le signal (ML + heuristique) avant les règles.
  const signalOnly = mergeAmbianceLists(mlAmbiances, signalAmbiances);
  if (signalOnly.length > 0) {
    return { ambiances: signalOnly, source: "rules" };
  }

  return { ambiances: rulesFallback, source: "rules" };
}

export function getStoredAmbiances(track: {
  ambiances?: string[] | null;
}): MusicAmbiance[] {
  return normalizeAmbianceList(track.ambiances);
}

export function trackNeedsAmbianceClassification(track: {
  ambiances?: string[] | null;
}): boolean {
  return getStoredAmbiances(track).length === 0;
}

export function trackMatchesAmbianceFilter(
  track: { ambiances?: string[] | null },
  filterAmbiances: string[]
): boolean {
  if (filterAmbiances.length === 0) return true;

  const stored = getStoredAmbiances(track);
  if (stored.length === 0) return false;

  const filterSet = new Set(filterAmbiances.map((a) => a.toLowerCase()));
  return stored.some((a) => filterSet.has(a.toLowerCase()));
}
