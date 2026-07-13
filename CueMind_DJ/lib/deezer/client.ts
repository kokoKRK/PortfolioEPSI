const DEEZER_API = "https://api.deezer.com";

export type DeezerSearchResult = {
  externalId: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  previewUrl: string | null;
  durationSeconds: number;
  isrc: string | null;
  rank: number;
  deezerUrl: string;
};

type DeezerArtist = {
  name?: string;
};

type DeezerAlbum = {
  cover_medium?: string;
  cover_small?: string;
};

type DeezerTrack = {
  id: number;
  title?: string;
  artist?: DeezerArtist;
  album?: DeezerAlbum;
  preview?: string;
  duration?: number;
  isrc?: string;
  rank?: number;
  link?: string;
  readable?: boolean;
};

type DeezerSearchResponse = {
  data?: DeezerTrack[];
  total?: number;
  next?: string;
  error?: { type: string; message: string };
};

type DeezerTrackResponse = DeezerTrack & {
  error?: { type: string; message: string };
};

export type DeezerGenre = {
  id: number;
  name: string;
  pictureUrl: string | null;
};

type DeezerGenreApi = {
  id: number;
  name?: string;
  picture_medium?: string;
  picture_big?: string;
};

type DeezerGenreResponse = {
  data?: DeezerGenreApi[];
  error?: { type: string; message: string };
};

function mapTrack(track: DeezerTrack): DeezerSearchResult | null {
  if (!track.id || !track.title) return null;
  // Les charts par genre n'envoient pas toujours `readable` — on exclut seulement si false.
  if (track.readable === false) return null;
  if (!track.preview) return null;

  return {
    externalId: String(track.id),
    title: track.title,
    artist: track.artist?.name ?? "Artiste inconnu",
    artworkUrl: track.album?.cover_medium ?? track.album?.cover_small ?? null,
    previewUrl: track.preview,
    durationSeconds: track.duration ?? 0,
    isrc: track.isrc ?? null,
    rank: track.rank ?? 0,
    deezerUrl: track.link ?? `https://www.deezer.com/track/${track.id}`,
  };
}

async function fetchDeezer<T>(path: string): Promise<T> {
  const response = await fetch(`${DEEZER_API}${path}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12_000),
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Deezer API error ${response.status}`);
  }

  const data = (await response.json()) as T & {
    error?: { type: string; message: string };
  };

  if (data.error) {
    throw new Error(data.error.message || "Erreur Deezer");
  }

  return data;
}

export async function searchDeezer(
  query: string,
  limit = 20
): Promise<{ results: DeezerSearchResult[]; total: number }> {
  const q = query.trim();
  if (q.length < 2) {
    return { results: [], total: 0 };
  }

  const safeLimit = Math.min(Math.max(limit, 1), 25);
  const data = await fetchDeezer<DeezerSearchResponse>(
    `/search?q=${encodeURIComponent(q)}&limit=${safeLimit}`
  );

  const results = (data.data ?? [])
    .map(mapTrack)
    .filter((t): t is DeezerSearchResult => t !== null);

  return { results, total: data.total ?? results.length };
}

export async function getDeezerTrack(
  externalId: string
): Promise<DeezerSearchResult | null> {
  const id = externalId.trim();
  if (!id) return null;

  const track = await fetchDeezer<DeezerTrackResponse>(`/track/${id}`);
  return mapTrack(track);
}

/** URL d'extrait 30s fraîche (les URLs signées expirent). */
export async function getDeezerPreviewUrl(
  externalId: string
): Promise<string | null> {
  const track = await getDeezerTrack(externalId);
  return track?.previewUrl ?? null;
}

/**
 * Top des morceaux. `genreId` = 0 pour le top global, sinon l'id d'un genre
 * Deezer (cf. getDeezerGenres) pour le top d'une catégorie.
 */
export async function getDeezerChartTracks(
  genreId = 0,
  limit = 24
): Promise<DeezerSearchResult[]> {
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const data = await fetchDeezer<DeezerSearchResponse>(
    `/chart/${genreId}/tracks?limit=${safeLimit}`
  );

  return (data.data ?? [])
    .map(mapTrack)
    .filter((t): t is DeezerSearchResult => t !== null);
}

/** Liste des catégories musicales (genres Deezer). */
export async function getDeezerGenres(): Promise<DeezerGenre[]> {
  const data = await fetchDeezer<DeezerGenreResponse>("/genre");

  return (data.data ?? [])
    .filter((g) => g.id !== 0 && g.name)
    .map((g) => ({
      id: g.id,
      name: g.name as string,
      pictureUrl: g.picture_medium ?? g.picture_big ?? null,
    }));
}
