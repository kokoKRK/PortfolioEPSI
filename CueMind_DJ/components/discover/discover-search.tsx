"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Flame, Loader2, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrackResultCard } from "@/components/discover/track-result-card";
import type { DeezerGenre, DeezerSearchResult } from "@/lib/deezer/client";
import { cn } from "@/lib/utils";
import type { Track } from "@/types/database";

type DiscoverSearchProps = {
  onTrackImported?: (track: Track) => void;
};

const TOP_GENRE_ID = 0;

export function DiscoverSearch({ onTrackImported }: DiscoverSearchProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"browse" | "search">("browse");

  const [genres, setGenres] = useState<DeezerGenre[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<number>(TOP_GENRE_ID);
  const [browseTracks, setBrowseTracks] = useState<DeezerSearchResult[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<DeezerSearchResult[]>([]);
  const [total, setTotal] = useState(0);

  const [importingId, setImportingId] = useState<string | null>(null);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const loadBrowse = useCallback(
    async (genreId: number, withGenres: boolean) => {
      setBrowseLoading(true);
      try {
        const params = new URLSearchParams({ genreId: String(genreId) });
        if (withGenres) params.set("withGenres", "true");
        const response = await fetch(`/api/deezer/browse?${params.toString()}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Erreur chargement");
        }
        setBrowseTracks(data.tracks ?? []);
        if (data.genres) setGenres(data.genres);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erreur de chargement"
        );
      } finally {
        setBrowseLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadBrowse(TOP_GENRE_ID, true);
  }, [loadBrowse]);

  function selectGenre(genreId: number) {
    setSelectedGenreId(genreId);
    void loadBrowse(genreId, false);
  }

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      toast.error("Saisis au moins 2 caractères.");
      return;
    }

    setMode("search");
    setSearching(true);
    try {
      const response = await fetch(
        `/api/deezer/search?q=${encodeURIComponent(trimmed)}&limit=24`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Erreur recherche");
      }
      setResults(data.results ?? []);
      setTotal(data.total ?? 0);
      if ((data.results ?? []).length === 0) {
        toast.info("Aucun résultat avec extrait disponible.");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erreur lors de la recherche"
      );
    } finally {
      setSearching(false);
    }
  }, []);

  function clearSearch() {
    setQuery("");
    setResults([]);
    setTotal(0);
    setMode("browse");
  }

  const handleImport = useCallback(
    async (result: DeezerSearchResult) => {
      setImportingId(result.externalId);
      try {
        const response = await fetch("/api/deezer/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ externalId: result.externalId }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Erreur import");
        }
        setImportedIds((prev) => new Set(prev).add(result.externalId));
        if (data.track) onTrackImported?.(data.track);
        toast.success(
          data.alreadyExists
            ? "Déjà dans ta bibliothèque"
            : "Ajouté et analysé (extrait 30s)"
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Erreur lors de l'import"
        );
      } finally {
        setImportingId(null);
      }
    },
    [onTrackImported]
  );

  const selectedGenreName =
    selectedGenreId === TOP_GENRE_ID
      ? "Top du moment"
      : (genres.find((g) => g.id === selectedGenreId)?.name ??
        "Sélection");

  function renderGrid(tracks: DeezerSearchResult[]) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((result) => (
          <TrackResultCard
            key={result.externalId}
            result={result}
            imported={importedIds.has(result.externalId)}
            importing={importingId === result.externalId}
            onImport={handleImport}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
      >
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un artiste, un titre, un album…"
            className="pl-9"
          />
          {mode === "search" && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Effacer"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={searching}>
          {searching ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Search className="size-4" />
          )}
          Rechercher
        </Button>
      </form>

      {mode === "search" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {results.length} résultat{results.length !== 1 ? "s" : ""}
              {total > results.length ? ` sur ~${total}` : ""} pour «{" "}
              {query.trim()} »
            </p>
            <Button variant="ghost" size="sm" onClick={clearSearch}>
              <X className="size-4" />
              Retour à la découverte
            </Button>
          </div>
          {searching ? (
            <BrowseSkeleton />
          ) : results.length > 0 ? (
            renderGrid(results)
          ) : (
            <div className="text-muted-foreground py-12 text-center">
              <p className="text-lg font-medium">Aucun résultat</p>
              <p className="text-sm">Essaie un autre artiste ou titre.</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Catégories */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" />
              Catégories
            </h2>
            <div className="flex flex-wrap gap-2">
              <CategoryChip
                label="Top du moment"
                active={selectedGenreId === TOP_GENRE_ID}
                onClick={() => selectGenre(TOP_GENRE_ID)}
              />
              {genres.map((genre) => (
                <CategoryChip
                  key={genre.id}
                  label={genre.name}
                  pictureUrl={genre.pictureUrl}
                  active={selectedGenreId === genre.id}
                  onClick={() => selectGenre(genre.id)}
                />
              ))}
            </div>
          </div>

          {/* Top / sélection de la catégorie */}
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Flame className="size-4 text-primary" />
              {selectedGenreName}
            </h2>
            {browseLoading ? (
              <BrowseSkeleton />
            ) : browseTracks.length > 0 ? (
              renderGrid(browseTracks)
            ) : (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Aucun morceau disponible pour cette catégorie.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  pictureUrl,
  active,
  onClick,
}: {
  label: string;
  pictureUrl?: string | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border hover:border-primary/40 hover:bg-muted/50"
      )}
    >
      <span className="bg-muted relative size-7 shrink-0 overflow-hidden rounded-full">
        {pictureUrl ? (
          <Image
            src={pictureUrl}
            alt=""
            fill
            className="object-cover"
            sizes="28px"
            unoptimized
          />
        ) : (
          <span className="flex size-full items-center justify-center">
            <Flame className="text-primary size-3.5" />
          </span>
        )}
      </span>
      {label}
    </button>
  );
}

function BrowseSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-muted/50 h-24 animate-pulse rounded-lg"
        />
      ))}
    </div>
  );
}
