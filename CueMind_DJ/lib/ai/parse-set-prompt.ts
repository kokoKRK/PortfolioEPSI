import { z } from "zod";
import { MUSIC_AMBIANCES, normalizeAmbianceList } from "@/lib/ai/classify-ambiance";
import { MUSIC_STYLES, normalizeStyleLabel } from "@/lib/ai/classify-style";
import { chatCompletionJson } from "@/lib/ai/llm-client";
import { STYLE_BRIDGE } from "@/lib/dj/style-affinity";
import {
  normalizePhaseDurations,
  planToLegacyFields,
  type ParsedSetPrompt,
  type ParseSetPromptContext,
  type SetPhase,
  type SetPhaseEnergy,
  type SetPlan,
} from "@/lib/dj/set-plan";

export type {
  ParsedSetPrompt,
  ParseSetPromptContext,
  SetPlan,
  SetPhase,
} from "@/lib/dj/set-plan";

const phaseSchema = z.object({
  name: z.string().optional(),
  durationMinutes: z.number().min(5).max(180).optional(),
  primaryStyles: z.array(z.string()).optional(),
  bridgeStyles: z.array(z.string()).optional(),
  ambiances: z.array(z.string()).optional(),
  energy: z.enum(["low", "medium", "high"]).optional(),
});

const planSchema = z.object({
  setName: z.string().optional(),
  totalDurationMinutes: z.number().min(15).max(360).optional(),
  phases: z.array(phaseSchema).optional(),
  summary: z.string().optional(),
});

const SYSTEM_PROMPT = `Tu es un DJ expert en construction de sets cohérents. Le client décrit le voyage musical souhaité.
Découpe le set en PARTIES séquentielles avec durée, énergie, styles et ponts entre genres.

Réponds UNIQUEMENT en JSON valide :
{
  "setName": "<nom optionnel>",
  "totalDurationMinutes": <durée totale>,
  "phases": [
    {
      "name": "<ex: Ouverture House Chill>",
      "durationMinutes": <minutes pour CETTE partie>,
      "primaryStyles": ["<styles principaux>"],
      "bridgeStyles": ["<styles ponts acceptés: Afrobeat, Other, Disco...>"],
      "ambiances": ["<ambiances>"],
      "energy": "low|medium|high"
    }
  ],
  "summary": "<résumé du parcours en français>"
}

Règles DJ importantes :
- Respecte l'ORDRE des parties et les durées explicites (ex: "20 min de techno" en fin = dernière phase ~20 min)
- primaryStyles parmi : ${MUSIC_STYLES.join(", ")}
- bridgeStyles : genres qui peuvent s'enchaîner (Afrobeat↔House, Other pour sous-genres mal classés, etc.)
- ambiances parmi : ${MUSIC_AMBIANCES.join(", ")}
- Une même partie peut réutiliser un style avec une ambiance/énergie différente (ex: House chill puis House énergique = 2 phases)
- Les durées des phases doivent sommer ~totalDurationMinutes
- Pense cohérence énergétique : montée progressive BPM/énergie sauf demande contraire`;

function matchStyle(raw: string, allowed: Set<string>): string | null {
  const normalized = normalizeStyleLabel(raw);
  if (allowed.has(normalized)) return normalized;
  const lower = raw.toLowerCase();
  for (const style of allowed) {
    if (style.toLowerCase() === lower) return style;
  }
  return null;
}

function matchAmbiance(raw: string, allowed: Set<string>): string | null {
  const list = normalizeAmbianceList([raw]);
  if (list[0] && allowed.has(list[0])) return list[0];
  const lower = raw.toLowerCase();
  for (const ambiance of allowed) {
    if (ambiance.toLowerCase() === lower) return ambiance;
  }
  return null;
}

function defaultBridges(primaryStyles: string[]): string[] {
  const bridges = new Set<string>(["Other"]);
  for (const style of primaryStyles) {
    for (const b of STYLE_BRIDGE[style] ?? STYLE_BRIDGE.Other) {
      bridges.add(b);
    }
  }
  return [...bridges].filter((s) => !primaryStyles.includes(s));
}

function normalizePhase(
  raw: z.infer<typeof phaseSchema>,
  allowedStyles: Set<string>,
  allowedAmbiances: Set<string>
): SetPhase | null {
  const primaryStyles: string[] = [];
  for (const s of raw.primaryStyles ?? []) {
    const m = matchStyle(s, allowedStyles);
    if (m && !primaryStyles.includes(m)) primaryStyles.push(m);
  }
  if (primaryStyles.length === 0) return null;

  const bridgeStyles: string[] = [];
  for (const s of raw.bridgeStyles ?? defaultBridges(primaryStyles)) {
    const m = matchStyle(s, allowedStyles);
    if (m && !primaryStyles.includes(m) && !bridgeStyles.includes(m)) {
      bridgeStyles.push(m);
    }
  }

  const ambiances: string[] = [];
  for (const a of raw.ambiances ?? []) {
    const m = matchAmbiance(a, allowedAmbiances);
    if (m && !ambiances.includes(m)) ambiances.push(m);
  }

  const energy: SetPhaseEnergy = raw.energy ?? "medium";

  return {
    name: raw.name?.trim() || primaryStyles.join(" / "),
    durationMinutes: raw.durationMinutes ?? 15,
    primaryStyles,
    bridgeStyles: bridgeStyles.length ? bridgeStyles : defaultBridges(primaryStyles),
    ambiances,
    energy,
  };
}

function rulesPlan(prompt: string, total: number): SetPlan {
  const lower = prompt.toLowerCase();
  const phases: SetPhase[] = [];

  const styleMentions: { style: string; index: number }[] = [];
  for (const style of MUSIC_STYLES) {
    const idx = lower.indexOf(style.toLowerCase());
    if (idx >= 0) styleMentions.push({ style, index: idx });
  }
  styleMentions.sort((a, b) => a.index - b.index);

  const ambiances = normalizeAmbianceList(
    MUSIC_AMBIANCES.filter((a) => lower.includes(a.toLowerCase()))
  );

  let technoMin = 0;
  const technoBlock = lower.match(/(\d+)\s*min(?:ute)?s?\s+(?:de\s+)?techno/);
  if (technoBlock) technoMin = parseInt(technoBlock[1], 10);

  const remaining = Math.max(15, total - technoMin);
  const housePhases = styleMentions.filter((s) => s.style === "House");

  if (housePhases.length >= 2) {
    const half = Math.floor(remaining / 2);
    phases.push({
      name: "House Chill",
      durationMinutes: half,
      primaryStyles: ["House"],
      bridgeStyles: defaultBridges(["House"]),
      ambiances: ambiances.includes("Chill") ? ["Chill"] : ambiances.slice(0, 2),
      energy: "low",
    });
    phases.push({
      name: "House Énergique",
      durationMinutes: remaining - half,
      primaryStyles: ["House"],
      bridgeStyles: defaultBridges(["House"]),
      ambiances: ambiances.includes("Énergique")
        ? ["Énergique", "Festif"]
        : ambiances.slice(0, 2),
      energy: "high",
    });
  } else if (styleMentions.length > 0) {
    const each = Math.floor(remaining / styleMentions.length);
    styleMentions.forEach((s, i) => {
      if (s.style === "Techno" && technoMin > 0) return;
      phases.push({
        name: s.style,
        durationMinutes:
          i === styleMentions.length - 1 && technoMin === 0
            ? remaining - each * (styleMentions.length - 1)
            : each,
        primaryStyles: [s.style],
        bridgeStyles: defaultBridges([s.style]),
        ambiances: ambiances.slice(0, 2),
        energy: i === 0 ? "low" : i === styleMentions.length - 1 ? "high" : "medium",
      });
    });
  }

  if (technoMin > 0 || lower.includes("techno")) {
    phases.push({
      name: "Techno Finale",
      durationMinutes: technoMin || 20,
      primaryStyles: ["Techno"],
      bridgeStyles: ["House", "Other"],
      ambiances: ["Énergique", "Hypnotique"],
      energy: "high",
    });
  }

  if (phases.length === 0) {
    phases.push({
      name: "Set",
      durationMinutes: total,
      primaryStyles: ["Other"],
      bridgeStyles: defaultBridges(["Other"]),
      ambiances,
      energy: "medium",
    });
  }

  return normalizePhaseDurations({
    totalDurationMinutes: total,
    phases,
    summary: "Plan basique (IA indisponible).",
  });
}

export async function parseSetPlan(
  prompt: string,
  context: ParseSetPromptContext
): Promise<SetPlan> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return {
      totalDurationMinutes: 60,
      phases: [],
      summary: "",
    };
  }

  const allowedStyles = new Set(
    context.libraryStyles.length > 0
      ? context.libraryStyles
      : [...MUSIC_STYLES]
  );
  const allowedAmbiances = new Set(
    context.libraryAmbiances.length > 0
      ? context.libraryAmbiances
      : [...MUSIC_AMBIANCES]
  );

  try {
    const content = await chatCompletionJson(
      SYSTEM_PROMPT,
      `Bibliothèque : ${context.trackCount} morceaux (BPM requis)
Styles en crate : ${[...allowedStyles].join(", ") || "variés"}
Ambiances détectées : ${[...allowedAmbiances].join(", ") || "à inférer"}

Brief du DJ :
"${trimmed}"`
    );

    const raw = planSchema.parse(JSON.parse(content));
    const total =
      raw.totalDurationMinutes != null &&
      raw.totalDurationMinutes >= 15 &&
      raw.totalDurationMinutes <= 360
        ? raw.totalDurationMinutes
        : 60;

    const phases: SetPhase[] = [];
    for (const p of raw.phases ?? []) {
      const phase = normalizePhase(p, allowedStyles, allowedAmbiances);
      if (phase) phases.push(phase);
    }

    if (phases.length === 0) {
      return rulesPlan(trimmed, total);
    }

    return normalizePhaseDurations({
      setName: raw.setName?.trim() || undefined,
      totalDurationMinutes: total,
      phases,
      summary:
        raw.summary?.trim() ||
        phases.map((p) => `${p.name} (${p.durationMinutes} min)`).join(" → "),
    });
  } catch (error) {
    console.error("parseSetPlan fallback:", error);
    const hourMatch = trimmed.toLowerCase().match(/(\d+)\s*h(?:\s*(\d+))?/);
    let total = 60;
    if (hourMatch) {
      total =
        parseInt(hourMatch[1], 10) * 60 +
        (hourMatch[2] ? parseInt(hourMatch[2], 10) : 0);
    }
    return rulesPlan(trimmed, total);
  }
}

export async function parseSetPrompt(
  prompt: string,
  context: ParseSetPromptContext
): Promise<ParsedSetPrompt> {
  const plan = await parseSetPlan(prompt, context);
  const legacy = planToLegacyFields(plan);
  return { ...legacy, plan };
}
