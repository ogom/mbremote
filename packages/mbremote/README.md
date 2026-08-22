# mbremote

[日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

Command-line tools for building, flashing, and inspecting BBC micro:bit MicroPython and PicoRuby projects.

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

In each project directory, download the official V1 and V2 firmware before building:

```sh
mbremote setup
```

The firmware is saved to `firmware/` in the current directory. An empty
`config/setting.json` is also created without overwriting an existing file.

## Usage

### Build a project

Build a directory containing `main.py`:

```sh
mbremote build src
```

To build a single Python file as `main.py` on the micro:bit:

```sh
mbremote build main.py
```

By default, this creates a Universal HEX for both micro:bit V1 and V2 at `build/microbit.hex`.

### Build PicoRuby (experimental)

Compile `main.rb` to FemtoRuby (mruby/c) bytecode and link it into micro:bit V2 firmware:

```sh
mbremote build main.rb --language ruby --board v2
mbremote run main.rb --language ruby --board v2 --force
```

The first build requires Git, CMake, Arm GNU Toolchain, and Ruby. Official sources and intermediate files are cached in `.mbremote-cache/`. The current milestone supports V2, multiple top-level `.rb` files, `puts`, the LED display, A/B buttons, the touch logo, accelerometer XYZ values, sleeping and elapsed time, radio communication, pins/PWM, and NeoPixel output. Ruby files are combined in filename order, with `main.rb` executed last. The REPL is not implemented yet. See the workspace [picoruby/led-rover example](../../examples/picoruby/led-rover/README.md) for a multi-file project and [picoruby/microbit example](../../examples/picoruby/microbit/README.md) for the API list.

### Flash and run

Flash the default `build/microbit.hex` with DAPLink USB:

```sh
mbremote flash
```

Build, flash, and open a serial monitor:

```sh
mbremote run main.py
```

Use `--no-monitor` to flash without opening a serial monitor, or `--all` to flash every connected micro:bit.

```sh
mbremote run main.py --no-monitor
mbremote run main.py --all
```

### Use custom firmware

Specify a board and custom MicroPython HEX when the project needs a custom firmware build:

```sh
mbremote build main.py --board v2 --firmware firmware/custom-v2.hex
mbremote run main.py --board v2 --firmware firmware/custom-v2.hex --force
```

`--firmware` requires `--board v1` or `--board v2`. Use `--force` the first time a custom firmware is installed or when it changes.

### Include shared modules

Python files in a project-local or sibling `shared/` directory are included automatically.
To choose another location or include none:

```sh
mbremote build src --shared ../shared
mbremote build src --no-shared
```

For example, `shared/motor/main.py` is installed as the `motor` module.

```text
examples/
├── begin/
│   └── main.py
└── shared/
    └── motor/
        └── main.py
```

## Configuration

`mbremote` reads project defaults from `config/setting.json`.
Pass `--config FILE` to use another file; command-line options take precedence.

```json
{
  "shared": false,
  "board": "v2",
  "language": "python",
  "firmware": "firmware/custom-v2.hex",
  "all": true
}
```

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

Run `mbremote --help` for all options. When multiple boards are connected, select one with `--port /dev/cu.usbmodem...`.
`monitor` and `repl` exit with `Ctrl-]`.

## Flashing options

```sh
mbremote flash --force
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
mbremote flash --all --mass-storage
```

`--force` always performs a full flash. Otherwise, mbremote automatically selects partial or full flashing.
`--all` requires at least two connected micro:bits and does not open a serial monitor.

## Development

To use the workspace version of this package:

```sh
npm install
npm run setup
npm link --workspace mbremote
```

Run the tests with:

```sh
npm test --workspace mbremote
```

Run the optional PicoRuby firmware integration build with:

```sh
npm run test:picoruby-firmware --workspace mbremote
```

## License

[MIT](LICENSE). See [Third-Party Notices](THIRD_PARTY_NOTICES.md) for components distributed under other licenses.
