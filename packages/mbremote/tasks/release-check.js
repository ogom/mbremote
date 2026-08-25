import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootDirectory = path.resolve(packageDirectory, "../..");
const packageJson = JSON.parse(
  await fs.readFile(path.join(packageDirectory, "package.json"), "utf8")
);
const version = packageJson.version;
const run = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: packageDirectory, stdio: "inherit", ...options });

function fail(message) {
  throw new Error(`release check failed: ${message}`);
}

const changelog = await fs.readFile(path.join(packageDirectory, "CHANGELOG.md"), "utf8");
if (!new RegExp(`^## ${escapeRegExp(version)}\\s+-\\s+`, "m").test(changelog)) {
  fail(`CHANGELOG.md has no heading for ${version}`);
}
const lockfile = JSON.parse(await fs.readFile(path.join(rootDirectory, "package-lock.json"), "utf8"));
if (lockfile.packages?.["packages/mbremote"]?.version !== version) {
  fail(`package-lock.json version does not match ${version}`);
}

run("npm", ["test"]);
run("npm", ["run", "test:picoruby-firmware"]);

let tarball;
let temporaryDirectory;
try {
  temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "mbremote-release-"));
  const npmEnvironment = {
    ...process.env,
    npm_config_cache: path.join(temporaryDirectory, "npm-cache"),
  };
  const packResult = JSON.parse(
    execFileSync("npm", ["pack", "--json"], {
      cwd: packageDirectory,
      encoding: "utf8",
      env: npmEnvironment,
    })
  );
  const packed = Array.isArray(packResult)
    ? packResult[0]
    : Object.values(packResult)[0];
  if (!packed?.filename || !Array.isArray(packed.files)) {
    fail("npm pack did not return package metadata");
  }
  tarball = path.join(packageDirectory, packed.filename);
  const packedFiles = new Set(packed.files.map(({ path: filename }) => filename));
  for (const required of [
    "README.md",
    "README.ja.md",
    "CHANGELOG.md",
    "THIRD_PARTY_NOTICES.md",
    "bin/mbremote.js",
    "src/cli.js",
  ]) {
    if (!packedFiles.has(required)) fail(`npm package is missing ${required}`);
  }

  run("npm", ["install", "--ignore-scripts", "--prefix", temporaryDirectory, tarball], {
    env: npmEnvironment,
  });
  const executable = path.join(temporaryDirectory, "node_modules", ".bin", "mbremote");
  const installedVersion = execFileSync(executable, ["--version"], {
    encoding: "utf8",
  }).trim();
  if (installedVersion !== version) {
    fail(`isolated CLI reports ${installedVersion}, expected ${version}`);
  }
} finally {
  if (tarball) await fs.rm(tarball, { force: true });
  if (temporaryDirectory) await fs.rm(temporaryDirectory, { recursive: true, force: true });
}

console.log(`release check passed: mbremote ${version}`);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
