import assert from "node:assert/strict";
import test from "node:test";

import { helpTextForCommand, parseArgs } from "../src/args.js";

test("parses run input and serial options", () => {
  assert.deepEqual(
    parseArgs(["run", "examples/main.py", "--port", "/dev/test"]),
    {
      command: "run",
      options: {
        board: "universal",
        baud: 115200,
        timeout: 10000,
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

test("converts the timeout option from seconds to milliseconds", () => {
  const result = parseArgs(["run", "examples/main.py", "--timeout", "2"]);
  assert.equal(result.options.timeout, 2000);
});

test("converts a configured timeout from seconds to milliseconds", () => {
  const result = parseArgs(["run", "examples/main.py"], { timeout: 2 });
  assert.equal(result.options.timeout, 2000);
});

test("parses forced full flash option", () => {
  const result = parseArgs(["flash", "--firmware", "firmware.hex", "--force"]);
  assert.equal(result.options.force, true);
  assert.equal(result.options.massStorage, false);
  assert.equal(result.options.firmware, "firmware.hex");
});

test("parses build clean", () => {
  const result = parseArgs(["build", "clean"]);
  assert.equal(result.command, "build");
  assert.deepEqual(result.positionals, ["clean"]);
});

test("parses fs ls", () => {
  const result = parseArgs(["fs", "ls", "--port", "/dev/test"]);
  assert.equal(result.command, "fs");
  assert.deepEqual(result.positionals, ["ls"]);
  assert.equal(result.options.port, "/dev/test");
});

test("parses exec and reset commands", () => {
  const exec = parseArgs(["exec", "print(1)", "--timeout", "2"]);
  const reset = parseArgs(["reset", "--port", "/dev/test"]);
  assert.deepEqual(exec.positionals, ["print(1)"]);
  assert.equal(exec.options.timeout, 2000);
  assert.equal(reset.options.port, "/dev/test");
});

test("accepts the compatible fs ls root path", () => {
  const result = parseArgs(["fs", "ls", ":/"]);
  assert.deepEqual(result.positionals, ["ls", ":/"]);
});

test("parses fs cp paths", () => {
  const upload = parseArgs(["fs", "cp", "main.py", ":main.py"]);
  const download = parseArgs(["fs", "cp", ":data.bin", "data.bin"]);
  assert.deepEqual(upload.positionals, ["cp", "main.py", ":main.py"]);
  assert.deepEqual(download.positionals, ["cp", ":data.bin", "data.bin"]);
});

test("rejects the former top-level ls command", () => {
  assert.throws(() => parseArgs(["ls"]), /unknown command: ls/);
});

test("parses mass-storage fallback options", () => {
  const result = parseArgs([
    "flash",
    "--firmware",
    "firmware.hex",
    "--mass-storage",
    "--mount",
    "/Volumes/MICROBIT",
  ]);
  assert.equal(result.options.massStorage, true);
  assert.equal(result.options.mount, "/Volumes/MICROBIT");
});

test("parses all-device flash option", () => {
  const result = parseArgs(["flash", "--firmware", "firmware.hex", "--all"]);
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

test("parses the PicoRuby language for a V2 build", () => {
  const result = parseArgs([
    "build",
    "examples/picoruby/begin",
    "--language",
    "picoruby",
    "--board",
    "v2",
  ]);
  assert.equal(result.options.language, "picoruby");
  assert.equal(result.options.board, "v2");
});

test("rejects unknown source languages", () => {
  assert.throws(
    () => parseArgs(["build", "main.rb", "--language", "javascript"]),
    /--language must be micropython or picoruby/
  );
});

test("parses disabled shared modules for build and run", () => {
  const build = parseArgs(["build", "examples/main.py", "--no-shared"]);
  const run = parseArgs(["run", "examples/main.py", "--no-shared"]);
  assert.equal(build.options.shared, false);
  assert.equal(run.options.shared, false);
});

test("monitor options override the configured run default", () => {
  assert.equal(parseArgs(["run", "main.py"], { monitor: false }).options.monitor, false);
  assert.equal(
    parseArgs(["run", "main.py", "--monitor"], { monitor: false }).options.monitor,
    true
  );
  assert.equal(
    parseArgs(["run", "main.py", "--no-monitor"], { monitor: true }).options.monitor,
    false
  );
});

test("the last monitor option wins", () => {
  assert.equal(
    parseArgs(["run", "main.py", "--monitor", "--no-monitor"]).options.monitor,
    false
  );
  assert.equal(
    parseArgs(["run", "main.py", "--no-monitor", "--monitor"]).options.monitor,
    true
  );
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
    ["build", "examples/micropython/magic-circle", "--no-shared"],
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
    "examples/micropython/magic-circle/main.py",
    "--board",
    "v2",
    "--base-firmware",
    "firmware/magic-circle-v2.hex",
  ]);
  assert.equal(result.options.board, "v2");
  assert.equal(result.options.baseFirmware, "firmware/magic-circle-v2.hex");
});

test("parses firmware as the build artifact path", () => {
  const result = parseArgs(["build", "--firmware", "build/custom.hex"]);
  assert.equal(result.options.firmware, "build/custom.hex");
});

test("rejects the former output options", () => {
  assert.throws(() => parseArgs(["build", "--output", "build/custom.hex"]), /unknown option/);
  assert.throws(() => parseArgs(["build", "-o", "build/custom.hex"]), /unknown option/);
});

test("validates board names", () => {
  assert.throws(() => parseArgs(["build", "--board", "v3"]), /--board/);
});

test("shows help when no command is given", () => {
  assert.equal(parseArgs([]).options.help, true);
});

test("provides command-specific help", () => {
  const run = helpTextForCommand("run");
  const fs = helpTextForCommand("fs");
  assert.match(run, /mbremote run \[FILE\|DIR\]/);
  assert.match(run, /--monitor/);
  assert.doesNotMatch(run, /fs cp/);
  assert.match(fs, /mbremote fs cp FILE :FILENAME/);
  assert.doesNotMatch(fs, /--base-firmware/);
});

test("provides filesystem subcommand help", () => {
  const cp = helpTextForCommand("fs", "cp");
  assert.match(cp, /mbremote fs cp FILE :FILENAME/);
  assert.doesNotMatch(cp, /mbremote fs rm/);
});

test("parses the firmware setup command", () => {
  assert.equal(parseArgs(["setup"]).command, "setup");
});

test("parses config show", () => {
  const result = parseArgs(["config", "show", "--timeout", "2"]);
  assert.equal(result.command, "config");
  assert.deepEqual(result.positionals, ["show"]);
  assert.equal(result.options.timeout, 2000);
});
