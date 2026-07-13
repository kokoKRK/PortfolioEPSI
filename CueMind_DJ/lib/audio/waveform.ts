import {
  peaksFromChannelData,
  WAVEFORM_PEAK_COUNT,
} from "@/lib/audio/waveform-peaks";

export { WAVEFORM_PEAK_COUNT } from "@/lib/audio/waveform-peaks";

export async function extractWaveformPeaks(
  buffer: Buffer,
  peakCount = WAVEFORM_PEAK_COUNT
): Promise<number[]> {
  try {
    const decode = (await import("audio-decode")).default;
    const audioBuffer = await decode(Uint8Array.from(buffer));
    const channel = audioBuffer.channelData[0];
    if (!channel) return [];
    return peaksFromChannelData(channel, peakCount);
  } catch (error) {
    console.warn("Waveform extraction failed:", error);
    return [];
  }
}
