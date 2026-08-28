import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as tf from "@tensorflow/tfjs";

import {
  extractFeatures
} from "../../../picoruby/magic-circle/scripts/verify-ml4f-model.mjs";

const PROJECT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const DATA_PATH = path.join(PROJECT_DIRECTORY, "data", "samples.json");
const MODEL_PATH = path.join(PROJECT_DIRECTORY, "ml_model.py");
const EPOCHS = 800;
const LEARNING_RATE = 0.02;
const SEED = 20260822;
const MODEL_METADATA = {
  labels: ["circle", "pose", "side", "up", "down"],
  inputSize: 24,
  hiddenSize: 16,
  outputSize: 5,
  sampleLength: 50
};

tf.enableProdMode();

function parseArguments(argumentsList) {
  if (argumentsList.length === 0) return { outputPath: MODEL_PATH };
  if (argumentsList.length === 2 && argumentsList[0] === "--output") {
    return { outputPath: path.resolve(argumentsList[1]) };
  }
  throw new Error("usage: train-model.mjs [--output ml_model.py]");
}

function trainingExamples(actions) {
  const labelIndices = new Map(
    MODEL_METADATA.labels.map((label, index) => [label, index])
  );
  const result = [];
  const longest = Math.max(...actions.map((action) => action.recordings.length));

  for (let recordingIndex = 0; recordingIndex < longest; recordingIndex += 1) {
    for (const action of actions) {
      const recording = action.recordings[recordingIndex];
      if (!recording) continue;
      const labelIndex = labelIndices.get(action.name);
      if (labelIndex === undefined) {
        throw new Error("Training data contains unknown label: " + action.name);
      }
      result.push({
        features: extractFeatures(recording.data, MODEL_METADATA.sampleLength),
        labelIndex
      });
    }
  }
  return result;
}

function normalizer(examples, inputSize) {
  const means = new Array(inputSize).fill(0);
  const deviations = new Array(inputSize).fill(0);
  for (const example of examples) {
    example.features.forEach((value, index) => { means[index] += value; });
  }
  means.forEach((value, index) => { means[index] = value / examples.length; });
  for (const example of examples) {
    example.features.forEach((value, index) => {
      const difference = value - means[index];
      deviations[index] += difference * difference;
    });
  }
  deviations.forEach((value, index) => {
    deviations[index] = Math.sqrt(value / examples.length) || 1;
  });
  return { means, deviations };
}

function rawInputWeights(normalizedWeights, hiddenBias, means, deviations) {
  const weights = new Array(means.length * hiddenBias.length);
  const bias = hiddenBias.slice();
  for (let inputIndex = 0; inputIndex < means.length; inputIndex += 1) {
    for (let hiddenIndex = 0; hiddenIndex < hiddenBias.length; hiddenIndex += 1) {
      const index = inputIndex * hiddenBias.length + hiddenIndex;
      const weight = normalizedWeights[index] / deviations[inputIndex];
      weights[index] = weight;
      bias[hiddenIndex] -= means[inputIndex] * weight;
    }
  }
  return { weights, bias };
}

function numberValues(values) {
  return values.map((value) => Number(value).toPrecision(9));
}

function formatArray(name, values, columns) {
  const rows = [];
  for (let index = 0; index < values.length; index += columns) {
    rows.push("    " + values.slice(index, index + columns).join(", ") + ",");
  }
  return name + ' = array("f", (\n' + rows.join("\n") + "\n))";
}

function replaceArray(source, name, values, columns) {
  const pattern = new RegExp(
    name + ' = array\\("f", \\(\\n[\\s\\S]*?\\n\\)\\)'
  );
  if (!pattern.test(source)) {
    throw new Error("Cannot find " + name + " in MicroPython model template");
  }
  return source.replace(pattern, formatArray(name, numberValues(values), columns));
}

function generatedSource(template, model) {
  let source = template;
  source = replaceArray(source, "INPUT_WEIGHTS", model.inputWeights, 16);
  source = replaceArray(source, "HIDDEN_BIAS", model.hiddenBias, 8);
  source = replaceArray(source, "OUTPUT_WEIGHTS", model.outputWeights, 10);
  return replaceArray(source, "OUTPUT_BIAS", model.outputBias, 5);
}

export async function trainMicroPythonModel({ outputPath = MODEL_PATH } = {}) {
  const [dataSource, template] = await Promise.all([
    fs.readFile(DATA_PATH, "utf8"),
    fs.readFile(MODEL_PATH, "utf8")
  ]);
  const examples = trainingExamples(JSON.parse(dataSource));
  const { inputSize, hiddenSize, outputSize } = MODEL_METADATA;
  const { means, deviations } = normalizer(examples, inputSize);
  const inputs = examples.map(({ features }) =>
    features.map((value, index) => (value - means[index]) / deviations[index])
  );
  const labels = examples.map(({ labelIndex }) => {
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
    const model = {
      inputWeights: raw.weights,
      hiddenBias: raw.bias,
      outputWeights,
      outputBias
    };
    await fs.writeFile(
      outputPath,
      generatedSource(template, model).trimEnd() + "\n"
    );
    return {
      accuracy: history.history.acc.at(-1),
      examples: examples.length,
      outputPath
    };
  } finally {
    inputTensor.dispose();
    labelTensor.dispose();
    network.dispose();
  }
}

async function main() {
  const report = await trainMicroPythonModel(parseArguments(process.argv.slice(2)));
  console.log("trained recordings: " + report.examples);
  console.log("training accuracy: " + Number(report.accuracy).toFixed(4));
  console.log("wrote: " + path.relative(process.cwd(), report.outputPath));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
