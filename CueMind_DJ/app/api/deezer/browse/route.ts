import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDeezerChartTracks,
  getDeezerGenres,
} from "@/lib/deezer/client";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  genreId: z.coerce.number().int().min(0).optional(),
  withGenres: z.coerce.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { genreId = 0, withGenres } = querySchema.parse({
      genreId: searchParams.get("genreId") ?? undefined,
      withGenres: searchParams.get("withGenres") ?? undefined,
    });

    const [tracks, genres] = await Promise.all([
      getDeezerChartTracks(genreId, 24),
      withGenres ? getDeezerGenres() : Promise.resolve(null),
    ]);

    return NextResponse.json({
      tracks,
      genres,
      genreId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
    }
    console.error("Deezer browse error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors du chargement du catalogue.",
      },
      { status: 502 }
    );
  }
}
