# Configuration reference

[日本語](config.ja.md)

mbremote reads project defaults from `config/setting.json` in the current
project directory. Use `--config FILE` to select another file. Configuration
keys use `snake_case`.

For each command, command-line options override values from the configuration
file. A valid key that does not apply to the current command is ignored. An
unknown key or a value with the wrong type is an error.

## Precedence

| Priority | Source | Effect |
| --- | --- | --- |
| 1 | Command-line option | Overrides a value from the configuration file. This includes `--no-shared` and `--no-monitor`. |
| 2 | `--config FILE`, or `config/setting.json` when omitted | Supplies project defaults for the selected command. |
| 3 | Built-in default | Used when neither the command line nor configuration provides a value. |

```json
{
  "board": "v2",
  "language": "micropython",
  "firmware": "build/microbit.hex",
  "base_firmware": "firmware/custom-v2.hex",
  "shared": false,
  "port": "/dev/cu.usbmodem0000000000001",
  "timeout": 10
}
```

## Build and firmware keys

| Key | Type | Default | Commands | CLI option | Description |
| --- | --- | --- | --- | --- | --- |
| `board` | string: `universal`, `v1`, or `v2` | `universal` | `build`, `run` | `--board` | Target micro:bit board. |
| `language` | string: `micropython` or `picoruby` | Detect from the input | `build`, `run` | `--language` | Source language. |
| `firmware` | non-empty string | `build/microbit.hex` | `build`, `run`, `flash` | `--firmware` | Built HEX path for `build` and `run`; HEX input path for `flash`. |
| `base_firmware` | non-empty string | Installed official base firmware | `build`, `run` | `--base-firmware` | Base MicroPython HEX. Requires `board` to be `v1` or `v2`. PicoRuby does not support it. |
| `shared` | non-empty string or `false` | Automatically discovered `shared/` directory | `build`, `run` | `--shared`, `--no-shared` | Shared MicroPython module directory, or `false` to exclude shared modules. |

## Device and execution keys

| Key | Type | Default | Commands | CLI option | Description |
| --- | --- | --- | --- | --- | --- |
| `port` | non-empty string | Automatically selected board | `flash`, `run`, `repl`, `monitor`, `fs ls` | `--port` | Serial device path for the target micro:bit. |
| `mount` | non-empty string | Automatically detected mounted volume | `flash`, `run` | `--mount` | Mounted MICROBIT volume; implies `mass_storage`. |
| `baud` | positive integer | `115200` | `run`, `repl`, `monitor`, `fs ls` | `--baud` | Serial baud rate. |
| `timeout` | positive integer, in seconds | `10` | `run`, `fs ls` | `--timeout` | Device wait timeout. |
| `monitor` | boolean | `true` | `run` | `--no-monitor` | Open the serial monitor after `run`. Set to `false` to disable it. |
| `mass_storage` | boolean | `false` | `flash`, `run` | `--mass-storage` | Copy the HEX to a mounted MICROBIT volume instead of using DAPLink USB. |
| `all` | boolean | `false` | `flash`, `run` | `--all` | Flash all detected boards; at least two boards are required. |
| `force` | boolean | `false` | `flash`, `run` | `--force` | Force a complete DAPLink USB flash. |

## Notes

- `mbremote setup` creates an empty `config/setting.json` without overwriting
  an existing file, and downloads the official base firmware into `firmware/`.
- `mbremote build clean`, `mbremote ports`, and the other commands do not use
  project configuration values.
- `--config FILE` itself is command-line only; it is not a configuration key.
- Run `mbremote --help` for the complete command syntax.
