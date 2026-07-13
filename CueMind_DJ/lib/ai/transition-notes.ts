import { chatCompletionJson, chatCompletionText } from "@/lib/ai/llm-client";
import { areKeysCompatible, toCamelotKey } from "@/lib/dj/camelot";
import { estimateCuePointsFromPeaks, formatCueTime } from "@/lib/audio/cue-points";
import type { GeneratedSetTrack, Track } from "@/types/database";

type TransitionTrack = Track & { position: number };

const SYSTEM_PROMPT = `Tu es un DJ professionnel et formateur en mix. Tu t'appuies sur les techniques de transition réellement utilisées par les DJ (beatmatching, harmonic mixing / roue de Camelot, EQ swap des basses, filtre passe-haut/passe-bas, echo/reverb out, loop, slip cue, bass swap sur le kick, transitions longues vs cut court).
Pour CHAQUE passage d'un morceau A (sortant) vers un morceau B (entrant), donne UNE consigne de mix concrète, actionnable et courte (1 à 2 phrases max), en français.
Prends en compte : l'écart de BPM (faut-il pitcher/sync ?), la compatibilité harmonique des clés Camelot, l'évolution d'énergie (montée, plateau, breakdown), les styles et les points de mix (outro de A, intro de B).
Sois précis et technique mais concis (ex: "Lance B sur l'intro à 5:20, swap les basses sur le premier kick, monte le passe-haut sur 16 temps pour lisser l'écart de +4 BPM"). Pas de blabla, pas d'intro générique.`;

function energyLabel(energy: number | null | undefined): string {
  if (energy == null) return "inconnue";
  if (energy >= 72) return "haute";
  if (energy >= 45) return "moyenne";
  return "basse";
}

function describeKeyRelation(
  fromKey: string | null,
  toKey: string | null
): string {
  const a = toCamelotKey(fromKey) ?? fromKey;
  const b = toCamelotKey(toKey) ?? toKey;
  if (!a || !b) return "clés inconnues";
  const compatible = areKeysCompatible(fromKey, toKey);
  if (compatible === true)
    return `${a} → ${b} (compatibles harmoniquement)`;
  if (compatible === false)
    return `${a} → ${b} (NON compatibles — risque de dissonance, mixer hors mélodie / sur les drums)`;
  return `${a} → ${b}`;
}

function describeTrack(track: TransitionTrack, label: string): string {
  const cue = estimateCuePointsFromPeaks(
    track.waveform_peaks,
    track.duration_seconds
  );
  const energy = track.audio_energy ?? null;
  const ambiances = track.ambiances?.length
    ? track.ambiances.join(", ")
    : "—";

  const cueInfo =
    label === "A (sortant)"
      ? `outro vers ${formatCueTime(cue?.outroStartSeconds ?? null)}, mix-out conseillé ${formatCueTime(cue?.mixOutSeconds ?? null)}`
      : `intro jusqu'à ${formatCueTime(cue?.introEndSeconds ?? null)}`;

  return `${label} : "${track.title}"${track.artist ? ` — ${track.artist}` : ""}
  · BPM ${track.bpm ?? "?"} · Clé ${toCamelotKey(track.key) ?? track.key ?? "?"} · Style ${track.detected_style ?? track.style ?? "?"} · Énergie ${energyLabel(energy)} · Ambiances ${ambiances} · ${cueInfo}`;
}

function buildPairContext(
  from: TransitionTrack,
  to: TransitionTrack
): string {
  const bpmDelta =
    from.bpm != null && to.bpm != null ? to.bpm - from.bpm : null;
  const bpmLine =
    bpmDelta != null
      ? `Écart BPM : ${bpmDelta > 0 ? "+" : ""}${bpmDelta} (de ${from.bpm} à ${to.bpm})`
      : "Écart BPM : inconnu";

  return `${describeTrack(from, "A (sortant)")}
${describeTrack(to, "B (entrant)")}
${bpmLine}
Harmonie : ${describeKeyRelation(from.key, to.key)}`;
}

/** Génère une note de transition pour un seul passage A → B. */
export async function generateTransitionNote(
  from: TransitionTrack,
  to: TransitionTrack
): Promise<string> {
  const note = await chatCompletionText(
    SYSTEM_PROMPT,
    `Donne la consigne de mix pour ce passage (réponds uniquement par la consigne, sans guillemets) :
${buildPairContext(from, to)}`,
    0.5
  );
  return note.replace(/^["']|["']$/g, "").trim();
}

export type GeneratedTransitionNote = {
  position: number;
  note: string;
};

/**
 * Génère en un seul appel les notes pour toutes les transitions demandées.
 * `position` correspond au morceau de destination (transition depuis le précédent).
 */
export async function generateTransitionNotesBatch(
  tracks: TransitionTrack[],
  positions?: number[]
): Promise<GeneratedTransitionNote[]> {
  if (tracks.length < 2) return [];

  const ordered = [...tracks].sort((a, b) => a.position - b.position);
  const wanted = positions ? new Set(positions) : null;

  const pairs: { position: number; context: string }[] = [];
  for (let i = 1; i < ordered.length; i++) {
    const to = ordered[i];
    if (wanted && !wanted.has(to.position)) continue;
    pairs.push({
      position: to.position,
      context: buildPairContext(ordered[i - 1], to),
    });
  }

  if (pairs.length === 0) return [];

  // Pour un seul passage, l'appel texte simple suffit.
  if (pairs.length === 1) {
    const idx = ordered.findIndex((t) => t.position === pairs[0].position);
    if (idx < 1) return [];
    const note = await generateTransitionNote(ordered[idx - 1], ordered[idx]);
    return note ? [{ position: pairs[0].position, note }] : [];
  }

  const userPrompt = `Voici les transitions d'un set DJ. Pour chacune, donne la consigne de mix.
Réponds UNIQUEMENT en JSON valide : {"transitions":[{"position":<numéro du morceau entrant>,"note":"<consigne courte>"}]}

${pairs
  .map(
    (p) => `### Transition vers la position ${p.position}
${p.context}`
  )
  .join("\n\n")}`;

  try {
    const content = await chatCompletionJson(SYSTEM_PROMPT, userPrompt);
    const parsed = JSON.parse(content) as {
      transitions?: { position?: number; note?: string }[];
    };
    const result: GeneratedTransitionNote[] = [];
    const raw = parsed.transitions ?? [];

    for (let i = 0; i < pairs.length; i++) {
      const expectedPosition = pairs[i].position;
      const match =
        raw.find((t) => t.position === expectedPosition) ?? raw[i];
      if (typeof match?.note === "string") {
        const note = match.note.replace(/^["']|["']$/g, "").trim();
        if (note) result.push({ position: expectedPosition, note });
      }
    }

    if (result.length > 0) return result;
  } catch (error) {
    console.error("Transition notes batch JSON error:", error);
  }

  // Repli : génère les notes une par une (plus lent mais fiable).
  const fallback: GeneratedTransitionNote[] = [];
  for (const pair of pairs) {
    const idx = ordered.findIndex((t) => t.position === pair.position);
    if (idx < 1) continue;
    try {
      const note = await generateTransitionNote(ordered[idx - 1], ordered[idx]);
      if (note) fallback.push({ position: pair.position, note });
    } catch (error) {
      console.error(
        `Transition note fallback failed (position ${pair.position}):`,
        error
      );
    }
  }
  return fallback;
}

export function toTransitionTracks(
  tracks: GeneratedSetTrack[]
): TransitionTrack[] {
  return tracks.map((t) => ({ ...t, position: t.position }));
}
