import { NextResponse } from "next/server";
import { z } from "zod";
import { getDeezerPreviewUrl } from "@/lib/deezer/client";
import { createClient } from "@/lib/supabase/server";

const querySchema = z.object({
  id: z.string().min(1),
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
    const { id } = querySchema.parse({ id: searchParams.get("id") ?? "" });

    const previewUrl = await getDeezerPreviewUrl(id);
    if (!previewUrl) {
      return NextResponse.json(
        { error: "Extrait indisponible pour ce morceau." },
        { status: 404 }
      );
    }

    return NextResponse.json({ previewUrl });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }
    console.error("Deezer preview error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la récupération de l'extrait.",
      },
      { status: 502 }
    );
  }
}
