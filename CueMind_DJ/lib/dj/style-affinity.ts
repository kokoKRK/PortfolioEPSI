/** Styles compatibles en transition DJ (ponts entre crates) */
export const STYLE_BRIDGE: Record<string, string[]> = {
  House: ["Disco", "Funk", "Afrobeat", "Latino", "Ambient", "Techno", "Other"],
  Techno: ["House", "Trance", "Drum & Bass", "Other"],
  Trance: ["Techno", "House", "Ambient", "Other"],
  "Drum & Bass": ["Dubstep", "Techno", "Hip-Hop", "Other"],
  Dubstep: ["Drum & Bass", "Hip-Hop", "Other"],
  "Hip-Hop": ["R&B", "Pop", "Funk", "Afrobeat", "Other"],
  "R&B": ["Hip-Hop", "Pop", "Other"],
  Pop: ["House", "Disco", "Hip-Hop", "Latino", "Other"],
  Rock: ["Hip-Hop", "Pop", "Other"],
  Reggae: ["Afrobeat", "Latino", "Dubstep", "Other"],
  Latino: ["Afrobeat", "House", "Reggae", "Pop", "Other"],
  Afrobeat: ["House", "Latino", "Funk", "Disco", "Techno", "Other"],
  Disco: ["House", "Funk", "Pop", "Afrobeat", "Other"],
  Funk: ["House", "Disco", "Hip-Hop", "Afrobeat", "Other"],
  Ambient: ["House", "Trance", "Other"],
  Other: [
    "House",
    "Techno",
    "Afrobeat",
    "Hip-Hop",
    "Pop",
    "Disco",
    "Funk",
    "Latino",
  ],
};

export function stylesAreBridged(styleA: string, styleB: string): boolean {
  if (styleA.toLowerCase() === styleB.toLowerCase()) return true;
  const bridgesA = STYLE_BRIDGE[styleA] ?? STYLE_BRIDGE.Other;
  const bridgesB = STYLE_BRIDGE[styleB] ?? STYLE_BRIDGE.Other;
  return (
    bridgesA.some((s) => s.toLowerCase() === styleB.toLowerCase()) ||
    bridgesB.some((s) => s.toLowerCase() === styleA.toLowerCase())
  );
}

const TITLE_HINTS: Record<string, string[]> = {
  House: ["house", "deep", "soulful", "garage", "afro house"],
  Techno: ["techno", "acid", "rave", "warehouse", "minimal", "industrial"],
  Afrobeat: ["afro", "amapiano", "gqom", "afrobeats"],
  "Drum & Bass": ["dnb", "jungle", "neuro"],
  Disco: ["disco", "nu disco"],
  Funk: ["funk", "boogie"],
};

export function inferStylesFromTitle(title: string): string[] {
  const lower = title.toLowerCase();
  const found: string[] = [];
  for (const [style, keywords] of Object.entries(TITLE_HINTS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      found.push(style);
    }
  }
  return found;
}

export function trackEffectiveStyles(
  style: string | null,
  title: string,
  detectedStyle?: string | null,
  discogsGenre?: string | null
): string[] {
  const audioStyle =
    detectedStyle && detectedStyle !== "Other" ? detectedStyle : null;
  const base = audioStyle ?? style ?? "Other";
  const hints = inferStylesFromTitle(title);
  const set = new Set([base, ...hints]);
  if (style && style !== base) set.add(style);

  if (discogsGenre) {
    const g = discogsGenre.toLowerCase();
    if (g.includes("house")) set.add("House");
    if (g.includes("techno")) set.add("Techno");
    if (g.includes("trance")) set.add("Trance");
    if (g.includes("drum n bass") || g.includes("jungle")) {
      set.add("Drum & Bass");
    }
    if (g.includes("dubstep")) set.add("Dubstep");
    if (g.includes("ambient") || g.includes("downtempo")) set.add("Ambient");
    if (g.includes("disco")) set.add("Disco");
    if (g.includes("funk")) set.add("Funk");
    if (g.includes("hip hop")) set.add("Hip-Hop");
  }

  return [...set];
}
