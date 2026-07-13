import { join } from "node:path";

export function getMusicnnModelPath() {
  return join(process.cwd(), "public", "models", "msd-musicnn-1.onnx");
}

export function getDiscogsEffnetModelPath() {
  return join(
    process.cwd(),
    "public",
    "models",
    "discogs-effnet-bsdynamic-1.onnx"
  );
}

export function getDiscogsLabelsJsonPath() {
  return join(
    process.cwd(),
    "public",
    "models",
    "discogs-effnet-bsdynamic-1.json"
  );
}
