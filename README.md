# mbremote

[日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

A development environment for building, flashing, and controlling BBC micro:bit MicroPython projects. It includes the `mbremote` CLI in `packages/mbremote` and sample programs for micro:bit.

It uses official micro:bit Python Editor V3 firmware, `@microbit/microbit-fs`, and `@microbit/microbit-connection`. It creates Universal HEX files for V1 and V2 and flashes them through DAPLink USB or mass storage.

## Installation

Node.js 20 or later is required.

```sh
npm install --global mbremote
```

Before building, download official V1 and V2 firmware from the MicroPython project directory:

```sh
mbremote setup
```

Firmware is stored in the project's `firmware/` directory. To use the samples, clone this repository and use `examples/`.

## Usage

### Build a project

Build a directory containing `main.py`:

```sh
mbremote build examples/begin
```

You can also build one Python file as `main.py` on the micro:bit:

```sh
mbremote build examples/begin/main.py
```

By default, mbremote creates a Universal HEX for both micro:bit V1 and V2 at `build/microbit.hex`.

### Flash and run

Flash the default `build/microbit.hex` with DAPLink USB:

```sh
mbremote flash
```

Build, flash, and open a serial monitor in one command:

```sh
mbremote run examples/begin/main.py
```

Use `--no-monitor` to flash without opening a serial monitor. Use `--all` to flash the same program to two or more connected micro:bits.

```sh
mbremote run examples/begin/main.py --no-monitor
mbremote run examples/rps-radio --all
```

### Use custom firmware

Specify a board and custom MicroPython HEX when the project needs custom firmware. Use `--force` for a full flash the first time it is installed or whenever the firmware changes.

```sh
mbremote build examples/magic-circle/main.py --board v2 --firmware firmware/custom-v2.hex
mbremote run examples/magic-circle/main.py --board v2 --firmware firmware/custom-v2.hex --force
```

`--firmware` requires `--board v1` or `--board v2`.

Generate the firmware for `examples/magic-circle` with the following command. Regenerate it after changing `ml_model.py` or `rgb_led.py`.

```sh
npm run firmware:magic-circle
mbremote run examples/magic-circle/main.py --all --no-shared --board v2 --firmware firmware/microbit-micropython-v2-magic-circle.hex --force
```

### Include shared modules

Python files in a project-local or sibling `shared/` directory are included automatically. Use `--shared DIR` to choose another location, or `--no-shared` to exclude them.

```sh
mbremote build examples/begin --shared examples/shared
mbremote build examples/begin --no-shared
```

For example, `examples/shared/motor/main.py` is stored on the micro:bit as the `motor` module.

```text
examples/
├── begin/
│   └── main.py
└── shared/
    └── motor/
        └── main.py
```

## Configuration

mbremote reads project defaults from `config/setting.json`. Pass `--config FILE` to use another file; command-line options take precedence.

```json
{
  "all": true,
  "shared": false,
  "board": "v2",
  "firmware": "firmware/microbit-micropython-v2-magic-circle.hex"
}
```

Set `shared` to a shared-module directory, or to `false` to exclude shared modules. See the [mbremote README](packages/mbremote/README.md) for all configuration options.

## Commands

| Command                      | Description                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| `mbremote setup`             | Download official V1 and V2 firmware for the current project. |
| `mbremote build [FILE\|DIR]` | Create `build/microbit.hex`.                                  |
| `mbremote flash [HEX]`       | Flash a HEX using DAPLink USB or mass storage.                |
| `mbremote run [FILE\|DIR]`   | Build, flash, and open the serial monitor.                    |
| `mbremote ports`             | List connected micro:bit serial ports.                        |
| `mbremote monitor`           | Open a serial monitor.                                        |
| `mbremote repl`              | Open the MicroPython REPL.                                    |
| `mbremote ls`                | List files on the connected micro:bit.                        |

Run `mbremote --help` for all options. When multiple micro:bits are connected, select one with `--port /dev/cu.usbmodem...`. Exit `monitor` and `repl` with `Ctrl-]`.

## Flashing options

```sh
mbremote flash --force
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
mbremote flash --all --mass-storage
```

`--force` forces a DAPLink USB full flash. Otherwise, mbremote automatically selects partial or full flashing. If DAPLink USB is busy or fails, try `--mass-storage`.

`--all` requires at least two connected micro:bits. `run --all` does not open a serial monitor.

## Samples

- [begin](examples/begin/main.py): Basic MicroPython program
- [led-rover](examples/led-rover/README.md): Rover using LEDs and motors
- [rps-radio](examples/rps-radio/README.md): Two-player radio rock-paper-scissors
- [magic-circle](examples/magic-circle/README.md): Magic-circle rock-paper-scissors using motion recognition and NeoPixel

## Development

To develop the workspace version in this GitHub repository, install dependencies and official V1/V2 firmware from the repository root, then link the CLI.

```sh
npm install
npm run setup
npm link --workspace mbremote
```

Run tests after changing the workspace CLI:

```sh
npm test
```

See [packages/mbremote](packages/mbremote/README.md) for the CLI implementation and detailed usage.

## License

[MIT](packages/mbremote/LICENSE)
