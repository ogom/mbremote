# mbremote development examples

Check the target project configuration before running a command. Build without
flashing unless the user asked for hardware execution.

## MicroPython projects

A single Python file is installed as `main.py`:

```sh
mbremote build examples/blink.py
```

A directory project requires `main.py`; direct `.py` files become modules:

```text
src/
├── main.py
├── display.py
└── sensor.py
```

```sh
mbremote build src
mbremote run src --no-monitor
```

Shared modules are automatically discovered from a project-local or sibling
`shared/` directory. Use `--shared DIR` to select another location, or
`--no-shared` to exclude them.

## PicoRuby projects

A PicoRuby directory requires `main.rb`; `.rb` files under the directory are
compiled in lexical path order and `main.rb` runs last:

```text
src/
├── lib/
│   └── rover.rb
└── main.rb
```

```sh
mbremote build src --language picoruby --board v2
mbremote run src --language picoruby --board v2 --force --no-monitor
```

PicoRuby source is linked into firmware. It has no REPL and does not use the
MicroPython shared-module mechanism or `--base-firmware`.

## Device checks and troubleshooting

```sh
mbremote ports
mbremote fs ls --port /dev/cu.usbmodem1101
mbremote monitor --port /dev/cu.usbmodem1101
```

- For DAPLink USB errors, close applications using the board, then retry.
- If only DAPLink USB fails, compare with `mbremote flash --mass-storage`.
- If a mounted volume is not discovered, use
  `mbremote flash --mount /Volumes/MICROBIT` and inspect `FAIL.TXT`.
- If serial auto-detection fails, select the device with `--port`.
- For missing official base firmware, run `npm run setup` in the CLI source
  repository or `mbremote setup` in an npm project.

## Custom base firmware

Custom MicroPython base firmware must target a specific board. Use a full
flash on first installation and whenever the base firmware changes:

```sh
npm run build:firmware:magic-circle
mbremote run examples/magic-circle/main.py --board v2 \
  --base-firmware firmware/microbit-micropython-v2-magic-circle.hex \
  --no-shared --force --no-monitor
```

After the first installation, omit `--force` if the base firmware is unchanged
to allow automatic partial flashing.
