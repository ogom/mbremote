import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { compileModel } from "@microbit/ml4f";
import * as tf from "@tensorflow/tfjs";

import { REQUIRED_CONFIDENCE } from "./model-config.mjs";
import { loadModel } from "./model.mjs";

const PROJECT_DIRECTORY = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const DATA_PATH = path.join(PROJECT_DIRECTORY, "data", "samples.json");
const PROBABILITY_TOLERANCE = 0.0001;

tf.enableProdMode();

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function standardDeviation(values) {
  const average = mean(values);
  const variance = values.reduce((total, value) => {
    const difference = value - average;
    return total + difference * difference;
  }, 0);
  return Math.sqrt(variance / values.length);
}

function peaks(values) {
  const lag = 5;
  const filtered = values.slice();
  let average = mean(values.slice(0, lag));
  let deviation = average;
  let previousSignal = 0;
  let count = 0;

  for (let index = lag; index < values.length; index += 1) {
    const difference = Math.abs(values[index] - average);
    let signal;
    if (difference > 0.1 && difference > 3.5 * deviation) {
      signal = values[index] > average ? 1 : -1;
      if (signal === 1 && previousSignal === 0) count += 1;
      filtered[index] = 0.5 * (values[index] + filtered[index - 1]);
    } else {
      signal = 0;
      filtered[index] = values[index];
    }
    const window = filtered.slice(index - lag, index);
    average = mean(window);
    deviation = standardDeviation(window);
    previousSignal = signal;
  }
  return count;
}

function acceleration(values, sampleLength) {
  const total = values.reduce((sum, value) => sum + Math.abs(value), 0);
  return total * sampleLength / values.length;
}

function zeroCrossingRate(values) {
  let count = 0;
  for (let index = 1; index < values.length; index += 1) {
    if (
      (values[index] >= 0 && values[index - 1] < 0) ||
      (values[index] < 0 && values[index - 1] >= 0)
    ) {
      count += 1;
    }
  }
  return count / (values.length - 1);
}

function rms(values) {
  const total = values.reduce((sum, value) => sum + value * value, 0);
  return Math.sqrt(total / values.length);
}

export function extractFeatures(data, sampleLength) {
  const filters = [
    (values) => Math.max(...values),
    mean,
    (values) => Math.min(...values),
    standardDeviation,
    peaks,
    (values) => acceleration(values, sampleLength),
    zeroCrossingRate,
    rms
  ];
  const features = [];
  for (const filter of filters) {
    for (const axis of ["x", "y", "z"]) {
      features.push(filter(data[axis]));
    }
  }
  return features;
}

const f32 = Math.fround;

function peaksFloat32(values) {
  const lag = 5;
  const filtered = new Float32Array(values.length);
  let windowTotal = f32(0);
  let windowSquaredTotal = f32(0);
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    filtered[index] = value;
    if (index < lag) {
      windowTotal = f32(windowTotal + value);
      windowSquaredTotal = f32(
        windowSquaredTotal + f32(value * value)
      );
    }
  }

  let average = f32(windowTotal / lag);
  let deviation = average;
  let deviationSquared = f32(0);
  let hasDeviationSquared = false;
  let previousSignal = 0;
  let count = 0;

  for (let index = lag; index < values.length; index += 1) {
    const difference = f32(Math.abs(f32(values[index] - average)));
    const overDeviation = hasDeviationSquared
      ? f32(difference * difference) > f32(12.25 * deviationSquared)
      : difference > f32(3.5 * deviation);
    let signal;
    if (difference > f32(0.1) && overDeviation) {
      signal = values[index] > average ? 1 : -1;
      if (signal === 1 && previousSignal === 0) count += 1;
      filtered[index] = f32(
        0.5 * f32(values[index] + filtered[index - 1])
      );
    } else {
      signal = 0;
      filtered[index] = values[index];
    }

    if (index > lag) {
      const removed = filtered[index - lag - 1];
      const added = filtered[index - 1];
      windowTotal = f32(windowTotal + f32(added - removed));
      windowSquaredTotal = f32(
        windowSquaredTotal + f32(
          f32(added * added) - f32(removed * removed)
        )
      );
    }
    average = f32(windowTotal / lag);
    deviationSquared = f32(
      f32(windowSquaredTotal / lag) - f32(average * average)
    );
    if (deviationSquared < 0) deviationSquared = f32(0);
    hasDeviationSquared = true;
    previousSignal = signal;
  }
  return f32(count);
}

function axisFeaturesFloat32(rawValues, sampleLength) {
  const values = new Float32Array(rawValues.length);
  let total = f32(0);
  let squaredTotal = f32(0);
  let absoluteTotal = f32(0);
  let minimum = f32(0);
  let maximum = f32(0);
  let crossings = 0;

  for (let index = 0; index < rawValues.length; index += 1) {
    // Training samples are already stored in g. The firmware receives mg and
    // divides by 1000 before this point, producing the same float value.
    const value = f32(rawValues[index]);
    values[index] = value;
    total = f32(total + value);
    squaredTotal = f32(squaredTotal + f32(value * value));
    absoluteTotal = f32(absoluteTotal + f32(Math.abs(value)));
    if (index === 0 || value < minimum) minimum = value;
    if (index === 0 || value > maximum) maximum = value;
    if (
      index > 0 &&
      ((value >= 0 && values[index - 1] < 0) ||
       (value < 0 && values[index - 1] >= 0))
    ) {
      crossings += 1;
    }
  }

  const average = f32(total / rawValues.length);
  let varianceTotal = f32(0);
  for (const value of values) {
    const difference = f32(value - average);
    varianceTotal = f32(
      varianceTotal + f32(difference * difference)
    );
  }
  return [
    maximum,
    average,
    minimum,
    f32(Math.sqrt(f32(varianceTotal / rawValues.length))),
    peaksFloat32(values),
    f32(f32(absoluteTotal * f32(sampleLength)) / rawValues.length),
    f32(crossings / (rawValues.length - 1)),
    f32(Math.sqrt(f32(squaredTotal / rawValues.length)))
  ];
}

function extractFeaturesFloat32(data, sampleLength) {
  const axes = ["x", "y", "z"].map((axis) =>
    axisFeaturesFloat32(data[axis], sampleLength)
  );
  const features = [];
  for (let feature = 0; feature < 8; feature += 1) {
    for (let axis = 0; axis < axes.length; axis += 1) {
      features.push(axes[axis][feature]);
    }
  }
  return features;
}

function referenceProbabilities(features, model) {
  const hidden = new Array(Number(model.hiddenSize));
  for (let hiddenIndex = 0; hiddenIndex < hidden.length; hiddenIndex += 1) {
    let value = Number(model.hiddenBias[hiddenIndex]);
    let weightIndex = hiddenIndex;
    for (const feature of features) {
      value += feature * Number(model.inputWeights[weightIndex]);
      weightIndex += hidden.length;
    }
    hidden[hiddenIndex] = Math.max(value, 0);
  }

  const logits = new Array(Number(model.outputSize));
  for (let outputIndex = 0; outputIndex < logits.length; outputIndex += 1) {
    let value = Number(model.outputBias[outputIndex]);
    let weightIndex = outputIndex;
    for (const hiddenValue of hidden) {
      value += hiddenValue * Number(model.outputWeights[weightIndex]);
      weightIndex += logits.length;
    }
    logits[outputIndex] = value;
  }

  const maximum = Math.max(...logits);
  const exponentials = logits.map((value) => Math.exp(value - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

function decision(probabilities, features, model, thresholds = REQUIRED_CONFIDENCE) {
  let actionIndex = 0;
  let bestDelta = -2;
  for (let index = 0; index < probabilities.length; index += 1) {
    const delta = probabilities[index] - thresholds[index];
    if (delta > bestDelta) {
      actionIndex = index;
      bestDelta = delta;
    }
  }
  const confidence = probabilities[actionIndex];
  let confident = confidence >= thresholds[actionIndex];
  if (confident && actionIndex <= 2) {
    confident = Math.max(...features.slice(9, 12)) >= Number(model.minimumGestureMotion);
  }
  return { actionIndex, confidence, confident };
}

function createTensorFlowModel(model) {
  const inputSize = Number(model.inputSize);
  const hiddenSize = Number(model.hiddenSize);
  const outputSize = Number(model.outputSize);
  const result = tf.sequential();
  result.add(tf.layers.dense({
    inputShape: [inputSize],
    units: hiddenSize,
    activation: "relu",
    useBias: true
  }));
  result.add(tf.layers.dense({
    units: outputSize,
    activation: "softmax",
    useBias: true
  }));
  result.setWeights([
    tf.tensor2d(model.inputWeights.map(Number), [inputSize, hiddenSize]),
    tf.tensor1d(model.hiddenBias.map(Number)),
    tf.tensor2d(model.outputWeights.map(Number), [hiddenSize, outputSize]),
    tf.tensor1d(model.outputBias.map(Number))
  ]);
  return result;
}

export function compileML4FModel(model) {
  const tensorFlowModel = createTensorFlowModel(model);
  try {
    return compileModel(tensorFlowModel, { includeTest: false });
  } finally {
    tensorFlowModel.dispose();
  }
}

function windowData(data, start, length) {
  return {
    x: data.x.slice(start, start + length),
    y: data.y.slice(start, start + length),
    z: data.z.slice(start, start + length)
  };
}

function evaluationCases(actions) {
  const cases = [];
  for (const action of actions) {
    action.recordings.forEach((recording, recordingIndex) => {
      cases.push({
        id: `${action.name}/${recordingIndex + 1}/full`,
        data: recording.data
      });

      const runtimeLength = action.name === "side" ? 30 :
        action.name === "circle" ? 50 : 0;
      if (runtimeLength > 0) {
        const lastStart = recording.data.x.length - runtimeLength;
        cases.push({
          id: `${action.name}/${recordingIndex + 1}/first-${runtimeLength}`,
          data: windowData(recording.data, 0, runtimeLength)
        });
        cases.push({
          id: `${action.name}/${recordingIndex + 1}/last-${runtimeLength}`,
          data: windowData(recording.data, lastStart, runtimeLength)
        });
      }
    });
  }
  return cases;
}

export async function verifyML4FModel({
  model: suppliedModel,
  probabilityTolerance = PROBABILITY_TOLERANCE
} = {}) {
  const [model, dataSource] = await Promise.all([
    suppliedModel || loadModel(),
    fs.readFile(DATA_PATH, "utf8")
  ]);
  if (REQUIRED_CONFIDENCE.length !== Number(model.outputSize)) {
    throw new Error("PicoRuby confidence thresholds must match model outputs");
  }
  const actions = JSON.parse(dataSource);
  const compiled = compileML4FModel(model);
  const cases = evaluationCases(actions);
  const mismatches = [];
  const float32Mismatches = [];
  let maxProbabilityDelta = 0;
  let float32MaxFeatureDelta = 0;
  let float32MaxProbabilityDelta = 0;

  for (const testCase of cases) {
    const features = extractFeatures(testCase.data, Number(model.sampleLength));
    const float32Features = extractFeaturesFloat32(
      testCase.data,
      Number(model.sampleLength)
    );
    const reference = referenceProbabilities(features, model);
    const machine = Array.from(compiled.execute(features));
    const float32Machine = Array.from(compiled.execute(float32Features));
    const referenceDecision = decision(reference, features, model);
    const machineDecision = decision(machine, features, model);
    const float32Decision = decision(float32Machine, float32Features, model);
    const deltas = reference.map((value, index) => Math.abs(value - machine[index]));
    const caseMaximum = Math.max(...deltas);
    maxProbabilityDelta = Math.max(maxProbabilityDelta, caseMaximum);
    const float32FeatureDelta = Math.max(...features.map(
      (value, index) => Math.abs(value - float32Features[index])
    ));
    const float32ProbabilityDelta = Math.max(...machine.map(
      (value, index) => Math.abs(value - float32Machine[index])
    ));
    float32MaxFeatureDelta = Math.max(
      float32MaxFeatureDelta,
      float32FeatureDelta
    );
    float32MaxProbabilityDelta = Math.max(
      float32MaxProbabilityDelta,
      float32ProbabilityDelta
    );

    if (
      caseMaximum > probabilityTolerance ||
      referenceDecision.actionIndex !== machineDecision.actionIndex ||
      referenceDecision.confident !== machineDecision.confident
    ) {
      mismatches.push({
        id: testCase.id,
        maxProbabilityDelta: caseMaximum,
        referenceDecision,
        machineDecision,
        reference,
        machine
      });
    }
    if (
      float32ProbabilityDelta > probabilityTolerance ||
      machineDecision.actionIndex !== float32Decision.actionIndex ||
      machineDecision.confident !== float32Decision.confident
    ) {
      float32Mismatches.push({
        id: testCase.id,
        maxFeatureDelta: float32FeatureDelta,
        maxProbabilityDelta: float32ProbabilityDelta,
        machineDecision,
        float32Decision,
        machine,
        float32Machine
      });
    }
  }
  const recordings = actions.reduce(
    (total, action) => total + action.recordings.length,
    0
  );
  return {
    recordings,
    evaluationCases: cases.length,
    probabilityValues: cases.length * Number(model.outputSize),
    probabilityTolerance,
    maxProbabilityDelta,
    decisionMismatches: mismatches.length,
    mismatches,
    float32MaxFeatureDelta,
    float32MaxProbabilityDelta,
    float32DecisionMismatches: float32Mismatches.length,
    float32Mismatches,
    machineCodeBytes: compiled.machineCode.length,
    arenaBytes: compiled.stats.total.arenaBytes,
    estimatedCycles: compiled.stats.total.optimizedCycles,
    estimatedMilliseconds: compiled.stats.total.optimizedCycles / 64000
  };
}

async function main() {
  const report = await verifyML4FModel();
  console.log(`recordings: ${report.recordings}`);
  console.log(`evaluation cases: ${report.evaluationCases}`);
  console.log(`probability values: ${report.probabilityValues}`);
  console.log(`maximum probability delta: ${report.maxProbabilityDelta}`);
  console.log(`decision mismatches: ${report.decisionMismatches}`);
  console.log(`float32 maximum feature delta: ${report.float32MaxFeatureDelta}`);
  console.log(`float32 maximum probability delta: ${report.float32MaxProbabilityDelta}`);
  console.log(`float32 decision mismatches: ${report.float32DecisionMismatches}`);
  console.log(`machine code: ${report.machineCodeBytes} bytes`);
  console.log(`arena: ${report.arenaBytes} bytes`);
  console.log(
    `estimated inference: ${report.estimatedCycles} cycles ` +
      `(${report.estimatedMilliseconds.toFixed(3)}ms at 64MHz)`
  );
  if (report.mismatches.length > 0 || report.float32Mismatches.length > 0) {
    console.error(JSON.stringify({
      mismatches: report.mismatches,
      float32Mismatches: report.float32Mismatches
    }, null, 2));
    process.exitCode = 1;
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  await main();
}
