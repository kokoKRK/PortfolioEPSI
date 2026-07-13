type LlmProvider = "groq" | "xai";

type LlmConfig = {
  provider: LlmProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
};

export function getLlmConfig(): LlmConfig | null {
  const groqKey = process.env.GROQ_API_KEY?.trim();
  const xaiKey = process.env.XAI_API_KEY?.trim();
  const legacyKey = process.env.OPENAI_API_KEY?.trim();

  const apiKey = groqKey || xaiKey || legacyKey;
  if (!apiKey) return null;

  if (apiKey.startsWith("gsk_") || groqKey) {
    return {
      provider: "groq",
      apiKey,
      baseUrl: "https://api.groq.com/openai/v1/chat/completions",
      model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    };
  }

  return {
    provider: "xai",
    apiKey,
    baseUrl: "https://api.x.ai/v1/chat/completions",
    model: process.env.XAI_MODEL ?? "grok-3-mini-fast",
  };
}

export async function chatCompletionJson(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const config = getLlmConfig();
  if (!config) {
    throw new Error("Aucune clé API IA configurée");
  }

  const response = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.provider} error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Réponse IA invalide");
  }

  return content;
}

export async function chatCompletionText(
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.6
): Promise<string> {
  const config = getLlmConfig();
  if (!config) {
    throw new Error("Aucune clé API IA configurée");
  }

  const response = await fetch(config.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(20_000),
    body: JSON.stringify({
      model: config.model,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`${config.provider} error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    throw new Error("Réponse IA invalide");
  }

  return content.trim();
}
