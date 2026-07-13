import { parseCamelotKey, toCamelotKey } from "@/lib/dj/camelot";

/** Couleurs roue Camelot — style Rekordbox (A = minor, B = major) */
const CAMELOT_WHEEL: Record<number, { a: string; b: string }> = {
  1: {
    a: "bg-red-600/90 text-white border-red-400",
    b: "bg-red-400/90 text-white border-red-300",
  },
  2: {
    a: "bg-orange-600/90 text-white border-orange-400",
    b: "bg-orange-400/90 text-white border-orange-300",
  },
  3: {
    a: "bg-amber-600/90 text-white border-amber-400",
    b: "bg-amber-400/90 text-white border-amber-300",
  },
  4: {
    a: "bg-yellow-600/90 text-black border-yellow-400",
    b: "bg-yellow-400/90 text-black border-yellow-300",
  },
  5: {
    a: "bg-lime-600/90 text-black border-lime-400",
    b: "bg-lime-400/90 text-black border-lime-300",
  },
  6: {
    a: "bg-green-600/90 text-white border-green-400",
    b: "bg-green-400/90 text-white border-green-300",
  },
  7: {
    a: "bg-emerald-600/90 text-white border-emerald-400",
    b: "bg-emerald-400/90 text-white border-emerald-300",
  },
  8: {
    a: "bg-teal-600/90 text-white border-teal-400",
    b: "bg-teal-400/90 text-white border-teal-300",
  },
  9: {
    a: "bg-cyan-600/90 text-white border-cyan-400",
    b: "bg-cyan-400/90 text-white border-cyan-300",
  },
  10: {
    a: "bg-sky-600/90 text-white border-sky-400",
    b: "bg-sky-400/90 text-white border-sky-300",
  },
  11: {
    a: "bg-blue-600/90 text-white border-blue-400",
    b: "bg-blue-400/90 text-white border-blue-300",
  },
  12: {
    a: "bg-violet-600/90 text-white border-violet-400",
    b: "bg-violet-400/90 text-white border-violet-300",
  },
};

export function getKeyDisplay(rawKey: string | null | undefined): {
  label: string;
  className: string;
} {
  if (!rawKey) {
    return {
      label: "?",
      className:
        "bg-zinc-700/80 text-zinc-400 border-zinc-600 border border-dashed",
    };
  }

  const camelot = toCamelotKey(rawKey) ?? rawKey.toUpperCase();
  const parsed = parseCamelotKey(camelot);

  if (parsed) {
    const colors = CAMELOT_WHEEL[parsed.number];
    const className =
      parsed.letter === "A" ? colors.a : colors.b;
    return {
      label: `${parsed.number}${parsed.letter}`,
      className: `${className} border`,
    };
  }

  return {
    label: camelot,
    className: "bg-zinc-600/80 text-white border-zinc-500 border",
  };
}
