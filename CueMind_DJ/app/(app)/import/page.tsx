"use client";

import { TrackUpload } from "@/components/tracks/track-upload";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importer des morceaux</h1>
        <p className="text-muted-foreground mt-1">
          Glisse un dossier ou plusieurs fichiers. Chaque morceau sera analysé
          (BPM Essentia, Discogs-EffNet 400 genres, MusiCNN) et{" "}
          <span className="text-primary">classé automatiquement</span> dans tes
          playlists — retrouve-les dans l&apos;onglet Playlists.
        </p>
      </div>

      <TrackUpload />

      <Card className="border-border/60 bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Comment ça marche ?</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>1. Upload tes MP3/WAV (fichier, lot ou dossier entier)</p>
          <p>
            2. Analyse Essentia + Discogs-EffNet (400 genres) + MusiCNN + IA
          </p>
          <p>
            3. Le morceau apparaît dans ta bibliothèque ET dans la playlist du
            style correspondant
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
