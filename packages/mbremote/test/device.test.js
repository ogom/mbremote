import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { flashHex, flashHexAll } from "../src/device.js";

test("copies a HEX file to an explicit mount", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const mount = path.join(directory, "MICROBIT");
  const source = path.join(directory, "source.hex");
  await fs.mkdir(mount);
  await fs.writeFile(source, ":00000001FF\n");

  await flashHex(source, { mount, log: () => undefined });

  assert.equal(
    await fs.readFile(path.join(mount, "microbit.hex"), "utf8"),
    ":00000001FF\n"
  );
});

test("reports a DAPLink FAIL.TXT", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const mount = path.join(directory, "MICROBIT");
  const source = path.join(directory, "source.hex");
  await fs.mkdir(mount);
  await fs.writeFile(source, ":00000001FF\n");
  await fs.writeFile(path.join(mount, "DETAILS.TXT"), "DAPLink\n");
  await fs.writeFile(
    path.join(mount, "FAIL.TXT"),
    "error: The transfer timed out.\n"
  );

  await assert.rejects(
    flashHex(source, { mount, log: () => undefined }),
    /DAPLink rejected the transfer.*transfer timed out/s
  );
});

test("copies a HEX file to all mounts", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const mounts = [
    path.join(directory, "MICROBIT"),
    path.join(directory, "MICROBIT 1"),
  ];
  const source = path.join(directory, "source.hex");
  await Promise.all(mounts.map((mount) => fs.mkdir(mount)));
  await fs.writeFile(source, ":00000001FF\n");

  await flashHexAll(source, { mounts, log: () => undefined });

  for (const mount of mounts) {
    assert.equal(
      await fs.readFile(path.join(mount, "microbit.hex"), "utf8"),
      ":00000001FF\n"
    );
  }
});

test("requires at least two mounts for --all", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-test-"));
  const mount = path.join(directory, "MICROBIT");
  const source = path.join(directory, "source.hex");
  await fs.mkdir(mount);
  await fs.writeFile(source, ":00000001FF\n");

  await assert.rejects(
    flashHexAll(source, { mounts: [mount], log: () => undefined }),
    /two or more mounted MICROBIT drives.*--all/
  );
  await assert.rejects(fs.access(path.join(mount, "microbit.hex")));
});
