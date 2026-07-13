import { chatCompletionText } from "@/lib/ai/llm-client";

type SuggestPromptInput = {
  styleOrder?: string[];
  ambiances?: string[];
  targetDurationMinutes?: number | null;
};

function buildFallbackPrompt(input: SuggestPromptInput): string {
  const parts: string[] = [];

  if (input.targetDurationMinutes) {
    parts.push(`Set de ${input.targetDurationMinutes} minutes`);
  } else {
    parts.push("Génère un set");
  }

  if (input.styleOrder?.length) {
    parts.push(
      `avec un parcours ${input.styleOrder.join(" puis ")}`
    );
  }

  if (input.ambiances?.length) {
    parts.push(`ambiance ${input.ambiances.join(" et ")}`);
  }

  parts.push("montée progressive et transitions fluides");

  return `${parts.join(", ")}.`;
}

export async function suggestPromptFromFilters(
  input: SuggestPromptInput
): Promise<string> {
  const fallback = buildFallbackPrompt(input);

  try {
    const text = await chatCompletionText(
      `Tu es un DJ professionnel. Transforme des filtres en une phrase de prompt naturelle pour générer un set.
Réponds en une seule phrase en français, sans guillemets, sans JSON, max 200 caractères.`,
      `Filtres :
- Styles (ordre) : ${input.styleOrder?.join(" → ") || "libre"}
- Ambiances : ${input.ambiances?.join(", ") || "aucune"}
- Durée : ${input.targetDurationMinutes ? `${input.targetDurationMinutes} min` : "sans limite"}`
    );
    return text || fallback;
  } catch {
    return fallback;
  }
}
