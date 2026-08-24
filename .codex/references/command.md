# mbremote commands

Run commands from the project root. For the authoritative installed syntax,
run `mbremote --help`.

## Set up the development CLI

Use this in the mbremote source repository:

```sh
npm install
npm run setup
npm link --workspace mbremote
```

For a published npm installation, run `mbremote setup` in each project before
the first MicroPython build. It downloads official base firmware and creates an
empty `config/setting.json` without replacing an existing file.

## Build

```sh
mbremote build [FILE|DIR] [--firmware HEX] \
  [--language micropython|picoruby] [--board universal|v1|v2] \
  [--base-firmware HEX] [--shared DIR|--no-shared]
mbremote build clean
```

```sh
mbremote build examples/begin
mbremote build examples/rps-radio --firmware build/rps-radio.hex --no-shared
mbremote build examples/begin --shared examples/shared
mbremote build examples/magic-circle/main.py --board v2 \
  --base-firmware firmware/microbit-micropython-v2.hex --no-shared
```

`--firmware` names the generated HEX. `--base-firmware` selects a custom base
MicroPython HEX and requires `--board v1` or `--board v2`.

## Build PicoRuby firmware

PicoRuby targets micro:bit V2 only.

```sh
mbremote build examples/picoruby/begin --language picoruby --board v2
mbremote run examples/picoruby/led-rover --language picoruby --board v2 \
  --force --no-monitor
```

A PicoRuby directory requires `main.rb`. Ruby files are collected in lexical
path order and `main.rb` runs last. PicoRuby source is compiled into firmware,
so use `--force` after changing it. `--base-firmware`, `--shared`, and
`--no-shared` do not apply to PicoRuby.

## Flash

```sh
mbremote flash [--firmware HEX] [--port PORT] [--all] [--force] \
  [--mass-storage] [--mount DIR]
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
mbremote run [FILE|DIR] [--port PORT|--all] [--firmware HEX] \
  [--language micropython|picoruby] [--board universal|v1|v2] \
  [--base-firmware HEX] [--shared DIR|--no-shared] [--force] \
  [--mass-storage] [--mount DIR] [--no-monitor]
```

```sh
mbremote run examples/begin/main.py
mbremote run examples/begin/main.py --no-monitor
mbremote run examples/rps-radio --all
```

`run --all` does not open a serial monitor.

## Serial and filesystem commands

```sh
mbremote ports
mbremote monitor [--port PORT]
mbremote repl [--port PORT]
mbremote fs ls [--port PORT]
```

`repl` is MicroPython-only. PicoRuby has no REPL, but `monitor` displays its
serial output. Exit `monitor` and `repl` with `Ctrl-]`.

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
| `--no-monitor` | Do not open the monitor after `run`. |

## Validate the CLI

```sh
npm test
npm run test:picoruby-firmware --workspace mbremote
mbremote --help
mbremote build examples/begin
```
