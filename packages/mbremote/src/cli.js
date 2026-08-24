import { createRequire } from "node:module";

import { helpText, parseArgs } from "./args.js";
import { buildHex, cleanBuild } from "./builder.js";
import { loadConfigOptions, setupConfig } from "./config.js";
import { flashHex, flashHexAll } from "./device.js";
import { flashHexDirect, flashHexDirectAll } from "./direct-flash.js";
import { setupFirmware } from "./firmware.js";
import {
  findMicrobitPort,
  findMicrobitUsbSerial,
  interactiveSerial,
  listPorts,
  remoteLs,
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
    console.log(helpText);
    return;
  }
  const config = await loadConfigOptions(initial.command, {
    cwd,
    filename: initial.options.config || "config/setting.json",
    required: Boolean(initial.options.config),
  });
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
      await flash(hex, options);
      return;
    }
    case "run": {
      const result = await buildHex({
        input: positionals[0],
        output: options.firmware,
        board: options.board,
        language: options.language,
        firmware: options.baseFirmware,
        shared: options.shared,
        cwd,
      });
      await flash(result.outputPath, options);
      if (options.monitor && !options.all) {
        const serialPath = await waitForMicrobitPort({
          port: options.port,
          timeout: options.timeout,
        });
        await interactiveSerial({ path: serialPath, baudRate: options.baud });
      }
      return;
    }
    case "setup":
      await setupConfig({ cwd });
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
    case "fs": {
      const serialPath = await findMicrobitPort(options.port);
      const files = await remoteLs({
        path: serialPath,
        baudRate: options.baud,
        timeout: options.timeout,
      });
      files.forEach((file) => console.log(file));
      return;
    }
    case "ports": {
      const ports = await listPorts();
      if (ports.length === 0) {
        console.log("No serial ports found.");
      }
      for (const port of ports) {
        const details = [
          port.manufacturer,
          port.vendorId && `VID:${port.vendorId}`,
        ]
          .filter(Boolean)
          .join(" ");
        console.log(`${port.path}${details ? `\t${details}` : ""}`);
      }
      return;
    }
  }
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
  if (options.language && !["build", "run"].includes(command)) {
    throw new Error("--language can only be used with build or run");
  }
  if (options.baseFirmware && !["build", "run"].includes(command)) {
    throw new Error("--base-firmware can only be used with build or run");
  }
  if (options.baseFirmware && options.board === "universal") {
    throw new Error("--base-firmware requires --board v1 or v2");
  }
  if (options.shared && !["build", "run"].includes(command)) {
    throw new Error("--shared can only be used with build or run");
  }
  if (options.all && !["flash", "run"].includes(command)) {
    throw new Error("--all can only be used with flash or run");
  }
  if (options.all && (options.port || options.mount)) {
    throw new Error("--all cannot be combined with --port or --mount");
  }
  if (options.force && (options.massStorage || options.mount)) {
    throw new Error("--force is only available for DAPLink USB flash");
  }
}

function assertPositionals(command, positionals) {
  const max = ["build", "run", "fs"].includes(command) ? 1 : 0;
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
  if (command === "fs" && positionals[0] !== "ls") {
    throw new Error("fs requires the ls subcommand");
  }
}
