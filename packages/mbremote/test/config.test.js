import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadConfigOptions } from "../src/config.js";

async function writeConfig(cwd, content) {
  const directory = path.join(cwd, "config");
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, "setting.json"), content);
}

test("loads setting.json options used by the command", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(
    cwd,
    JSON.stringify({
      shared: "common",
      board: "v2",
      firmware: "firmware/custom-v2.hex",
      port: "/dev/test",
    })
  );

  assert.deepEqual(await loadConfigOptions("build", { cwd }), {
    shared: "common",
    board: "v2",
    firmware: "firmware/custom-v2.hex",
  });
  assert.deepEqual(await loadConfigOptions("monitor", { cwd }), {
    port: "/dev/test",
  });
});

test("loads false for shared to disable shared modules", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"shared":false}');

  assert.deepEqual(await loadConfigOptions("run", { cwd }), {
    shared: false,
  });
});

test("rejects true for shared", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"shared":true}');

  await assert.rejects(
    loadConfigOptions("run", { cwd }),
    /config option shared must be a non-empty string or false/
  );
});

test("returns no options when setting.json does not exist", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  assert.deepEqual(await loadConfigOptions("build", { cwd }), {});
});

test("rejects unknown setting.json options", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"unknown":true}');
  await assert.rejects(
    loadConfigOptions("build", { cwd }),
    /unknown config option/
  );
});

test("rejects setting.json options with the wrong type", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"all":"yes"}');
  await assert.rejects(
    loadConfigOptions("run", { cwd }),
    /config option all must be a boolean/
  );
});

test("rejects invalid setting.json", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, "{");
  await assert.rejects(loadConfigOptions("build", { cwd }), /invalid config file/);
});

test("loads an explicitly selected config file", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await fs.writeFile(path.join(cwd, "custom.json"), '{"shared":"common"}');
  assert.deepEqual(
    await loadConfigOptions("build", {
      cwd,
      filename: "custom.json",
      required: true,
    }),
    { shared: "common" }
  );
});

test("rejects a missing explicitly selected config file", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await assert.rejects(
    loadConfigOptions("build", {
      cwd,
      filename: "missing.json",
      required: true,
    }),
    /config file does not exist/
  );
});
