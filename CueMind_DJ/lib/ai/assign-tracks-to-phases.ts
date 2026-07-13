import { z } from "zod";
import { getStoredAmbiances } from "@/lib/ai/classify-ambiance";
import { chatCompletionJson } from "@/lib/ai/llm-client";
import {
  getTrackDiscogsGenre,
  getTrackEffectiveBpm,
  getTrackEnergyLevel,
  getTrackPrimaryStyle,
} from "@/lib/dj/track-profile";
import type { SetPlan } from "@/lib/dj/set-plan";
import type { Track } from "@/types/database";

const assignmentSchema = z.object({
  assignments: z.array(
    z.object({
      trackId: z.string().uuid(),
      phaseIndex: z.number().int().min(0),
    })
  ),
});

const SYSTEM_PROMPT = `Tu es un DJ expert. On te donne un plan de set en plusieurs parties et une liste de morceaux.

Assigne chaque morceau pertinent à UNE SEULE phase (phaseIndex 0, 1, 2...).

CRITIQUE — juge le VIBE RÉEL :
- PRIORISE discogsGenre et detectedStyle (analyse audio Discogs-EffNet) sur tagStyle
- Un remix peut être House alors que le tag dit Techno
- Phase "chill / low energy" : JAMAIS de techno dure, energyLevel high, ou BPM agressif
- Phase "Techno finale" : morceaux techno, hard, hypnotiques — pas de chill
- Respecte l'énergie croissante du set

Réponds UNIQUEMENT en JSON :
{"assignments":[{"trackId":"<uuid>","phaseIndex":0}]}

N'inclus que les morceaux qui correspondent vraiment à une phase.`;

export type PhaseAssignments = Map<number, Track[]>;

export async function assignTracksToPhases(
  plan: SetPlan,
  tracks: Track[]
): Promise<PhaseAssignments | null> {
  const eligible = tracks.filter((t) => t.bpm != null);
  if (plan.phases.length === 0 || eligible.length === 0) return null;

  const phasesDesc = plan.phases
    .map(
      (p, i) =>
        `[${i}] ${p.name} — ${p.durationMinutes}min — énergie:${p.energy} — styles:${p.primaryStyles.join("+")} — ponts:${p.bridgeStyles.join(",")} — ambiances:${p.ambiances.join(",")}`
    )
    .join("\n");

  const catalog = eligible.slice(0, 80).map((t) => {
    const audioMeta = t.audio_features as
      | {
          mlTopTags?: { tag: string; score: number }[];
          discogsTopGenres?: { tag: string; score: number }[];
          discogsGenre?: string | null;
          analysisEngine?: string;
        }
      | null;
    return {
      id: t.id,
      title: t.title,
      artist: t.artist ?? "?",
      tagStyle: t.style ?? "Other",
      detectedStyle: getTrackPrimaryStyle(t),
      discogsGenre: getTrackDiscogsGenre(t) ?? audioMeta?.discogsGenre ?? null,
      energyLevel: getTrackEnergyLevel(t),
      audioEnergy: t.audio_energy,
      ambiances: getStoredAmbiances(t),
      bpm: getTrackEffectiveBpm(t),
      audioAnalyzed: Boolean(t.audio_analyzed_at),
      mlTopTags: audioMeta?.mlTopTags?.slice(0, 5) ?? [],
      discogsTopGenres: audioMeta?.discogsTopGenres?.slice(0, 5) ?? [],
      analysisEngine: audioMeta?.analysisEngine ?? null,
    };
  });

  try {
    const content = await chatCompletionJson(
      SYSTEM_PROMPT,
      `Plan du set (~${plan.totalDurationMinutes} min) :
${phasesDesc}

Morceaux disponibles :
${JSON.stringify(catalog)}`
    );

    const parsed = assignmentSchema.parse(JSON.parse(content));
    const trackById = new Map(eligible.map((t) => [t.id, t]));
    const result: PhaseAssignments = new Map();

    for (const { trackId, phaseIndex } of parsed.assignments) {
      if (phaseIndex < 0 || phaseIndex >= plan.phases.length) continue;
      const track = trackById.get(trackId);
      if (!track) continue;
      const list = result.get(phaseIndex) ?? [];
      if (list.some((t) => t.id === trackId)) continue;
      list.push(track);
      result.set(phaseIndex, list);
    }

    const totalAssigned = [...result.values()].reduce((n, arr) => n + arr.length, 0);
    if (totalAssigned < 3) return null;

    return result;
  } catch (error) {
    console.error("assignTracksToPhases failed:", error);
    return null;
  }
}
