import { NextResponse } from "next/server";
import { analyzeAudioBuffer } from "@/lib/audio/analyze";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const formData = await request.formData().catch(() => null);

    if (!formData) {
      return NextResponse.json(
        {
          error:
            "Fichier trop volumineux ou requête invalide (max 50 Mo). Réessaie avec un fichier plus léger.",
        },
        { status: 413 }
      );
    }

    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Fichier requis" }, { status: 400 });
    }

    const allowedTypes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/wave",
    ];

    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav)$/i)) {
      return NextResponse.json(
        { error: "Format non supporté. Utilise MP3 ou WAV." },
        { status: 400 }
      );
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 50 Mo)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Import léger : on lit uniquement les tags ID3 (rapide, pas d'IA ni d'analyse
    // profonde du signal). L'analyse audio complète (BPM/clé/style/ambiances/waveform)
    // est lancée plus tard via le bouton « Analyser l'audio » de la bibliothèque.
    const analysis = await analyzeAudioBuffer(buffer, file.name);
    const tagStyle = analysis.style === "Unknown" ? null : analysis.style;

    // Anti-doublon : on évite de réimporter un morceau déjà présent (même titre
    // + même artiste pour cet utilisateur). On vérifie AVANT d'écrire le fichier
    // dans le storage pour ne pas créer d'objet orphelin.
    const normalizedArtist = (analysis.artist ?? "").trim().toLowerCase();
    // Échappe les jokers ilike (% et _) et l'antislash pour une comparaison exacte.
    const titlePattern = analysis.title.replace(/([\\%_])/g, "\\$1");
    const { data: sameTitle } = await supabase
      .from("tracks")
      .select("id, title, artist, source")
      .eq("user_id", user.id)
      .ilike("title", titlePattern);

    const duplicate = (sameTitle ?? []).find(
      (t) => (t.artist ?? "").trim().toLowerCase() === normalizedArtist
    );

    if (duplicate) {
      return NextResponse.json({
        track: duplicate,
        alreadyExists: true,
        analyzed: false,
      });
    }

    const fileId = crypto.randomUUID();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${user.id}/${fileId}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("audio-tracks")
      .upload(storagePath, buffer, {
        contentType: file.type || "audio/mpeg",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Erreur upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: track, error: insertError } = await supabase
      .from("tracks")
      .insert({
        user_id: user.id,
        title: analysis.title,
        artist: analysis.artist,
        bpm: analysis.bpm,
        key: analysis.key,
        style: tagStyle,
        ambiances: [],
        audio_url: storagePath,
        duration_seconds: analysis.durationSeconds,
      })
      .select()
      .single();

    if (insertError) {
      await supabase.storage.from("audio-tracks").remove([storagePath]);
      return NextResponse.json(
        { error: `Erreur base de données: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      track,
      analyzed: false,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Erreur lors de l'upload du morceau.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
