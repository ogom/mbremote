# mbremote commands

Run commands from the project root. For the authoritative installed syntax, run `mbremote --help`; use `mbremote <command> --help` for command-specific syntax and options.

## Set up the development CLI

Use this in the mbremote source repository:

```sh
npm install
npm run setup
npm link --workspace mbremote
```

For a published npm installation, run `mbremote setup` in each project before the first MicroPython build. It downloads official base firmware and creates an empty `config/setting.json` without replacing an existing file.

## Inspect effective configuration

```sh
mbremote config show
mbremote config show --config config/device-v2.json
```

Shows JSON effective values for `language`, `board`, `firmware`, `base_firmware`, `port`, and `timeout` after configuration and defaults are merged.

## Build

```sh
mbremote build [FILE|DIR] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared]
mbremote build clean
```

```sh
mbremote build examples/micropython/begin
mbremote build examples/micropython/rps-radio --firmware build/rps-radio.hex --no-shared
mbremote build examples/micropython/begin --shared examples/micropython/shared
mbremote build examples/micropython/magic-circle/main.py --board v2 --base-firmware firmware/microbit-micropython-v2.hex --no-shared
```

`--firmware` names the generated HEX. `--base-firmware` selects a custom base MicroPython HEX and requires `--board v1` or `--board v2`.

## Build PicoRuby firmware

PicoRuby targets micro:bit V2 only.

```sh
mbremote build examples/picoruby/begin --language picoruby --board v2
mbremote run examples/picoruby/led-rover --language picoruby --board v2 --force --no-monitor
```

A PicoRuby directory requires `main.rb`. Ruby files are collected in lexical path order and `main.rb` runs last. PicoRuby source is compiled into firmware, so use `--force` after changing it. `--base-firmware`, `--shared`, and `--no-shared` do not apply to PicoRuby.

## Flash

```sh
mbremote flash [--firmware HEX] [--port PORT] [--all] [--force] [--mass-storage] [--mount DIR]
```

```sh
# Flash build/microbit.hex through DAPLink USB.
mbremote flash

# Flash a specific HEX. A positional HEX argument is not supported.
mbremote flash --firmware build/rps-radio.hex

# Force a DAPLink USB full flash.
mbremote flash --force

# Flash through the MICROBIT volume.
mbremote flash --mass-storage
mbremote flash --mount /Volumes/MICROBIT
```

## Build and run

```sh
mbremote run [FILE|DIR] [--port PORT|--all] [--firmware HEX] [--language micropython|picoruby] [--board universal|v1|v2] [--base-firmware HEX] [--shared DIR|--no-shared] [--force] [--mass-storage] [--mount DIR] [--monitor|--no-monitor]
```

```sh
mbremote run examples/micropython/begin/main.py
mbremote run examples/micropython/begin/main.py --no-monitor
mbremote run examples/micropython/rps-radio --all
```

`run` is a persistent `build` → `flash` → optional `monitor` sequence, not rpremote's temporary-upload execution. The generated HEX remains installed on the micro:bit. `flash` writes a HEX as persistent firmware and replaces the program that starts after reset. Before a state-changing stage, the CLI prints the action and target; PicoRuby AOT firmware compilation is also announced before it starts. For one board, monitoring is on by default; use `--no-monitor` to exit after build and flash, or `--monitor` to override configured `monitor: false`. `run --all` does not open a serial monitor.

When monitoring, `run` ends with `Ctrl-]` or serial-port closure; program completion is not detected. `--timeout` limits only the post-flash wait for the serial port, not build, flash, program, or monitor duration. Exit status is zero only when all selected stages succeed; deployed-program exceptions do not determine the CLI exit status.

`ports` prints each detected micro:bit serial path on its own line in path order. With no matching board, it prints `No micro:bit serial ports found.`

## Serial and filesystem commands

```sh
mbremote ports
mbremote monitor [--port PORT]
mbremote repl [--port PORT]
mbremote exec CODE [--port PORT]
mbremote reset [--port PORT]
mbremote fs cp FILE :FILENAME [--port PORT]
mbremote fs cp :FILENAME FILE [--port PORT]
mbremote fs cat :FILENAME [--port PORT]
mbremote fs ls [:/] [--port PORT]
mbremote fs rm :FILENAME [--port PORT]
```

`repl` is MicroPython-only. PicoRuby has no REPL, but `monitor` displays its serial output. Exit `monitor` and `repl` with `Ctrl-]`.

`exec` runs one quoted MicroPython command, prints its output, and then soft-resets the board. `reset` explicitly performs the same soft reset.

Remote paths start with `:`. The micro:bit filesystem is flat: use `fs ls` and `:FILENAME` for files. Paths without `:` are local; exactly one `fs cp` path must be remote. `:/FILENAME` remains compatible, but directories are unsupported.

## Common options

| Option | Purpose |
| --- | --- |
| `--config FILE` | Select a configuration file instead of `config/setting.json`. |
| `--firmware HEX` | Generated HEX for `build`/`run`, or input HEX for `flash`. |
| `--base-firmware HEX` | Board-specific MicroPython base HEX for `build`/`run`. |
| `--board BOARD` | `universal`, `v1`, or `v2`; default: `universal`. |
| `--language LANG` | `micropython` or `picoruby`; default: detect. |
| `--timeout SEC` | Device wait timeout in seconds; default: `10`. |
| `--force` | Force a DAPLink USB full flash. |
| `--mass-storage` | Copy through a mounted MICROBIT volume. |
| `--mount DIR` | Set the volume and select mass-storage flashing. |
| `--all` | Flash every detected board; requires at least two. |
| `--monitor`, `--no-monitor` | Enable or disable the monitor after a single-board `run`. |

## Validate the CLI

```sh
npm test
npm run test:picoruby-firmware --workspace mbremote
mbremote --help
mbremote build examples/micropython/begin
```
