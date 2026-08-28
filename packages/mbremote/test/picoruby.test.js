import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  combineRubySource,
  resolveRubyEntryPoint,
  resolveRubySourceFiles
} from "../src/picoruby.js";
import {
  generateRubyModel
} from "../../../examples/picoruby/magic-circle/scripts/generate-ml-model.mjs";
import {
  generateML4FArtifacts
} from "../../../examples/picoruby/magic-circle/scripts/generate-ml4f-model.mjs";
import {
  REQUIRED_CONFIDENCE
} from "../../../examples/picoruby/magic-circle/scripts/model-config.mjs";
import {
  loadModel
} from "../../../examples/picoruby/magic-circle/scripts/model.mjs";
import {
  trainModel
} from "../../../examples/picoruby/magic-circle/scripts/train-model.mjs";
import {
  compileML4FModel,
  extractFeatures,
  verifyML4FModel
} from "../../../examples/picoruby/magic-circle/scripts/verify-ml4f-model.mjs";

let trainedModelDirectory;
let trainedModelPromise;

async function trainedModel() {
  if (!trainedModelPromise) {
    trainedModelPromise = (async () => {
      trainedModelDirectory = await fs.mkdtemp(
        path.join(os.tmpdir(), "mbremote-model-")
      );
      const outputPath = path.join(trainedModelDirectory, "model.json");
      await trainModel({ outputPath });
      return loadModel(outputPath);
    })();
  }
  return trainedModelPromise;
}

after(async () => {
  if (trainedModelDirectory) {
    await fs.rm(trainedModelDirectory, { recursive: true, force: true });
  }
});

test("keeps the PicoRuby firmware build isolated and reproducible", async () => {
  const buildScriptUrl = new URL(
    "../support/v2/picoruby/build.sh",
    import.meta.url
  );
  const patchUrl = new URL(
    "../support/v2/picoruby/codal.patch",
    import.meta.url
  );
  const noticesUrl = new URL("../THIRD_PARTY_NOTICES.md", import.meta.url);
  const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../.."
  );
  const [buildScript, patch, notices] = await Promise.all([
    fs.readFile(buildScriptUrl, "utf8"),
    fs.readFile(patchUrl, "utf8"),
    fs.readFile(noticesUrl, "utf8")
  ]);

  const shellCheck = spawnSync("sh", ["-n", fileURLToPath(buildScriptUrl)], {
    encoding: "utf8"
  });
  assert.equal(shellCheck.status, 0, shellCheck.stderr);

  const patchCheck = spawnSync(
    "git",
    ["apply", "--numstat", fileURLToPath(patchUrl)],
    { cwd: repositoryRoot, encoding: "utf8" }
  );
  assert.equal(patchCheck.status, 0, patchCheck.stderr);
  assert.match(patchCheck.stdout, /CMakeLists\.txt/);

  assert.match(buildScript, /lock_dir="\$work_dir\/build\.lock"/);
  assert.match(
    buildScript,
    /git clone "\$codal_source_dir" "\$codal_build_source_dir"/
  );
  assert.match(buildScript, /cmake_source_key=.*cksum/);
  assert.match(buildScript, /-U CMAKE_TOOLCHAIN_FILE/);
  assert.doesNotMatch(
    buildScript,
    /git -C "\$codal_source_dir" (?:apply|checkout)/
  );
  assert.match(buildScript, /ensure_magic_circle_model\(\)/);
  assert.match(buildScript, /npm run train:ml4f:magic-circle/);
  assert.match(buildScript, /npm run generate:ml4f:magic-circle/);
  assert.doesNotMatch(buildScript, /MBREMOTE_PICORUBY_OUTPUT_DIR/);
  assert.match(patch, /SPDX-License-Identifier: MIT/);
  assert.match(notices, /MicroPython V2 and CODAL — MIT License/);
  assert.match(notices, /ML4F C runner and generated model — MIT License/);
  assert.match(notices, /mruby\/c — BSD 3-Clause License/);
});

test("rejects concurrent PicoRuby builds using the same cache", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const cacheDirectory = path.join(directory, "cache");
  const lockDirectory = path.join(
    cacheDirectory,
    "picoruby-microbit-v2",
    "build.lock"
  );
  const input = path.join(directory, "main.rb");
  const output = path.join(directory, "microbit.hex");
  const buildScript = fileURLToPath(
    new URL("../support/v2/picoruby/build.sh", import.meta.url)
  );
  await fs.mkdir(lockDirectory, { recursive: true });
  await fs.writeFile(input, 'puts "hello"\n');

  const result = spawnSync(
    "sh",
    [buildScript, input, output, cacheDirectory],
    { encoding: "utf8" }
  );
  assert.equal(result.status, 2);
  assert.match(result.stderr, /another PicoRuby build is using this cache/);
});

test("uses a Ruby file as the PicoRuby entry point", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const ruby = path.join(directory, "blink.rb");
  await fs.writeFile(ruby, 'puts "hello"\n');

  assert.equal(await resolveRubyEntryPoint(ruby), ruby);
});

test("uses main.rb from a PicoRuby project directory", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const ruby = path.join(directory, "main.rb");
  await fs.writeFile(ruby, 'puts "hello"\n');

  assert.equal(await resolveRubyEntryPoint(directory), ruby);
});

test("orders PicoRuby helper files before main.rb", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await fs.writeFile(path.join(directory, "main.rb"), "puts SECOND\n");
  await fs.writeFile(path.join(directory, "20_second.rb"), "SECOND = FIRST + 1");
  await fs.writeFile(path.join(directory, "10_first.rb"), "FIRST = 1\n");
  await fs.writeFile(path.join(directory, "notes.txt"), "not Ruby\n");

  const files = await resolveRubySourceFiles(directory);
  assert.deepEqual(
    files.map((file) => file.target),
    ["10_first.rb", "20_second.rb", "main.rb"]
  );

  const combined = combineRubySource(files);
  assert.ok(combined.indexOf("FIRST = 1") < combined.indexOf("SECOND = FIRST"));
  assert.ok(combined.indexOf("SECOND = FIRST") < combined.indexOf("puts SECOND"));
  assert.doesNotMatch(combined, /not Ruby/);
  assert.equal(combined.endsWith("\n"), true);
});

test("orders nested PicoRuby library files before main.rb", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const library = path.join(directory, "lib");
  await fs.mkdir(library);
  await fs.writeFile(path.join(directory, "main.rb"), "puts VALUE\n");
  await fs.writeFile(path.join(library, "20_second.rb"), "VALUE = FIRST + 1\n");
  await fs.writeFile(path.join(library, "10_first.rb"), "FIRST = 1\n");

  const files = await resolveRubySourceFiles(directory);
  assert.deepEqual(
    files.map((file) => file.target),
    ["lib/10_first.rb", "lib/20_second.rb", "main.rb"]
  );
});

test("requires main.rb in a PicoRuby project directory", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await fs.writeFile(path.join(directory, "helper.rb"), "VALUE = 1\n");

  await assert.rejects(resolveRubySourceFiles(directory), /does not contain main.rb/);
});

test("ships PicoRuby display patterns and input events", async () => {
  const [api, platform, example, begin, rgbLed] = await Promise.all([
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/microbit_api.c", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/main.cpp", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/microbit/main.rb", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/begin/main.rb", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/begin/lib/rgb_led.rb", import.meta.url),
      "utf8"
    )
  ]);

  assert.match(api, /mrbc_define_class_under\(vm, microbit, "Display"/);
  assert.match(api, /mrbc_define_class_under\(vm, microbit, "Image"/);
  for (const name of [
    "Button",
    "Logo",
    "Accelerometer",
    "DigitalPin",
    "AnalogPin",
    "NeoPixel",
    "Radio"
  ]) {
    assert.match(api, new RegExp(`mrbc_define_class_under\\(vm, microbit, "${name}"`));
  }
  for (const name of [
    "HEART",
    "HAPPY",
    "SAD",
    "YES",
    "NO",
    "ARROW_N",
    "DIAMOND",
    "SQUARE_SMALL",
    "SKULL"
  ]) {
    assert.match(api, new RegExp(`define_image_constant\\(vm, image, "${name}"`));
  }
  assert.match(api, /mrbc_define_method\(vm, display, "show"/);
  assert.match(api, /mrbc_define_method\(vm, display, "scroll"/);
  assert.match(api, /mrbc_define_method\(vm, button, "a_was_pressed\?"/);
  assert.match(api, /mrbc_define_method\(vm, button, "b_was_pressed\?"/);
  assert.match(api, /mrbc_define_method\(vm, logo, "touched\?"/);
  assert.match(api, /mrbc_define_method\(vm, logo, "was_touched\?"/);
  assert.match(platform, /uBit\.buttonA\.wasPressed\(\)/);
  assert.match(platform, /uBit\.logo\.isPressed\(\)/);
  assert.match(platform, /uBit\.display\.scroll\(ManagedString\(/);
  assert.match(example, /display\.show\(Microbit::Image::DIAMOND\)/);
  assert.match(example, /display\.show\(Microbit::Image::ARROW_W\)/);
  assert.match(example, /display\.show\(Microbit::Image::ARROW_E\)/);
  assert.match(example, /logo\.was_touched\?/);
  assert.match(begin, /display = Microbit::Display\.new/);
  assert.match(begin, /display\.show\(Microbit::Image::HEART\)/);
  assert.match(begin, /display\.scroll\('Hello'\)/);
  assert.match(begin, /RGBLed\.new\(/);
  assert.match(rgbLed, /class RGBLed/);
  assert.match(rgbLed, /def initialize\(pin:, pixel_count:/);
  assert.match(rgbLed, /@pixels\.configure\(pin, pixel_count\)/);
});

test("ships synchronized acceleration samples and PicoRuby magic-circle motion detection", async () => {
  const [api, platform, circle, builder, game, orientation, learnedGesture, model, pose, side, entry] = await Promise.all([
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/microbit_api.c", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/main.cpp", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/gestures/circle_gesture.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/builder.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/game.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/gestures/orientation_gesture.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/gestures/learned_motion_gesture.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/ml_model.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/gestures/pose_gesture.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/gestures/side_gesture.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/magic-circle/main.rb", import.meta.url),
      "utf8"
    )
  ]);

  assert.match(api, /mrbc_define_method\(vm, accelerometer, "sample"/);
  assert.match(platform, /uBit\.accelerometer\.getSample\(\)/);
  assert.match(orientation, /class OrientationGesture/);
  assert.match(orientation, /DOWN_THRESHOLD = -950/);
  assert.match(orientation, /UP_THRESHOLD = 950/);
  assert.match(orientation, /STABLE_SAMPLES = 3/);
  assert.match(pose, /class PoseGesture/);
  assert.match(pose, /WINDOW_SIZE = 35/);
  assert.match(pose, /LearnedMotionGesture\.new/);
  assert.match(pose, /MLModel::LABEL_POSE/);
  assert.match(pose, /"pose"/);
  assert.doesNotMatch(pose, /MIN_X_SPAN|def span/);
  assert.match(learnedGesture, /class LearnedMotionGesture/);
  assert.match(learnedGesture, /EVALUATE_EVERY = 3/);
  assert.match(learnedGesture, /@window_size = window_size/);
  assert.match(learnedGesture, /@model = MLModel\.new/);
  assert.match(learnedGesture, /def collect\(sample\)/);
  assert.match(learnedGesture, /collect\(sample\)/);
  assert.match(learnedGesture, /evaluation = @model\.evaluate/);
  assert.match(learnedGesture, /side_fallback = @target_label == MLModel::LABEL_SIDE && evaluation\[3\]/);
  assert.match(learnedGesture, /@last_metrics = evaluation/);
  assert.doesNotMatch(learnedGesture, /def side_motion\?/);
  assert.match(model, /class MLModel/);
  assert.match(model, /LABELS = \["circle", "pose", "side", "up", "down"\]/);
  assert.match(model, /Neural-network weights are compiled into the firmware by ML4F/);
  assert.match(model, /def evaluate\(x_values, y_values, z_values\)/);
  assert.match(model, /Microbit::ML\.evaluate\(/);
  assert.doesNotMatch(model, /INPUT_WEIGHTS|HIDDEN_BIAS|OUTPUT_WEIGHTS|OUTPUT_BIAS/);
  assert.doesNotMatch(model, /REQUIRED_CONFIDENCE/);
  assert.doesNotMatch(model, /def extract_features/);
  assert.doesNotMatch(model, /def predict/);
  assert.doesNotMatch(model, /def update\(sample\)/);
  assert.match(api, /mrbc_define_module_under\(vm, microbit, "ML"\)/);
  assert.match(api, /mrbc_define_method\(vm, ml, "evaluate", c_ml_evaluate\)/);
  assert.match(api, /static void c_ml_evaluate/);
  assert.match(api, /ML_INPUT_SIZE = 24/);
  assert.match(api, /ML_OUTPUT_SIZE = 5/);
  assert.doesNotMatch(api, /ML_HIDDEN_SIZE/);
  assert.match(api, /expect_arguments\(vm, argc, 3\)/);
  assert.match(api, /ml4f_full_invoke_arena\(/);
  assert.match(api, /mbremote_magic_circle_required_confidence/);
  assert.match(api, /mbremote_magic_circle_minimum_gesture_motion/);
  assert.match(api, /ML_SIDE_MIN_X_STDDEV/);
  assert.match(api, /const bool side_fallback/);
  assert.match(api, /mrbc_value result = mrbc_array_new\(vm, 8\)/);
  assert.doesNotMatch(api, /mrbc_array_new\(vm, ML_INPUT_SIZE\)/);
  assert.match(api, /static float ml_peaks/);
  assert.match(api, /sqrtf\(/);
  assert.match(api, /fabsf\(/);
  assert.doesNotMatch(api, /double/);
  assert.match(api, /window_total \+= added - removed/);
  assert.match(side, /class SideGesture/);
  assert.match(side, /MLModel::LABEL_SIDE/);
  assert.match(side, /"side",\n      30/);
  assert.match(circle, /class CircleGesture/);
  assert.match(circle, /MLModel::LABEL_CIRCLE/);
  assert.match(circle, /"circle",\n      50/);
  assert.match(builder, /class Builder/);
  assert.match(builder, /orientation_action == "down"/);
  assert.match(builder, /orientation_action == "up"/);
  assert.match(builder, /expected == "pose"/);
  assert.match(builder, /expected == "side"/);
  assert.match(builder, /expected == "circle"/);
  assert.match(builder, /if @lights\.action_active\?/);
  assert.match(builder, /collect_next_motion\(expected, sample\)/);
  assert.match(builder, /@pose\.collect\(sample\)/);
  assert.match(builder, /@side\.collect\(sample\)/);
  assert.match(builder, /@circle\.collect\(sample\)/);
  assert.doesNotMatch(builder, /pose_action = @pose\.update/);
  assert.match(game, /class Game/);
  assert.doesNotMatch(game, /Microbit::Accelerometer\.new/);
  assert.doesNotMatch(game, /@accelerometer/);
  assert.match(game, /@builder = builder/);
  assert.match(game, /Microbit\.sleep\(remaining\) if remaining > 0/);
  assert.match(game, /Microbit\.sleep\(LOOP_INTERVAL_MS\)/);
  assert.doesNotMatch(game, /sleep_ms\(/);
  assert.match(entry, /accelerometer = Microbit::Accelerometer\.new/);
  assert.match(entry, /builder = Builder\.new\(/);
  assert.match(entry, /game = Game\.new\(/);
  assert.match(entry, /builder: builder/);
  assert.match(entry, /game\.run/);
  assert.doesNotMatch(entry, /class Game/);
  assert.match(entry, /\ncall\n$/);
});

test("generates the PicoRuby neural network from its local model", async () => {
  const [model, generated] = await Promise.all([
    trainedModel(),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/ml_model.rb",
        import.meta.url
      ),
      "utf8"
    )
  ]);

  assert.deepEqual(REQUIRED_CONFIDENCE, [0.80, 0.80, 0.80, 0.90, 0.90]);
  assert.deepEqual(model.labels, ["circle", "pose", "side", "up", "down"]);
  assert.equal(model.inputWeights.length, 24 * 16);
  assert.equal(model.hiddenBias.length, 16);
  assert.equal(model.outputWeights.length, 16 * 5);
  assert.equal(model.outputBias.length, 5);
  assert.equal(generated, generateRubyModel(model));
});

test("retrain the PicoRuby model from local recordings", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-model-"));
  const outputPath = path.join(directory, "model.json");
  try {
    const report = await trainModel({ outputPath });
    const trained = JSON.parse(await fs.readFile(outputPath, "utf8"));

    assert.equal(report.examples, 49);
    assert.ok(report.accuracy >= 0.99);
    assert.deepEqual(trained.labels, ["circle", "pose", "side", "up", "down"]);
    assert.equal(trained.inputWeights.length, 24 * 16);
    assert.equal(trained.outputWeights.length, 16 * 5);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});

test("recognizes pose training data with the ML model without false positives", async () => {
  const model = await trainedModel();
  const compiled = compileML4FModel(model);
  const actions = JSON.parse(await fs.readFile(
    new URL(
      "../../../examples/picoruby/magic-circle/data/samples.json",
      import.meta.url
    ),
    "utf8"
  ));
  const windowSize = 35;
  const firstRecognition = (data) => {
    for (let end = windowSize; end <= data.x.length; end += 3) {
      const window = {
        x: data.x.slice(end - windowSize, end),
        y: data.y.slice(end - windowSize, end),
        z: data.z.slice(end - windowSize, end)
      };
      const probabilities = Array.from(
        compiled.execute(extractFeatures(window, Number(model.sampleLength)))
      );
      const actionIndex = probabilities.reduce(
        (best, probability, index) =>
          probability > probabilities[best] ? index : best,
        0
      );
      if (actionIndex === 1 && probabilities[actionIndex] >= 0.80) {
        return end;
      }
    }
    return null;
  };
  const pose = actions.find((action) => action.name === "pose");
  const poseRecognitions = pose.recordings.map((recording) =>
    firstRecognition(recording.data)
  );
  const falsePositives = actions
    .filter((action) => action.name !== "pose")
    .flatMap((action) => action.recordings)
    .filter((recording) => firstRecognition(recording.data) !== null);

  assert.equal(poseRecognitions.filter((value) => value !== null).length, 9);
  assert.ok(Math.max(...poseRecognitions) <= 35);
  assert.equal(falsePositives.length, 0);
});

test("generates reproducible ML4F firmware artifacts from training data", async () => {
  const model = await trainedModel();
  const artifacts = generateML4FArtifacts(model);

  assert.match(artifacts.source, /mbremote_magic_circle_model/);
  assert.match(artifacts.header, /MBREMOTE_MAGIC_CIRCLE_MODEL_WORDS 744/);
  assert.equal(artifacts.compiled.machineCode.length, 2976);
  assert.equal(artifacts.compiled.stats.total.arenaBytes, 168);
});

test("matches the ML4F machine model against every magic-circle recording", async () => {
  const report = await verifyML4FModel({ model: await trainedModel() });

  assert.equal(report.recordings, 49);
  assert.equal(report.evaluationCases, 87);
  assert.equal(report.probabilityValues, 435);
  assert.equal(report.decisionMismatches, 0);
  assert.equal(report.float32DecisionMismatches, 0);
  assert.ok(report.maxProbabilityDelta <= report.probabilityTolerance);
  assert.ok(report.float32MaxProbabilityDelta <= report.probabilityTolerance);
  assert.ok(report.machineCodeBytes > 0);
  assert.ok(report.arenaBytes > 0);
  assert.ok(report.estimatedCycles > 0);
});

test("ports the complete PicoRuby magic-circle game and light effects", async () => {
  const [
    buildScript,
    lights,
    layout,
    gerbera,
    delphinium,
    clover,
    ancient,
    builder,
    judge,
    protocol,
    runtime,
    game,
    main
  ] = await Promise.all([
    fs.readFile(
      new URL("../support/v2/picoruby/build.sh", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/magic_circles/magic_circle_lights.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/magic_circles/magic_circle_layout.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/magic_circles/gerbera_magic_circle.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/magic_circles/delphinium_magic_circle.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/magic_circles/clover_magic_circle.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/magic_circles/ancient_magic_circle.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/builder.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/judge.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/protocol.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/main.cpp", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/lib/game.rb",
        import.meta.url
      ),
      "utf8"
    ),
    fs.readFile(
      new URL(
        "../../../examples/picoruby/magic-circle/main.rb",
        import.meta.url
      ),
      "utf8"
    )
  ]);

  assert.match(buildScript, /MAX_SYMBOLS_COUNT=512/);
  assert.match(buildScript, /MAX_REGS_SIZE=256/);
  assert.match(buildScript, /MRBC_SUPPORT_OP_EXT/);
  assert.match(buildScript, /MRBC_USE_MATH=1/);
  assert.match(buildScript, /_DEFAULT_SOURCE/);
  assert.match(buildScript, /mrubyc-build-symbols512-regs256-op-ext-math/);
  assert.match(buildScript, /codal_app\/ml4f\.c/);
  assert.match(buildScript, /codal_app\/ml4f\.h/);
  assert.match(buildScript, /codal_app\/magic_circle_model\.c/);
  assert.match(buildScript, /codal_app\/magic_circle_model\.h/);
  assert.match(runtime, /RUBY_HEAP_SIZE = 56 \* 1024/);
  assert.match(lights, /PIXEL_PIN = 16/);
  assert.match(lights, /PIXEL_COUNT = 241/);
  assert.match(lights, /FRAME_DELAY_MS = 10/);
  assert.match(lights, /ACTION_DELAY_MS = 20/);
  assert.match(lights, /Microbit\.sleep\(delay_ms\)/);
  assert.doesNotMatch(lights, /sleep_ms\(/);
  assert.match(lights, /pixel_number - 1/);
  assert.match(layout, /class MagicCircleLayout/);
  assert.match(layout, /RADIAL_LINES = \[/);
  assert.match(gerbera, /class GerberaMagicCircle/);
  assert.match(delphinium, /class DelphiniumMagicCircle/);
  assert.match(clover, /class CloverMagicCircle/);
  assert.match(ancient, /class AncientMagicCircle/);
  for (const magicCircle of [gerbera, delphinium, clover, ancient]) {
    assert.match(magicCircle, /def show/);
    assert.match(magicCircle, /Microbit\.sleep\(/);
    assert.doesNotMatch(magicCircle, /sleep_ms\(/);
  }
  assert.match(lights, /def show_win_effect/);
  assert.match(lights, /def show_lose_effect/);
  assert.match(lights, /def show_draw_effect/);
  assert.match(lights, /def start_action_sequence\(action, sequence\)/);
  assert.match(lights, /def update_action/);
  assert.match(lights, /def action_active\?/);
  assert.match(lights, /@action_next_at = now \+ ACTION_DELAY_MS/);
  assert.doesNotMatch(lights, /Microbit\.sleep\(ACTION_DELAY_MS\)/);
  assert.match(builder, /@lights\.show_down/);
  assert.match(game, /@display\.show\(Microbit::Image::YES\)/);
  assert.match(builder, /@display\.show\(Microbit::Image::COW\)/);
  assert.match(builder, /@display\.show\(Microbit::Image::SWORD\)/);
  assert.match(builder, /@display\.show\(Microbit::Image::ASLEEP\)/);
  assert.match(builder, /@display\.show\(Microbit::Image::DIAMOND\)/);
  assert.match(builder, /@lights\.show_pose/);
  assert.match(builder, /@lights\.show_side/);
  assert.match(builder, /@lights\.show_circle/);
  assert.match(builder, /\[magic-circle\] motion_timing action=/);
  assert.match(builder, /wait_ms=/);
  assert.match(builder, /sample_count=/);
  assert.match(builder, /@step_started_at = shown_at/);
  assert.match(builder, /@step_sample_count = 0/);
  assert.match(builder, /\[magic-circle\] animation_timing action=/);
  assert.match(builder, /first_frame_ms=/);
  assert.match(builder, /@pending_complete/);
  assert.match(main, /DelphiniumMagicCircle\.new\(lights\)/);
  assert.match(main, /GerberaMagicCircle\.new\(lights\)/);
  assert.match(main, /CloverMagicCircle\.new\(lights\)/);
  assert.match(main, /AncientMagicCircle\.new\(lights\)/);
  assert.doesNotMatch(game, /MagicCircleLights\.new/);
  assert.doesNotMatch(game, /MagicCircle\.new\(@lights\)/);
  assert.match(game, /@magic_circles\[@my_choice\]\.show/);
  assert.match(game, /CAST_LIGHT_DELAY_MS = 100/);
  assert.match(game, /Microbit\.sleep\(CAST_LIGHT_DELAY_MS\)/);
  assert.match(game, /CAST_WAIT_MS = 10_000/);
  assert.match(game, /@my_wait_until = finished_at \+ CAST_WAIT_MS/);
  assert.match(game, /@opponent_time\.nil\? && now >= @my_wait_until/);
  assert.match(game, /show_outcome\(1\)/);
  assert.match(builder, /ACTION_WAIT_MS = 2000/);
  assert.match(builder, /Microbit\.running_time > @action_wait_until/);
  assert.match(builder, /def fail_build/);
  assert.doesNotMatch(builder, /Temporarily disabled/);
  assert.match(game, /@logo\.touched\?/);
  assert.match(game, /@button\.a_was_pressed\?/);
  assert.match(game, /@button\.b_was_pressed\?/);
  assert.match(game, /@button\.a_pressed\? && @button\.b_pressed\?/);
  assert.match(builder, /ANCIENT_SEQUENCE = \[/);
  assert.match(main, /radio\.enable\(RADIO_GROUP, RADIO_CHANNEL, RADIO_POWER\)/);
  assert.match(main, /lights: lights/);
  assert.match(main, /magic_circles: magic_circles/);
  assert.match(main, /orientation_gesture: OrientationGesture\.new/);
  for (const message of ["R", "A", "C", "K", "X", "Z"]) {
    assert.match(protocol, new RegExp(`"${message}\\|`));
  }
  assert.match(protocol, /class Protocol/);
  assert.match(judge, /class Judge/);
  assert.match(judge, /def judge\(/);
  assert.doesNotMatch(game, /@radio\.send/);
  assert.match(game, /@judge\.judge\(/);
  assert.match(game, /@lights\.show_win_effect/);
  assert.match(game, /@lights\.show_lose_effect/);
  assert.match(game, /@lights\.show_draw_effect/);
  assert.match(game, /@lights\.show_draw_effect\n      @magic_circles\[@my_choice\]\.show/);
});

test("ships PicoRuby radio bindings", async () => {
  const [api, platform] = await Promise.all([
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/microbit_api.c", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/main.cpp", import.meta.url),
      "utf8"
    ),
  ]);

  for (const method of ["enable", "disable", "send", "receive"]) {
    assert.match(api, new RegExp(`mrbc_define_method\\(vm, radio, "${method}"`));
  }
  assert.match(platform, /MICROBIT_RADIO_MAX_PACKET_SIZE/);
  assert.match(platform, /uBit\.radio\.setFrequencyBand\(channel\)/);
  assert.match(platform, /uBit\.radio\.setTransmitPower\(power\)/);
});

test("ships PicoRuby digital and analog pin bindings", async () => {
  const [api, platform] = await Promise.all([
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/microbit_api.c", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/main.cpp", import.meta.url),
      "utf8"
    ),
  ]);

  for (const method of ["initialize", "write", "read"]) {
    assert.match(
      api,
      new RegExp(`mrbc_define_method\\(vm, digital_pin, "${method}"`)
    );
  }
  for (const method of ["initialize", "write", "read", "period="]) {
    assert.match(
      api,
      new RegExp(`mrbc_define_method\\(vm, analog_pin, "${method}"`)
    );
  }
  assert.match(api, /mrbc_define_class_under\(vm, microbit, "DigitalPin"/);
  assert.match(api, /mrbc_define_class_under\(vm, microbit, "AnalogPin"/);
  assert.match(api, /"AnalogReadWritePin"/);
  assert.match(api, /define_pin_mode_constants\(digital_pin\)/);
  assert.match(api, /define_pin_mode_constants\(analog_pin\)/);
  const pinInitializer = api.slice(
    api.indexOf("static void c_pin_initialize"),
    api.indexOf("static void c_analog_read_write_pin_initialize")
  );
  const analogReadWritePinInitializer = api.slice(
    api.indexOf("static void c_analog_read_write_pin_initialize"),
    api.indexOf("static void c_digital_pin_write")
  );
  assert.doesNotMatch(pinInitializer, /SET_NIL_RETURN/);
  assert.doesNotMatch(analogReadWritePinInitializer, /SET_NIL_RETURN/);
  for (const method of ["initialize", "write", "read", "period="]) {
    assert.match(
      api,
      new RegExp(
        `mrbc_define_method\\([\\s\\S]*?analog_read_write_pin,[\\s\\S]*?"${method}"`
      )
    );
  }
  assert.match(platform, /case 20: return &uBit\.io\.P20/);
});

test("ships PicoRuby NeoPixel bindings", async () => {
  const [api, platform] = await Promise.all([
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/microbit_api.c", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/main.cpp", import.meta.url),
      "utf8"
    ),
  ]);

  for (const method of ["configure", "set_pixel", "fill", "clear", "show"]) {
    assert.match(
      api,
      new RegExp(`mrbc_define_method\\(vm, neopixel, "${method}"`)
    );
  }
  assert.match(platform, /NEOPIXEL_MAX_PIXELS = 256/);
  assert.match(platform, /neopixel_buffer\[offset\] = static_cast<uint8_t>\(green\)/);
});

test("ports the complete PicoRuby LED rover with a radio failsafe", async () => {
  const [api, platform, motor, dualMotor, rgbLed, controller, rover, main] = await Promise.all([
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/microbit_api.c", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../support/v2/picoruby/codal_app/main.cpp", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/led-rover/lib/motor.rb", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/led-rover/lib/dual_motor.rb", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/led-rover/lib/rgb_led.rb", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/led-rover/lib/controller.rb", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/led-rover/lib/rover.rb", import.meta.url),
      "utf8"
    ),
    fs.readFile(
      new URL("../../../examples/picoruby/led-rover/main.rb", import.meta.url),
      "utf8"
    )
  ]);

  assert.match(api, /mrbc_define_method\(vm, microbit, "running_time"/);
  assert.match(platform, /uBit\.systemTime\(\)/);
  assert.match(motor, /def brake/);
  assert.match(
    motor,
    /Microbit::DigitalPin\.new\(in1, Microbit::DigitalPin::OUT\)/
  );
  assert.match(
    motor,
    /Microbit::AnalogPin\.new\(pwm, Microbit::AnalogPin::OUT\)/
  );
  assert.match(motor, /@in1\.write\(1\)/);
  assert.match(dualMotor, /def drive\(left_speed, right_speed\)/);
  assert.match(dualMotor, /motor\.ccw\(speed\)/);
  assert.match(rgbLed, /def rainbow\(position\)/);
  assert.match(rgbLed, /def block_march_paths/);
  assert.match(controller, /class Controller/);
  assert.match(controller, /@accelerometer = Microbit::Accelerometer\.new/);
  assert.match(controller, /FORWARD_SPEED = 70/);
  assert.match(controller, /BACKWARD_SPEED = 70/);
  assert.match(controller, /@radio\.send\(encode_speeds\(\[0, 0\]\)\)/);
  assert.match(controller, /Microbit::Image::ARROW_N/);
  assert.match(rover, /class Rover/);
  assert.match(rover, /RECEIVE_TIMEOUT_MS = 500/);
  assert.match(rover, /LED_BRIGHTNESS = 20/);
  assert.match(rover, /LED_FRAME_DELAY_MS = 20/);
  assert.match(rover, /LED_STOP_RAINBOW_STEP = 4/);
  assert.match(rover, /Motor\.new\(8, 9, 13\)/);
  assert.match(rover, /Motor\.new\(14, 15, 16\)/);
  assert.match(rover, /DualMotor\.new\(left_motor, right_motor\)/);
  assert.match(rover, /RGBLed\.new\(/);
  assert.match(rover, /update_motion_image\(current_light_mode\)/);
  assert.match(rover, /Microbit::Image::SQUARE_SMALL/);
  assert.match(main, /radio\.enable\(RADIO_GROUP, RADIO_CHANNEL, RADIO_POWER\)/);
  assert.match(main, /Controller\.new\(display, radio, button\)\.run/);
  assert.doesNotMatch(main, /Microbit::Accelerometer\.new/);
  assert.match(main, /Rover\.new\(display, radio\)\.run/);
  assert.doesNotMatch(main, /def run_controller/);
  assert.doesNotMatch(main, /def run_rover/);
  assert.match(main, /\ncall\n$/);
});
