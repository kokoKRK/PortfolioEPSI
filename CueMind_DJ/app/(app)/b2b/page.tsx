"use client";

import { B2bPanel } from "@/components/b2b/b2b-panel";
import { useTracks } from "@/hooks/use-tracks";

export default function B2bPage() {
  const { tracks, loading } = useTracks();

  if (loading) {
    return (
      <div className="text-muted-foreground py-12 text-center">
        Chargement de ta bibliothèque...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">B2B avec l&apos;IA</h1>
        <p className="text-muted-foreground mt-1">
          Entraîne-toi comme en back-to-back — l&apos;IA te suggère le prochain
          morceau et explique pourquoi.
        </p>
      </div>
      <B2bPanel tracks={tracks} />
    </div>
  );
}
