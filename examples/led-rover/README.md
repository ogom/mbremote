# LED Rover

[日本語](README.ja.md)

Connect two micro:bits by radio: use one as a steering-wheel controller and the other as an LED-equipped rover.

## Overview

- Tilt the controller to drive a rover with DC motors.
- Players: 1
- Features: LED, A and B buttons, radio, accelerometer, and NeoPixel
- Boards: micro:bit V1 / V2 (the rover's LED matrix display requires V2)

## How to play

### Setup

1. Flash the same program to both micro:bits.
2. When `?` appears at startup, press A on the controller and B on the rover.
3. Hold the controller upright with its LED display facing you and the USB connector at the top.

### Controls

| Control | Rover action |
| --- | --- |
| Press A | Drive forward |
| Press B | Drive backward |
| Hold A or B and turn right | Turn right |
| Hold A or B and turn left | Turn left |
| Release both buttons, or press both | Stop |

### Behavior

- Steering begins when the controller is tilted about 5° from center.
- As the tilt increases, the inner motor slows down; at about 40°, the outer motor runs at 20%.
- The rover stops automatically if it receives no control signal for 500 ms.

## Configuration

- Radio uses group 23 and channel 7.
- Adjust forward and backward speed with `FORWARD_SPEED` and `BACKWARD_SPEED`.
- Adjust steering with `STEERING_DEAD_ZONE`, `STEERING_FULL_SCALE`, and `STEERING_MAX_PERCENT`. Set `STEERING_DIRECTION` to `-1` to reverse left and right.
- Adjust LED brightness with `LED_BRIGHTNESS`.

### Wiring

| Motor | Direction pins | PWM |
| --- | --- | --- |
| A (left) | P8, P9 | P13 |
| B (right) | P14, P15 | P16 |

Connect NeoPixel data input to P0. Do not power the NeoPixel or motors directly from the micro:bit; use a sufficiently capable external power supply and share GND with the micro:bit. Connect STBY to 3V or pull it high on the motor-driver side.

## Development

Connect both boards by USB, then run this command from the repository root:

```sh
mbremote run examples/led-rover --all
```
