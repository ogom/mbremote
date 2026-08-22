import fs from "node:fs/promises";
import path from "node:path";

const OPTION_TYPES = new Map([
  ["board", "string"],
  ["language", "string"],
  ["output", "string"],
  ["shared", "string-or-false"],
  ["firmware", "string"],
  ["port", "string"],
  ["mount", "string"],
  ["baud", "number"],
  ["timeout", "number"],
  ["monitor", "boolean"],
  ["massStorage", "boolean"],
  ["all", "boolean"],
  ["force", "boolean"],
]);

const COMMAND_OPTIONS = new Map([
  [
    "build",
    new Set(["board", "language", "output", "shared", "firmware"]),
  ],
  [
    "flash",
    new Set(["output", "port", "mount", "massStorage", "all", "force"]),
  ],
  [
    "run",
    new Set([
      "board",
      "language",
      "output",
      "shared",
      "firmware",
      "port",
      "mount",
      "baud",
      "timeout",
      "monitor",
      "massStorage",
      "all",
      "force",
    ]),
  ],
  ["repl", new Set(["port", "baud"])],
  ["monitor", new Set(["port", "baud"])],
  ["ls", new Set(["port", "baud", "timeout"])],
  ["ports", new Set()],
]);

export async function setupConfig({
  cwd = process.cwd(),
  filename = "config/setting.json",
  log = console.log,
} = {}) {
  const configPath = path.resolve(cwd, filename);
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  try {
    await fs.writeFile(configPath, "{}\n", {
      encoding: "utf8",
      flag: "wx",
    });
    log(`installed: ${configPath}`);
    return { path: configPath, created: true };
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    log(`exists: ${configPath}`);
    return { path: configPath, created: false };
  }
}

export async function loadConfigOptions(
  command,
  {
    cwd = process.cwd(),
    filename = "config/setting.json",
    required = false,
  } = {}
) {
  const configPath = path.resolve(cwd, filename);
  const text = await fs.readFile(configPath, "utf8").catch((error) => {
    if (error.code === "ENOENT" && !required) return undefined;
    if (error.code === "ENOENT") {
      throw new Error(`config file does not exist: ${configPath}`);
    }
    throw error;
  });
  if (text === undefined) return {};

  let config;
  try {
    config = JSON.parse(text);
  } catch (error) {
    throw new Error(`invalid config file ${configPath}: ${error.message}`);
  }
  if (!config || Array.isArray(config) || typeof config !== "object") {
    throw new Error(`config file must contain a JSON object: ${configPath}`);
  }

  for (const [key, value] of Object.entries(config)) {
    const expectedTypes = OPTION_TYPES.get(key);
    if (!expectedTypes) {
      throw new Error(`unknown config option: ${key}`);
    }
    if (expectedTypes === "string-or-false") {
      if (value === false || (typeof value === "string" && value.length > 0)) {
        continue;
      }
      throw new Error(
        "config option shared must be a non-empty string or false"
      );
    }

    const types = Array.isArray(expectedTypes) ? expectedTypes : [expectedTypes];
    if (
      !types.includes(typeof value) ||
      (typeof value === "string" && value.length === 0)
    ) {
      throw new Error(
        `config option ${key} must be a ${types.join(" or ")}`
      );
    }
  }

  const allowed = COMMAND_OPTIONS.get(command) || new Set();
  return Object.fromEntries(
    Object.entries(config).filter(([key]) => allowed.has(key))
  );
}
