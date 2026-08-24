const COMMANDS = new Set([
  "build",
  "flash",
  "run",
  "setup",
  "repl",
  "monitor",
  "fs",
  "ports",
]);

const VALUE_OPTIONS = new Map([
  ["--config", "config"],
  ["--port", "port"],
  ["--mount", "mount"],
  ["--shared", "shared"],
  ["--base-firmware", "baseFirmware"],
  ["--firmware", "firmware"],
  ["--board", "board"],
  ["--language", "language"],
  ["--baud", "baud"],
  ["--timeout", "timeout"],
]);

const DEFAULT_OPTIONS = {
  board: "universal",
  baud: 115200,
  timeout: 10,
  monitor: true,
  massStorage: false,
  all: false,
  force: false,
};

export function parseArgs(argv, defaults = {}) {
  const args = [...argv];
  const options = {
    ...DEFAULT_OPTIONS,
    ...defaults,
  };
  const positionals = [];
  let command;

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--") {
      positionals.push(...args);
      break;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--version" || arg === "-V") {
      options.version = true;
      continue;
    }
    if (arg === "--no-monitor") {
      options.monitor = false;
      continue;
    }
    if (arg === "--no-shared") {
      options.shared = false;
      continue;
    }
    if (arg === "--mass-storage") {
      options.massStorage = true;
      continue;
    }
    if (arg === "--all") {
      options.all = true;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (VALUE_OPTIONS.has(arg)) {
      if (args.length === 0) {
        throw new Error(`${arg} requires a value`);
      }
      options[VALUE_OPTIONS.get(arg)] = args.shift();
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`unknown option: ${arg}`);
    }
    if (!command) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }

  if (command && !COMMANDS.has(command)) {
    throw new Error(`unknown command: ${command}`);
  }
  if (!command && !options.help && !options.version) {
    options.help = true;
  }
  if (!["universal", "v1", "v2"].includes(options.board)) {
    throw new Error("--board must be universal, v1, or v2");
  }
  if (options.language && !["micropython", "picoruby"].includes(options.language)) {
    throw new Error("--language must be micropython or picoruby");
  }
  options.baud = positiveInteger(options.baud, "--baud");
  options.timeout = secondsToMilliseconds(options.timeout, "--timeout");

  return { command, options, positionals };
}

function positiveInteger(value, option) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${option} must be a positive integer`);
  }
  return number;
}

function secondsToMilliseconds(value, option) {
  const seconds = positiveInteger(value, option);
  if (seconds > Number.MAX_SAFE_INTEGER / 1000) {
    throw new Error(`${option} must be a positive integer`);
  }
  return seconds * 1000;
}

export const helpText = `mbremote - mpremote-style tools for the BBC micro:bit

Usage:
  mbremote build [FILE|DIR] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared]
  mbremote build clean
  mbremote flash [--firmware HEX] [--port PORT] [--all] [--force] [--mass-storage] [--mount DIR]
  mbremote run [FILE|DIR] [--port PORT|--all] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared] [--force] [--mass-storage] [--mount DIR] [--no-monitor]
  mbremote setup
  mbremote repl [--port PORT]
  mbremote monitor [--port PORT]
  mbremote fs ls [--port PORT]
  mbremote ports

Configuration:
  config/setting.json  default project options

Options:
  --config FILE    use another configuration file
  --all            flash all detected micro:bits (at least two)
  --force          force a full DAPLink USB flash (default: automatic)
  --mass-storage   copy HEX to the mounted MICROBIT drive
  --mount DIR      mounted MICROBIT drive (implies --mass-storage)
  --board BOARD    target universal, v1, or v2 (default: universal)
  --language LANG  source language: micropython or picoruby (default: detect)
  --base-firmware HEX  base MicroPython firmware (requires --board v1 or v2)
  --shared DIR     directory containing shared Python modules
  --no-shared      do not include automatically configured shared modules
  --port PORT      target micro:bit serial device path
  --baud RATE      serial baud rate (default: 115200)
  --timeout SEC    device wait timeout in seconds (default: 10)
  --firmware HEX       built HEX path (default: build/microbit.hex)
  --no-monitor     do not open the monitor after run
  -h, --help       show this help
  -V, --version    show the version

Interactive serial sessions exit with Ctrl-].`;
