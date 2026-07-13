export type CuePoints = {
  introEndSeconds: number | null;
  outroStartSeconds: number | null;
  mixOutSeconds: number | null;
};

function peaksToSeconds(index: number, peakCount: number, durationSeconds: number) {
  return Math.round((index / peakCount) * durationSeconds);
}

/**
 * Estime intro/outro/mix-out à partir des waveform_peaks (v1 heuristique).
 */
export function estimateCuePointsFromPeaks(
  peaks: number[] | null | undefined,
  durationSeconds: number | null | undefined
): CuePoints | null {
  if (!peaks?.length || !durationSeconds || durationSeconds < 30) return null;

  const n = peaks.length;
  const introWindow = Math.max(4, Math.floor(n * 0.15));
  const outroWindow = Math.max(4, Math.floor(n * 0.2));

  const introBaseline =
    peaks.slice(0, introWindow).reduce((a, b) => a + b, 0) / introWindow;
  const threshold = introBaseline * 1.35 + 0.08;

  let introEndIdx = introWindow;
  for (let i = introWindow; i < Math.floor(n * 0.4); i++) {
    if (peaks[i] > threshold && peaks[i + 1] > threshold) {
      introEndIdx = i;
      break;
    }
  }

  const outroBaseline =
    peaks.slice(n - outroWindow).reduce((a, b) => a + b, 0) / outroWindow;
  const outroThreshold = outroBaseline * 0.85;

  let outroStartIdx = n - outroWindow;
  for (let i = n - outroWindow; i > Math.floor(n * 0.5); i--) {
    if (peaks[i] < outroThreshold && peaks[i - 1] < outroThreshold) {
      outroStartIdx = i;
      break;
    }
  }

  const introEndSeconds = peaksToSeconds(introEndIdx, n, durationSeconds);
  const outroStartSeconds = peaksToSeconds(outroStartIdx, n, durationSeconds);
  const mixOutSeconds = Math.max(
    introEndSeconds + 30,
    outroStartSeconds - 16
  );

  return {
    introEndSeconds,
    outroStartSeconds,
    mixOutSeconds: Math.min(mixOutSeconds, durationSeconds - 8),
  };
}

export function formatCueTime(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
