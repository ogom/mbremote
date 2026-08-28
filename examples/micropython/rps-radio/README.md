# Radio Rock-Paper-Scissors

[日本語](README.ja.md)

Two players use micro:bits for radio rock-paper-scissors. Flash the same [main.py](main.py) to both boards.

## Overview

- Select a hand and play at the same time.
- Players: 2
- Features: LED, A and B buttons, and radio
- Boards: micro:bit V1 / V2

## How to play

### Setup

1. Flash the same program to both micro:bits.
2. Each player holds one board.
3. Press A to select a hand, then press B to confirm it.

### Controls

| Control | Action |
| --- | --- |
| A button | Select rock → paper → scissors |
| B button | Confirm and send the hand to the opponent |
| A+B buttons | Reset the current game |

### Rules

- The result appears after both players have confirmed their hands.
- 😀 means win, 😢 means loss, and horizontal lines mean draw.
- A new game starts three seconds after the result.

## Configuration

- The default radio group is 42 and the channel is 7.
- To play with multiple pairs, set a different `RADIO_GROUP` for each pair and flash both boards again.
- Hands are resent until their ACK is received.

## Development

Connect both boards by USB, then run this command from the repository root:

```sh
mbremote run examples/micropython/rps-radio --all
```
