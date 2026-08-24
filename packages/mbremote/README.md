# mbremote CLI reference

[日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

mbremote builds, flashes, and inspects BBC micro:bit MicroPython and PicoRuby
projects.

## Requirements

- Node.js 20 or later, including npm.
- For MicroPython projects, `mbremote setup` downloads the official V1 and V2
  base firmware. No additional build tools are required.
- PicoRuby projects also require Git, Ruby with Rake, GNU Make, CMake, and the
  Arm GNU Toolchain. The first build downloads pinned PicoRuby and micro:bit
  V2 sources.
- DAPLink USB support may require the platform's libusb development package
  when the `usb` npm dependency has no prebuilt binary.

## Install and set up a project

```sh
npm install --global mbremote
cd my-microbit-project
mbremote setup
```

`setup` downloads official base firmware into the project's `firmware/`
directory and creates `config/setting.json` if it does not already exist.

## Command syntax

```text
mbremote build [FILE|DIR] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared]
mbremote build clean
mbremote flash [--firmware HEX] [--port PORT] [--all] [--force] [--mass-storage] [--mount DIR]
mbremote run [FILE|DIR] [--port PORT|--all] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared] [--force] [--mass-storage] [--mount DIR] [--no-monitor]
mbremote setup
mbremote repl [--port PORT]
mbremote monitor [--port PORT]
mbremote fs ls [--port PORT]
mbremote ports
```

| Command | Description |
| --- | --- |
| `build` | Build a project into a Universal HEX by default. A single `.py` file becomes `main.py` on the board. |
| `build clean` | Remove the project's generated `build/` directory. |
| `flash` | Flash a HEX through DAPLink USB or a mounted MICROBIT volume. Without `--firmware`, uses `build/microbit.hex`. |
| `run` | Build, flash, then open the serial monitor unless `--no-monitor` is set. |
| `setup` | Create project configuration and download official base firmware. |
| `repl` | Open the MicroPython REPL. |
| `monitor` | Open the serial monitor. |
| `fs ls` | List files on the connected board. |
| `ports` | List detected micro:bit serial ports. |

Interactive serial commands exit with `Ctrl-]`.

## Options

| Option | Description |
| --- | --- |
| `--config FILE` | Read defaults from another configuration file. |
| `--firmware HEX` | Built HEX path for `build` and `run`; HEX input path for `flash`. Default: `build/microbit.hex`. |
| `--base-firmware HEX` | Base MicroPython HEX for a board-specific `build` or `run`. Not supported by PicoRuby. |
| `--board BOARD` | `universal`, `v1`, or `v2`. Default: `universal`. |
| `--language LANG` | `micropython` or `picoruby`. Default: detect from the input. |
| `--shared DIR`, `--no-shared` | Select or disable automatically discovered shared MicroPython modules. |
| `--port PORT` | Select a serial device path. |
| `--baud RATE` | Serial baud rate. Default: `115200`. |
| `--timeout SEC` | Device wait timeout in seconds. Default: `10`. |
| `--mass-storage` | Copy the HEX to a mounted MICROBIT volume. |
| `--mount DIR` | Set the mounted MICROBIT volume and enable mass-storage flashing. |
| `--all` | Flash all detected boards; requires at least two. |
| `--force` | Force a DAPLink USB full flash. |
| `--no-monitor` | Do not open the serial monitor after `run`. |
| `-h`, `--help` | Show help. |
| `-V`, `--version` | Show the installed version. |

Command-line options override configuration. See the
[configuration reference](../../docs/config.md) for every configuration key,
its type, default, and applicable commands.

## Build projects

Build a project directory containing `main.py`, or a single Python file:

```sh
mbremote build src
mbremote build main.py
```

MicroPython modules in a project-local or sibling `shared/` directory are
included automatically. Use `--shared DIR` to select another directory, or
`--no-shared` to exclude shared modules.

PicoRuby projects use `.rb` files or `main.rb`, target V2 only, and compile
their Ruby code into firmware:

```sh
mbremote build main.rb --language picoruby --board v2
mbremote run main.rb --language picoruby --board v2 --force
```

PicoRuby does not provide the REPL. Use `--force` for the initial PicoRuby
flash and whenever its firmware changes.

## Flash projects

```sh
mbremote flash
mbremote flash --firmware build/other.hex
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
mbremote run src --all
```

`--force` performs a full flash through DAPLink USB. Without it, mbremote
automatically selects partial or full flashing. `--all` does not open a serial
monitor after `run`.

## Base firmware

Use `--base-firmware` with a board-specific build when a project requires a
custom MicroPython base firmware:

```sh
mbremote run main.py --board v2 \
  --base-firmware firmware/custom-v2.hex --force
```

The option requires `--board v1` or `--board v2`. The base firmware is not the
same as `--firmware`, which names the built HEX or the HEX passed to `flash`.

## Development

For repository development, install dependencies from the repository root:

```sh
npm install
npm run setup
npm link --workspace mbremote
npm test --workspace mbremote
```

Before an npm release, run the checks and follow the
[release checklist](RELEASING.md).

## License

[MIT](LICENSE). See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for
components distributed under other licenses.
