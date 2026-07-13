import { NextResponse } from "next/server";
import { z } from "zod";
import { searchDeezer } from "@/lib/deezer/client";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  q: z.string().min(2).max(200),
  limit: z.coerce.number().min(1).max(25).optional(),
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
    const parsed = querySchema.parse({
      q: searchParams.get("q") ?? "",
      limit: searchParams.get("limit") ?? undefined,
    });

    const { results, total } = await searchDeezer(parsed.q, parsed.limit ?? 20);

    return NextResponse.json({ results, total });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Requête invalide (min. 2 caractères)" },
        { status: 400 }
      );
    }
    console.error("Deezer search error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la recherche Deezer.",
      },
      { status: 502 }
    );
  }
}
