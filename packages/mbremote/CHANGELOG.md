# Changelog

## 0.3.0 — 2026-08-22

- Add experimental PicoRuby/FemtoRuby support for BBC micro:bit V2.
- Add Ruby build, flash, and source-file discovery to `mbremote`.
- Provide Ruby examples for basic micro:bit APIs, LED rover, and magic circle.
- Add radio, display, button, accelerometer, Pin/PWM, and NeoPixel bindings.
- Add an embedded ML4F model for PicoRuby magic-circle motion recognition.

### Limitations

- PicoRuby targets micro:bit V2 only.
- The PicoRuby REPL is not available.
- Ruby firmware is linked into the HEX, so use `--force` when flashing it.
