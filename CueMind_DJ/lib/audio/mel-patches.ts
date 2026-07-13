export const MEL_BANDS = 96;

export function flattenMelSpectrum(
  melSpectrum: unknown,
  frameCount: number,
  melBands: number = MEL_BANDS
): Float32Array {
  const flat = new Float32Array(frameCount * melBands);
  if (!Array.isArray(melSpectrum)) {
    return flat;
  }

  let offset = 0;
  for (let i = 0; i < frameCount && i < melSpectrum.length; i++) {
    const frame = melSpectrum[i] as Float32Array | number[];
    const values =
      frame instanceof Float32Array
        ? frame
        : Float32Array.from(frame as Iterable<number>);
    flat.set(values.subarray(0, melBands), offset);
    offset += melBands;
  }
  return flat;
}

export function buildMelPatches(
  melFlat: Float32Array | number[],
  frameCount: number,
  patchSize: number
): Float32Array[] {
  const melBands = MEL_BANDS;
  const flat = Float32Array.from(melFlat);

  if (frameCount <= 0) return [];

  if (frameCount < patchSize) {
    const padded = new Float32Array(patchSize * melBands);
    padded.set(flat.subarray(0, frameCount * melBands));
    return [padded];
  }

  const batchSize = Math.ceil(frameCount / patchSize);
  const padded = new Float32Array(batchSize * patchSize * melBands);
  padded.set(flat.subarray(0, frameCount * melBands));

  const patches: Float32Array[] = [];
  for (let b = 0; b < batchSize; b++) {
    patches.push(
      padded.subarray(b * patchSize * melBands, (b + 1) * patchSize * melBands)
    );
  }
  return patches;
}

export function averageVectors(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const size = vectors[0].length;
  const avg = new Array(size).fill(0);
  for (const vec of vectors) {
    for (let i = 0; i < size; i++) {
      avg[i] += vec[i] ?? 0;
    }
  }
  for (let i = 0; i < size; i++) {
    avg[i] /= vectors.length;
  }
  return avg;
}
