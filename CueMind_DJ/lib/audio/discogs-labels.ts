import { readFileSync } from "node:fs";
import { getDiscogsLabelsJsonPath } from "@/lib/audio/model-paths";

let cachedLabels: string[] | null = null;

export function getDiscogsLabels(): string[] {
  if (cachedLabels) return cachedLabels;
  const raw = readFileSync(getDiscogsLabelsJsonPath(), "utf8");
  const json = JSON.parse(raw) as { classes?: string[] };
  cachedLabels = json.classes ?? [];
  return cachedLabels;
}

export function formatDiscogsGenre(label: string): string {
  const parts = label.split("---");
  return parts.length > 1 ? parts[1] : label;
}

export type DiscogsGenreGroup = {
  parent: string;
  subgenres: string[];
};

/**
 * Regroupe les 400 labels Discogs par genre parent (ex: "Blues", "Electronic")
 * avec leurs sous-genres, triés alphabétiquement.
 */
export function getGroupedDiscogsGenres(): DiscogsGenreGroup[] {
  const labels = getDiscogsLabels();
  const map = new Map<string, string[]>();

  for (const label of labels) {
    const parts = label.split("---");
    const parent = parts[0]?.trim() || "Autres";
    const sub = (parts[1] ?? parts[0] ?? "").trim();
    if (!map.has(parent)) map.set(parent, []);
    if (sub) map.get(parent)!.push(sub);
  }

  return [...map.entries()]
    .map(([parent, subgenres]) => ({
      parent,
      subgenres: subgenres.sort((a, b) => a.localeCompare(b, "fr")),
    }))
    .sort((a, b) => a.parent.localeCompare(b.parent, "fr"));
}
