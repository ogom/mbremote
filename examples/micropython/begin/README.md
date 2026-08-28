# Begin

[日本語](README.ja.md)

A basic MicroPython program for micro:bit V1 and V2. It displays a heart,
scrolls `Hello`, and animates ten low-brightness NeoPixels connected to P0.

## Run

Run these commands from the repository root. `run` builds the program, writes
persistent firmware to the connected micro:bit, and opens the serial monitor.

```sh
mbremote setup
mbremote run examples/micropython/begin
```

Use `--no-monitor` when the command should finish immediately after flashing:

```sh
mbremote run examples/micropython/begin --no-monitor
```

The `rgb_led` module is included automatically from the parent
[`shared/`](../shared/) directory. See the [MicroPython examples](../README.md)
for other projects.
