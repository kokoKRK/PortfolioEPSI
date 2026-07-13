export type DecodedAudio = {
  channel: Float32Array;
  sampleRate: number;
  durationSeconds: number;
};

export async function decodeAudioBuffer(
  buffer: Buffer
): Promise<DecodedAudio | null> {
  try {
    const decode = (await import("audio-decode")).default;
    const audioData = await decode(Uint8Array.from(buffer));
    const channel = audioData.channelData[0];
    if (!channel?.length) return null;

    return {
      channel,
      sampleRate: audioData.sampleRate,
      durationSeconds: channel.length / audioData.sampleRate,
    };
  } catch (error) {
    console.warn("Audio decode failed:", error);
    return null;
  }
}
