# PicoRuby begin

This ports the MicroPython `examples/begin/main.py` program to FemtoRuby on a micro:bit V2. It displays a heart, scrolls `Hello`, then animates ten low-brightness NeoPixels on P0.

```sh
mbremote build examples/picoruby/begin --language ruby --board v2
mbremote run examples/picoruby/begin --language ruby --board v2 --force
```

Connect the NeoPixel data input to P0. Do not power NeoPixels from the micro:bit; use an appropriate external supply and share GND.

PicoRuby support is currently experimental. It targets V2 only and compiles Ruby code into the firmware ahead of time. See [microbit](../microbit/README.md) for LED, button, and accelerometer APIs, [led-rover](../led-rover/README.md) for a multi-file project, and [magic-circle](../magic-circle/README.md) for a larger game. The REPL is not implemented yet.
