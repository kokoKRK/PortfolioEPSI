import { chatCompletionJson } from "@/lib/ai/llm-client";
import {
  classifyTrackAmbiances,
  deriveAmbiancesFromSignal,
  guessAmbiancesFromStyle,
  MUSIC_AMBIANCES,
  normalizeAmbianceList,
  type MusicAmbiance,
} from "@/lib/ai/classify-ambiance";
import {
  MUSIC_STYLES,
  normalizeStyleLabel,
  type MusicStyle,
  type StyleClassificationInput,
} from "@/lib/ai/classify-style";

export type TrackMetadataClassification = {
  style: MusicStyle;
  ambiances: MusicAmbiance[];
  confidence: "high" | "medium" | "low";
  source: "ai" | "rules";
};

const SYSTEM_PROMPT = `Tu es un expert DJ et musicologue. Détermine le STYLE et les AMBIANCES du morceau.

Pour le STYLE :
- Si tu reconnais l'ARTISTE ou le TITRE, fie-toi D'ABORD à ta connaissance du genre habituel de cet artiste. Exemple : un rappeur connu (ex: GIMS, Booba, Drake) = Hip-Hop, même si le tempo ou l'énergie ressemblent à de l'électro.
- L'analyse AUDIO (BPM, énergie, genre détecté) sert à CONFIRMER, à départager les morceaux instrumentaux ou inconnus, et à repérer un remix/edit trompeur — PAS à contredire un artiste clairement identifié.
- Le genre déduit du seul tempo n'est PAS fiable pour distinguer Hip-Hop, Pop, R&B et Techno (BPM proches). En cas de doute, privilégie l'artiste/titre.

Réponds UNIQUEMENT en JSON valide :
{
  "style": "<une catégorie parmi: ${MUSIC_STYLES.join(", ")}>",
  "ambiances": ["<1 à 3 ambiances OBLIGATOIRES, valeurs EXACTES parmi: ${MUSIC_AMBIANCES.join(", ")}>"],
  "confidence": "high|medium|low"
}
Mets "confidence":"high" lorsque tu reconnais l'artiste/titre.
Les ambiances décrivent l'énergie et l'émotion (ex: Festif, Sombre, Chill), pas le genre musical.`;

function buildAudioContext(input: StyleClassificationInput): string {
  const audio = input.audioFeatures;
  if (!audio) return "";

  const topTags = audio.mlTopTags?.length
    ? `\n- Tags MusiCNN: ${audio.mlTopTags
        .slice(0, 5)
        .map((t) => `${t.tag} ${Math.round(t.score * 100)}%`)
        .join(", ")}`
    : "";

  const discogs = audio.discogsGenre
    ? `\n- Genre Discogs (deep learning, 400 styles): ${audio.discogsGenre}${
        audio.discogsTopGenres?.length
          ? ` — aussi: ${audio.discogsTopGenres
              .slice(1, 4)
              .map((t) => t.tag)
              .join(", ")}`
          : ""
      }`
    : "";

  return `
Analyse AUDIO (signal réellement écouté — source fiable) :
- Moteur: ${audio.analysisEngine ?? "heuristique"}
- BPM détecté : ${audio.detectedBpm ?? "inconnu"}
- Énergie : ${audio.energy}/100 (${audio.energyLevel})
- Style détecté : ${audio.detectedStyle} (confiance ${audio.styleConfidence})
- Basses : ${audio.bassPresence}%, Aigus/brightness : ${audio.brightness}%${discogs}${topTags}`;
}

function resolveStyleFromSignals(
  aiStyle: MusicStyle,
  aiConfidence: "high" | "medium" | "low",
  _rulesStyle: MusicStyle,
  input: StyleClassificationInput
): MusicStyle {
  const audio = input.audioFeatures;
  if (!audio) return aiStyle;

  const audioStyle = normalizeStyleLabel(audio.detectedStyle);
  if (audioStyle === "Other" || audioStyle === aiStyle) return aiStyle;

  // Le style déduit du seul tempo (moteurs "essentia"/"heuristic", sans modèle
  // de genre par deep learning) confond facilement Hip-Hop, Pop et Techno : ils
  // partagent des BPM proches. On ne laisse JAMAIS ce signal écraser l'IA, qui
  // connaît l'artiste et le titre. Il ne sert qu'à combler un vide (IA = Other).
  const hasGenreModel =
    audio.analysisEngine === "essentia+discogs" ||
    audio.analysisEngine === "essentia+musicnn";

  if (!hasGenreModel) {
    return aiStyle === "Other" ? audioStyle : aiStyle;
  }

  // Modèle de genre (Discogs/MusiCNN) : fiable sur le son, mais l'IA garde la
  // priorité quand elle est sûre (elle reconnaît un artiste connu). On n'override
  // que si l'IA hésite réellement.
  if (aiStyle === "Other") return audioStyle;
  if (aiConfidence === "low" && audio.styleConfidence !== "low") {
    return audioStyle;
  }

  return aiStyle;
}

export async function classifyTrackMetadata(
  input: StyleClassificationInput
): Promise<TrackMetadataClassification> {
  const rulesStyle = normalizeStyleLabel(input.rawGenre ?? "Unknown");
  const rulesAmbiances = guessAmbiancesFromStyle(rulesStyle);

  try {
    const content = await chatCompletionJson(
      SYSTEM_PROMPT,
      `Titre: ${input.title}
Artiste: ${input.artist ?? "inconnu"}
Genre ID3: ${input.rawGenre ?? "non renseigné"}
Fichier: ${input.filename}${buildAudioContext(input)}`
    );

    const parsed = JSON.parse(content) as {
      style?: string;
      ambiances?: unknown;
      confidence?: string;
    };

    const aiStyle = normalizeStyleLabel(parsed.style ?? rulesStyle);
    const confidence =
      parsed.confidence === "high" ||
      parsed.confidence === "medium" ||
      parsed.confidence === "low"
        ? parsed.confidence
        : "medium";

    const style = resolveStyleFromSignals(
      aiStyle,
      confidence,
      rulesStyle,
      input
    );

    let ambiances = normalizeAmbianceList(parsed.ambiances);

    // Renforce avec le signal : ambiances ML + heuristique énergie/brightness.
    if (input.audioFeatures) {
      const mlAmbiances = input.audioFeatures.mlAmbiances?.length
        ? normalizeAmbianceList(input.audioFeatures.mlAmbiances)
        : [];
      const signalAmbiances = deriveAmbiancesFromSignal(input.audioFeatures);

      for (const a of [...mlAmbiances, ...signalAmbiances]) {
        if (ambiances.length >= 3) break;
        if (!ambiances.includes(a)) ambiances.push(a);
      }
    }

    if (ambiances.length === 0) {
      const ambianceResult = await classifyTrackAmbiances({
        ...input,
        style,
      });
      ambiances = ambianceResult.ambiances;
    }

    return { style, ambiances, confidence, source: "ai" };
  } catch (error) {
    console.error("Track metadata classification fallback:", error);
    const fallbackStyle =
      input.audioFeatures &&
      input.audioFeatures.styleConfidence !== "low" &&
      input.audioFeatures.detectedStyle !== "Other"
        ? normalizeStyleLabel(input.audioFeatures.detectedStyle)
        : rulesStyle;

    return {
      style: fallbackStyle,
      ambiances: rulesAmbiances,
      confidence: input.rawGenre && rulesStyle !== "Other" ? "medium" : "low",
      source: "rules",
    };
  }
}
