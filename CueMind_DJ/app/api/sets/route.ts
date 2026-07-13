import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { DjSet, Track } from "@/types/database";

export type DjSetSummary = DjSet & {
  track_count: number;
  total_duration_seconds: number;
};

const createSchema = z.object({
  name: z.string().max(200).optional(),
  description: z.string().max(500).optional(),
  trackIds: z.array(z.string().uuid()).min(2),
});

/** Crée un set à partir d'un ordre de morceaux EXPLICITE (ex: chaîne B2B). */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { name, description, trackIds } = createSchema.parse(
      await request.json().catch(() => ({}))
    );

    // On ne garde que les morceaux qui appartiennent bien à l'utilisateur,
    // en préservant l'ordre fourni (et en dédoublonnant).
    const { data: ownedTracks, error: tracksError } = await supabase
      .from("tracks")
      .select("id")
      .eq("user_id", user.id)
      .in("id", trackIds);

    if (tracksError) {
      return NextResponse.json({ error: tracksError.message }, { status: 500 });
    }

    const owned = new Set((ownedTracks ?? []).map((t) => t.id));
    const orderedIds: string[] = [];
    const seen = new Set<string>();
    for (const id of trackIds) {
      if (owned.has(id) && !seen.has(id)) {
        seen.add(id);
        orderedIds.push(id);
      }
    }

    if (orderedIds.length < 2) {
      return NextResponse.json(
        { error: "Au moins 2 morceaux valides sont nécessaires." },
        { status: 400 }
      );
    }

    const setName =
      name?.trim() ||
      `Set B2B — ${new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`;

    const { data: djSet, error: setError } = await supabase
      .from("dj_sets")
      .insert({
        user_id: user.id,
        name: setName,
        description:
          description?.trim() ||
          `Set créé en B2B — ${orderedIds.length} morceaux`,
      })
      .select()
      .single();

    if (setError || !djSet) {
      return NextResponse.json(
        { error: setError?.message ?? "Erreur création du set" },
        { status: 500 }
      );
    }

    const payload = orderedIds.map((trackId, index) => ({
      set_id: djSet.id,
      track_id: trackId,
      position: index + 1,
    }));

    const { error: insertError } = await supabase
      .from("set_tracks")
      .insert(payload);

    if (insertError) {
      await supabase.from("dj_sets").delete().eq("id", djSet.id);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ set: djSet, trackCount: orderedIds.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Sélectionne au moins 2 morceaux." },
        { status: 400 }
      );
    }
    console.error("Set create error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création du set." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { data: sets, error: setsError } = await supabase
      .from("dj_sets")
      .select("*")
      .order("created_at", { ascending: false });

    if (setsError) {
      return NextResponse.json({ error: setsError.message }, { status: 500 });
    }

    if (!sets || sets.length === 0) {
      return NextResponse.json({ sets: [] });
    }

    const setIds = sets.map((s) => s.id);

    const { data: links, error: linksError } = await supabase
      .from("set_tracks")
      .select("set_id, track_id, position")
      .in("set_id", setIds)
      .order("position", { ascending: true });

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 });
    }

    const trackIds = [...new Set((links ?? []).map((l) => l.track_id))];
    let tracksMap = new Map<string, Track>();

    if (trackIds.length > 0) {
      const { data: tracks, error: tracksError } = await supabase
        .from("tracks")
        .select("*")
        .in("id", trackIds);

      if (tracksError) {
        return NextResponse.json({ error: tracksError.message }, { status: 500 });
      }

      tracksMap = new Map((tracks ?? []).map((t) => [t.id, t]));
    }

    const summaries: DjSetSummary[] = sets.map((set) => {
      const setLinks = (links ?? []).filter((l) => l.set_id === set.id);
      let totalDuration = 0;
      for (const link of setLinks) {
        const track = tracksMap.get(link.track_id);
        totalDuration += track?.duration_seconds ?? 0;
      }
      return {
        ...set,
        track_count: setLinks.length,
        total_duration_seconds: totalDuration,
      };
    });

    return NextResponse.json({ sets: summaries });
  } catch (error) {
    console.error("Sets fetch error:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des sets." },
      { status: 500 }
    );
  }
}
