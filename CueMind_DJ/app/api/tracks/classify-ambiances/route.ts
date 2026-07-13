import { NextResponse } from "next/server";
import { z } from "zod";
import {
  classifyTrackAmbiances,
  trackNeedsAmbianceClassification,
} from "@/lib/ai/classify-ambiance";
import { classifyTrackMetadata } from "@/lib/ai/classify-track-metadata";
import { reconstructAudioFeatures } from "@/lib/audio/track-to-features";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/types/database";

const bodySchema = z.object({
  trackIds: z.array(z.string().uuid()).optional(),
  ambiancesOnly: z.boolean().optional(),
});

const MAX_BATCH = 20;

function migrationHint(message: string): string | null {
  if (
    message.includes("ambiances") &&
    (message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("does not exist"))
  ) {
    return "La colonne ambiances est absente. Exécute la migration supabase/migrations/20260622190000_track_ambiances.sql dans le SQL Editor Supabase, puis recharge le schéma (Settings → API → Reload schema).";
  }
  return null;
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
    const { trackIds, ambiancesOnly = true } = bodySchema.parse(body);

    let query = supabase
      .from("tracks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (trackIds?.length) {
      query = query.in("id", trackIds);
    }

    const { data: tracks, error: fetchError } = await query;

    if (fetchError) {
      const hint = migrationHint(fetchError.message);
      return NextResponse.json(
        { error: hint ?? fetchError.message },
        { status: 500 }
      );
    }

    if (!tracks?.length) {
      return NextResponse.json({
        updated: 0,
        remaining: 0,
        processed: 0,
        errors: [],
        message: "Aucun morceau trouvé.",
      });
    }

    const candidates = trackIds?.length
      ? tracks
      : tracks.filter(trackNeedsAmbianceClassification);

    if (candidates.length === 0) {
      return NextResponse.json({
        updated: 0,
        remaining: 0,
        processed: 0,
        errors: [],
        message: "Tous les morceaux ont déjà des ambiances.",
      });
    }

    const toProcess = candidates.slice(0, MAX_BATCH);
    const updatedTracks: Track[] = [];
    const errors: { trackId: string; title: string; message: string }[] = [];
    let aiCount = 0;

    for (const track of toProcess) {
      const filename = track.audio_url?.split("/").pop() ?? `${track.title}.mp3`;
      const input = {
        title: track.title,
        artist: track.artist,
        rawGenre: track.style,
        filename,
        audioFeatures: reconstructAudioFeatures(track),
      };

      try {
        let updatePayload: { style?: string | null; ambiances: string[] };

        if (ambiancesOnly) {
          const result = await classifyTrackAmbiances({ ...input, style: track.style });
          updatePayload = { ambiances: result.ambiances };
          if (result.source === "ai") aiCount++;
        } else {
          const result = await classifyTrackMetadata(input);
          updatePayload = { style: result.style, ambiances: result.ambiances };
          if (result.source === "ai") aiCount++;
        }

        const { data: updated, error: updateError } = await supabase
          .from("tracks")
          .update(updatePayload)
          .eq("id", track.id)
          .eq("user_id", user.id)
          .select()
          .maybeSingle();

        if (updateError) {
          const hint = migrationHint(updateError.message);
          errors.push({
            trackId: track.id,
            title: track.title,
            message: hint ?? updateError.message,
          });
          continue;
        }

        if (!updated) {
          errors.push({
            trackId: track.id,
            title: track.title,
            message: "Mise à jour refusée (vérifie les droits RLS).",
          });
          continue;
        }

        updatedTracks.push(updated);
      } catch (trackError) {
        errors.push({
          trackId: track.id,
          title: track.title,
          message:
            trackError instanceof Error
              ? trackError.message
              : "Erreur classification",
        });
      }
    }

    const failedInBatch = toProcess.length - updatedTracks.length;
    const notProcessedYet = Math.max(0, candidates.length - toProcess.length);
    const remaining = failedInBatch + notProcessedYet;

    const firstError = errors[0]?.message;
    const migrationRequired = errors.some((e) =>
      e.message.includes("colonne ambiances")
    );

    return NextResponse.json({
      updated: updatedTracks.length,
      processed: toProcess.length,
      aiClassified: aiCount,
      remaining,
      errors: errors.slice(0, 5),
      migrationRequired,
      error:
        updatedTracks.length === 0 && firstError
          ? firstError
          : undefined,
      tracks: updatedTracks,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Classify ambiances error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'analyse des ambiances.",
      },
      { status: 500 }
    );
  }
}
