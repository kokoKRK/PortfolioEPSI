"use client";

import {
  peaksFromArrayBuffer,
  WAVEFORM_PEAK_COUNT,
} from "@/lib/audio/waveform-peaks";
import { getSignedAudioUrl } from "@/lib/audio/signed-url";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

type TrackWaveformProps = {
  audioPath?: string | null;
  peaks: number[] | null;
  className?: string;
  isActive?: boolean;
};

function WaveformSvg({
  peaks,
  className,
  isActive,
}: {
  peaks: number[];
  className?: string;
  isActive?: boolean;
}) {
  const height = 100;
  const width = peaks.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn(
        "h-10 w-full",
        isActive ? "text-brand-hover" : "text-primary",
        className
      )}
      aria-hidden
    >
      {peaks.map((peak, i) => {
        const barHeight = Math.max(peak * height, 2);
        const y = (height - barHeight) / 2;
        return (
          <rect
            key={i}
            x={i}
            y={y}
            width={0.85}
            height={barHeight}
            rx={0.2}
            className="fill-current opacity-90"
          />
        );
      })}
    </svg>
  );
}

function WaveformPlaceholder() {
  return (
    <div className="flex h-10 w-full items-center gap-px opacity-30">
      {Array.from({ length: 32 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-muted-foreground/40"
          style={{ height: `${30 + (i % 5) * 12}%` }}
        />
      ))}
    </div>
  );
}

export function TrackWaveform({
  audioPath,
  peaks: storedPeaks,
  className,
  isActive,
}: TrackWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [peaks, setPeaks] = useState<number[] | null>(
    storedPeaks?.length ? storedPeaks : null
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (storedPeaks?.length) {
      setPeaks(storedPeaks);
    }
  }, [storedPeaks]);

  useEffect(() => {
    if (peaks?.length || loading || !audioPath) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void loadPeaks();
      },
      { rootMargin: "100px" }
    );

    observer.observe(el);
    return () => observer.disconnect();

    async function loadPeaks() {
      if (!audioPath) return;
      setLoading(true);
      try {
        const signedUrl = await getSignedAudioUrl(audioPath);

        const response = await fetch(signedUrl);
        if (!response.ok) return;

        const arrayBuffer = await response.arrayBuffer();
        const generated = await peaksFromArrayBuffer(
          arrayBuffer,
          WAVEFORM_PEAK_COUNT
        );
        if (generated.length) setPeaks(generated);
      } catch {
        // Silencieux — placeholder reste affiché
      } finally {
        setLoading(false);
      }
    }
  }, [audioPath, peaks, loading]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full min-w-[14rem]",
        isActive && "rounded ring-1 ring-primary/40",
        className
      )}
    >
      {peaks?.length ? (
        <WaveformSvg peaks={peaks} isActive={isActive} />
      ) : (
        <WaveformPlaceholder />
      )}
    </div>
  );
}
