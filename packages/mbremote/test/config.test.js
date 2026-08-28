import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { loadConfigOptions, setupConfig } from "../src/config.js";

async function writeConfig(cwd, content) {
  const directory = path.join(cwd, "config");
  await fs.mkdir(directory);
  await fs.writeFile(path.join(directory, "setting.json"), content);
}

test("creates an empty project configuration", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const result = await setupConfig({ cwd, log() {} });

  assert.deepEqual(result, {
    path: path.join(cwd, "config", "setting.json"),
    created: true,
  });
  assert.equal(
    await fs.readFile(path.join(cwd, "config", "setting.json"), "utf8"),
    "{}\n"
  );
});

test("does not overwrite an existing project configuration", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"board":"v2"}\n');

  const result = await setupConfig({ cwd, log() {} });

  assert.equal(result.created, false);
  assert.equal(
    await fs.readFile(path.join(cwd, "config", "setting.json"), "utf8"),
    '{"board":"v2"}\n'
  );
});

test("loads setting.json options used by the command", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(
    cwd,
    JSON.stringify({
      shared: "common",
      board: "v2",
      language: "picoruby",
      base_firmware: "firmware/custom-v2.hex",
      port: "/dev/test",
    })
  );

  assert.deepEqual(await loadConfigOptions("build", { cwd }), {
    shared: "common",
    board: "v2",
    language: "picoruby",
    baseFirmware: "firmware/custom-v2.hex",
  });
  assert.deepEqual(await loadConfigOptions("monitor", { cwd }), {
    port: "/dev/test",
  });
  assert.deepEqual(await loadConfigOptions("fs", { cwd }), {
    port: "/dev/test",
  });
  assert.deepEqual(await loadConfigOptions("exec", { cwd }), {
    port: "/dev/test",
  });
  assert.deepEqual(await loadConfigOptions("reset", { cwd }), {
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

test("loads snake_case mass_storage as the mass-storage option", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"mass_storage":true}');

  assert.deepEqual(await loadConfigOptions("flash", { cwd }), {
    massStorage: true,
  });
});

test("loads timeout in seconds", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"timeout":2}');

  assert.deepEqual(await loadConfigOptions("run", { cwd }), { timeout: 2 });
});

test("rejects camelCase config keys", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"massStorage":true}');

  await assert.rejects(
    loadConfigOptions("flash", { cwd }),
    /unknown config option: massStorage/
  );
});

test("loads firmware as the build artifact path", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"firmware":"build/custom.hex"}');

  assert.deepEqual(await loadConfigOptions("build", { cwd }), {
    firmware: "build/custom.hex",
  });
});

test("rejects the former output config key", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  await writeConfig(cwd, '{"output":"build/custom.hex"}');

  await assert.rejects(
    loadConfigOptions("build", { cwd }),
    /unknown config option: output/
  );
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
