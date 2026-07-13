export type SetPhaseEnergy = "low" | "medium" | "high";

export type SetPhase = {
  name: string;
  durationMinutes: number;
  primaryStyles: string[];
  bridgeStyles: string[];
  ambiances: string[];
  energy: SetPhaseEnergy;
};

export type SetPlan = {
  setName?: string;
  totalDurationMinutes: number;
  phases: SetPhase[];
  summary: string;
};

export type ParseSetPromptContext = {
  libraryStyles: string[];
  libraryAmbiances: string[];
  trackCount: number;
};

/** Rétrocompat UI / filtres manuels */
export type ParsedSetPrompt = {
  setName?: string;
  styleOrder: string[];
  ambiances: string[];
  targetDurationMinutes: number | null;
  summary: string;
  plan: SetPlan;
};

export function planToLegacyFields(plan: SetPlan): Omit<ParsedSetPrompt, "plan"> {
  const styleOrder: string[] = [];
  const ambiances: string[] = [];

  for (const phase of plan.phases) {
    for (const s of phase.primaryStyles) {
      if (!styleOrder.includes(s)) styleOrder.push(s);
    }
    for (const a of phase.ambiances) {
      if (!ambiances.includes(a)) ambiances.push(a);
    }
  }

  return {
    setName: plan.setName,
    styleOrder,
    ambiances,
    targetDurationMinutes: plan.totalDurationMinutes,
    summary: plan.summary,
  };
}

export function normalizePhaseDurations(plan: SetPlan): SetPlan {
  if (plan.phases.length === 0) return plan;

  const total = plan.totalDurationMinutes;
  const explicitSum = plan.phases.reduce((s, p) => s + p.durationMinutes, 0);

  if (explicitSum <= 0) {
    const each = Math.floor(total / plan.phases.length);
    return {
      ...plan,
      phases: plan.phases.map((p, i) => ({
        ...p,
        durationMinutes:
          i === plan.phases.length - 1
            ? total - each * (plan.phases.length - 1)
            : each,
      })),
    };
  }

  if (Math.abs(explicitSum - total) <= 5) return plan;

  const ratio = total / explicitSum;
  return {
    ...plan,
    phases: plan.phases.map((p) => ({
      ...p,
      durationMinutes: Math.max(5, Math.round(p.durationMinutes * ratio)),
    })),
  };
}
