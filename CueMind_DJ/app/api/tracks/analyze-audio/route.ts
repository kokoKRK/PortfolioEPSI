import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyTrackMetadata } from "@/lib/ai/classify-track-metadata";
import {
  analyzeAudioContent,
  audioFeaturesToDbFields,
} from "@/lib/audio/analyze-content";
import { assignTrackToStylePlaylist } from "@/lib/playlists/assign-track";
import { createClient } from "@/lib/supabase/server";
import type { Track } from "@/types/database";

const bodySchema = z.object({
  trackIds: z.array(z.string().uuid()).optional(),
});

const MAX_BATCH = 10;

function migrationHint(message: string): string | null {
  if (
    message.includes("detected_style") ||
    message.includes("energy_level") ||
    message.includes("audio_bpm")
  ) {
    if (
      message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("does not exist")
    ) {
      return "Colonnes d'analyse audio manquantes. Exécute la migration supabase/migrations/20260622200000_audio_analysis.sql dans Supabase.";
    }
  }
  return null;
}

function trackNeedsAudioAnalysis(track: Track): boolean {
  if ((track.source ?? "upload") === "deezer") return false;
  return !track.audio_analyzed_at && Boolean(track.audio_url);
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
    const { trackIds } = bodySchema.parse(body);

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
      : tracks.filter(trackNeedsAudioAnalysis);

    if (candidates.length === 0) {
      return NextResponse.json({
        updated: 0,
        remaining: 0,
        processed: 0,
        errors: [],
        message: "Tous les morceaux ont déjà été analysés audio.",
      });
    }

    const toProcess = candidates.slice(0, MAX_BATCH);
    const updatedTracks: Track[] = [];
    const errors: { trackId: string; title: string; message: string }[] = [];

    for (const track of toProcess) {
      if (!track.audio_url) {
        errors.push({
          trackId: track.id,
          title: track.title,
          message: "Pas de fichier audio local (morceau Deezer déjà analysé via extrait).",
        });
        continue;
      }

      const filename = track.audio_url.split("/").pop() ?? "track.mp3";

      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("audio-tracks")
          .download(track.audio_url);

        if (downloadError || !fileData) {
          errors.push({
            trackId: track.id,
            title: track.title,
            message: "Impossible de télécharger le fichier audio",
          });
          continue;
        }

        const buffer = Buffer.from(await fileData.arrayBuffer());
        const audioContent = await analyzeAudioContent(buffer, track.bpm);

        if (!audioContent) {
          errors.push({
            trackId: track.id,
            title: track.title,
            message: "Décodage audio impossible",
          });
          continue;
        }

        const classification = await classifyTrackMetadata({
          title: track.title,
          artist: track.artist,
          rawGenre: track.style,
          filename,
          audioFeatures: audioContent.features,
        });

        const audioDbFields = audioFeaturesToDbFields(audioContent.features);
        const bpm = track.bpm ?? audioContent.features.detectedBpm ?? null;
        const key = track.key ?? audioContent.detectedKey ?? null;

        const { data: updated, error: updateError } = await supabase
          .from("tracks")
          .update({
            bpm,
            key,
            style: classification.style,
            ambiances: classification.ambiances,
            waveform_peaks: audioContent.waveformPeaks.length
              ? audioContent.waveformPeaks
              : track.waveform_peaks,
            ...audioDbFields,
          })
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

        // L'assignation aux playlists par style se fait ici (et non à l'upload),
        // une fois le style classé par l'IA lors de l'analyse différée.
        try {
          await assignTrackToStylePlaylist(
            supabase,
            user.id,
            track.id,
            classification.style
          );
        } catch (playlistError) {
          console.error("Playlist assignment error:", playlistError);
        }

        updatedTracks.push(updated);
      } catch (trackError) {
        errors.push({
          trackId: track.id,
          title: track.title,
          message:
            trackError instanceof Error
              ? trackError.message
              : "Erreur analyse audio",
        });
      }
    }

    const failedInBatch = toProcess.length - updatedTracks.length;
    const notProcessedYet = Math.max(0, candidates.length - toProcess.length);
    const remaining = failedInBatch + notProcessedYet;

    return NextResponse.json({
      updated: updatedTracks.length,
      processed: toProcess.length,
      remaining,
      errors: errors.slice(0, 5),
      migrationRequired: errors.some((e) =>
        e.message.includes("analyse audio manquantes")
      ),
      tracks: updatedTracks,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Analyze audio batch error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'analyse audio.",
      },
      { status: 500 }
    );
  }
}
