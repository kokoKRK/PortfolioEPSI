import { NextResponse } from "next/server";
import { z } from "zod";
import { generateTransitionNotesBatch } from "@/lib/ai/transition-notes";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/types/database";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const bodySchema = z.object({
  position: z.number().int().min(2).optional(),
  overwrite: z.boolean().optional(),
});

function transitionNoteMigrationHint(message: string): string | null {
  if (
    message.toLowerCase().includes("transition_note") &&
    (message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("does not exist"))
  ) {
    return "Colonne transition_note manquante. Exécute la migration supabase/migrations/20260625120000_set_transition_notes.sql dans Supabase.";
  }
  return null;
}

async function loadSetTrackLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  setId: string
) {
  let { data: links, error: linksError } = await supabase
    .from("set_tracks")
    .select("track_id, position, transition_note")
    .eq("set_id", setId)
    .order("position", { ascending: true });

  if (
    linksError &&
    linksError.message.toLowerCase().includes("transition_note")
  ) {
    const fallback = await supabase
      .from("set_tracks")
      .select("track_id, position")
      .eq("set_id", setId)
      .order("position", { ascending: true });
    links =
      fallback.data?.map((l) => ({ ...l, transition_note: null })) ?? null;
    linksError = fallback.error;
  }

  return { links, linksError };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { position, overwrite = false } = bodySchema.parse(body);

    const { data: djSet, error: setError } = await supabase
      .from("dj_sets")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (setError || !djSet || djSet.user_id !== user.id) {
      return NextResponse.json({ error: "Set introuvable" }, { status: 404 });
    }

    const { links, linksError } = await loadSetTrackLinks(supabase, id);

    if (linksError) {
      const hint = transitionNoteMigrationHint(linksError.message);
      return NextResponse.json(
        { error: hint ?? linksError.message },
        { status: 500 }
      );
    }

    if (!links || links.length < 2) {
      return NextResponse.json(
        { error: "Le set doit contenir au moins 2 morceaux." },
        { status: 400 }
      );
    }

    const trackIds = links.map((l) => l.track_id);
    const { data: tracks, error: tracksError } = await supabase
      .from("tracks")
      .select("*")
      .in("id", trackIds);

    if (tracksError) {
      return NextResponse.json({ error: tracksError.message }, { status: 500 });
    }

    const tracksMap = new Map((tracks ?? []).map((t) => [t.id, t]));
    const orderedTracks = links
      .map((link) => {
        const track = tracksMap.get(link.track_id);
        if (!track) return null;
        return { ...track, position: link.position };
      })
      .filter((t): t is Track & { position: number } => t !== null);

    // Quelles transitions générer ?
    let positions: number[] | undefined;
    if (position != null) {
      positions = [position];
    } else if (!overwrite) {
      positions = links
        .filter((l) => l.position > 1 && !l.transition_note?.trim())
        .map((l) => l.position);
      if (positions.length === 0) {
        return NextResponse.json({
          updated: 0,
          notes: [],
          message: "Toutes les transitions ont déjà une note.",
        });
      }
    }

    const generated = await generateTransitionNotesBatch(
      orderedTracks,
      positions
    );

    if (generated.length === 0) {
      return NextResponse.json(
        { error: "L'IA n'a pas pu générer de notes (vérifie la clé API)." },
        { status: 502 }
      );
    }

    const saveErrors: string[] = [];
    for (const note of generated) {
      const { error: updateError } = await supabase
        .from("set_tracks")
        .update({ transition_note: note.note })
        .eq("set_id", id)
        .eq("position", note.position);

      if (updateError) {
        const hint = transitionNoteMigrationHint(updateError.message);
        saveErrors.push(hint ?? updateError.message);
      }
    }

    if (saveErrors.length > 0 && saveErrors.length === generated.length) {
      return NextResponse.json(
        { error: saveErrors[0] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      updated: generated.length - saveErrors.length,
      notes: generated,
      saveErrors: saveErrors.length > 0 ? saveErrors.slice(0, 3) : undefined,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Suggest transition notes error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des notes." },
      { status: 500 }
    );
  }
}
