import { classifyTrackMetadata } from "@/lib/ai/classify-track-metadata";
import {
  analyzeAudioContent,
  audioFeaturesToDbFields,
} from "@/lib/audio/analyze-content";
import {
  getDeezerChartTracks,
  searchDeezer,
  type DeezerSearchResult,
} from "@/lib/deezer/client";
import type { Track } from "@/types/database";

/**
 * Préfixe d'id pour les candidats Deezer analysés en mémoire (pas encore en base).
 * Permet de repérer, après génération du set, les morceaux à importer réellement.
 */
export const DEEZER_CANDIDATE_PREFIX = "deezer-candidate:";

export function isDeezerCandidateId(id: string): boolean {
  return id.startsWith(DEEZER_CANDIDATE_PREFIX);
}

type GatherOptions = {
  userId: string;
  /** Styles ciblés (parcours du set) — utilisés comme requêtes Deezer. */
  styles?: string[];
  /** Ambiances ciblées — combinées aux styles pour affiner la recherche. */
  ambiances?: string[];
  /** Requête libre (prompt) en dernier recours. */
  promptQuery?: string;
  /** Nombre max d'extraits à télécharger + analyser. */
  limit: number;
  /**
   * Exiger une clé Camelot détectée (sinon le morceau est écarté). Améliore
   * fortement la cohérence harmonique des sets 100% découverte.
   */
  requireKey?: boolean;
};

type QuerySpec = {
  query: string;
  /** Style à appliquer au morceau s'il provient d'une recherche par style. */
  styleHint: string | null;
};

function buildQueries(
  styles: string[] | undefined,
  ambiances: string[] | undefined,
  promptQuery: string | undefined
): QuerySpec[] {
  const styleList = (styles ?? []).filter(Boolean).slice(0, 5);
  const ambianceList = (ambiances ?? []).filter(Boolean);
  const specs: QuerySpec[] = [];

  for (const style of styleList) {
    specs.push({ query: style, styleHint: style });
    if (ambianceList[0]) {
      specs.push({ query: `${style} ${ambianceList[0]}`, styleHint: style });
    }
  }

  if (styleList.length === 0 && ambianceList.length > 0) {
    for (const ambiance of ambianceList.slice(0, 3)) {
      specs.push({ query: ambiance, styleHint: null });
    }
  }

  if (specs.length === 0 && promptQuery?.trim()) {
    specs.push({ query: promptQuery.trim(), styleHint: null });
  }

  const seen = new Set<string>();
  return specs.filter((s) => {
    const key = s.query.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type PooledResult = DeezerSearchResult & { styleHint: string | null };

/** Mélange les résultats par requête en round-robin pour varier les styles. */
function roundRobinPool(perQuery: PooledResult[][]): PooledResult[] {
  const seen = new Set<string>();
  const pool: PooledResult[] = [];
  let index = 0;
  let added = true;

  while (added) {
    added = false;
    for (const arr of perQuery) {
      const result = arr[index];
      if (!result) continue;
      added = true;
      if (seen.has(result.externalId)) continue;
      seen.add(result.externalId);
      pool.push(result);
    }
    index += 1;
  }

  return pool;
}

function buildCandidateTrack(
  userId: string,
  dz: DeezerSearchResult,
  audioContent: NonNullable<Awaited<ReturnType<typeof analyzeAudioContent>>>,
  classification: { style: string | null; ambiances: string[] },
  styleHint: string | null
): Track {
  const audioDb = audioFeaturesToDbFields(audioContent.features);
  const now = new Date().toISOString();

  return {
    id: `${DEEZER_CANDIDATE_PREFIX}${dz.externalId}`,
    user_id: userId,
    title: dz.title,
    artist: dz.artist,
    bpm: audioContent.features.detectedBpm ?? null,
    key: audioContent.detectedKey,
    // Le style recherché garantit que le morceau intègre bien le parcours.
    style: styleHint ?? classification.style,
    ambiances: classification.ambiances,
    detected_style: audioDb.detected_style,
    energy_level: audioDb.energy_level,
    audio_bpm: audioDb.audio_bpm,
    audio_energy: audioDb.audio_energy,
    audio_features: audioDb.audio_features,
    audio_analyzed_at: audioDb.audio_analyzed_at,
    audio_url: null,
    source: "deezer",
    external_id: dz.externalId,
    preview_url: dz.previewUrl,
    artwork_url: dz.artworkUrl,
    duration_seconds: dz.durationSeconds || 30,
    waveform_peaks: audioContent.waveformPeaks.length
      ? audioContent.waveformPeaks
      : null,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Recherche des morceaux Deezer ciblés, télécharge et analyse leurs extraits 30s,
 * et renvoie des objets `Track` prêts à être mélangés au pool de génération.
 * Les morceaux retournés ne sont PAS encore en base (id préfixé).
 */
export async function gatherDeezerCandidates(
  options: GatherOptions
): Promise<{ candidates: Track[]; failed: number }> {
  const { userId, limit } = options;
  if (limit <= 0) return { candidates: [], failed: 0 };

  const specs = buildQueries(options.styles, options.ambiances, options.promptQuery);

  const perQuery: PooledResult[][] = [];
  for (const spec of specs) {
    try {
      const { results } = await searchDeezer(spec.query, 15);
      perQuery.push(
        results
          .filter((r) => Boolean(r.previewUrl))
          // On privilégie les morceaux les plus populaires (connus) de chaque style.
          .sort((a, b) => b.rank - a.rank)
          .map((r) => ({ ...r, styleHint: spec.styleHint }))
      );
    } catch {
      perQuery.push([]);
    }
  }

  let pool = roundRobinPool(perQuery);

  // Repli sur le top global si aucune recherche n'a abouti.
  if (pool.length === 0) {
    try {
      const chart = await getDeezerChartTracks(0, limit * 2);
      pool = chart
        .filter((r) => Boolean(r.previewUrl))
        .map((r) => ({ ...r, styleHint: null }));
    } catch {
      pool = [];
    }
  }

  // On écarte les titres très peu connus si on garde assez de candidats.
  const POPULARITY_FLOOR = 100_000;
  const popular = pool.filter((r) => r.rank >= POPULARITY_FLOOR);
  if (popular.length >= limit) {
    pool = popular;
  }

  const requireKey = options.requireKey ?? false;
  const candidates: Track[] = [];
  let failed = 0;
  let attempts = 0;
  // Borne le nombre de téléchargements/analyses pour éviter des temps trop longs
  // quand beaucoup d'extraits sont écartés (clé/BPM manquants).
  const maxAttempts = Math.min(pool.length, limit + 12);

  for (const dz of pool) {
    if (candidates.length >= limit) break;
    if (attempts >= maxAttempts) break;
    if (!dz.previewUrl) continue;
    attempts += 1;

    try {
      const previewResponse = await fetch(dz.previewUrl, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!previewResponse.ok) {
        failed += 1;
        continue;
      }

      const buffer = Buffer.from(await previewResponse.arrayBuffer());
      const audioContent = await analyzeAudioContent(buffer);
      if (!audioContent || audioContent.features.detectedBpm == null) {
        failed += 1;
        continue;
      }

      // Sans clé Camelot fiable, la cohérence harmonique est impossible.
      if (requireKey && !audioContent.detectedKey) {
        failed += 1;
        continue;
      }

      const classification = await classifyTrackMetadata({
        title: dz.title,
        artist: dz.artist,
        rawGenre: null,
        filename: `${dz.title}.mp3`,
        audioFeatures: audioContent.features,
      });

      candidates.push(
        buildCandidateTrack(userId, dz, audioContent, classification, dz.styleHint)
      );
    } catch {
      failed += 1;
    }
  }

  return { candidates, failed };
}
