---
name: mb-remote-dev
description: Develop, build, flash, and troubleshoot BBC micro:bit MicroPython or PicoRuby projects with mbremote. Use for mbremote CLI workflows and project configuration, not generic Python or Ruby work.
---

# micro:bit development with mbremote

Use the npm or repository-workspace version of `mbremote` for MicroPython
projects on micro:bit V1/V2 and experimental PicoRuby projects on micro:bit
V2.

## Establish the project

- If `packages/mbremote/` exists, this is the CLI source repository; otherwise
  treat it as a micro:bit project using the published CLI.
- Work from the project root. Inspect `README.md`, `package.json`, the target
  source files, and `config/setting.json` before changing code or running a
  device command.
- Use `mbremote --help` when the installed CLI behavior may differ from this
  skill.
- Read [references/command.md](references/command.md) for command syntax and
  [references/config.md](references/config.md) when configuration affects the
  task. Read [references/examples.md](references/examples.md) for project
  layouts, device verification, or troubleshooting.

## Build and run

- Use `micropython` or `picoruby` for `--language`; source detection is the
  default. A MicroPython directory needs `main.py`; a PicoRuby directory needs
  `main.rb`.
- `--firmware` names the generated HEX for `build` and `run`, and the HEX
  passed to `flash`. `--base-firmware` selects a board-specific MicroPython
  base HEX. Do not treat them as aliases.
- Build a custom-base MicroPython project with `--board v1|v2
  --base-firmware HEX`. PicoRuby supports V2 only and does not accept
  `--base-firmware`, `--shared`, or `--no-shared`.
- Use `mbremote fs ls` for remote file listing. `mbremote ls` is not a command.
- `timeout` values from the CLI and configuration are whole seconds; the
  default is 10 seconds.

## Hardware safety

- Build only unless the user requests a hardware action. `run` builds and
  flashes, so do not use it for a static build check.
- Before flashing, identify the intended HEX and device. Use `--port` when
  multiple boards are connected.
- `--force` performs a DAPLink USB full flash. Use it for the initial PicoRuby
  flash and whenever its firmware changes; otherwise allow automatic partial
  or full flashing.
- Use `--mass-storage` or `--mount /Volumes/MICROBIT` when DAPLink USB is
  unavailable. Do not combine `--force` with mass-storage flashing.
- A single-target `run` opens the serial monitor by default. Use `--no-monitor`
  for a non-interactive device run. `run --all` does not open a monitor.

## Verification and failures

- In the CLI source repository, run `npm test` after changing CLI code. Run
  `npm run test:picoruby-firmware --workspace mbremote` when PicoRuby build
  support changes and its required toolchain is available.
- For missing official base firmware, run `npm run setup` in the CLI source
  repository or `mbremote setup` in a project using the npm package.
- For device failures, check `mbremote ports`, then retry with an explicit
  `--port` or mass-storage flashing as appropriate. Inspect `FAIL.TXT` for a
  mounted MICROBIT volume.
