# mbremote CLI reference

[日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

mbremote builds, flashes, and inspects BBC micro:bit MicroPython and PicoRuby projects.

## Requirements

- Node.js 20 or later, including npm.
- For MicroPython projects, `mbremote setup` downloads the official V1 and V2 base firmware. No additional build tools are required.
- PicoRuby projects also require Git, Ruby with Rake, GNU Make, CMake, and the Arm GNU Toolchain. The first build downloads pinned PicoRuby and micro:bit V2 sources.
- DAPLink USB support may require the platform's libusb development package when the `usb` npm dependency has no prebuilt binary.

## Install and set up a project

```sh
npm install --global mbremote
git clone https://github.com/ogom/mbremote.git
cd mbremote
mbremote setup
```

`setup` downloads official base firmware into the project's `firmware/` directory and creates `config/setting.json` if it does not already exist.

## Command syntax

```text
mbremote build [FILE|DIR] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared]
mbremote build clean
mbremote flash [--firmware HEX] [--port PORT] [--all] [--force] [--mass-storage] [--mount DIR]
mbremote run [FILE|DIR] [--port PORT|--all] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared] [--force] [--mass-storage] [--mount DIR] [--monitor|--no-monitor]
mbremote setup
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
```

| Command | Description |
| --- | --- |
| `build` | Build a project into a Universal HEX by default. A single `.py` file becomes `main.py` on the board. |
| `build clean` | Remove the project's generated `build/` directory. |
| `flash` | Persistently write a HEX through DAPLink USB or a mounted MICROBIT volume. Without `--firmware`, uses `build/microbit.hex`. |
| `run` | Sequentially build, persistently flash, then optionally open the serial monitor. |
| `setup` | Create project configuration and download official base firmware. |
| `repl` | Open the MicroPython REPL. |
| `monitor` | Open the serial monitor. |
| `exec` | Execute MicroPython code and print its output. |
| `reset` | Soft-reset the connected micro:bit. |
| `fs cp/cat/ls/rm` | Operate on the connected board's MicroPython filesystem. |
| `config show` | Show effective project target values as JSON. |
| `ports` | List detected micro:bit serial ports, one path per line. |

Interactive serial commands exit with `Ctrl-]`.

`ports` lists only detected micro:bit serial ports in path order, so multiple connected boards appear as multiple lines. When none are found, it prints `No micro:bit serial ports found.`

## Execute code and reset

Execute quoted MicroPython code; output from `print` is displayed:

```sh
mbremote exec 'print(1 + 2)'
mbremote exec 'from microbit import display; display.show("H")'
mbremote reset
```

`exec` and filesystem commands use the MicroPython REPL. They stop the running program and soft-reset the board when finished; `reset` explicitly performs that soft reset. `reset` waits for the REPL before sending it, but does not wait for the restarted program.

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
| `--monitor`, `--no-monitor` | Enable or disable the serial monitor after a single-board `run`. |
| `-h`, `--help` | Show help. |
| `-V`, `--version` | Show the installed version. |

Command-line options override configuration. See the [configuration reference](https://github.com/ogom/mbremote/blob/main/docs/config.md) for every configuration key, its type, default, and applicable commands.

Use `mbremote --help` for all commands, or `mbremote <command> --help` for only that command's syntax and options, for example `mbremote run --help` or `mbremote fs --help`.
`mbremote fs cp --help` (and `cat`, `ls`, or `rm`) narrows help to that filesystem operation.

## Show effective configuration

```sh
mbremote config show
mbremote config show --config config/device-v2.json
```

The JSON output merges `config/setting.json`, command-line overrides, and built-in defaults. It shows `language`, `board`, `firmware`, `base_firmware`, `port`, and `timeout`; paths are resolved from the project directory and `timeout` is in seconds.

## `run` specification

`mbremote run` is a persistent deployment command: it performs `build`, then `flash`, then (for one board) `monitor`. It does **not** follow `rpremote run`'s temporary-upload-and-execute model; the generated HEX remains on the micro:bit and starts as its normal program after flashing.

- For one board, the monitor is enabled by default. Use `--no-monitor` for a non-interactive build-and-flash command. Use `--monitor` to override `"monitor": false` in configuration.
- `run --all` flashes every detected board and never opens a monitor, even when `--monitor` is supplied.
- With a monitor, `run` ends when you press `Ctrl-]` or when the serial port closes. It does not infer completion from the program, which may run indefinitely.
- `--timeout` limits only the wait for the serial port after flashing, before the monitor opens. It does not limit building, flashing, program execution, or monitor duration.
- The command exits `0` only after all selected stages succeed (and the monitor ends normally when enabled). Build, flash, port-wait, or serial errors exit nonzero. A MicroPython exception after deployment is board output, not a process exit status; with `--no-monitor`, `run` exits successfully once flashing succeeds.
- Before an operation that changes state, the CLI prints its stage and target. In particular, `flash` prints the HEX that will replace the board's persistent firmware, and `run` prints `build`, that persistent flash, and `monitor` before each stage.

## Filesystem operations

Prefix remote paths with `:`. Paths without the prefix are local, so exactly one side of `fs cp` must be remote. The micro:bit filesystem is flat: use `fs ls` to list it and `:FILENAME` for files. The older `:/FILENAME` form remains compatible. Directories are not supported by MicroPython on the board.

```sh
mbremote fs ls
mbremote fs cp helper.py :helper.py
mbremote fs cat :helper.py
mbremote fs cp :data.bin data.bin
mbremote fs rm :helper.py
```

Filesystem commands use the MicroPython REPL and restart the board after the operation.

For platform and command limits, see [Limitations](https://github.com/ogom/mbremote/blob/main/docs/limitations.md).

## Build projects

Build a project directory containing `main.py`, or a single Python file:

```sh
mbremote build examples/micropython/begin
mbremote build main.py
```

MicroPython modules in a project-local or sibling `shared/` directory are included automatically. Use `--shared DIR` to select another directory, or `--no-shared` to exclude shared modules.

PicoRuby projects use `.rb` files or `main.rb`, target V2 only, and compile their Ruby code into firmware:

```sh
mbremote build main.rb --language picoruby --board v2
mbremote run main.rb --language picoruby --board v2 --force
```

PicoRuby does not provide the REPL. Use `--force` for the initial PicoRuby flash and whenever its firmware changes.

PicoRuby builds use AOT compilation and create a firmware HEX. The CLI prints that planned compilation before it starts; `flash` or `run` then prints the persistent board write before changing the device.

## Flash projects

`flash` writes the selected HEX as the board's persistent firmware, replacing the program that starts after reset. It is a write operation, not a temporary execution command; the CLI prints the HEX and target before beginning the transfer.

```sh
mbremote flash
mbremote flash --firmware build/other.hex
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
mbremote run examples/micropython/begin --all
```

`--force` performs a full flash through DAPLink USB. Without it, mbremote automatically selects a partial or full flash. `--all` does not open a serial monitor after `run`.

## Base firmware

Use `--base-firmware` with a board-specific build when a project requires a custom MicroPython base firmware:

```sh
mbremote run main.py --board v2 --base-firmware firmware/custom-v2.hex --force
```

The option requires `--board v1` or `--board v2`. The base firmware is not the same as `--firmware`, which names the built HEX or the HEX passed to `flash`.

## Development

For repository development, install dependencies from the repository root:

```sh
npm install
npm run setup
npm link --workspace mbremote
npm test --workspace mbremote
```

Before an npm release, run the checks and follow the [release checklist](RELEASING.md).

## License

[MIT](LICENSE). See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for components distributed under other licenses.
