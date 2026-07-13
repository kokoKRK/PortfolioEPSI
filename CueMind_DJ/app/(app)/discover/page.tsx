"use client";

import { DiscoverSearch } from "@/components/discover/discover-search";

export default function DiscoverPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Découvrir</h1>
        <p className="text-muted-foreground mt-1">
          Explore le top du moment et les catégories, ou recherche un morceau.
          Chaque ajout est analysé automatiquement (BPM, style, énergie,
          ambiances) pour la génération de sets.
        </p>
      </div>
      <DiscoverSearch />
    </div>
  );
}
