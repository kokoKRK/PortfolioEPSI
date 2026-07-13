import Link from "next/link";
import { Import, ListMusic, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PlaylistsCustomPage() {
  return (
    <Card className="border-border bg-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ListMusic className="size-5 text-primary" />
          Mes playlists
        </CardTitle>
        <CardDescription>
          Crée tes propres playlists à partir de ta bibliothèque — indépendantes
          des crates par style.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <Plus className="text-muted-foreground mx-auto size-10" />
          <p className="mt-3 font-medium">Bientôt disponible</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Tu pourras créer des playlists personnalisées, les organiser librement
            et les importer depuis Spotify ou d&apos;autres services.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button disabled variant="default">
            <Plus className="size-4" />
            Nouvelle playlist
          </Button>
          <Button disabled variant="outline">
            <Import className="size-4" />
            Importer depuis Spotify
          </Button>
        </div>

        <p className="text-muted-foreground text-sm">
          En attendant, utilise les{" "}
          <Link href="/playlists/styles" className="text-primary hover:underline">
            playlists par style
          </Link>{" "}
          ou{" "}
          <Link href="/sets/ai" className="text-primary hover:underline">
            génère un set
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
