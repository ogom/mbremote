# PicoRuby examples

[日本語](README.ja.md)

These PicoRuby (FemtoRuby) examples target the micro:bit V2. Run commands from the repository root.

| Example | Description |
| --- | --- |
| [begin](begin/README.md) | Minimal Ruby program |
| [microbit](microbit/README.md) | LEDs, buttons, touch logo, and accelerometer |
| [led-rover](led-rover/README.md) | Rover integrating radio, motors, and NeoPixels |
| [magic-circle](magic-circle/README.md) | Magic-circle game recognizing all four construction motions |

Ruby code is linked into the firmware, so use `--force` when flashing a board.

```sh
mbremote run examples/picoruby/begin --language picoruby --board v2 --force
```

## Remaining work for experimental support

The current PicoRuby firmware prioritizes the features used by these examples: LED display, A/B buttons, touch logo, accelerometer XYZ, digital/analog pins, NeoPixels, and string radio messages. Compared with the micro:bit V2 MicroPython firmware, the current PicoRuby bindings do not yet provide the following features.

- [ ] **Compass**: heading, magnetic-field XYZ and strength, and calibration
- [ ] **Microphone**: sound level, dB, sound events, and threshold configuration
- [ ] **Speaker and sound**: `music`, `audio`, `speech`, pitches, melodies, sound effects, volume, and speaker on/off
- [ ] **Serial buses**: UART, I2C, and SPI
- [ ] **Temperature and power control**: temperature, reset, panic, power off, and deep sleep
- [ ] **Extended LED display features**: on/off, ambient light level, rotation, multi-image animation, and wait/loop options
- [ ] **Complete Image support**: unregistered built-in images, creating images, pixel editing, dimensions, cropping, shifting, inversion, copying, filling, and image operations
- [ ] **Extended button support**: A/B button press counts
- [ ] **Extended accelerometer support**: strength, gesture detection and history, and measurement range configuration
- [ ] **Extended pin support**: pull-up/pull-down, mode inspection, touch input and history, touch modes, microsecond PWM periods, and low-level WS2812 output
- [ ] **Extended radio support**: byte messages, RSSI and receive timestamps, queue length, packet length, address, and data-rate configuration
- [ ] **Files and data logging**: an on-device file system, `os`, and `log` data logging
- [ ] **Interactive execution**: REPL and replacing a running program or its files
- [ ] **micro:bit V1**: the current PicoRuby firmware targets V2 only

Each feature requires a Ruby API, a CODAL binding, automated tests, hardware tests, an example, and documentation. Resolving these gaps within an agreed scope is the remaining work for PicoRuby experimental support.
