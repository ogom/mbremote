---
name: mb-remote-dev
description: Develop BBC micro:bit MicroPython programs with the npm or workspace version of mbremote, including builds, firmware setup, flashing, serial monitoring, REPL access, and connection troubleshooting.
---

# micro:bit Development with mbremote

Use the npm or repository-workspace version of `mbremote` to develop and verify MicroPython code for micro:bit V1 and V2.

## Establish the workspace

- If `packages/mbremote/` exists, treat the repository as the CLI source repository; otherwise, treat it as the user's MicroPython project.
- Run commands from the project root unless there is a reason not to.
- Start by checking `README.md`, `package.json`, and the target Python files.
- When the CLI behavior is uncertain, check the current behavior with `mbremote --help`.
- Read [references/command.md](references/command.md) for CLI syntax and options.
- Read [references/config.md](references/config.md) for `setting.json` options, precedence, and examples.
- Read [references/examples.md](references/examples.md) for development workflows and troubleshooting examples.

## Development workflow

1. Review the request and existing code.
2. Check `config/setting.json` or the file supplied with `--config FILE`, and identify settings overridden by CLI options.
3. Check `mbremote --version`. If the command is unavailable in the CLI source repository, run `npm install`, `npm run setup`, and `npm link --workspace mbremote`.
4. Install the npm package with `npm install --global mbremote` only after confirming it has been published. Do not assume the npm version is available before publication; use the workspace version instead. After installing the npm package, run `mbremote setup` from the project root.
5. In the CLI source repository, run `npm run setup` when the official firmware is missing.
6. Edit any `.py` file for a single-file project. For a multi-file project, always place `main.py` directly in the project directory.
7. Use only APIs available in micro:bit MicroPython and preserve the existing code style.
8. Generate a HEX with `mbremote build <FILE|DIR> [--shared DIR|--no-shared]`. For custom MicroPython, also provide `--board v1|v2 --firmware HEX`.
9. Run `npm test` after changing CLI source code. Even for Python-only changes, confirm that the build succeeds at minimum.
10. Flash hardware only when the request includes it. For non-interactive work, prefer `--no-monitor` to avoid opening a serial monitor.
11. Report the result, flashing method, and any unverified items concisely.

## Preserve source layout rules

- A single Python file is stored on the device as `main.py`.
- When a directory is specified, only `.py` files directly inside it are included; subdirectories are excluded.
- A directory project must contain `main.py`.
- Shared modules are discovered automatically from a `shared/` directory at the project root or beside it. Direct `.py` files and `main.py` files in child directories are included. A child `main.py` is stored on the device as `<child-directory>.py`. Use `--shared DIR` to select another location, or `--no-shared` to disable discovery.
- When no input is specified, search in this order: `src/`, root `main.py`, then `examples/`.
- Normally generate a Universal HEX that supports V1 and V2. Use `--board v1` or `--board v2` only when there is a reason to target one board.
- Custom firmware must target `--board v1` or `--board v2`. Use `--force` for a full flash on first installation and whenever the firmware changes.

## Choose a flashing method

- Use `mbremote flash` by default. It prefers DAPLink USB partial flashing through `@microbit/microbit-connection`.
- Use `--force` only when automatic detection must be overridden to force a DAPLink USB full flash.
- Use `--mass-storage` if DAPLink USB fails because the device is in use, permissions are insufficient, or DAPLink is old.
- On macOS, use `--mount /Volumes/MICROBIT` to specify a mount point. This implicitly selects mass-storage flashing.
- To build and flash every connected micro:bit, use `mbremote run <FILE|DIR> --all`. To flash an existing HEX, use `mbremote flash --all`. For mass storage, add `--all --mass-storage`.
- When multiple serial ports are detected, use `--port` to select the target explicitly.

## Handle physical devices safely

- If the user did not request flashing or hardware execution, stop after building.
- Confirm the input and output HEX before flashing.
- `run` builds and flashes, so do not use it for a static check alone.
- Single-target `run` opens a serial monitor by default. `run --all` flashes multiple boards and exits without opening one. In other non-interactive cases, add `--no-monitor`.
- Exit `repl` and `monitor` with `Ctrl-]`. Run long-lived monitoring only when explicitly requested.

## Troubleshoot failures

1. Check the connection with `mbremote ports`.
2. For missing official firmware, run `npm run setup` in the CLI source repository or `mbremote setup` with the npm package. For missing custom firmware, follow the project-specific generation or retrieval procedure.
3. For a DAPLink USB `device-in-use` error, close applications that use DAPLink, such as Python Editor.
4. If only DAPLink USB flashing fails, compare it with `--mass-storage`.
5. For mass-storage failures, inspect `/Volumes/MICROBIT` and `FAIL.TXT`.
6. If only serial auto-detection fails, specify `--port /dev/cu.usbmodem...`.
7. After a fix, rerun the command that failed and `npm test`.
