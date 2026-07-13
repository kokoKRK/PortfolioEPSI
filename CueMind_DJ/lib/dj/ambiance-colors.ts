/**
 * Couleurs hex par ambiance, alignées sur les badges colorés de la
 * bibliothèque (teintes Tailwind -400). Utilisées pour le rendu SVG.
 */
export const AMBIANCE_HEX: Record<string, string> = {
  Énergique: "#fb923c",
  Chill: "#38bdf8",
  Festif: "#f472b6",
  Sombre: "#94a3b8",
  Romantique: "#fb7185",
  Dansant: "#e879f9",
  Mélancolique: "#818cf8",
  Agressif: "#f87171",
  Nostalgique: "#fbbf24",
  Hypnotique: "#a78bfa",
  Uplifting: "#facc15",
  Groove: "#34d399",
};

const FALLBACK = "#9ca3af";

export function getAmbianceHex(ambiance: string | null | undefined): string {
  if (!ambiance) return FALLBACK;
  const match = Object.keys(AMBIANCE_HEX).find(
    (key) => key.toLowerCase() === ambiance.toLowerCase()
  );
  return match ? AMBIANCE_HEX[match] : FALLBACK;
}
