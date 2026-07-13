import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeAudioBuffer } from "@/lib/audio/analyze";
import { classifyTrackMetadata } from "@/lib/ai/classify-track-metadata";
import {
  analyzeAudioContent,
  audioFeaturesToDbFields,
} from "@/lib/audio/analyze-content";
import { createClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  trackId: z.string().uuid(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await request.json();
    const { trackId } = bodySchema.parse(body);

    const { data: track, error: fetchError } = await supabase
      .from("tracks")
      .select("*")
      .eq("id", trackId)
      .single();

    if (fetchError || !track) {
      return NextResponse.json(
        { error: "Morceau introuvable" },
        { status: 404 }
      );
    }

    if (!track.audio_url) {
      return NextResponse.json(
        { error: "Ce morceau n'a pas de fichier local (source Deezer)." },
        { status: 400 }
      );
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from("audio-tracks")
      .download(track.audio_url);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: "Impossible de télécharger le fichier audio" },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const filename = track.audio_url.split("/").pop() ?? "track.mp3";
    const analysis = await analyzeAudioBuffer(buffer, filename);
    const audioContent = await analyzeAudioContent(buffer, analysis.bpm);

    const classification = await classifyTrackMetadata({
      title: analysis.title,
      artist: analysis.artist,
      rawGenre: analysis.style === "Unknown" ? null : analysis.style,
      filename,
      audioFeatures: audioContent?.features ?? null,
    });

    const waveformPeaks = audioContent?.waveformPeaks ?? [];
    const bpm = analysis.bpm ?? audioContent?.features.detectedBpm ?? null;
    const audioDbFields = audioContent
      ? audioFeaturesToDbFields(audioContent.features)
      : {};

    const { data: updated, error: updateError } = await supabase
      .from("tracks")
      .update({
        title: analysis.title,
        artist: analysis.artist,
        bpm,
        key: analysis.key ?? audioContent?.detectedKey ?? null,
        style: classification.style,
        ambiances: classification.ambiances,
        duration_seconds: analysis.durationSeconds,
        waveform_peaks: waveformPeaks.length ? waveformPeaks : null,
        ...audioDbFields,
      })
      .eq("id", trackId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      track: updated,
      audioAnalysis: audioContent?.features ?? null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'analyse." },
      { status: 500 }
    );
  }
}
