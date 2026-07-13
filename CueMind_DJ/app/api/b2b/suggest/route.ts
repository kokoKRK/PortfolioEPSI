import { NextResponse } from "next/server";
import { z } from "zod";
import { getB2bSuggestions } from "@/lib/ai/b2b-suggest";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  trackId: z.string().uuid(),
  limit: z.number().min(1).max(5).optional(),
  /** IDs des morceaux déjà joués dans la session B2B (à ne pas reproposer). */
  excludeIds: z.array(z.string().uuid()).optional(),
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

    const { trackId, limit, excludeIds } = bodySchema.parse(
      await request.json().catch(() => ({}))
    );

    const { data: tracks, error } = await supabase
      .from("tracks")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const currentTrack = tracks?.find((t) => t.id === trackId);
    if (!currentTrack) {
      return NextResponse.json({ error: "Morceau introuvable" }, { status: 404 });
    }

    const suggestions = await getB2bSuggestions(
      currentTrack,
      tracks ?? [],
      limit ?? 3,
      excludeIds ?? []
    );

    return NextResponse.json({
      currentTrack,
      suggestions: suggestions.map((s) => ({
        track: s.track,
        score: s.score,
        bpmDelta: s.bpmDelta,
        explanation: s.explanation,
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("B2B suggest error:", error);
    return NextResponse.json(
      { error: "Erreur suggestions B2B" },
      { status: 500 }
    );
  }
}
