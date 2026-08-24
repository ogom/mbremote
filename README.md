# mbremote

[日本語](README.ja.md)

[![npm version](https://img.shields.io/npm/v/mbremote.svg)](https://www.npmjs.com/package/mbremote)

mbremote is a development environment for BBC micro:bit MicroPython and
PicoRuby projects. It builds Universal HEX files for micro:bit V1 and V2,
flashes connected boards, and provides serial and filesystem tools.

The repository contains the published `mbremote` CLI in
[`packages/mbremote`](packages/mbremote), examples, and development tooling.

## Quick start

Install Node.js 20 or later, then install the CLI:

```sh
npm install --global mbremote
```

In a project directory, download the official micro:bit base firmware and
create an optional project configuration:

```sh
mbremote setup
```

Build and flash a MicroPython project containing `main.py`:

```sh
mbremote build src
mbremote flash
```

Or build, flash, and open the serial monitor in one step:

```sh
mbremote run src
```

PicoRuby projects target micro:bit V2:

```sh
mbremote run examples/picoruby/begin --language picoruby --board v2 --force
```

`--force` performs a full flash, which is required when installing or
changing PicoRuby firmware.

## Examples

Clone this repository to run the included examples.

- [All examples](examples/README.md)
- [Basic MicroPython program](examples/begin/main.py)
- [LED rover](examples/led-rover/README.md)
- [Radio rock-paper-scissors](examples/rps-radio/README.md)
- [Motion-recognition magic circle](examples/magic-circle/README.md)
- [PicoRuby examples](examples/picoruby/README.md)

## Documentation

- [CLI reference and detailed usage](packages/mbremote/README.md)
- [Configuration reference](docs/config.md) ([日本語](docs/config.ja.md))
- [Release checklist](packages/mbremote/RELEASING.md)

## Development

Install dependencies from the repository root and link the workspace CLI:

```sh
npm install
npm run setup
npm link --workspace mbremote
```

Run the CLI test suite after making changes:

```sh
npm test
```

The optional PicoRuby firmware integration build requires Git, Ruby with Rake,
GNU Make, CMake, and the Arm GNU Toolchain:

```sh
npm run test:picoruby-firmware --workspace mbremote
```

Before publishing, follow the
[release checklist](packages/mbremote/RELEASING.md).

## Related projects

- [rpremote](https://github.com/ogom/rpremote) applies the same project-first
  concept to Raspberry Pi Pico boards, preparing, building, flashing, and
  controlling custom PicoRuby firmware.

## License

[MIT](packages/mbremote/LICENSE)
