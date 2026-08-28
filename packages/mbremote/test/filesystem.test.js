import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  runFilesystem,
  validateFilesystemArgs,
} from "../src/filesystem.js";

function outputBuffer() {
  const chunks = [];
  return {
    chunks,
    write(chunk) {
      chunks.push(Buffer.from(chunk));
    },
    text() {
      return Buffer.concat(chunks).toString("utf8");
    },
  };
}

function remoteDouble(overrides = {}) {
  return {
    cat: async () => Buffer.alloc(0),
    ls: async () => [],
    rm: async () => undefined,
    writeFile: async () => undefined,
    ...overrides,
  };
}

test("validates fs commands and remote path placement", () => {
  assert.doesNotThrow(() => validateFilesystemArgs(["ls"]));
  assert.doesNotThrow(() => validateFilesystemArgs(["ls", ":/"]));
  assert.doesNotThrow(() =>
    validateFilesystemArgs(["cp", "main.py", ":main.py"])
  );
  assert.throws(() => validateFilesystemArgs(["ls", "/"]), /prefix it with/);
  assert.throws(
    () => validateFilesystemArgs(["cp", "a.py", "b.py"]),
    /exactly one cp path/
  );
  assert.throws(
    () => validateFilesystemArgs(["cp", ":/a.py", ":/b.py"]),
    /exactly one cp path/
  );
  assert.throws(
    () => validateFilesystemArgs(["cp", "a.py", ":/lib/a.py"]),
    /filesystem is flat/
  );
  assert.throws(
    () => validateFilesystemArgs(["ls", ":lib"]),
    /does not accept a path/
  );
  assert.throws(() => validateFilesystemArgs(["unknown"]), /unknown fs command/);
});

test("lists the micro:bit filesystem root", async () => {
  let received;
  const output = outputBuffer();
  await runFilesystem(["ls"], {
    serialPath: "/dev/test",
    baudRate: 9600,
    timeout: 2000,
    output,
    remote: remoteDouble({
      ls: async (options) => {
        received = options;
        return ["a.py", "b.py"];
      },
    }),
  });

  assert.deepEqual(received, {
    path: "/dev/test",
    baudRate: 9600,
    timeout: 2000,
  });
  assert.equal(output.text(), "a.py\nb.py\n");
});

test("writes cat data without changing binary bytes", async () => {
  const output = outputBuffer();
  await runFilesystem(["cat", ":data.bin"], {
    output,
    remote: remoteDouble({ cat: async () => Buffer.from([0, 255, 10]) }),
  });
  assert.deepEqual(Buffer.concat(output.chunks), Buffer.from([0, 255, 10]));
});

test("uploads a local file to a remote path", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-fs-test-"));
  await fs.writeFile(path.join(cwd, "data.bin"), Buffer.from([0, 1, 255]));
  let received;
  const output = outputBuffer();

  await runFilesystem(["cp", "data.bin", ":data.bin"], {
    cwd,
    output,
    remote: remoteDouble({
      writeFile: async (options) => {
        received = options;
      },
    }),
  });

  assert.equal(received.remotePath, "data.bin");
  assert.deepEqual(received.data, Buffer.from([0, 1, 255]));
  assert.equal(output.text(), "uploaded 3 bytes: data.bin -> :data.bin\n");
});

test("downloads a remote file into a local directory", async () => {
  const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-fs-test-"));
  const destination = path.join(cwd, "downloads");
  await fs.mkdir(destination);
  const output = outputBuffer();

  await runFilesystem(["cp", ":data.bin", "downloads"], {
    cwd,
    output,
    remote: remoteDouble({ cat: async () => Buffer.from([255, 0, 1]) }),
  });

  assert.deepEqual(
    await fs.readFile(path.join(destination, "data.bin")),
    Buffer.from([255, 0, 1])
  );
  assert.equal(output.text(), "downloaded 3 bytes: :data.bin -> downloads\n");
});

test("passes a flat filename to rm", async () => {
  const calls = [];
  const remote = remoteDouble({
    rm: async (options) => calls.push(["rm", options.remotePath]),
  });

  await runFilesystem(["rm", ":old.py"], { remote });
  assert.deepEqual(calls, [["rm", "old.py"]]);
});
