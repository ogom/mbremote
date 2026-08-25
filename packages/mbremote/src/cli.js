import { createRequire } from "node:module";
import path from "node:path";

import { helpText, helpTextForCommand, parseArgs } from "./args.js";
import { buildHex, cleanBuild, resolveFirmware } from "./builder.js";
import { loadConfigOptions, setupConfig } from "./config.js";
import { flashHex, flashHexAll } from "./device.js";
import { flashHexDirect, flashHexDirectAll } from "./direct-flash.js";
import { setupFirmware } from "./firmware.js";
import { runFilesystem, validateFilesystemArgs } from "./filesystem.js";
import {
  findMicrobitPort,
  findMicrobitUsbSerial,
  interactiveSerial,
  listPorts,
  microbitPortPaths,
  remoteExec,
  remoteReset,
  waitForMicrobitPort,
} from "./serial.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

export async function main(argv, { cwd = process.cwd() } = {}) {
  const initial = parseArgs(argv);
  if (initial.options.version) {
    console.log(packageJson.version);
    return;
  }
  if (initial.options.help) {
    console.log(
      initial.command
        ? helpTextForCommand(initial.command, initial.positionals[0])
        : helpText
    );
    return;
  }
  const config = await loadConfigOptions(
    initial.command === "config" ? "run" : initial.command,
    {
    cwd,
    filename: initial.options.config || "config/setting.json",
    required: Boolean(initial.options.config) && initial.command !== "setup",
    }
  );
  const { command, options, positionals } = parseArgs(argv, config);
  assertPositionals(command, positionals);
  assertOptions(command, options);

  switch (command) {
    case "build":
      if (positionals[0] === "clean") {
        await cleanBuild({ cwd });
        return;
      }
      await buildHex({
        input: positionals[0],
        output: options.firmware,
        board: options.board,
        language: options.language,
        firmware: options.baseFirmware,
        shared: options.shared,
        cwd,
      });
      return;
    case "flash": {
      const hex = options.firmware || "build/microbit.hex";
      console.log(`will flash persistent firmware: ${hex} -> micro:bit`);
      await flash(hex, options);
      return;
    }
    case "run": {
      console.log("run: build");
      const result = await buildHex({
        input: positionals[0],
        output: options.firmware,
        board: options.board,
        language: options.language,
        firmware: options.baseFirmware,
        shared: options.shared,
        cwd,
      });
      console.log(
        `run: flash persistent ${result.language} firmware: ${result.outputPath} -> micro:bit`
      );
      await flash(result.outputPath, options);
      if (options.monitor && !options.all) {
        const serialPath = await waitForMicrobitPort({
          port: options.port,
          timeout: options.timeout,
        });
        console.log(`run: monitor: ${serialPath}`);
        await interactiveSerial({ path: serialPath, baudRate: options.baud });
      }
      return;
    }
    case "setup":
      await setupConfig({ cwd, filename: options.config || "config/setting.json" });
      await setupFirmware({ cwd });
      return;
    case "repl": {
      const serialPath = await findMicrobitPort(options.port);
      await interactiveSerial({
        path: serialPath,
        baudRate: options.baud,
        interrupt: true,
      });
      return;
    }
    case "monitor": {
      const serialPath = await findMicrobitPort(options.port);
      await interactiveSerial({ path: serialPath, baudRate: options.baud });
      return;
    }
    case "exec": {
      const serialPath = await findMicrobitPort(options.port);
      const output = await remoteExec({
        path: serialPath,
        code: positionals[0],
        baudRate: options.baud,
        timeout: options.timeout,
      });
      if (output) console.log(output);
      return;
    }
    case "reset": {
      const serialPath = await findMicrobitPort(options.port);
      await remoteReset({
        path: serialPath,
        baudRate: options.baud,
        timeout: options.timeout,
      });
      return;
    }
    case "fs": {
      const serialPath = await findMicrobitPort(options.port);
      await runFilesystem(positionals, {
        cwd,
        serialPath,
        baudRate: options.baud,
        timeout: options.timeout,
      });
      return;
    }
    case "config":
      console.log(JSON.stringify(effectiveConfigValues(options, { cwd }), null, 2));
      return;
    case "ports": {
      const ports = microbitPortPaths(await listPorts());
      if (ports.length === 0) {
        console.log("No micro:bit serial ports found.");
      }
      for (const port of ports) {
        console.log(port);
      }
      return;
    }
  }
}

export function effectiveConfigValues(options, { cwd = process.cwd() } = {}) {
  const baseFirmware = resolveFirmware({
    board: options.board,
    firmware: options.baseFirmware,
    cwd,
  });
  return {
    language: options.language || "auto",
    board: options.board,
    firmware: path.resolve(cwd, options.firmware || "build/microbit.hex"),
    base_firmware: baseFirmware,
    port: options.port || "auto",
    timeout: options.timeout / 1000,
  };
}

async function flash(hexPath, options) {
  if (options.all) {
    if (options.massStorage) {
      return flashHexAll(hexPath);
    }
    return flashHexDirectAll(hexPath, { partial: !options.force });
  }
  if (options.massStorage || options.mount) {
    return flashHex(hexPath, { mount: options.mount });
  }
  const serialNumber = await findMicrobitUsbSerial(options.port);
  return flashHexDirect(hexPath, {
    partial: !options.force,
    port: options.port,
    serialNumber,
  });
}

function assertOptions(command, options) {
  assertExplicitOptions(command, options);
  if (options.baseFirmware && options.board === "universal") {
    throw new Error("--base-firmware requires --board v1 or v2");
  }
  if (options.all && (options.port || options.mount)) {
    throw new Error("--all cannot be combined with --port or --mount");
  }
  if (options.force && (options.massStorage || options.mount)) {
    throw new Error("--force is only available for DAPLink USB flash");
  }
}

const COMMAND_OPTION_NAMES = new Map([
  ["build", new Set(["config", "firmware", "language", "board", "baseFirmware", "shared"])],
  ["flash", new Set(["config", "firmware", "port", "all", "force", "massStorage", "mount"])],
  ["run", new Set(["config", "firmware", "language", "board", "baseFirmware", "shared", "port", "baud", "timeout", "monitor", "all", "force", "massStorage", "mount"])],
  ["setup", new Set(["config"])],
  ["repl", new Set(["config", "port", "baud"])],
  ["monitor", new Set(["config", "port", "baud"])],
  ["exec", new Set(["config", "port", "baud", "timeout"])],
  ["reset", new Set(["config", "port", "baud", "timeout"])],
  ["fs", new Set(["config", "port", "baud", "timeout"])],
  ["config", new Set(["config", "language", "board", "firmware", "baseFirmware", "port", "timeout"])],
  ["ports", new Set()],
]);

const OPTION_FLAGS = {
  config: "--config",
  port: "--port",
  mount: "--mount",
  shared: "--shared/--no-shared",
  baseFirmware: "--base-firmware",
  firmware: "--firmware",
  board: "--board",
  language: "--language",
  baud: "--baud",
  timeout: "--timeout",
  monitor: "--monitor/--no-monitor",
  massStorage: "--mass-storage",
  all: "--all",
  force: "--force",
};

function assertExplicitOptions(command, options) {
  const allowed = COMMAND_OPTION_NAMES.get(command) || new Set();
  for (const option of options.explicitOptions || []) {
    if (["help", "version"].includes(option) || allowed.has(option)) continue;
    throw new Error(`${OPTION_FLAGS[option] || `--${option}`} cannot be used with ${command}`);
  }
}

function assertPositionals(command, positionals) {
  if (command === "config") {
    if (positionals.length !== 1 || positionals[0] !== "show") {
      throw new Error("usage: mbremote config show [options]");
    }
    return;
  }
  if (command === "fs") {
    validateFilesystemArgs(positionals);
    return;
  }
  if (command === "exec") {
    if (positionals.length !== 1) {
      throw new Error("usage: mbremote exec CODE [--port PORT]");
    }
    return;
  }
  const max = ["build", "run"].includes(command) ? 1 : 0;
  if (positionals.length > max) {
    throw new Error(
      `too many arguments for ${command}: ${positionals.join(" ")}`
    );
  }
  if (
    command === "build" &&
    positionals[0] === "clean" &&
    positionals.length !== 1
  ) {
    throw new Error("build clean does not accept an input file");
  }
}
