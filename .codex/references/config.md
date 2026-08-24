# mbremote configuration

mbremote reads `config/setting.json` from the project root. Use `--config FILE`
to select another file. Configuration keys use `snake_case`.

Command-line values override configuration. A valid key that does not apply to
the selected command is ignored; an unknown key, invalid JSON, or wrong type
is an error.

```json
{
  "board": "v2",
  "language": "micropython",
  "firmware": "build/microbit.hex",
  "base_firmware": "firmware/custom-v2.hex",
  "shared": false,
  "mass_storage": true,
  "timeout": 10
}
```

| Key | Type | Default | Commands | CLI option |
| --- | --- | --- | --- | --- |
| `board` | `universal`, `v1`, or `v2` string | `universal` | `build`, `run` | `--board` |
| `language` | `micropython` or `picoruby` string | detect | `build`, `run` | `--language` |
| `firmware` | non-empty string | `build/microbit.hex` | `build`, `run`, `flash` | `--firmware` |
| `base_firmware` | non-empty string | official base firmware | `build`, `run` | `--base-firmware` |
| `shared` | non-empty string or `false` | automatic `shared/` discovery | `build`, `run` | `--shared`, `--no-shared` |
| `port` | non-empty string | auto-select | `flash`, `run`, `repl`, `monitor`, `fs ls` | `--port` |
| `mount` | non-empty string | auto-detect | `flash`, `run` | `--mount` |
| `baud` | positive integer | `115200` | `run`, `repl`, `monitor`, `fs ls` | `--baud` |
| `timeout` | positive integer seconds | `10` | `run`, `fs ls` | `--timeout` |
| `monitor` | boolean | `true` | `run` | `--no-monitor` |
| `mass_storage` | boolean | `false` | `flash`, `run` | `--mass-storage` |
| `all` | boolean | `false` | `flash`, `run` | `--all` |
| `force` | boolean | `false` | `flash`, `run` | `--force` |

`firmware` names the generated HEX for `build` and `run`, but the HEX input
for `flash`. `base_firmware` is a different setting: it selects a custom
MicroPython base HEX and requires a V1 or V2 board. It cannot be used for
PicoRuby.

Keep machine-specific `port` and `mount` values out of shared configuration.
