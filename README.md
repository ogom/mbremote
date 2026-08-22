# mbremote

[日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

A development environment for building, flashing, and controlling BBC micro:bit MicroPython and PicoRuby projects.
It includes the `mbremote` CLI in `packages/mbremote` and sample programs for micro:bit.
It creates Universal HEX files for V1 and V2 and flashes them through DAPLink USB or mass storage.

## Dependencies

- **All projects:** Node.js 20 or later (including npm).
- **MicroPython projects:** the official micro:bit Python Editor V3 V1/V2 firmware, `@microbit/microbit-fs`, and `@microbit/microbit-connection`.
  - npm installs the JavaScript packages; `mbremote setup` downloads the firmware. No additional build tools are required.
- **PicoRuby projects (experimental):** Git, Ruby with Rake, GNU Make, CMake, and the Arm GNU Toolchain (`arm-none-eabi-gcc` and `arm-none-eabi-ar`).
  - The first build also needs network access to clone the pinned PicoRuby and micro:bit V2 sources.
- **DAPLink USB flashing:** the `usb` npm dependency may require the platform's libusb development package when no prebuilt native binary is available.

## Installation

```sh
npm install --global mbremote
```

Before building, download official V1 and V2 firmware from the MicroPython project directory:

```sh
mbremote setup
```

Firmware is stored in the project's `firmware/` directory. An empty `config/setting.json` is also created without overwriting an existing file.
To use the samples, clone this repository and use `examples/`.

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

### Build PicoRuby (experimental)

PicoRuby's lightweight FemtoRuby (mruby/c) VM can ahead-of-time compile `main.rb` into firmware for the micro:bit V2.

```sh
mbremote build examples/picoruby/begin --language ruby --board v2
mbremote run examples/picoruby/begin --language ruby --board v2 --force
```

Ruby is detected from a `.rb` file or `main.rb`; the example passes `--language ruby --board v2` to make the V2-only target explicit. The first build requires Git, CMake, Arm GNU Toolchain, and Ruby, and downloads the official PicoRuby and CODAL sources into `.mbremote-cache/`. The workspace reuses the toolchain under `tmp/`.

The current milestone supports multiple top-level `.rb` files, serial output through `puts`, the LED display, A/B buttons, the touch logo, accelerometer XYZ values, sleeping and elapsed time, radio communication, pins/PWM, and NeoPixel output. Ruby files are combined in filename order, with `main.rb` executed last. See [picoruby/microbit](examples/picoruby/microbit/README.md) for the API example, [picoruby/led-rover](examples/picoruby/led-rover/README.md) for the integrated radio, motor, and NeoPixel example, and [picoruby/magic-circle](examples/picoruby/magic-circle/README.md) for the motion-recognition game. The REPL and V1 are not implemented yet. Ruby bytecode is linked into the firmware, so use `--force` when flashing it.

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
npm run build:firmware:magic-circle
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
  "language": "python",
  "shared": false,
  "board": "v2",
  "firmware": "firmware/microbit-micropython-v2-magic-circle.hex"
}
```

Set `shared` to a shared-module directory, or to `false` to exclude shared modules. See the [mbremote README](packages/mbremote/README.md) for all configuration options.

## Commands

| Command                      | Description                                                  |
| ---------------------------- | ------------------------------------------------------------ |
| `mbremote setup`             | Create the config file and download official V1/V2 firmware. |
| `mbremote build [FILE\|DIR]` | Create `build/microbit.hex`.                                 |
| `mbremote flash [HEX]`       | Flash a HEX using DAPLink USB or mass storage.               |
| `mbremote run [FILE\|DIR]`   | Build, flash, and open the serial monitor.                   |
| `mbremote ports`             | List connected micro:bit serial ports.                       |
| `mbremote monitor`           | Open a serial monitor.                                       |
| `mbremote repl`              | Open the MicroPython REPL.                                   |
| `mbremote ls`                | List files on the connected micro:bit.                       |

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
- [picoruby/begin](examples/picoruby/begin/README.md): Minimal Ruby program using FemtoRuby
- [picoruby/microbit](examples/picoruby/microbit/README.md): Use LEDs, buttons, and the accelerometer from Ruby
- [picoruby/led-rover](examples/picoruby/led-rover/README.md): Ruby rover integrating radio, motors, and NeoPixels
- [picoruby/magic-circle](examples/picoruby/magic-circle/README.md): Ruby magic circle recognizing all four construction motions
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
