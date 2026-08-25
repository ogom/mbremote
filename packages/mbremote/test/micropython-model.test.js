import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  trainMicroPythonModel
} from "../../../examples/micropython/magic-circle/scripts/train-model.mjs";

test("trains the MicroPython magic-circle model from local recordings", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-model-"));
  const outputPath = path.join(directory, "ml_model.py");
  try {
    const report = await trainMicroPythonModel({ outputPath });
    const source = await fs.readFile(outputPath, "utf8");

    assert.equal(report.examples, 49);
    assert.ok(report.accuracy >= 0.99);
    assert.match(source, /INPUT_WEIGHTS = array\("f", \(/);
    assert.match(source, /HIDDEN_BIAS = array\("f", \(/);
    assert.match(source, /OUTPUT_WEIGHTS = array\("f", \(/);
    assert.match(source, /OUTPUT_BIAS = array\("f", \(/);
    assert.match(source, /def extract_features\(/);
    assert.match(source, /def is_confident\(/);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
