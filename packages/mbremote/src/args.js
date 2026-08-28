const COMMANDS = new Set([
  "build",
  "flash",
  "run",
  "setup",
  "repl",
  "monitor",
  "exec",
  "reset",
  "fs",
  "config",
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
  const explicitOptions = new Set();
  let command;

  const setOption = (name, value) => {
    options[name] = value;
    explicitOptions.add(name);
  };

  while (args.length > 0) {
    const arg = args.shift();
    if (arg === "--") {
      positionals.push(...args);
      break;
    }
    if (arg === "--help" || arg === "-h") {
      setOption("help", true);
      continue;
    }
    if (arg === "--version" || arg === "-V") {
      setOption("version", true);
      continue;
    }
    if (arg === "--no-monitor") {
      setOption("monitor", false);
      continue;
    }
    if (arg === "--monitor") {
      setOption("monitor", true);
      continue;
    }
    if (arg === "--no-shared") {
      setOption("shared", false);
      continue;
    }
    if (arg === "--mass-storage") {
      setOption("massStorage", true);
      continue;
    }
    if (arg === "--all") {
      setOption("all", true);
      continue;
    }
    if (arg === "--force") {
      setOption("force", true);
      continue;
    }
    if (VALUE_OPTIONS.has(arg)) {
      if (args.length === 0) {
        throw new Error(`${arg} requires a value`);
      }
      setOption(VALUE_OPTIONS.get(arg), args.shift());
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
  Object.defineProperty(options, "explicitOptions", {
    value: explicitOptions,
    enumerable: false,
  });

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
  mbremote run [FILE|DIR] [--port PORT|--all] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared] [--force] [--mass-storage] [--mount DIR] [--monitor|--no-monitor]
  mbremote setup [--config FILE]
  mbremote repl [--port PORT]
  mbremote monitor [--port PORT]
  mbremote exec CODE [--port PORT]
  mbremote reset [--port PORT]
  mbremote fs cp FILE :FILENAME [--port PORT]
  mbremote fs cp :FILENAME FILE [--port PORT]
  mbremote fs cat :FILENAME [--port PORT]
  mbremote fs ls [:/] [--port PORT]
  mbremote fs rm :FILENAME [--port PORT]
  mbremote config show [--config FILE]
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
  --monitor        open the monitor after run (default for one board)
  --no-monitor     do not open the monitor after run
  -h, --help       show this help
  -V, --version    show the version

The micro:bit MicroPython filesystem is flat: fs ls has no path and files use :FILENAME.

Interactive serial sessions exit with Ctrl-].`;

const COMMAND_HELP = {
  build: `Usage:
  mbremote build [FILE|DIR] [options]
  mbremote build clean

Options:
  --firmware HEX       generated HEX path (default: build/microbit.hex)
  --language LANG      micropython or picoruby (default: detect)
  --board BOARD        universal, v1, or v2 (default: universal)
  --base-firmware HEX  custom MicroPython base HEX (requires --board v1 or v2)
  --shared DIR         directory containing shared Python modules
  --no-shared          do not include automatically configured shared modules`,
  flash: `Usage:
  mbremote flash [options]

Writes a HEX as persistent micro:bit firmware.

Options:
  --firmware HEX   HEX path (default: build/microbit.hex)
  --port PORT      target micro:bit serial device path
  --all            flash all detected micro:bits (at least two)
  --force          force a full DAPLink USB flash
  --mass-storage   copy HEX to the mounted MICROBIT drive
  --mount DIR      mounted MICROBIT drive (implies --mass-storage)`,
  run: `Usage:
  mbremote run [FILE|DIR] [options]

Sequentially builds, flashes persistent firmware, then optionally monitors one board.

Options:
  --firmware HEX       generated HEX path (default: build/microbit.hex)
  --language LANG      micropython or picoruby (default: detect)
  --board BOARD        universal, v1, or v2 (default: universal)
  --base-firmware HEX  custom MicroPython base HEX (requires --board v1 or v2)
  --shared DIR          directory containing shared Python modules
  --no-shared           do not include automatically configured shared modules
  --port PORT           target micro:bit serial device path
  --all                 flash all detected micro:bits; does not monitor
  --force               force a full DAPLink USB flash
  --mass-storage        copy HEX to the mounted MICROBIT drive
  --mount DIR           mounted MICROBIT drive (implies --mass-storage)
  --baud RATE           serial baud rate (default: 115200)
  --timeout SEC         post-flash serial-port wait timeout (default: 10)
  --monitor             open the monitor after a single-board run (default)
  --no-monitor          do not open the monitor

When both --monitor and --no-monitor are given, the last one wins.`,
  setup: `Usage:
  mbremote setup [--config FILE]

Creates config/setting.json when absent and downloads official MicroPython base firmware.`,
  repl: `Usage:
  mbremote repl [--port PORT] [--baud RATE]

Opens the MicroPython REPL. Exit with Ctrl-].`,
  monitor: `Usage:
  mbremote monitor [--port PORT] [--baud RATE]

Opens the serial monitor. Exit with Ctrl-].`,
  exec: `Usage:
  mbremote exec CODE [--port PORT] [--baud RATE] [--timeout SEC]

Runs MicroPython code, prints its output, then soft-resets the board.`,
  reset: `Usage:
  mbremote reset [--port PORT] [--baud RATE] [--timeout SEC]

Sends a MicroPython soft reset to the connected micro:bit. It waits for the
REPL before sending the reset, but does not wait for the restarted program.`,
  fs: `Usage:
  mbremote fs cp FILE :FILENAME [--port PORT] [--baud RATE] [--timeout SEC]
  mbremote fs cp :FILENAME FILE [--port PORT] [--baud RATE] [--timeout SEC]
  mbremote fs cat :FILENAME [--port PORT] [--baud RATE] [--timeout SEC]
  mbremote fs ls [:/] [--port PORT] [--baud RATE] [--timeout SEC]
  mbremote fs rm :FILENAME [--port PORT] [--baud RATE] [--timeout SEC]

The micro:bit filesystem is flat: remote files use :FILENAME and fs ls has no path.`,
  config: `Usage:
  mbremote config show [options]

Shows effective project values after configuration, command-line overrides, and defaults.

Display options:
  --language LANG      micropython or picoruby
  --board BOARD        universal, v1, or v2
  --firmware HEX       generated HEX path
  --base-firmware HEX  custom MicroPython base HEX
  --port PORT          target micro:bit serial device path
  --timeout SEC        device wait timeout in seconds`,
  ports: `Usage:
  mbremote ports

Lists detected micro:bit serial paths, one per line.`,
};

const FILESYSTEM_HELP = {
  cp: `Usage:
  mbremote fs cp FILE :FILENAME [--port PORT] [--baud RATE] [--timeout SEC]
  mbremote fs cp :FILENAME FILE [--port PORT] [--baud RATE] [--timeout SEC]

Copies one local file to or from the flat MicroPython filesystem. Exactly one
path must be remote and use the : prefix.`,
  cat: `Usage:
  mbremote fs cat :FILENAME [--port PORT] [--baud RATE] [--timeout SEC]

Writes a remote file's bytes to standard output.`,
  ls: `Usage:
  mbremote fs ls [:/] [--port PORT] [--baud RATE] [--timeout SEC]

Lists the flat MicroPython filesystem.`,
  rm: `Usage:
  mbremote fs rm :FILENAME [--port PORT] [--baud RATE] [--timeout SEC]

Removes one remote file from the flat MicroPython filesystem.`,
};

export function helpTextForCommand(command, subcommand) {
  if (command === "fs" && FILESYSTEM_HELP[subcommand]) {
    return `${FILESYSTEM_HELP[subcommand]}

Common options:
  --config FILE  use another configuration file
  -h, --help     show this help
  -V, --version  show the version`;
  }
  const text = COMMAND_HELP[command];
  if (!text) return helpText;
  return `${text}

Common options:
  --config FILE  use another configuration file
  -h, --help     show this help
  -V, --version  show the version`;
}
