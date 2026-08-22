import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const MODEL_PATH = path.join(PROJECT_DIRECTORY, "data", "model.json");

const REQUIRED_FIELDS = [
  "labels",
  "inputSize",
  "hiddenSize",
  "outputSize",
  "sampleLength",
  "minimumGestureMotion",
  "inputWeights",
  "hiddenBias",
  "outputWeights",
  "outputBias"
];

export function validateModel(model) {
  for (const field of REQUIRED_FIELDS) {
    if (!(field in model)) throw new Error(`Missing PicoRuby model value: ${field}`);
  }
  const inputSize = Number(model.inputSize);
  const hiddenSize = Number(model.hiddenSize);
  const outputSize = Number(model.outputSize);
  if (model.labels.length !== outputSize) throw new Error("Model labels must match outputs");
  if (model.inputWeights.length !== inputSize * hiddenSize) {
    throw new Error("Model input weights do not match dimensions");
  }
  if (model.hiddenBias.length !== hiddenSize) {
    throw new Error("Model hidden bias does not match dimensions");
  }
  if (model.outputWeights.length !== hiddenSize * outputSize) {
    throw new Error("Model output weights do not match dimensions");
  }
  if (model.outputBias.length !== outputSize) {
    throw new Error("Model output bias does not match dimensions");
  }
  return model;
}

export async function loadModel() {
  return validateModel(JSON.parse(await fs.readFile(MODEL_PATH, "utf8")));
}

export { MODEL_PATH };
