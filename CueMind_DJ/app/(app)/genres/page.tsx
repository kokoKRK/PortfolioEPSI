import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { GenresExplorer } from "@/components/genres/genres-explorer";
import { Button } from "@/components/ui/button";
import { getGroupedDiscogsGenres } from "@/lib/audio/discogs-labels";

export const metadata = {
  title: "Genres détectables — CueMind",
  description:
    "Les 400 styles musicaux que l'IA peut reconnaître à partir du signal audio.",
};

export default function GenresPage() {
  const groups = getGroupedDiscogsGenres();
  const totalSubgenres = groups.reduce(
    (sum, group) => sum + group.subgenres.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link href="/library">
            <ArrowLeft className="mr-2 size-4" />
            Retour à la bibliothèque
          </Link>
        </Button>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="text-primary size-6" />
          Genres détectables par l&apos;IA
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl">
          CueMind analyse directement le <strong>signal audio</strong> de chaque
          morceau grâce au modèle de deep learning{" "}
          <strong>Discogs-EffNet</strong>, entraîné sur la base de données
          Discogs. Il reconnaît <strong>{totalSubgenres} sous-genres</strong>{" "}
          répartis en {groups.length} grandes familles musicales. Le style
          retenu pour ta bibliothèque est ensuite simplifié dans une catégorie
          principale (House, Techno, Hip-Hop…) pour faciliter la génération de
          sets.
        </p>
      </div>

      <GenresExplorer groups={groups} totalSubgenres={totalSubgenres} />
    </div>
  );
}
