# mbremote Commands

## Contents

- [Set up the development version](#set-up-the-development-version)
- [Install the npm version](#install-the-npm-version)
- [Build](#build)
- [Flash](#flash)
- [Build and run](#build-and-run)
- [Serial monitor and REPL](#serial-monitor-and-repl)
- [Common options](#common-options)
- [Validate the CLI](#validate-the-cli)

Run every command from the project root.

## Set up the development version

```sh
npm install
npm run setup
npm link --workspace mbremote
```

## Install the npm version

Run this only after confirming that the package has been published to npm. Use the development version before publication.

```sh
npm install --global mbremote
mbremote setup
mbremote --version
```

Both `npm run setup` in the CLI source repository and `mbremote setup` in an
npm project download the official firmware and create an empty
`config/setting.json` when it is missing. They do not overwrite an existing
configuration file.

## Build

```sh
mbremote build [FILE|DIR] [-o FILE] [--board universal|v1|v2] [--firmware HEX] [--shared DIR|--no-shared]
```

Examples:

```sh
mbremote build examples/begin
mbremote build examples/begin/main.py
mbremote build examples/rps-radio -o build/rps-radio.hex --no-shared
mbremote build examples/rps-radio --board v2 --no-shared
mbremote build examples/begin --shared examples/shared
mbremote build examples/rps-radio/main.py --board v2 --firmware firmware/microbit-micropython-v2.hex --no-shared
```

## Flash

```sh
mbremote flash [HEX] [--port PORT] [--all] [--force] [--mass-storage] [--mount DIR]
```

Examples:

```sh
# Flash build/microbit.hex through DAPLink USB with automatic partial/full selection.
mbremote flash

# Flash a specific HEX.
mbremote flash build/rps-radio.hex

# Force a DAPLink USB full flash.
mbremote flash --force

# Flash through the MICROBIT drive.
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT

# Flash the same HEX to every detected micro:bit.
mbremote flash --all
mbremote flash --all --mass-storage
```

## Build and run

```sh
mbremote run [FILE|DIR] [--port PORT|--all] [--board universal|v1|v2] [--firmware HEX] [--shared DIR|--no-shared] [--force] [--mass-storage] [--mount DIR] [--no-monitor]
```

```sh
# Build, flash, and open the serial monitor.
mbremote run examples/begin/main.py

# Build and flash only.
mbremote run examples/begin/main.py --no-monitor

# Build and flash every detected micro:bit.
mbremote run examples/rps-radio --all
```

`run --all` exits without opening a serial monitor.

## Serial monitor and REPL

```sh
mbremote ports
mbremote monitor [--port PORT]
mbremote repl [--port PORT]
mbremote ls [--port PORT]
```

```sh
mbremote monitor --port /dev/cu.usbmodem1101
mbremote repl --port /dev/cu.usbmodem1101
mbremote ls --port /dev/cu.usbmodem1101
```

Exit `repl` and `monitor` with `Ctrl-]`.

## Common options

| Option | Purpose |
|---|---|
| `--config FILE` | Use a configuration file other than the default `config/setting.json`. |
| `--force` | Override automatic selection and force a DAPLink USB full flash. |
| `--mass-storage` | Copy through the MICROBIT drive. |
| `--all` | Flash the same HEX to every detected micro:bit. |
| `--mount DIR` | Specify a mount point and use mass-storage flashing. |
| `--firmware HEX` | Use custom MicroPython HEX together with `--board v1` or `--board v2`. |
| `--shared DIR` | Specify the directory of shared Python modules for `build` or `run`. |
| `--no-shared` | Do not include shared Python modules for `build` or `run`. |
| `--port PORT` | Specify a serial port. |
| `--baud RATE` | Set the baud rate; the default is 115200. |
| `--timeout MS` | Set the device wait time; the default is 15000 ms. |
| `-o, --output FILE` | Specify the HEX output path. |
| `--no-monitor` | Do not open a monitor after `run`. |

## Validate the CLI

```sh
npm test
mbremote --help
mbremote build examples/begin
```
