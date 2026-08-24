import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MicropythonFsHex, microbitBoardId } from "@microbit/microbit-fs";

import { buildPicoRubyHex } from "./picoruby.js";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const projectRoot = path.resolve(packageRoot, "../..");
const COMMON_FS_SIZE = 20 * 1024;

export async function buildHex({
  input,
  output = "build/microbit.hex",
  board = "universal",
  language,
  firmware: customFirmware,
  shared,
  cwd = process.cwd(),
  log = console.log,
} = {}) {
  const source = await resolveInput(input, cwd, { language });
  const resolvedLanguage = await resolveLanguage(source, language);
  if (resolvedLanguage === "picoruby") {
    return buildPicoRubyHex({
      source,
      output,
      board,
      firmware: customFirmware,
      cwd,
      log,
    });
  }

  const sharedDirectory =
    shared === false ? false : shared ? path.resolve(cwd, shared) : undefined;
  const files = await readSourceFiles(source, { shared: sharedDirectory });
  const firmware = resolveFirmware({
    firmware: customFirmware,
    board,
    cwd,
  });
  const boards = board === "universal" ? ["v1", "v2"] : [board];
  const images = await Promise.all(
    boards.map(async (targetBoard) => ({
      boardId:
        targetBoard === "v1" ? microbitBoardId.V1 : microbitBoardId.V2,
      hex: await readFirmware(firmware[targetBoard]),
    }))
  );
  const microbitFs = new MicropythonFsHex(
    images,
    customFirmware ? undefined : { maxFsSize: COMMON_FS_SIZE }
  );

  for (const file of files) {
    microbitFs.write(file.target, file.content);
    log(`add: ${file.target}`);
  }

  const outputPath = path.resolve(cwd, output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const hex =
    board === "universal"
      ? microbitFs.getUniversalHex()
      : microbitFs.getIntelHex(
          board === "v1" ? microbitBoardId.V1 : microbitBoardId.V2
        );
  await fs.writeFile(outputPath, hex, "utf8");
  log(`built: ${outputPath}`);
  return {
    outputPath,
    files: files.map(({ target }) => target),
    firmware,
    language: "micropython",
  };
}

export async function cleanBuild({
  cwd = process.cwd(),
  log = console.log,
} = {}) {
  const buildDirectory = path.resolve(cwd, "build");
  await fs.rm(buildDirectory, { recursive: true, force: true });
  log(`cleaned: ${buildDirectory}`);
  return { buildDirectory };
}

export async function resolveInput(
  input,
  cwd = process.cwd(),
  { language } = {}
) {
  if (input) {
    return path.resolve(cwd, input);
  }
  const candidates =
    language === "picoruby"
      ? ["src", "main.rb", "examples"]
      : language === "micropython"
        ? ["src", "main.py", "examples"]
        : ["src", "main.py", "main.rb", "examples"];
  for (const candidate of candidates) {
    const resolved = path.resolve(cwd, candidate);
    if (await isUsableDefaultInput(resolved, language)) {
      return resolved;
    }
  }
  throw new Error(
    "no input found; pass a .py/.rb file or a directory containing main.py/main.rb"
  );
}

export async function resolveLanguage(sourcePath, requestedLanguage) {
  const stat = await fs.stat(sourcePath).catch(() => undefined);
  if (!stat) {
    throw new Error(`input does not exist: ${sourcePath}`);
  }

  let detected;
  if (stat.isFile()) {
    const extension = path.extname(sourcePath).toLowerCase();
    if (extension === ".py") detected = "micropython";
    if (extension === ".rb") detected = "picoruby";
  } else if (stat.isDirectory()) {
    const hasPython = await exists(path.join(sourcePath, "main.py"));
    const hasRuby = await exists(path.join(sourcePath, "main.rb"));
    if (hasPython && hasRuby && !requestedLanguage) {
      throw new Error(
        `${sourcePath} contains both main.py and main.rb; pass --language micropython or picoruby`
      );
    }
    if (hasPython) detected = "micropython";
    if (hasRuby && (!hasPython || requestedLanguage === "picoruby")) {
      detected = "picoruby";
    }
  }

  if (!detected) {
    throw new Error(
      `cannot detect source language; expected main.py or main.rb: ${sourcePath}`
    );
  }
  if (requestedLanguage && requestedLanguage !== detected) {
    throw new Error(
      `--language ${requestedLanguage} does not match ${sourcePath}`
    );
  }
  return detected;
}

export async function readSourceFiles(sourcePath, { shared } = {}) {
  const stat = await fs.stat(sourcePath).catch(() => undefined);
  if (!stat) {
    throw new Error(`input does not exist: ${sourcePath}`);
  }
  if (stat.isFile()) {
    if (path.extname(sourcePath).toLowerCase() !== ".py") {
      throw new Error(`input file must end in .py: ${sourcePath}`);
    }
    const projectFiles = [
      {
        source: sourcePath,
        target: "main.py",
        content: await fs.readFile(sourcePath),
      },
    ];
    return includeSharedFiles(projectFiles, path.dirname(sourcePath), shared);
  }
  if (!stat.isDirectory()) {
    throw new Error(`input is not a file or directory: ${sourcePath}`);
  }

  const projectFiles = await readPythonFiles(sourcePath);
  if (!projectFiles.some((file) => file.target === "main.py")) {
    throw new Error(`${sourcePath} does not contain main.py`);
  }

  return includeSharedFiles(projectFiles, sourcePath, shared);
}

async function includeSharedFiles(projectFiles, projectDirectory, sharedDirectory) {
  if (sharedDirectory === false) {
    return projectFiles.sort((a, b) => a.target.localeCompare(b.target));
  }
  if (sharedDirectory && !(await isDirectory(sharedDirectory))) {
    throw new Error(`shared directory does not exist: ${sharedDirectory}`);
  }
  const candidates = sharedDirectory
    ? [sharedDirectory]
    : [
        path.join(projectDirectory, "shared"),
        path.join(path.dirname(projectDirectory), "shared"),
      ];
  let sharedFiles = [];
  for (const candidate of candidates) {
    if (path.resolve(candidate) === path.resolve(projectDirectory)) {
      if (sharedDirectory) {
        throw new Error(
          "shared directory must differ from the project directory"
        );
      }
      continue;
    }
    if (await isDirectory(candidate)) {
      sharedFiles = await readPythonFiles(candidate, { moduleNames: true });
      break;
    }
  }
  const files = [...projectFiles, ...sharedFiles].sort((a, b) =>
    a.target.localeCompare(b.target)
  );
  const duplicate = files.find(
    (file, index) =>
      files.findIndex((item) => item.target === file.target) !== index
  );
  if (duplicate) {
    throw new Error(`duplicate target filename: ${duplicate.target}`);
  }
  return files;
}

export function resolveFirmware({ firmware, board, cwd = process.cwd() } = {}) {
  const localFirmware = path.resolve(cwd, "firmware");
  const workspaceFirmware = path.join(projectRoot, "firmware");
  const firmwareDirectory = existsSync(
    path.join(localFirmware, "microbit-micropython-v1.hex")
  )
    ? localFirmware
    : workspaceFirmware;
  const resolved = {
    v1: path.join(firmwareDirectory, "microbit-micropython-v1.hex"),
    v2: path.join(firmwareDirectory, "microbit-micropython-v2.hex"),
  };
  if (!firmware) return resolved;
  if (!["v1", "v2"].includes(board)) {
    throw new Error("custom firmware requires board v1 or v2");
  }
  resolved[board] = path.resolve(cwd, firmware);
  return resolved;
}

async function readFirmware(filename) {
  return fs.readFile(filename, "utf8").catch((error) => {
    if (error.code === "ENOENT") {
      throw new Error(
        `firmware not found: ${filename}; run mbremote setup for official firmware or provide a custom firmware`
      );
    }
    throw error;
  });
}

async function exists(filename) {
  return fs.access(filename).then(
    () => true,
    () => false
  );
}

async function isDirectory(filename) {
  return fs.stat(filename).then(
    (stat) => stat.isDirectory(),
    () => false
  );
}

async function readPythonFiles(directory, { moduleNames = false } = {}) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".py"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
  const files = await Promise.all(
    names.map(async (name) => {
      const target = moduleNames ? name.replaceAll("-", "_") : name;
      return {
        source: path.join(directory, name),
        target,
        content: await fs.readFile(path.join(directory, name)),
      };
    })
  );
  if (!moduleNames) return files;

  const directoryModules = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const source = path.join(directory, entry.name, "main.py");
        if (!(await exists(source))) return undefined;
        return {
          source,
          target: `${entry.name.replaceAll("-", "_")}.py`,
          content: await fs.readFile(source),
        };
      })
  );
  return [...files, ...directoryModules.filter(Boolean)].sort((a, b) =>
    a.target.localeCompare(b.target)
  );
}

async function isUsableDefaultInput(filename, language) {
  const stat = await fs.stat(filename).catch(() => undefined);
  if (!stat) return false;
  const entryPoints =
    language === "picoruby"
      ? ["main.rb"]
      : language === "micropython"
        ? ["main.py"]
        : ["main.py", "main.rb"];
  if (stat.isFile()) return entryPoints.includes(path.basename(filename));
  if (!stat.isDirectory()) return false;
  for (const entryPoint of entryPoints) {
    if (await exists(path.join(filename, entryPoint))) return true;
  }
  return false;
}
