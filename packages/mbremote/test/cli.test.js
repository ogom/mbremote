import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { main } from "../src/cli.js";

test("rejects a flash firmware positional argument", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));

  await assert.rejects(
    main(["flash", "firmware.hex"], { cwd }),
    /too many arguments for flash: firmware\.hex/
  );
});
