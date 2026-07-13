type EssentiaRuntime = {
  essentia: InstanceType<typeof import("essentia.js").Essentia>;
  wasmModule: typeof import("essentia.js").EssentiaWASM;
  extractor: InstanceType<
    typeof import("essentia.js").EssentiaModel.EssentiaTFInputExtractor
  >;
};

let runtime: EssentiaRuntime | null = null;
let runtimePromise: Promise<EssentiaRuntime> | null = null;

export async function getEssentiaRuntime(): Promise<EssentiaRuntime> {
  if (runtime) return runtime;
  if (!runtimePromise) {
    runtimePromise = (async () => {
      const essentiaPkg = await import("essentia.js");
      const wasmModule = essentiaPkg.EssentiaWASM;
      const essentia = new essentiaPkg.Essentia(wasmModule);
      const extractor = new essentiaPkg.EssentiaModel.EssentiaTFInputExtractor(
        wasmModule,
        "musicnn"
      );
      runtime = { essentia, wasmModule, extractor };
      return runtime;
    })();
  }
  return runtimePromise;
}

export function downsampleTo16k(
  channel: Float32Array,
  sampleRate: number
): Float32Array {
  const targetRate = 16000;
  if (sampleRate <= targetRate) return channel;
  const ratio = sampleRate / targetRate;
  const outLen = Math.floor(channel.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    out[i] = channel[Math.floor(i * ratio)] ?? 0;
  }
  return out;
}

export function sliceChannel(
  channel: Float32Array,
  sampleRate: number,
  maxSeconds: number
): Float32Array {
  const maxSamples = Math.min(
    channel.length,
    Math.floor(sampleRate * maxSeconds)
  );
  return channel.subarray(0, maxSamples);
}
