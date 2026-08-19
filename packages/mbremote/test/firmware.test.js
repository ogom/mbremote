import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { setupFirmware } from "../src/firmware.js";

test("downloads official V1 and V2 firmware into the project", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const urls = [];
  const installed = await setupFirmware({
    cwd,
    fetchImpl: async (url) => {
      urls.push(url);
      return {
        ok: true,
        text: async () => ":00000001FF\n",
      };
    },
    log() {},
  });

  assert.equal(urls.length, 2);
  assert.deepEqual(
    installed.map((filename) => path.basename(filename)).sort(),
    ["microbit-micropython-v1.hex", "microbit-micropython-v2.hex"]
  );
  for (const filename of installed) {
    assert.equal(await fs.readFile(filename, "utf8"), ":00000001FF\n");
  }
});

test("rejects a firmware download that is not Intel HEX", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));

  await assert.rejects(
    setupFirmware({
      cwd,
      fetchImpl: async () => ({ ok: true, text: async () => "not hex" }),
      log() {},
    }),
    /not Intel HEX/
  );
});
