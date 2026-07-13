import { existsSync } from "node:fs";
import type { InferenceSession } from "onnxruntime-node";
import {
  interpretMusicnnActivations,
  type MlInterpretation,
} from "@/lib/audio/map-ml-tags";
import {
  averageVectors,
  buildMelPatches,
  flattenMelSpectrum,
  MEL_BANDS,
} from "@/lib/audio/mel-patches";
import { getMusicnnModelPath } from "@/lib/audio/model-paths";

const PATCH_SIZE = 187;

let session: InferenceSession | null = null;
let sessionPromise: Promise<InferenceSession | null> | null = null;

async function getOnnxSession(): Promise<InferenceSession | null> {
  if (session) return session;
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const modelPath = getMusicnnModelPath();
      if (!existsSync(modelPath)) {
        console.warn("MusiCNN ONNX model missing:", modelPath);
        return null;
      }
      const ort = await import("onnxruntime-node");
      session = await ort.InferenceSession.create(modelPath, {
        executionProviders: ["cpu"],
      });
      return session;
    })();
  }
  return sessionPromise;
}

export async function predictMusicnnFromMelFeatures(input: {
  melSpectrum: Float32Array | number[] | unknown[];
  frameSize: number;
  melBandsSize: number;
}): Promise<MlInterpretation | null> {
  const onnxSession = await getOnnxSession();
  if (!onnxSession) return null;

  const melBands = input.melBandsSize || MEL_BANDS;
  const frameCount = input.frameSize;
  const flatMel = Array.isArray(input.melSpectrum)
    ? flattenMelSpectrum(input.melSpectrum, frameCount, melBands)
    : Float32Array.from(input.melSpectrum as ArrayLike<number>);

  const patches = buildMelPatches(flatMel, frameCount, PATCH_SIZE);
  if (patches.length === 0) return null;

  const ort = await import("onnxruntime-node");
  const patchResults: number[][] = [];

  for (const patch of patches) {
    const tensor = new ort.Tensor("float32", patch, [
      1,
      PATCH_SIZE,
      melBands,
    ]);
    const output = await onnxSession.run({ melspectrogram: tensor });
    const activations = output.activations?.data;
    if (!activations) continue;
    patchResults.push(Array.from(activations as Float32Array));
  }

  if (patchResults.length === 0) return null;

  return interpretMusicnnActivations(averageVectors(patchResults));
}

export function isMusicnnModelAvailable(): boolean {
  return existsSync(getMusicnnModelPath());
}
