const MAJOR_KEYS: Record<string, string> = {
  "C": "8B", "G": "9B", "D": "10B", "A": "11B", "E": "12B", "B": "1B",
  "F#": "2B", "Gb": "2B", "Db": "3B", "C#": "3B", "Ab": "4B", "G#": "4B",
  "Eb": "5B", "D#": "5B", "Bb": "6B", "A#": "6B", "F": "7B",
};

const MINOR_KEYS: Record<string, string> = {
  "Am": "8A", "Em": "9A", "Bm": "10A", "F#m": "11A", "Fbm": "11A",
  "C#m": "12A", "Dbm": "12A", "G#m": "1A", "Abm": "1A", "D#m": "2A",
  "Ebm": "2A", "A#m": "3A", "Bbm": "3A", "Fm": "4A", "Cm": "5A",
  "Gm": "6A", "Dm": "7A",
};

const CAMELOT_REGEX = /^(\d{1,2})([AB])$/i;

export function parseCamelotKey(key: string): { number: number; letter: "A" | "B" } | null {
  const match = key.trim().match(CAMELOT_REGEX);
  if (!match) return null;

  const number = parseInt(match[1], 10);
  if (number < 1 || number > 12) return null;

  return {
    number,
    letter: match[2].toUpperCase() as "A" | "B",
  };
}

export function toCamelotKey(rawKey: string | null | undefined): string | null {
  if (!rawKey) return null;

  const trimmed = rawKey.trim();
  if (!trimmed) return null;

  if (parseCamelotKey(trimmed)) {
    const parsed = parseCamelotKey(trimmed)!;
    return `${parsed.number}${parsed.letter}`;
  }

  const normalized = trimmed
    .replace(/\s+/g, "")
    .replace(/major/gi, "")
    .replace(/minor/gi, "m")
    .replace(/min$/i, "m");

  if (MINOR_KEYS[normalized]) return MINOR_KEYS[normalized];
  if (MAJOR_KEYS[normalized]) return MAJOR_KEYS[normalized];

  const minorMatch = normalized.match(/^([A-G][#b]?)m$/i);
  if (minorMatch) {
    const note = minorMatch[1].charAt(0).toUpperCase() + minorMatch[1].slice(1);
    const key = note.endsWith("m") ? note : `${note}m`;
    if (MINOR_KEYS[key]) return MINOR_KEYS[key];
  }

  const majorMatch = normalized.match(/^([A-G][#b]?)$/i);
  if (majorMatch) {
    const note = majorMatch[1].charAt(0).toUpperCase() + majorMatch[1].slice(1);
    if (MAJOR_KEYS[note]) return MAJOR_KEYS[note];
  }

  return null;
}

export function areKeysCompatible(
  keyA: string | null | undefined,
  keyB: string | null | undefined
): boolean | null {
  if (!keyA || !keyB) return null;

  const a = parseCamelotKey(toCamelotKey(keyA) ?? keyA);
  const b = parseCamelotKey(toCamelotKey(keyB) ?? keyB);

  if (!a || !b) return null;
  if (a.number === b.number && a.letter === b.letter) return true;

  if (a.number === b.number && a.letter !== b.letter) return true;

  const diff = Math.abs(a.number - b.number);
  const wrapDiff = Math.min(diff, 12 - diff);
  if (wrapDiff === 1 && a.letter === b.letter) return true;

  return false;
}

export function getKeyBadgeVariant(
  compatible: boolean | null
): "success" | "warning" | "secondary" {
  if (compatible === true) return "success";
  if (compatible === false) return "warning";
  return "secondary";
}
