import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildHex,
  readSourceFiles,
  resolveFirmware,
  resolveInput,
} from "../src/builder.js";

test("a single Python file is installed as main.py", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const file = path.join(directory, "blink.py");
  await fs.writeFile(file, "print('hello')\n");
  const files = await readSourceFiles(file);
  assert.equal(files.length, 1);
  assert.equal(files[0].target, "main.py");
});

test("a single project file includes modules from sibling shared", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const project = path.join(directory, "hello");
  const shared = path.join(directory, "shared");
  await fs.mkdir(project);
  await fs.mkdir(shared);
  const main = path.join(project, "main.py");
  await fs.writeFile(main, "import rgb_led\n");
  await fs.writeFile(path.join(shared, "rgb_led.py"), "def update(): pass\n");

  const files = await readSourceFiles(main);

  assert.deepEqual(
    files.map((file) => file.target),
    ["main.py", "rgb_led.py"]
  );
});

test("a project directory includes sorted Python files", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await fs.writeFile(path.join(directory, "main.py"), "import helper\n");
  await fs.writeFile(path.join(directory, "helper.py"), "value = 1\n");
  await fs.writeFile(path.join(directory, "notes.txt"), "ignored\n");
  const files = await readSourceFiles(directory);
  assert.deepEqual(
    files.map((file) => file.target),
    ["helper.py", "main.py"]
  );
});

test("a project includes Python modules from its sibling shared directory", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const project = path.join(directory, "hello");
  const shared = path.join(directory, "shared");
  await fs.mkdir(project);
  await fs.mkdir(shared);
  await fs.writeFile(path.join(project, "main.py"), "import rgb_led\n");
  await fs.writeFile(path.join(shared, "rgb-led.py"), "def update(): pass\n");

  const files = await readSourceFiles(project);

  assert.deepEqual(
    files.map((file) => file.target),
    ["main.py", "rgb_led.py"]
  );
});

test("a shared module directory is installed using its directory name", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const project = path.join(directory, "hello");
  const shared = path.join(directory, "shared");
  const motor = path.join(shared, "motor");
  const dualMotor = path.join(shared, "dual-motor");
  await fs.mkdir(project);
  await fs.mkdir(motor, { recursive: true });
  await fs.mkdir(dualMotor);
  await fs.writeFile(path.join(project, "main.py"), "import motor\n");
  await fs.writeFile(path.join(motor, "main.py"), "class Motor: pass\n");
  await fs.writeFile(
    path.join(dualMotor, "main.py"),
    "class DualMotor: pass\n"
  );

  const files = await readSourceFiles(project);

  assert.deepEqual(
    files.map((file) => file.target),
    ["dual_motor.py", "main.py", "motor.py"]
  );
});

test("an explicit shared directory overrides automatic discovery", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const project = path.join(directory, "examples", "hello");
  const automatic = path.join(directory, "examples", "shared");
  const explicit = path.join(directory, "common");
  await fs.mkdir(project, { recursive: true });
  await fs.mkdir(automatic);
  await fs.mkdir(explicit);
  await fs.writeFile(path.join(project, "main.py"), "import helper\n");
  await fs.writeFile(path.join(automatic, "automatic.py"), "value = 1\n");
  await fs.writeFile(path.join(explicit, "helper.py"), "value = 2\n");

  const files = await readSourceFiles(project, { shared: explicit });

  assert.deepEqual(
    files.map((file) => file.target),
    ["helper.py", "main.py"]
  );
});

test("shared modules can be disabled", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const project = path.join(directory, "examples", "magic-circle");
  const shared = path.join(directory, "examples", "shared");
  await fs.mkdir(project, { recursive: true });
  await fs.mkdir(shared);
  await fs.writeFile(path.join(project, "main.py"), "print('hello')\n");
  await fs.writeFile(path.join(shared, "motor.py"), "class Motor: pass\n");

  const files = await readSourceFiles(project, { shared: false });

  assert.deepEqual(
    files.map((file) => file.target),
    ["main.py"]
  );
});

test("rejects a missing explicit shared directory", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await fs.writeFile(path.join(directory, "main.py"), "print('hello')\n");

  await assert.rejects(
    readSourceFiles(directory, { shared: path.join(directory, "missing") }),
    /shared directory does not exist/
  );
});

test("rejects a shared module that collides with a project filename", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const project = path.join(directory, "hello");
  const shared = path.join(directory, "shared");
  await fs.mkdir(project);
  await fs.mkdir(shared);
  await fs.writeFile(path.join(project, "main.py"), "import helper\n");
  await fs.writeFile(path.join(project, "helper.py"), "value = 1\n");
  await fs.writeFile(path.join(shared, "helper.py"), "value = 2\n");

  await assert.rejects(readSourceFiles(project), /duplicate target filename/);
});

test("root V1 and V2 firmware resolves", async () => {
  const firmware = resolveFirmware();
  assert.match(firmware.v1, /my_microbit\/firmware\//);
  assert.match(firmware.v1, /microbit-micropython-v1\.hex$/);
  assert.match(firmware.v2, /microbit-micropython-v2\.hex$/);
  await fs.access(firmware.v1);
  await fs.access(firmware.v2);
});

test("project firmware takes precedence over workspace firmware", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const firmwareDirectory = path.join(directory, "firmware");
  await fs.mkdir(firmwareDirectory);
  await fs.writeFile(
    path.join(firmwareDirectory, "microbit-micropython-v1.hex"),
    ":00000001FF\n"
  );

  const firmware = resolveFirmware({ cwd: directory });
  assert.equal(
    firmware.v1,
    path.join(firmwareDirectory, "microbit-micropython-v1.hex")
  );
  assert.equal(
    firmware.v2,
    path.join(firmwareDirectory, "microbit-micropython-v2.hex")
  );
});

test("custom firmware replaces only the selected board", () => {
  const firmware = resolveFirmware({
    firmware: "firmware/custom-v2.hex",
    board: "v2",
    cwd: "/project",
  });
  assert.equal(firmware.v2, "/project/firmware/custom-v2.hex");
  assert.match(firmware.v1, /microbit-micropython-v1\.hex$/);
});

test("custom firmware requires a board-specific build", () => {
  assert.throws(
    () => resolveFirmware({ firmware: "custom.hex", board: "universal" }),
    /requires board v1 or v2/
  );
});

test("builds a board-specific HEX from custom firmware", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const input = path.join(directory, "program.py");
  const output = path.join(directory, "microbit.hex");
  const customFirmware = resolveFirmware().v2;
  await fs.writeFile(input, "print('custom')\n");

  const result = await buildHex({
    input,
    output,
    board: "v2",
    firmware: customFirmware,
    cwd: directory,
    log() {},
  });

  assert.deepEqual(result.files, ["main.py"]);
  assert.equal(result.firmware.v2, customFirmware);
  assert.ok((await fs.stat(output)).size > 0);
});

test("default input falls back to examples", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const examples = path.join(directory, "examples");
  await fs.mkdir(examples);
  await fs.writeFile(path.join(examples, "main.py"), "print('hello')\n");
  assert.equal(await resolveInput(undefined, directory), examples);
});
