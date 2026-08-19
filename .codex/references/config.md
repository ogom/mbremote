# Using setting.json

## Contents

- [Basic configuration](#basic-configuration)
- [Specify a configuration file](#specify-a-configuration-file)
- [Configuration keys](#configuration-keys)
- [Override settings on the CLI](#override-settings-on-the-cli)
- [Flash multiple devices](#flash-multiple-devices)
- [Git considerations](#git-considerations)

`mbremote` automatically reads `config/setting.json` from the working directory. `mbremote setup` creates this file as an empty JSON object when it is missing and preserves an existing file. If the file does not exist because setup has not been run, CLI defaults are used. Explicit command-line options take precedence over the same settings in the file.

## Basic configuration

Minimal configuration for shared modules in `examples/shared`:

```text
config/
└── setting.json
```

```json
{
  "shared": "examples/shared"
}
```

To define defaults for building and serial communication as well:

```json
{
  "board": "universal",
  "output": "build/microbit.hex",
  "shared": "examples/shared",
  "baud": 115200,
  "timeout": 15000,
  "monitor": true
}
```

Relative paths for `shared` and `output` are resolved from the directory where `mbremote` runs. Put direct `.py` files or a `main.py` in each child directory under `shared`; a child `main.py` is stored as a module named after that child directory.

To exclude shared modules, set `false`, which is equivalent to `--no-shared`.

```json
{
  "shared": false
}
```

To use custom V2 firmware:

```json
{
  "board": "v2",
  "firmware": "firmware/microbit-micropython-v2-magic-circle.hex"
}
```

The `firmware` relative path is also resolved from the working directory. Custom firmware must set `board` to either `v1` or `v2`.

## Specify a configuration file

Use `--config FILE` for a file other than the default. Relative paths are resolved from the working directory; absolute paths are also supported.

```sh
mbremote build examples/begin --config config/begin.json
mbremote run examples/rps-radio --config /path/to/rps-radio.json
```

If the default `config/setting.json` does not exist, mbremote runs without configuration. A missing file provided with `--config` is an error.

## Configuration keys

| Key | Type | Commands | Purpose |
|---|---|---|---|
| `board` | string | `build`, `run` | Select `universal`, `v1`, or `v2`. |
| `output` | string | `build`, `flash`, `run` | Set the HEX output path or default input to flash. |
| `shared` | string \| false | `build`, `run` | Set the directory of shared Python modules; `false` excludes them. |
| `firmware` | string | `build`, `run` | Set board-specific custom MicroPython HEX. |
| `port` | string | `flash`, `run`, `repl`, `monitor`, `ls` | Set the target micro:bit serial port. |
| `mount` | string | `flash`, `run` | Set the MICROBIT drive and use mass storage. |
| `baud` | number | `run`, `repl`, `monitor`, `ls` | Set the serial baud rate. |
| `timeout` | number | `run`, `ls` | Set the device wait time in milliseconds. |
| `monitor` | boolean | `run` | Choose whether to open the serial monitor after flashing. |
| `massStorage` | boolean | `flash`, `run` | Choose whether to copy through the MICROBIT drive. |
| `all` | boolean | `flash`, `run` | Choose whether to flash every detected device. |
| `force` | boolean | `flash`, `run` | Force a DAPLink USB full flash. |

Known settings that do not apply to a command are ignored, so one `setting.json` can serve every command. Unknown keys, incorrect types, and invalid JSON are errors.

## Override settings on the CLI

To override `shared` and `board` in `setting.json` for one command:

```sh
mbremote build examples/begin --shared common --board v2
```

The following command does not open a monitor even when `monitor` is `true`:

```sh
mbremote run examples/begin --no-monitor
```

## Flash multiple devices

```json
{
  "all": true,
  "shared": "examples/shared"
}
```

With this configuration, `mbremote run examples/rps-radio` and `mbremote flash` target every connected micro:bit. Set `all` to `false` when returning to single-device work.

## Git considerations

Keep `config/setting.json` in `.gitignore`. Shared configuration examples must not include machine-specific values such as personal directory names, `port`, or `mount`.
