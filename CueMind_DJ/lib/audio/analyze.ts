import { parseBuffer } from "music-metadata";
import { toCamelotKey } from "@/lib/dj/camelot";

export type AudioAnalysis = {
  title: string;
  artist: string | null;
  bpm: number | null;
  key: string | null;
  style: string;
  durationSeconds: number | null;
};

function parseBpm(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return Math.round(parsed * 100) / 100;
  }
  return null;
}

export function extractTitleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/\s*\[[^\]]+\]\s*/g, " ")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fallbackAnalysis(filename: string): AudioAnalysis {
  const title = extractTitleFromFilename(filename) || "Untitled";
  return {
    title,
    artist: null,
    bpm: null,
    key: null,
    style: "Unknown",
    durationSeconds: null,
  };
}

async function parseMetadata(
  buffer: Buffer,
  filename: string
): Promise<AudioAnalysis> {
  const metadata = await parseBuffer(
    Uint8Array.from(buffer),
    { mimeType: undefined },
    { skipCovers: true }
  );

  const { common, format } = metadata;

  const title =
    common.title?.trim() ||
    extractTitleFromFilename(filename) ||
    "Untitled";

  const artist = common.artist?.trim() || common.artists?.[0]?.trim() || null;

  const commonExtra = common as unknown as Record<string, unknown>;

  const bpm =
    parseBpm(common.bpm) ??
    parseBpm(commonExtra.TBPM) ??
    parseBpm(commonExtra.tbpm);

  const rawKey =
    commonExtra.initialKey?.toString() ??
    commonExtra.key?.toString() ??
    commonExtra.TKEY?.toString() ??
    null;

  const key = toCamelotKey(rawKey);

  const genre = common.genre?.[0]?.trim();
  const style = genre || "Unknown";

  const durationSeconds = format.duration
    ? Math.round(format.duration)
    : null;

  return {
    title,
    artist,
    bpm,
    key,
    style,
    durationSeconds,
  };
}

export async function analyzeAudioBuffer(
  buffer: Buffer,
  filename: string
): Promise<AudioAnalysis> {
  if (buffer.length === 0) {
    throw new Error("Le fichier est vide ou corrompu.");
  }

  try {
    return await parseMetadata(buffer, filename);
  } catch (error) {
    console.warn(
      `Analyse métadonnées échouée pour ${filename}, fallback:`,
      error
    );
    return fallbackAnalysis(filename);
  }
}
