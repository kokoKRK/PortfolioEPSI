"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { buildSetStoryPoints } from "@/lib/dj/set-energy";
import { getAmbianceHex } from "@/lib/dj/ambiance-colors";
import type { GeneratedSetTrack } from "@/types/database";

type SetStoryboardProps = {
  tracks: GeneratedSetTrack[];
};

const WIDTH = 640;
const HEIGHT = 230;
const PADDING = { top: 20, right: 16, left: 48 };
const LINE_H = 108;
const RIBBON_TOP = PADDING.top + LINE_H + 26;
const RIBBON_H = 34;

export function SetStoryboard({ tracks }: SetStoryboardProps) {
  const points = useMemo(() => buildSetStoryPoints(tracks), [tracks]);

  const peakIdx = useMemo(() => {
    if (points.length === 0) return 0;
    let best = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i].bpm > points[best].bpm) best = i;
    }
    return best;
  }, [points]);

  if (points.length < 2) return null;

  const totalMinutes =
    points[points.length - 1].startMinute +
    points[points.length - 1].durationMinutes;
  const chartW = WIDTH - PADDING.left - PADDING.right;

  const maxBpm = Math.max(...points.map((p) => p.bpm), 120);
  const minBpm = Math.min(...points.map((p) => p.bpm), 80);
  const bpmRange = Math.max(maxBpm - minBpm, 10);

  const xAt = (minute: number) =>
    PADDING.left + (minute / totalMinutes) * chartW;
  const bpmYAt = (bpm: number) =>
    PADDING.top + LINE_H - ((bpm - minBpm) / bpmRange) * LINE_H;

  const bpmPath = points
    .map((p, i) => {
      const cx = xAt(p.startMinute + p.durationMinutes / 2);
      const cy = bpmYAt(p.bpm);
      return `${i === 0 ? "M" : "L"} ${cx} ${cy}`;
    })
    .join(" ");

  const peak = points[peakIdx];
  const peakX = xAt(peak.startMinute + peak.durationMinutes / 2);

  // Ambiances présentes dans le set (pour la légende)
  const usedAmbiances = [
    ...new Set(points.map((p) => p.primaryAmbiance).filter(Boolean)),
  ] as string[];

  const withoutAmbiance = points.filter((p) => !p.primaryAmbiance).length;

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="size-4 text-primary" />
          Storyboard du set
        </p>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3 rounded-full bg-amber-400" />
            BPM
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block size-2 rounded-sm bg-primary/60" />
            Ambiance
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Courbe BPM et ambiance du set"
      >
        {/* Grille + axe BPM (gauche) */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = PADDING.top + LINE_H * (1 - t);
          const bpmValue = Math.round(minBpm + bpmRange * t);
          return (
            <g key={t}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={WIDTH - PADDING.right}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
              <text
                x={PADDING.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-amber-400 text-[9px]"
              >
                {bpmValue}
              </text>
            </g>
          );
        })}

        <text
          x={12}
          y={PADDING.top + LINE_H / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${PADDING.top + LINE_H / 2})`}
          className="fill-amber-400 text-[10px] font-medium"
        >
          BPM
        </text>

        {/* Courbe BPM */}
        <path
          d={bpmPath}
          fill="none"
          stroke="currentColor"
          className="text-amber-400"
          strokeWidth={2.5}
        />
        {points.map((p) => (
          <circle
            key={p.trackId}
            cx={xAt(p.startMinute + p.durationMinutes / 2)}
            cy={bpmYAt(p.bpm)}
            r={p.position === peak.position ? 4.5 : 3}
            className={
              p.position === peak.position
                ? "fill-amber-300"
                : "fill-amber-400/70"
            }
          />
        ))}

        {/* Marqueur tempo max */}
        <line
          x1={peakX}
          y1={PADDING.top}
          x2={peakX}
          y2={PADDING.top + LINE_H}
          stroke="currentColor"
          className="text-accent"
          strokeWidth={1}
          strokeDasharray="3 3"
          strokeOpacity={0.6}
        />
        <text
          x={peakX}
          y={PADDING.top - 4}
          textAnchor="middle"
          className="fill-accent text-[10px] font-medium"
        >
          Tempo max
        </text>

        {/* Ruban d'ambiances */}
        <text
          x={12}
          y={RIBBON_TOP + RIBBON_H / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${RIBBON_TOP + RIBBON_H / 2})`}
          className="fill-primary text-[10px] font-medium"
        >
          Ambiance
        </text>
        {points.map((p) => {
          const x = xAt(p.startMinute);
          const w = Math.max((p.durationMinutes / totalMinutes) * chartW, 2);
          const color = getAmbianceHex(p.primaryAmbiance);
          const showLabel = w > 46 && p.primaryAmbiance;
          return (
            <g key={`amb-${p.trackId}`}>
              <title>
                #{p.position} {p.title} —{" "}
                {p.primaryAmbiance ?? "ambiance inconnue"}
              </title>
              <rect
                x={x}
                y={RIBBON_TOP}
                width={w - 1}
                height={RIBBON_H}
                rx={3}
                fill={color}
                fillOpacity={p.primaryAmbiance ? 0.85 : 0.3}
              />
              {showLabel && (
                <text
                  x={x + w / 2}
                  y={RIBBON_TOP + RIBBON_H / 2 + 3}
                  textAnchor="middle"
                  className="fill-black/80 text-[9px] font-medium"
                >
                  {p.primaryAmbiance}
                </text>
              )}
            </g>
          );
        })}

        {/* Axe temps */}
        <text
          x={PADDING.left}
          y={RIBBON_TOP + RIBBON_H + 16}
          className="fill-muted-foreground text-[10px]"
        >
          0 min
        </text>
        <text
          x={WIDTH - PADDING.right}
          y={RIBBON_TOP + RIBBON_H + 16}
          textAnchor="end"
          className="fill-muted-foreground text-[10px]"
        >
          ~{Math.round(totalMinutes)} min
        </text>
      </svg>

      {/* Légende des ambiances */}
      {usedAmbiances.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {usedAmbiances.map((a) => (
            <span
              key={a}
              className="text-muted-foreground flex items-center gap-1 text-[11px]"
            >
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ backgroundColor: getAmbianceHex(a) }}
              />
              {a}
            </span>
          ))}
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        BPM de {Math.round(minBpm)} à {Math.round(maxBpm)} sur le set · tempo max
        sur le morceau #{peak.position} « {peak.title} ».
        {withoutAmbiance > 0 &&
          ` ${withoutAmbiance} morceau${withoutAmbiance > 1 ? "x" : ""} sans ambiance détectée.`}
      </p>
    </div>
  );
}
