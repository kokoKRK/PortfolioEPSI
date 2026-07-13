export const WAVEFORM_PEAK_COUNT = 256;

export function peaksFromChannelData(
  channel: Float32Array,
  peakCount = WAVEFORM_PEAK_COUNT
): number[] {
  if (channel.length === 0) return [];

  const blockSize = Math.max(1, Math.floor(channel.length / peakCount));
  const peaks: number[] = [];

  for (let i = 0; i < peakCount; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channel.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      max = Math.max(max, Math.abs(channel[j]));
    }
    peaks.push(max);
  }

  const maxPeak = Math.max(...peaks, 0.001);
  return peaks.map((p) => Math.round((p / maxPeak) * 1000) / 1000);
}

export function peaksFromAudioBuffer(
  audioBuffer: AudioBuffer,
  peakCount = WAVEFORM_PEAK_COUNT
): number[] {
  return peaksFromChannelData(audioBuffer.getChannelData(0), peakCount);
}

export async function peaksFromArrayBuffer(
  arrayBuffer: ArrayBuffer,
  peakCount = WAVEFORM_PEAK_COUNT
): Promise<number[]> {
  const ctx = new AudioContext();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return peaksFromAudioBuffer(audioBuffer, peakCount);
  } finally {
    await ctx.close();
  }
}
