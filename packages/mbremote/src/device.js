import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const FLASH_TIMEOUT = 120_000;

export async function findMicrobitMount(explicitMount) {
  if (explicitMount) {
    const resolved = path.resolve(explicitMount);
    if (!(await isDirectory(resolved))) {
      throw new Error(`MICROBIT mount does not exist: ${resolved}`);
    }
    return resolved;
  }

  const candidates = [];
  if (process.platform === "darwin") {
    candidates.push("/Volumes/MICROBIT");
  } else if (process.platform === "linux") {
    candidates.push(
      path.join("/media", os.userInfo().username, "MICROBIT"),
      path.join("/run/media", os.userInfo().username, "MICROBIT"),
      "/media/MICROBIT"
    );
  } else if (process.platform === "win32") {
    for (let code = 68; code <= 90; code += 1) {
      candidates.push(`${String.fromCharCode(code)}:\\`);
    }
  }

  for (const candidate of candidates) {
    if (!(await isDirectory(candidate))) {
      continue;
    }
    if (
      path.basename(candidate).toUpperCase() === "MICROBIT" ||
      (await hasDetailsFile(candidate))
    ) {
      return candidate;
    }
  }
  throw new Error(
    "MICROBIT drive not found; connect the board or use --mount DIR"
  );
}

export async function findMicrobitMounts() {
  const candidates = await automaticMountCandidates();
  const mounts = [];

  for (const candidate of candidates) {
    const resolved = path.resolve(candidate);
    if (mounts.includes(resolved) || !(await isDirectory(resolved))) {
      continue;
    }
    if (
      path.basename(resolved).toUpperCase().startsWith("MICROBIT") ||
      (await hasDetailsFile(resolved))
    ) {
      mounts.push(resolved);
    }
  }
  return mounts;
}

export async function flashHex(hexPath, { mount, log = console.log } = {}) {
  const source = path.resolve(hexPath);
  const sourceStat = await fs.stat(source).catch(() => undefined);
  if (!sourceStat?.isFile()) {
    throw new Error(`HEX file does not exist: ${source}`);
  }
  const volume = await findMicrobitMount(mount);
  const isDaplink = await hasDetailsFile(volume);
  const destination = path.join(volume, "microbit.hex");
  log(`flash: ${source} -> ${destination}`);
  await copyHex(source, destination);
  if (isDaplink) {
    await waitForDaplink(volume);
    const failure = await readTextIfExists(path.join(volume, "FAIL.TXT"));
    if (failure) {
      throw new Error(`DAPLink rejected the transfer:\n${failure.trim()}`);
    }
  }
  log("flashed: DAPLink transfer complete");
  return { mount: volume, destination };
}

export async function flashHexAll(
  hexPath,
  { mounts, log = console.log } = {}
) {
  const volumes = mounts || (await findMicrobitMounts());
  if (volumes.length < 2) {
    throw new Error("two or more mounted MICROBIT drives are required for --all");
  }
  for (const volume of volumes) {
    if (!(await isDirectory(volume))) {
      throw new Error(`MICROBIT mount does not exist: ${path.resolve(volume)}`);
    }
  }

  const results = [];
  for (const volume of volumes) {
    results.push(await flashHex(hexPath, { mount: volume, log }));
  }
  return results;
}

async function automaticMountCandidates() {
  if (process.platform === "darwin") {
    return listChildren("/Volumes");
  }
  if (process.platform === "linux") {
    const user = os.userInfo().username;
    const roots = [path.join("/media", user), path.join("/run/media", user), "/media"];
    const candidates = [];
    for (const root of roots) {
      candidates.push(...(await listChildren(root)));
    }
    return candidates;
  }
  if (process.platform === "win32") {
    const candidates = [];
    for (let code = 68; code <= 90; code += 1) {
      candidates.push(`${String.fromCharCode(code)}:\\`);
    }
    return candidates;
  }
  return [];
}

async function listChildren(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name));
}

async function copyHex(source, destination) {
  if (process.platform === "darwin") {
    // Node's fs.copyFile can stall when writing to DAPLink's virtual FAT
    // filesystem. macOS cp performs the same sequential transfer that works
    // when dragging a HEX file onto MICROBIT in Finder. -X avoids copying
    // extended attributes to the virtual drive.
    await runProcess("/bin/cp", ["-X", source, destination], FLASH_TIMEOUT);
    return;
  }
  await fs.copyFile(source, destination);
}

async function runProcess(command, args, timeout) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data.toString("utf8");
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`flash transfer timed out after ${timeout} ms`));
    }, timeout);
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
      } else {
        const detail = stderr.trim() || `signal ${signal || "unknown"}`;
        reject(
          new Error(`flash copy failed (${code ?? "no exit code"}): ${detail}`)
        );
      }
    });
  });
}

async function waitForDaplink(volume) {
  const details = path.join(volume, "DETAILS.TXT");
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (await exists(details)) {
      return;
    }
    await delay(100);
  }
  throw new Error("MICROBIT did not remount after flashing");
}

async function hasDetailsFile(directory) {
  return exists(path.join(directory, "DETAILS.TXT"));
}

async function isDirectory(filename) {
  return fs.stat(filename).then(
    (stat) => stat.isDirectory(),
    () => false
  );
}

async function exists(filename) {
  return fs.access(filename).then(
    () => true,
    () => false
  );
}

async function readTextIfExists(filename) {
  return fs.readFile(filename, "utf8").catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
