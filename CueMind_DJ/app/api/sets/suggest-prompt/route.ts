import { NextResponse } from "next/server";
import { z } from "zod";
import { suggestPromptFromFilters } from "@/lib/ai/suggest-prompt";

const bodySchema = z.object({
  styleOrder: z.array(z.string()).optional(),
  ambiances: z.array(z.string()).optional(),
  targetDurationMinutes: z.number().min(15).max(360).nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json().catch(() => ({})));
    const prompt = await suggestPromptFromFilters(body);
    return NextResponse.json({ prompt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Erreur génération du prompt" },
      { status: 500 }
    );
  }
}
