import { areKeysCompatible } from "@/lib/dj/camelot";
import { scoreTransition } from "@/lib/dj/set-generator";
import { chatCompletionText } from "@/lib/ai/llm-client";
import type { Track } from "@/types/database";

export type B2bSuggestion = {
  track: Track;
  score: number;
  bpmDelta: number | null;
  keyCompatible: boolean | null;
  explanation: string;
};

export async function getB2bSuggestions(
  currentTrack: Track,
  candidates: Track[],
  limit = 3,
  /** Morceaux déjà joués dans le set B2B — jamais reproposés. */
  excludeIds: string[] = []
): Promise<B2bSuggestion[]> {
  // Un DJ ne rejoue (quasi) jamais deux fois le même morceau : on écarte le
  // morceau courant + tout l'historique déjà joué.
  const excluded = new Set<string>([currentTrack.id, ...excludeIds]);
  const eligible = candidates.filter(
    (t) => !excluded.has(t.id) && t.bpm != null
  );

  const scored = eligible
    .map((track) => {
      const score = scoreTransition(currentTrack, track, {
        tolerance: "balanced",
      });
      const keyCompatible = areKeysCompatible(currentTrack.key, track.key);
      const bpmDelta =
        currentTrack.bpm != null && track.bpm != null
          ? Math.round((track.bpm - currentTrack.bpm) * 100) / 100
          : null;

      return {
        track,
        score,
        bpmDelta,
        keyCompatible,
        explanation: "",
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  const withExplanations = await Promise.all(
    scored.map(async (item) => {
      try {
        const explanation = await chatCompletionText(
          `Tu es un DJ en back-to-back. Explique en 1 phrase courte (max 120 caractères) pourquoi tu enchaînerais ce morceau après l'autre. Ton direct et inspirant.`,
          `Morceau joué : "${currentTrack.title}" (${currentTrack.style ?? "?"}, ${currentTrack.bpm ?? "?"} BPM, clé ${currentTrack.key ?? "?"})
Prochain morceau : "${item.track.title}" (${item.track.style ?? "?"}, ${item.track.bpm ?? "?"} BPM, clé ${item.track.key ?? "?"})
Delta BPM : ${item.bpmDelta ?? "?"}`,
          0.7
        );
        return { ...item, explanation };
      } catch {
        return {
          ...item,
          explanation: `Enchaînement logique — ${item.track.style ?? "style"} à ${item.track.bpm ?? "?"} BPM.`,
        };
      }
    })
  );

  return withExplanations;
}
