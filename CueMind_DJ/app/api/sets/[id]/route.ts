import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { GeneratedSetTrack } from "@/types/database";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  position: z.number().int().min(1),
  note: z.string().max(2000),
});

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: djSet, error: setError } = await supabase
      .from("dj_sets")
      .select("*")
      .eq("id", id)
      .single();

    if (setError || !djSet) {
      return NextResponse.json({ error: "Set introuvable" }, { status: 404 });
    }

    let { data: links, error: linksError } = await supabase
      .from("set_tracks")
      .select("track_id, position, transition_note")
      .eq("set_id", id)
      .order("position", { ascending: true });

    // Repli si la migration transition_note n'est pas encore appliquée.
    if (
      linksError &&
      linksError.message.toLowerCase().includes("transition_note")
    ) {
      const fallback = await supabase
        .from("set_tracks")
        .select("track_id, position")
        .eq("set_id", id)
        .order("position", { ascending: true });
      links = fallback.data?.map((l) => ({ ...l, transition_note: null })) ?? null;
      linksError = fallback.error;
    }

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 });
    }

    if (!links || links.length === 0) {
      return NextResponse.json({ set: djSet, tracks: [] });
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

    const orderedTracks: GeneratedSetTrack[] = links
      .map((link) => {
        const track = tracksMap.get(link.track_id);
        if (!track) return null;
        return {
          ...track,
          position: link.position,
          transitionNote: link.transition_note ?? null,
        };
      })
      .filter((t): t is GeneratedSetTrack => t !== null);

    return NextResponse.json({ set: djSet, tracks: orderedTracks });
  } catch (error) {
    console.error("Set detail fetch error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement du set." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const { position, note } = patchSchema.parse(body);

    const { data: djSet, error: setError } = await supabase
      .from("dj_sets")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (setError || !djSet || djSet.user_id !== user.id) {
      return NextResponse.json({ error: "Set introuvable" }, { status: 404 });
    }

    const trimmed = note.trim();
    const { error: updateError } = await supabase
      .from("set_tracks")
      .update({ transition_note: trimmed.length > 0 ? trimmed : null })
      .eq("set_id", id)
      .eq("position", position);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      position,
      transitionNote: trimmed.length > 0 ? trimmed : null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Set transition note update error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement de la note." },
      { status: 500 }
    );
  }
}
