import assert from "node:assert/strict";
import test from "node:test";

import { parseArgs } from "../src/args.js";

test("parses run input and serial options", () => {
  assert.deepEqual(
    parseArgs(["run", "examples/main.py", "--port", "/dev/test"]),
    {
      command: "run",
      options: {
        board: "universal",
        baud: 115200,
        timeout: 15000,
        monitor: true,
        massStorage: false,
        all: false,
        force: false,
        port: "/dev/test",
      },
      positionals: ["examples/main.py"],
    }
  );
});

test("parses forced full flash option", () => {
  const result = parseArgs(["flash", "firmware.hex", "--force"]);
  assert.equal(result.options.force, true);
  assert.equal(result.options.massStorage, false);
});

test("parses mass-storage fallback options", () => {
  const result = parseArgs([
    "flash",
    "firmware.hex",
    "--mass-storage",
    "--mount",
    "/Volumes/MICROBIT",
  ]);
  assert.equal(result.options.massStorage, true);
  assert.equal(result.options.mount, "/Volumes/MICROBIT");
});

test("parses all-device flash option", () => {
  const result = parseArgs(["flash", "firmware.hex", "--all"]);
  assert.equal(result.options.all, true);
});

test("parses all-device run option", () => {
  const result = parseArgs(["run", "examples/rps_radio", "--all"]);
  assert.equal(result.command, "run");
  assert.equal(result.options.all, true);
  assert.equal(result.options.monitor, true);
  assert.deepEqual(result.positionals, ["examples/rps_radio"]);
});

test("parses a shared module directory for build and run", () => {
  const build = parseArgs(["build", "examples/main.py", "--shared", "lib"]);
  const run = parseArgs(["run", "examples/main.py", "--shared", "lib"]);
  assert.equal(build.options.shared, "lib");
  assert.equal(run.options.shared, "lib");
});

test("parses disabled shared modules for build and run", () => {
  const build = parseArgs(["build", "examples/main.py", "--no-shared"]);
  const run = parseArgs(["run", "examples/main.py", "--no-shared"]);
  assert.equal(build.options.shared, false);
  assert.equal(run.options.shared, false);
});

test("command-line options override config defaults", () => {
  const result = parseArgs(
    ["build", "examples/hello", "--shared", "cli-shared", "--board", "v1"],
    { shared: "config-shared", board: "v2" }
  );
  assert.equal(result.options.shared, "cli-shared");
  assert.equal(result.options.board, "v1");
});

test("no-shared overrides the configured shared directory", () => {
  const result = parseArgs(
    ["build", "examples/magic-circle", "--no-shared"],
    { shared: "config-shared" }
  );
  assert.equal(result.options.shared, false);
});

test("parses an explicit config file", () => {
  const result = parseArgs(["build", "--config", "settings/mbremote.json"]);
  assert.equal(result.options.config, "settings/mbremote.json");
});

test("parses custom firmware for a board-specific build", () => {
  const result = parseArgs([
    "build",
    "examples/magic-circle/main.py",
    "--board",
    "v2",
    "--firmware",
    "firmware/magic-circle-v2.hex",
  ]);
  assert.equal(result.options.board, "v2");
  assert.equal(result.options.firmware, "firmware/magic-circle-v2.hex");
});

test("validates board names", () => {
  assert.throws(() => parseArgs(["build", "--board", "v3"]), /--board/);
});

test("shows help when no command is given", () => {
  assert.equal(parseArgs([]).options.help, true);
});

test("parses the firmware setup command", () => {
  assert.equal(parseArgs(["setup"]).command, "setup");
});
