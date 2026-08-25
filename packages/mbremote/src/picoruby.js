import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
);
const projectRoot = path.resolve(packageRoot, "../..");
const supportDirectory = path.join(packageRoot, "support", "v2", "picoruby");

export async function buildPicoRubyHex({
  source,
  output = "build/microbit.hex",
  board,
  firmware,
  cwd = process.cwd(),
  log = console.log,
  environment = process.env,
} = {}) {
  if (board !== "v2") {
    throw new Error("PicoRuby currently requires --board v2");
  }
  if (firmware) {
    throw new Error("--base-firmware is not supported for PicoRuby builds");
  }
  const files = await resolveRubySourceFiles(source);
  const outputPath = path.resolve(cwd, output);
  const cacheDirectory = resolveCacheDirectory(cwd);
  const buildScript = path.join(supportDirectory, "build.sh");
  const buildEnvironment = resolveBuildEnvironment(environment);
  let temporaryDirectory;
  let buildSource = files[0].source;

  log(`will AOT-compile PicoRuby firmware: ${outputPath}`);

  try {
    if (files.length > 1) {
      temporaryDirectory = await fs.mkdtemp(
        path.join(os.tmpdir(), "mbremote-picoruby-")
      );
      buildSource = path.join(temporaryDirectory, "main.rb");
      await fs.writeFile(buildSource, combineRubySource(files), "utf8");
    }

    for (const file of files) {
      log(`add: ${file.target} (${file.source})`);
    }
    await run("sh", [buildScript, buildSource, outputPath, cacheDirectory], {
      cwd,
      env: buildEnvironment,
    });
  } finally {
    if (temporaryDirectory) {
      await fs.rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  return {
    outputPath,
    files: files.map((file) => file.target),
    firmware: { v2: "PicoRuby/FemtoRuby source build" },
    language: "picoruby",
  };
}

export async function resolveRubyEntryPoint(sourcePath) {
  const files = await resolveRubySourceFiles(sourcePath);
  return files.find((file) => file.target === "main.rb").source;
}

export async function resolveRubySourceFiles(sourcePath) {
  const stat = await fs.stat(sourcePath).catch(() => undefined);
  if (!stat) {
    throw new Error(`input does not exist: ${sourcePath}`);
  }
  if (stat.isFile()) {
    if (path.extname(sourcePath).toLowerCase() !== ".rb") {
      throw new Error(`PicoRuby input file must end in .rb: ${sourcePath}`);
    }
    return [
      {
        source: sourcePath,
        target: "main.rb",
        content: await fs.readFile(sourcePath, "utf8"),
      },
    ];
  }
  if (!stat.isDirectory()) {
    throw new Error(`input is not a file or directory: ${sourcePath}`);
  }

  const entryPoint = path.join(sourcePath, "main.rb");
  if (!existsSync(entryPoint)) {
    throw new Error(`${sourcePath} does not contain main.rb`);
  }
  const rubyFiles = (await findRubyFiles(sourcePath))
    .filter((name) => name !== "main.rb")
    .sort((a, b) => a.localeCompare(b));
  rubyFiles.push("main.rb");

  return Promise.all(
    rubyFiles.map(async (target) => {
      const source = path.join(sourcePath, target);
      return {
        source,
        target,
        content: await fs.readFile(source, "utf8"),
      };
    })
  );
}

async function findRubyFiles(directory, relativeDirectory = "") {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const sourcePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await findRubyFiles(sourcePath, relativePath)));
    } else if (
      entry.isFile() &&
      path.extname(entry.name).toLowerCase() === ".rb"
    ) {
      files.push(relativePath.split(path.sep).join("/"));
    }
  }

  return files;
}

export function combineRubySource(files) {
  return files
    .map(({ target, content }) => {
      const source = content.endsWith("\n") ? content : `${content}\n`;
      return `# mbremote source: ${target}\n${source}`;
    })
    .join("\n");
}

function resolveCacheDirectory(cwd) {
  const workspaceCache = path.join(projectRoot, "tmp");
  if (existsSync(path.join(workspaceCache, "picoruby"))) {
    return workspaceCache;
  }
  return path.resolve(cwd, ".mbremote-cache");
}

function resolveBuildEnvironment(environment) {
  const resolved = { ...environment };
  const cache = path.join(projectRoot, "tmp");
  const candidates = {
    PICORUBY_SOURCE: path.join(cache, "picoruby"),
    MICROBIT_V2_SOURCE_DIR: path.join(cache, "micropython-microbit-v2"),
    ARM_NONE_EABI_TOOLCHAIN_DIR: path.join(
      cache,
      "firmware-tools",
      "gcc-arm-none-eabi-10.3-2021.10"
    ),
    CMAKE_COMMAND: path.join(cache, "firmware-tools", "bin", "cmake"),
  };
  for (const [name, candidate] of Object.entries(candidates)) {
    if (!resolved[name] && existsSync(candidate)) {
      resolved[name] = candidate;
    }
  }
  return resolved;
}

function run(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      const reason = signal ? `signal ${signal}` : `exit code ${code}`;
      reject(new Error(`PicoRuby firmware build failed (${reason})`));
    });
  });
}
