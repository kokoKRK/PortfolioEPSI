import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoredAmbiances } from "@/lib/ai/classify-ambiance";
import { assignTracksToPhases } from "@/lib/ai/assign-tracks-to-phases";
import { parseSetPrompt } from "@/lib/ai/parse-set-prompt";
import { generateTransitionNotesBatch } from "@/lib/ai/transition-notes";
import {
  estimateSetDurationMinutes,
  generateSetFromPlan,
  generateSetOrder,
} from "@/lib/dj/set-generator";
import type { TransitionTolerance } from "@/lib/dj/transition-tolerance";
import type { SetPlan } from "@/lib/dj/set-plan";
import {
  gatherDeezerCandidates,
  isDeezerCandidateId,
} from "@/lib/deezer/candidates";
import type { GeneratedSetTrack, Track } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

const bodySchema = z.object({
  prompt: z.string().max(1000).optional(),
  name: z.string().optional(),
  trackIds: z.array(z.string().uuid()).optional(),
  styleOrder: z.array(z.string()).optional(),
  ambiances: z.array(z.string()).optional(),
  targetDurationMinutes: z.number().min(15).max(360).nullable().optional(),
  transitionTolerance: z
    .enum(["strict", "balanced", "daring"])
    .optional(),
  maxBpmDelta: z.number().min(1).max(20).nullable().optional(),
  transitionNotes: z.enum(["off", "manual", "ai"]).optional(),
  /** Source des morceaux : ma bibliothèque, découvertes Deezer, ou les deux. */
  source: z.enum(["library", "discover", "mixed"]).optional(),
  /** Override du nombre max d'extraits Deezer à analyser. */
  discoverLimit: z.number().min(1).max(30).nullable().optional(),
});

const AVG_TRACK_MINUTES = 3.5;

/** Importe en base un candidat Deezer retenu dans le set (dédoublonné). */
async function importDeezerCandidate(
  supabase: ServerSupabaseClient,
  userId: string,
  track: Track
): Promise<Track | null> {
  if (!track.external_id) return null;

  const { data: existing } = await supabase
    .from("tracks")
    .select("*")
    .eq("user_id", userId)
    .eq("source", "deezer")
    .eq("external_id", track.external_id)
    .maybeSingle();

  if (existing) return existing as Track;

  const { data: inserted, error } = await supabase
    .from("tracks")
    .insert({
      user_id: userId,
      title: track.title,
      artist: track.artist,
      bpm: track.bpm,
      key: track.key,
      style: track.style,
      ambiances: track.ambiances,
      detected_style: track.detected_style,
      energy_level: track.energy_level,
      audio_bpm: track.audio_bpm,
      audio_energy: track.audio_energy,
      audio_features: track.audio_features,
      audio_analyzed_at: track.audio_analyzed_at,
      source: "deezer",
      external_id: track.external_id,
      preview_url: track.preview_url,
      artwork_url: track.artwork_url,
      audio_url: null,
      duration_seconds: track.duration_seconds,
      waveform_peaks: track.waveform_peaks,
    })
    .select()
    .single();

  if (error) {
    console.error("Import candidat Deezer échoué:", error.message);
    return null;
  }

  return inserted as Track;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      prompt,
      name,
      trackIds,
      styleOrder: manualStyleOrder,
      ambiances: manualAmbiances,
      targetDurationMinutes: manualDuration,
      transitionTolerance: manualTolerance,
      maxBpmDelta,
      transitionNotes = "manual",
      source = "library",
      discoverLimit,
    } = bodySchema.parse(body);

    let query = supabase
      .from("tracks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (trackIds && trackIds.length > 0) {
      query = query.in("id", trackIds);
    }

    const { data: tracks, error: fetchError } = await query;

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const libraryTracks: Track[] = (tracks as Track[] | null) ?? [];

    // En mode bibliothèque, on exige des morceaux locaux. Les modes découverte
    // tolèrent une bibliothèque vide (le set sera 100% Deezer).
    if (source === "library" && libraryTracks.length === 0) {
      return NextResponse.json(
        { error: "Aucun morceau disponible." },
        { status: 400 }
      );
    }

    const withBpm = libraryTracks.filter((t) => t.bpm != null);
    const libraryStyles = [
      ...new Set(
        withBpm.map((t) => t.style).filter((s): s is string => Boolean(s))
      ),
    ];
    const libraryAmbiances = [
      ...new Set(withBpm.flatMap((t) => getStoredAmbiances(t))),
    ];

    let styleOrder = manualStyleOrder;
    let ambiances = manualAmbiances;
    let targetDurationMinutes = manualDuration ?? undefined;
    let setNameFromPrompt: string | undefined;
    let promptSummary: string | undefined;
    let setPlan: SetPlan | undefined;
    const transitionTolerance: TransitionTolerance =
      manualTolerance ?? "balanced";

    if (prompt?.trim()) {
      const parsed = await parseSetPrompt(prompt.trim(), {
        libraryStyles,
        libraryAmbiances,
        trackCount: withBpm.length,
      });
      setPlan = parsed.plan;
      if (parsed.styleOrder.length > 0) styleOrder = parsed.styleOrder;
      if (parsed.ambiances.length > 0) ambiances = parsed.ambiances;
      if (parsed.targetDurationMinutes != null) {
        targetDurationMinutes = parsed.targetDurationMinutes;
      }
      setNameFromPrompt = parsed.setName;
      promptSummary = parsed.summary;
    }

    // Découvertes Deezer : recherche + analyse d'extraits 30s à mélanger au pool.
    let deezerCandidates: Track[] = [];
    if (source !== "library") {
      const neededTracks = Math.ceil(
        (targetDurationMinutes ?? 60) / AVG_TRACK_MINUTES
      );
      // En 100% découverte on analyse PLUS de morceaux que nécessaire pour que
      // l'algo puisse réellement choisir les meilleures transitions (clé + BPM).
      const candidateLimit =
        source === "discover"
          ? Math.min(Math.max(Math.ceil(neededTracks * 1.5), 12), 20)
          : Math.min(Math.max(discoverLimit ?? 8, 4), 12);

      const gathered = await gatherDeezerCandidates({
        userId: user.id,
        styles: styleOrder,
        ambiances,
        promptQuery: prompt?.trim() || setNameFromPrompt,
        limit: discoverLimit ?? candidateLimit,
        // La cohérence harmonique prime en 100% découverte.
        requireKey: source === "discover",
      });
      deezerCandidates = gathered.candidates;
    }

    const poolTracks: Track[] =
      source === "discover"
        ? deezerCandidates
        : source === "mixed"
          ? [...libraryTracks, ...deezerCandidates]
          : libraryTracks;

    if (poolTracks.filter((t) => t.bpm != null).length < 3) {
      return NextResponse.json(
        {
          error:
            source === "library"
              ? "Aucun morceau disponible."
              : "Pas assez de morceaux analysables pour ce set. Élargis les styles/ambiances ou réessaie.",
        },
        { status: 400 }
      );
    }

    const orderedTracks = setPlan?.phases.length
      ? await (async () => {
          const plan = setPlan;
          const aiAssignments = prompt?.trim()
            ? await assignTracksToPhases(plan, poolTracks)
            : null;
          return generateSetFromPlan(
            poolTracks,
            plan,
            aiAssignments,
            transitionTolerance,
            maxBpmDelta
          );
        })()
      : generateSetOrder(poolTracks, {
          styleOrder,
          ambiances,
          targetDurationMinutes: targetDurationMinutes ?? undefined,
          transitionTolerance,
          maxBpmDelta,
        });

    // Les découvertes Deezer retenues dans le set sont importées en base
    // (nécessaire pour sauvegarder le set qui les référence).
    const idMap = new Map<string, string>();
    for (const track of orderedTracks) {
      if (track.source === "deezer" && isDeezerCandidateId(track.id)) {
        const imported = await importDeezerCandidate(supabase, user.id, track);
        if (imported) idMap.set(track.id, imported.id);
      }
    }

    const finalTracks: GeneratedSetTrack[] = orderedTracks
      .map((track) => {
        if (!isDeezerCandidateId(track.id)) return track;
        const realId = idMap.get(track.id);
        return realId ? { ...track, id: realId } : null;
      })
      .filter((t): t is GeneratedSetTrack => t !== null)
      .map((track, index) => ({ ...track, position: index + 1 }));

    if (finalTracks.length < 3) {
      return NextResponse.json(
        {
          error:
            "Le set n'a pas pu être constitué (découvertes indisponibles). Réessaie.",
        },
        { status: 400 }
      );
    }

    const discoveriesUsed = finalTracks.filter(
      (t) => t.source === "deezer"
    ).length;

    const durationLabel = estimateSetDurationMinutes(finalTracks);
    const labelParts: string[] = [];
    if (setPlan?.phases.length) {
      labelParts.push(
        setPlan.phases
          .map((p) => `${p.name} ${p.durationMinutes}min`)
          .join(" → ")
      );
    } else {
      if (styleOrder?.length) labelParts.push(styleOrder.join(" → "));
      if (ambiances?.length) labelParts.push(ambiances.join(" · "));
    }
    const filterLabel =
      labelParts.length > 0 ? labelParts.join(" | ") : "tous styles";

    const setName =
      name?.trim() ||
      setNameFromPrompt ||
      `Set ${filterLabel} — ${new Date().toLocaleDateString("fr-FR", {
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
        description: [
          `Set généré — ${finalTracks.length} morceaux · ~${durationLabel} min · ${filterLabel}`,
          discoveriesUsed > 0 ? `${discoveriesUsed} découverte(s) Deezer` : null,
          promptSummary ? `Prompt : ${promptSummary}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      })
      .select()
      .single();

    if (setError || !djSet) {
      return NextResponse.json(
        { error: setError?.message ?? "Erreur création du set" },
        { status: 500 }
      );
    }

    const setTracksPayload = finalTracks.map((track) => ({
      set_id: djSet.id,
      track_id: track.id,
      position: track.position,
    }));

    const { error: insertError } = await supabase
      .from("set_tracks")
      .insert(setTracksPayload);

    if (insertError) {
      await supabase.from("dj_sets").delete().eq("id", djSet.id);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    let tracksWithNotes = finalTracks;
    let notesGenerated = 0;
    let notesWarning: string | null = null;

    if (transitionNotes === "ai" && finalTracks.length >= 2) {
      try {
        const notes = await generateTransitionNotesBatch(finalTracks);
        if (notes.length > 0) {
          const noteByPosition = new Map(
            notes.map((n) => [n.position, n.note])
          );
          const saveErrors: string[] = [];
          await Promise.all(
            notes.map(async (n) => {
              const { error } = await supabase
                .from("set_tracks")
                .update({ transition_note: n.note })
                .eq("set_id", djSet.id)
                .eq("position", n.position);
              if (error) saveErrors.push(error.message);
            })
          );

          notesGenerated = notes.length - saveErrors.length;
          if (saveErrors.length > 0) {
            notesWarning =
              saveErrors[0].includes("transition_note") ||
              saveErrors[0].includes("schema cache")
                ? "Notes générées mais non sauvegardées — exécute la migration transition_note dans Supabase."
                : `Notes partiellement sauvegardées : ${saveErrors[0]}`;
          }

          tracksWithNotes = finalTracks.map((t) => ({
            ...t,
            transitionNote: noteByPosition.get(t.position) ?? null,
          }));
        } else {
          notesWarning =
            "L'IA n'a pas pu générer les notes de transition. Réessaie via « Suggérer (IA) » sur chaque passage.";
        }
      } catch (noteError) {
        console.error("AI transition notes generation failed:", noteError);
        notesWarning =
          noteError instanceof Error
            ? noteError.message
            : "Erreur lors de la génération des notes de transition.";
      }
    }

    return NextResponse.json({
      set: djSet,
      tracks: tracksWithNotes,
      estimatedDurationMinutes: durationLabel,
      appliedFilters: {
        styleOrder: styleOrder ?? [],
        ambiances: ambiances ?? [],
        targetDurationMinutes: targetDurationMinutes ?? null,
        summary: promptSummary,
        plan: setPlan ?? null,
        transitionTolerance,
        maxBpmDelta: maxBpmDelta ?? null,
        transitionNotes,
        source,
        discoveriesUsed,
        notesGenerated,
        notesWarning,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Generate set error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du set." },
      { status: 500 }
    );
  }
}
