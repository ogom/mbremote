import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as tf from "@tensorflow/tfjs";

import { loadModel, validateModel, MODEL_PATH } from "./model.mjs";
import { extractFeatures } from "./verify-ml4f-model.mjs";

const PROJECT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const DATA_PATH = path.join(PROJECT_DIRECTORY, "data", "data-samples.json");
const EPOCHS = 800;
const LEARNING_RATE = 0.02;
const SEED = 20260822;

tf.enableProdMode();

function parseArguments(argumentsList) {
  if (argumentsList.length === 0) return { outputPath: MODEL_PATH };
  if (argumentsList.length === 2 && argumentsList[0] === "--output") {
    return { outputPath: path.resolve(argumentsList[1]) };
  }
  throw new Error("usage: train-model.mjs [--output MODEL.json]");
}

function examples(actions, model) {
  const labelIndices = new Map(model.labels.map((label, index) => [label, index]));
  const result = [];
  const longest = Math.max(...actions.map((action) => action.recordings.length));

  for (let recordingIndex = 0; recordingIndex < longest; recordingIndex += 1) {
    for (const action of actions) {
      const recording = action.recordings[recordingIndex];
      if (!recording) continue;
      const labelIndex = labelIndices.get(action.name);
      if (labelIndex === undefined) {
        throw new Error(`Training data contains unknown label: ${action.name}`);
      }
      result.push({
        features: extractFeatures(recording.data, Number(model.sampleLength)),
        labelIndex
      });
    }
  }
  return result;
}

function normalizer(examplesList, inputSize) {
  const means = new Array(inputSize).fill(0);
  const deviations = new Array(inputSize).fill(0);
  for (const example of examplesList) {
    example.features.forEach((value, index) => { means[index] += value; });
  }
  means.forEach((value, index) => { means[index] = value / examplesList.length; });
  for (const example of examplesList) {
    example.features.forEach((value, index) => {
      const difference = value - means[index];
      deviations[index] += difference * difference;
    });
  }
  deviations.forEach((value, index) => {
    deviations[index] = Math.sqrt(value / examplesList.length) || 1;
  });
  return { means, deviations };
}

function rawInputWeights(normalizedWeights, hiddenBias, means, deviations) {
  const inputSize = means.length;
  const hiddenSize = hiddenBias.length;
  const weights = new Array(inputSize * hiddenSize);
  const bias = hiddenBias.slice();

  for (let inputIndex = 0; inputIndex < inputSize; inputIndex += 1) {
    for (let hiddenIndex = 0; hiddenIndex < hiddenSize; hiddenIndex += 1) {
      const index = inputIndex * hiddenSize + hiddenIndex;
      const weight = normalizedWeights[index] / deviations[inputIndex];
      weights[index] = weight;
      bias[hiddenIndex] -= means[inputIndex] * weight;
    }
  }
  return { weights, bias };
}

function stringValues(values) {
  return values.map((value) => Number(value).toPrecision(9));
}

export async function trainModel({ outputPath = MODEL_PATH } = {}) {
  const [model, source] = await Promise.all([
    loadModel(),
    fs.readFile(DATA_PATH, "utf8")
  ]);
  const trainingExamples = examples(JSON.parse(source), model);
  const inputSize = Number(model.inputSize);
  const hiddenSize = Number(model.hiddenSize);
  const outputSize = Number(model.outputSize);
  const { means, deviations } = normalizer(trainingExamples, inputSize);
  const inputs = trainingExamples.map(({ features }) =>
    features.map((value, index) => (value - means[index]) / deviations[index])
  );
  const labels = trainingExamples.map(({ labelIndex }) => {
    const value = new Array(outputSize).fill(0);
    value[labelIndex] = 1;
    return value;
  });
  const inputTensor = tf.tensor2d(inputs, [inputs.length, inputSize]);
  const labelTensor = tf.tensor2d(labels, [labels.length, outputSize]);
  const network = tf.sequential();
  network.add(tf.layers.dense({
    inputShape: [inputSize],
    units: hiddenSize,
    activation: "relu",
    kernelInitializer: tf.initializers.glorotUniform({ seed: SEED }),
    biasInitializer: "zeros"
  }));
  network.add(tf.layers.dense({
    units: outputSize,
    activation: "softmax",
    kernelInitializer: tf.initializers.glorotUniform({ seed: SEED + 1 }),
    biasInitializer: "zeros"
  }));
  network.compile({
    optimizer: tf.train.adam(LEARNING_RATE),
    loss: "categoricalCrossentropy",
    metrics: ["accuracy"]
  });

  try {
    const history = await network.fit(inputTensor, labelTensor, {
      epochs: EPOCHS,
      batchSize: 10,
      shuffle: false,
      verbose: 0
    });
    const [inputWeights, hiddenBias, outputWeights, outputBias] = network
      .getWeights()
      .map((tensor) => Array.from(tensor.dataSync()));
    const raw = rawInputWeights(inputWeights, hiddenBias, means, deviations);
    const trained = validateModel({
      ...model,
      inputWeights: stringValues(raw.weights),
      hiddenBias: stringValues(raw.bias),
      outputWeights: stringValues(outputWeights),
      outputBias: stringValues(outputBias)
    });
    await fs.writeFile(outputPath, `${JSON.stringify(trained, null, 2)}\n`);
    const accuracy = history.history.acc.at(-1);
    return { accuracy, examples: trainingExamples.length, outputPath };
  } finally {
    inputTensor.dispose();
    labelTensor.dispose();
    network.dispose();
  }
}

async function main() {
  const report = await trainModel(parseArguments(process.argv.slice(2)));
  console.log(`trained recordings: ${report.examples}`);
  console.log(`training accuracy: ${Number(report.accuracy).toFixed(4)}`);
  console.log(`wrote: ${path.relative(process.cwd(), report.outputPath)}`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
