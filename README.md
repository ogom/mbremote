# mbremote

[日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

mbremote is a development environment for BBC micro:bit MicroPython and PicoRuby projects. It builds Universal HEX files for micro:bit V1 and V2, flashes connected boards, and provides serial and filesystem tools.

The repository contains the published `mbremote` CLI in [`packages/mbremote`](packages/mbremote), examples, and development tooling.

## Quick start

Install Node.js 20 or later, install the CLI, and clone the examples and project files:

```sh
npm install --global mbremote
git clone https://github.com/ogom/mbremote.git
cd mbremote
mbremote setup
```

Build and flash a MicroPython project containing `main.py`:

```sh
mbremote build examples/micropython/begin
mbremote flash
```

Or build, flash, and open the serial monitor in one persistent deployment step:

```sh
mbremote run examples/micropython/begin
```

## Filesystem commands

Use `mbremote fs` to transfer and inspect persistent MicroPython files on the board:

```sh
mbremote fs ls
mbremote fs cp examples/micropython/filesystem/message.txt :message.txt
mbremote fs cat :message.txt
mbremote fs cp :message.txt message.txt
mbremote fs rm :message.txt
```

The `:` prefix marks a file on the micro:bit; paths without it are local. The filesystem is flat, so files use `:FILENAME` and directories are unavailable. Reflashing the board removes transferred files. See the [filesystem example](examples/micropython/filesystem/README.md) for the complete build, flash, and transfer workflow.

## Execute code and reset

Run a quoted MicroPython command on the board, or soft-reset it:

```sh
mbremote exec 'print("hello")'
mbremote reset
```

Both commands use the MicroPython REPL; `exec` prints the command output and then restarts the board.

## List connected boards

```sh
mbremote ports
```

Each detected micro:bit serial port is printed on its own line, including when multiple boards are connected. With no matching board, the command prints `No micro:bit serial ports found.`

## Inspect the target configuration

```sh
mbremote config show
```

This prints the effective language, board, firmware paths, port, and timeout after project configuration and defaults are applied.

## PicoRuby

PicoRuby projects target micro:bit V2:

```sh
mbremote run examples/picoruby/begin --language picoruby --board v2 --force
```

`--force` performs a full flash, which is required when installing or changing PicoRuby firmware.

`run` is a persistent build-and-flash deployment. Its full stage, monitor, timeout, and exit-status specification is in the [CLI reference](packages/mbremote/README.md#run-specification).

## Examples

Clone this repository to run the included examples.

- [All examples](examples/README.md)
- [MicroPython examples](examples/micropython/README.md)
- [Basic MicroPython program](examples/micropython/begin/main.py)
- [Filesystem operations](examples/micropython/filesystem/README.md)
- [LED rover](examples/micropython/led-rover/README.md)
- [Radio rock-paper-scissors](examples/micropython/rps-radio/README.md)
- [Motion-recognition magic circle](examples/micropython/magic-circle/README.md)
- [PicoRuby examples](examples/picoruby/README.md)

## Documentation

- [CLI reference and detailed usage](packages/mbremote/README.md)
- [Configuration reference](docs/config.md) ([日本語](docs/config.ja.md))
- [Limitations](docs/limitations.md) ([日本語](docs/limitations.ja.md))
- [Release checklist](packages/mbremote/RELEASING.md)

Use `mbremote --help` for the complete command list and `mbremote <command> --help` for command-specific options.

## Development

Install dependencies from the repository root and link the repository CLI:

```sh
npm install
npm run setup
npm link --workspace mbremote
```

Run the CLI test suite after making changes:

```sh
npm test
```

The optional PicoRuby firmware integration build requires Git, Ruby with Rake, GNU Make, CMake, and the Arm GNU Toolchain:

```sh
npm run test:picoruby-firmware --workspace mbremote
```

Before publishing, follow the [release checklist](packages/mbremote/RELEASING.md).

## Related projects

- [rpremote](https://github.com/ogom/rpremote) applies the same project-first concept to Raspberry Pi Pico boards, preparing, building, flashing, and controlling custom PicoRuby firmware.

## License

[MIT](packages/mbremote/LICENSE)
