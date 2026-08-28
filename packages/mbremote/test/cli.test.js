import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { effectiveConfigValues, main } from "../src/cli.js";

test("rejects a flash firmware positional argument", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));

  await assert.rejects(
    main(["flash", "firmware.hex"], { cwd }),
    /too many arguments for flash: firmware\.hex/
  );
});

test("validates fs paths before opening a serial connection", async () => {
  await assert.rejects(main(["fs", "ls", "/"]), /prefix it with :/);
  await assert.rejects(
    main(["fs", "cp", "source.py", "destination.py"]),
    /exactly one cp path must be remote/
  );
});

test("validates exec code before opening a serial connection", async () => {
  await assert.rejects(main(["exec"]), /usage: mbremote exec CODE/);
  await assert.rejects(main(["exec", "print\(1\)", "print\(2\)"]), /usage: mbremote exec CODE/);
});

test("validates config show", async () => {
  await assert.rejects(main(["config"]), /usage: mbremote config show/);
});

test("shows effective configuration values", () => {
  const workspaceFirmware = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../..",
    "firmware"
  );
  const values = effectiveConfigValues(
    {
      language: undefined,
      board: "v2",
      firmware: "build/custom.hex",
      baseFirmware: "firmware/base.hex",
      port: "/dev/test",
      timeout: 2000,
    },
    { cwd: "/project" }
  );
  assert.deepEqual(values, {
    language: "auto",
    board: "v2",
    firmware: "/project/build/custom.hex",
    base_firmware: {
      v1: path.join(workspaceFirmware, "microbit-micropython-v1.hex"),
      v2: "/project/firmware/base.hex",
    },
    port: "/dev/test",
    timeout: 2,
  });
});

test("rejects options that do not apply to the selected command", async () => {
  await assert.rejects(main(["ports", "--firmware", "build/other.hex"]), /--firmware cannot be used with ports/);
  await assert.rejects(main(["build", "--baud", "9600"]), /--baud cannot be used with build/);
});
