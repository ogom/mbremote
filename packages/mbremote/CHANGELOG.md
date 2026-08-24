# Changelog

## 0.4.0 — 2026-08-24

- Rename source languages to `micropython` and `picoruby`.
- Standardize configuration keys on `snake_case`, including
  `base_firmware` and `mass_storage`.
- Add `mbremote build clean` and move file listing to `mbremote fs ls`.
- Rename the built or flashed HEX option to `--firmware`; use
  `--base-firmware` for a custom MicroPython base firmware.
- Require `mbremote flash --firmware FILE` for a non-default HEX instead of a
  positional input.
- Express `timeout` values in seconds and set the default to 10 seconds.
- Reorganize the README, add configuration references, a release checklist,
  and a related-project link to rpremote.

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
