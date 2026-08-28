import fs from "node:fs/promises";
import path from "node:path";

import {
  remoteCat,
  remoteLs,
  remoteRm,
  remoteWriteFile,
} from "./serial.js";
import {
  isRemotePath,
  unwrapRemotePath,
  validateRemotePath,
} from "./remote-path.js";

const REMOTE = {
  cat: remoteCat,
  ls: remoteLs,
  rm: remoteRm,
  writeFile: remoteWriteFile,
};

export function validateFilesystemArgs(positionals) {
  const [command, ...args] = positionals;
  switch (command) {
    case "cp":
      if (args.length !== 2) {
        throw new Error("usage: mbremote fs cp SOURCE DESTINATION [options]");
      }
      validateCopyPaths(args[0], args[1]);
      return;
    case "cat":
    case "rm":
      if (args.length !== 1) {
        throw new Error(
          `usage: mbremote fs ${command} :FILENAME [options]`
        );
      }
      validateMicrobitFilePath(args[0]);
      return;
    case "ls":
      if (args.length > 1) {
        throw new Error("usage: mbremote fs ls [:/] [options]");
      }
      if (args.length === 1 && !["", "/"].includes(validateRemotePath(args[0]))) {
        throw new Error("micro:bit filesystem is flat; fs ls does not accept a path");
      }
      return;
    default:
      throw new Error(`unknown fs command: ${command || "(none)"}`);
  }
}

export async function runFilesystem(
  positionals,
  {
    cwd = process.cwd(),
    serialPath,
    baudRate = 115200,
    timeout = 10000,
    output = process.stdout,
    remote = REMOTE,
  } = {}
) {
  validateFilesystemArgs(positionals);
  const [command, ...args] = positionals;
  const connection = { path: serialPath, baudRate, timeout };

  switch (command) {
    case "cp":
      return copy(args[0], args[1], { cwd, connection, output, remote });
    case "cat":
      output.write(
        await remote.cat({
          ...connection,
          remotePath: validateMicrobitFilePath(args[0]),
        })
      );
      return;
    case "ls": {
      const files = await remote.ls({
        ...connection,
      });
      for (const file of files) output.write(`${file}\n`);
      return;
    }
    case "rm":
      await remote.rm({
        ...connection,
        remotePath: validateMicrobitFilePath(args[0]),
      });
      return;
  }
}

async function copy(source, destination, { cwd, connection, output, remote }) {
  const sourceRemote = isRemotePath(source);
  if (sourceRemote) {
    const data = await remote.cat({
      ...connection,
      remotePath: validateMicrobitFilePath(source),
    });
    const destinationPath = await localDestination(cwd, destination, source);
    await fs.writeFile(destinationPath, data);
    output.write(
      `downloaded ${data.length} bytes: ${source} -> ${destination}\n`
    );
    return;
  }

  const data = await fs.readFile(path.resolve(cwd, source));
  await remote.writeFile({
    ...connection,
    remotePath: validateMicrobitFilePath(destination),
    data,
  });
  output.write(`uploaded ${data.length} bytes: ${source} -> ${destination}\n`);
}

function validateCopyPaths(source, destination) {
  if (isRemotePath(source) === isRemotePath(destination)) {
    throw new Error(
      "exactly one cp path must be remote (prefix remote paths with :)"
    );
  }
  validateMicrobitFilePath(isRemotePath(source) ? source : destination);
}

function validateMicrobitFilePath(path) {
  const remote = validateRemotePath(path);
  const filename = remote.replace(/^\//, "");
  if (!filename || filename.includes("/")) {
    throw new Error(
      "micro:bit filesystem is flat; remote file paths must be :FILENAME"
    );
  }
  return filename;
}

async function localDestination(cwd, destination, source) {
  const resolved = path.resolve(cwd, destination);
  const stat = await fs.stat(resolved).catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (!stat?.isDirectory()) return resolved;
  return path.join(resolved, path.posix.basename(unwrapRemotePath(source)));
}
