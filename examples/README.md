# mbremote Examples

[日本語](README.ja.md)

This directory contains MicroPython examples for [mbremote](../README.md). Run commands from the repository root.

## Samples

| Sample | Description | Boards |
| --- | --- | --- |
| [begin](begin/main.py) | Basic display and NeoPixel program | V1 / V2 |
| [led-rover](led-rover/README.md) | Controller and rover using radio, motors, and NeoPixel | V1 / V2 |
| [rps-radio](rps-radio/README.md) | Two-player radio rock-paper-scissors | V1 / V2 |
| [magic-circle](magic-circle/README.md) | Motion-recognition magic-circle rock-paper-scissors with NeoPixel | V2 |

## Build and flash

Install mbremote and download the official firmware first:

```sh
npm install --global mbremote
mbremote setup
```

Build, flash, and open a serial monitor for the basic example:

```sh
mbremote run examples/begin/main.py
```

Use `--no-monitor` to flash without opening the monitor. To flash the same program to two or more connected micro:bits, use `--all`.

```sh
mbremote run examples/begin/main.py --no-monitor
mbremote run examples/rps-radio --all
```

## Shared modules

The `shared/` directory contains modules used by the examples, including motor, dual-motor, and RGB LED modules. mbremote discovers it automatically when building an example. To specify it explicitly:

```sh
mbremote build examples/begin --shared examples/shared
```

## Magic-circle firmware

`magic-circle` requires a custom V2 firmware with the motion model and RGB LED module frozen into it. Generate the firmware, then perform a full flash on first installation or after changing the firmware.

```sh
npm run build:firmware:magic-circle
mbremote run examples/magic-circle/main.py --all --no-shared --board v2 --firmware firmware/microbit-micropython-v2-magic-circle.hex --force
```

See the [root README](../README.md) for the full CLI guide.
