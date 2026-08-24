# Magic-Circle Rock-Paper-Scissors

[日本語](README.ja.md)

Build magic circles with CreateAI motion recognition in this rock-paper-scissors game for solo practice or two-player battles. For a two-player battle, flash the same [main.py](main.py) to both micro:bits.

## Overview

- Complete a magic circle through recognized motions.
- Players: 1 or 2
- Features: LED, A and B buttons, logo touch, radio, accelerometer, and NeoPixel
- Boards: micro:bit V2

## How to play

### Setup

1. Flash the same program to one micro:bit for solo practice, or to two for a battle.
2. Touch the logo to select a mode: `1` for solo practice or `2` for a two-player battle.
3. Hold the micro:bit in your right hand and follow the display prompts.

### Controls

| Control | Action |
| --- | --- |
| A button | Select rock → paper → scissors |
| B button | Confirm a hand in a battle, or begin magic-circle construction in solo practice |
| A+B buttons | Reset the current practice or battle, then play again |
| Touch the logo | Switch between solo practice and two-player battle |
| `down` motion | Light the center and start magic-circle construction |
| `up` motion | Turn off the lights and reset construction |

### Rules

- In solo practice, completing the selected magic circle displays 😀.
- In a battle, both players select a hand before building their magic circles. 😀 with an expanding green-and-gold animation means win, followed by one replay of the selected magic circle's completion animation. 😢 with a contracting red animation means loss, and horizontal lines with blue-and-white rings mean draw.
- When one magic circle is completed, the game waits five seconds for the opponent. If the opponent does not finish within five seconds, the player who finished first wins.
- If both players finish within five seconds, normal rock-paper-scissors rules determine the winner. Matching hands are a draw.
- The result stays on screen; press A+B to play again.
- An incorrect motion order displays `NO` and restarts construction from the beginning.

### Magic-circle motions

`data-samples.json` contains 50 CreateAI-recorded acceleration samples for each of `pose`, `side`, `circle`, `up`, and `down`. The model classifies roughly one second of motion (about 50 samples at 20 ms intervals), so make each motion large and deliberate over about one second.

1. `down`: Begin with the `down` motion to light the center.
2. `pose`: Hold the board vertically, swing it forward until horizontal, then stop.
3. `side`: Hold it horizontally, swing from left to right, then stop.
4. `circle`: Hold it horizontally, draw a right-to-left semicircle, then stop.

Wait for the display image to change before making the next motion. If a motion is not recognized, stop once and repeat the same large trajectory instead of making many small movements.

| Selection | Magic circle | Construction order |
| --- | --- | --- |
| Rock | `Delphinium` | `down` → `pose` → `side` → `circle` |
| Paper | `Gerbera` | `down` → `pose` → `side` → `circle` |
| Scissors | `Clover` | `down` → `pose` → `side` → `circle` |
| Ancient (SKULL, solo practice only) | `Ancient` | `down` → `pose` → `side` → `circle` → `side` → `circle` |

## Configuration

- The default radio group is 43 and the channel is 7. To play with multiple pairs, set a different `RADIO_GROUP` for each pair and flash both boards again.
- Hand selections and construction times are resent until their ACK is received.
- Connect NeoPixel data input to P16. Use a sufficiently capable external power supply and share GND with the micro:bit.
- Model weights are stored in `INPUT_WEIGHTS`, `HIDDEN_BIAS`, `OUTPUT_WEIGHTS`, and `OUTPUT_BIAS`; tune per-motion thresholds with `REQUIRED_CONFIDENCE`.
- While waiting for `side`, an additional detector absorbs accelerometer variation between micro:bits. Tune x/y motion and z-axis stability with `SIDE_MIN_X_STDDEV`, `SIDE_MIN_Y_STDDEV`, `SIDE_MAX_Z_STDDEV`, and `SIDE_MAX_Z_MEAN`.

## Development

Run commands from the repository root.

### Generate custom firmware

Run this before the first flash and after changing `ml_model.py` or `rgb_led.py`:

```sh
npm run build:firmware:magic-circle
```

The model from `data-samples.json` and `rgb_led.py` are frozen into the custom firmware, so they do not consume the 20 KB file system.

### Debug with one micro:bit

Connect one micro:bit and run without `--all` to open the serial monitor after flashing. It displays debug logs for state changes, motion recognition and confidence, magic-circle completion time, radio traffic, and game results.

```sh
mbremote run examples/magic-circle/main.py --no-shared --board v2 --base-firmware firmware/microbit-micropython-v2-magic-circle.hex
```

Exit the monitor with `Ctrl-]`. To disable logging, set `DEBUG` to `False` in [main.py](main.py).

### Flash the program

For the first installation, use `--force` to perform a full flash of the custom firmware and `main.py` to two boards.

```sh
mbremote run examples/magic-circle/main.py --config config/setting.json --force
```

For later flashes without firmware changes, omit `--force` and flash only `main.py`.

```sh
mbremote run examples/magic-circle/main.py --config config/setting.json
```

Without a configuration file, provide the options directly:

```sh
mbremote run examples/magic-circle/main.py --all --no-shared --board v2 --base-firmware firmware/microbit-micropython-v2-magic-circle.hex --force
```

### Configure `setting.json`

mbremote accepts a configuration file through `--config FILE`. Set `--all`, `--no-shared`, `--board v2`, and `--base-firmware` as follows:

```json
{
  "all": true,
  "shared": false,
  "board": "v2",
  "base_firmware": "firmware/microbit-micropython-v2-magic-circle.hex"
}
```
