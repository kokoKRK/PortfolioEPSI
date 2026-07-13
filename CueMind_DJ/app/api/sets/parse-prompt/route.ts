import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoredAmbiances } from "@/lib/ai/classify-ambiance";
import { parseSetPrompt } from "@/lib/ai/parse-set-prompt";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  prompt: z.string().min(3).max(1000),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { prompt } = bodySchema.parse(body);

    const { data: tracks, error } = await supabase
      .from("tracks")
      .select("style, ambiances, bpm")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const withBpm = (tracks ?? []).filter((t) => t.bpm != null);
    const libraryStyles = [
      ...new Set(
        withBpm.map((t) => t.style).filter((s): s is string => Boolean(s))
      ),
    ];
    const libraryAmbiances = [
      ...new Set(withBpm.flatMap((t) => getStoredAmbiances(t))),
    ];

    const parsed = await parseSetPrompt(prompt, {
      libraryStyles,
      libraryAmbiances,
      trackCount: withBpm.length,
    });

    return NextResponse.json({ parsed });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Prompt invalide" }, { status: 400 });
    }
    console.error("Parse set prompt error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'interprétation du prompt." },
      { status: 500 }
    );
  }
}
