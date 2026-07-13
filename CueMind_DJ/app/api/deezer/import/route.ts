import { NextResponse } from "next/server";
import { z } from "zod";
import { classifyTrackMetadata } from "@/lib/ai/classify-track-metadata";
import {
  analyzeAudioContent,
  audioFeaturesToDbFields,
} from "@/lib/audio/analyze-content";
import { getDeezerTrack } from "@/lib/deezer/client";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  externalId: z.string().min(1),
});

function migrationHint(message: string): string | null {
  if (
    message.includes("source") ||
    message.includes("external_id") ||
    message.includes("artwork_url")
  ) {
    if (
      message.includes("column") ||
      message.includes("schema cache") ||
      message.includes("does not exist")
    ) {
      return "Colonnes morceaux externes manquantes. Exécute la migration supabase/migrations/20260625140000_external_tracks.sql dans Supabase.";
    }
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
    const { externalId } = bodySchema.parse(body);

    const { data: existing } = await supabase
      .from("tracks")
      .select("*")
      .eq("user_id", user.id)
      .eq("source", "deezer")
      .eq("external_id", externalId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        track: existing,
        alreadyExists: true,
        message: "Ce morceau est déjà dans ta bibliothèque.",
      });
    }

    const deezerTrack = await getDeezerTrack(externalId);
    if (!deezerTrack?.previewUrl) {
      return NextResponse.json(
        { error: "Morceau introuvable ou sans extrait sur Deezer." },
        { status: 404 }
      );
    }

    const previewResponse = await fetch(deezerTrack.previewUrl, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!previewResponse.ok) {
      return NextResponse.json(
        { error: "Impossible de télécharger l'extrait 30s." },
        { status: 502 }
      );
    }

    const buffer = Buffer.from(await previewResponse.arrayBuffer());
    const audioContent = await analyzeAudioContent(buffer);

    if (!audioContent) {
      return NextResponse.json(
        { error: "Analyse audio de l'extrait impossible." },
        { status: 422 }
      );
    }

    const classification = await classifyTrackMetadata({
      title: deezerTrack.title,
      artist: deezerTrack.artist,
      rawGenre: null,
      filename: `${deezerTrack.title}.mp3`,
      audioFeatures: audioContent.features,
    });

    const audioDbFields = audioFeaturesToDbFields(audioContent.features);

    const { data: inserted, error: insertError } = await supabase
      .from("tracks")
      .insert({
        user_id: user.id,
        title: deezerTrack.title,
        artist: deezerTrack.artist,
        bpm: audioContent.features.detectedBpm ?? null,
        key: audioContent.detectedKey,
        style: classification.style,
        ambiances: classification.ambiances,
        source: "deezer",
        external_id: externalId,
        preview_url: deezerTrack.previewUrl,
        artwork_url: deezerTrack.artworkUrl,
        audio_url: null,
        duration_seconds: deezerTrack.durationSeconds || 30,
        waveform_peaks: audioContent.waveformPeaks.length
          ? audioContent.waveformPeaks
          : null,
        ...audioDbFields,
      })
      .select()
      .single();

    if (insertError) {
      const hint = migrationHint(insertError.message);
      return NextResponse.json(
        { error: hint ?? insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      track: inserted,
      alreadyExists: false,
      message: "Morceau ajouté et analysé (extrait 30s).",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Deezer import error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'import Deezer.",
      },
      { status: 500 }
    );
  }
}
