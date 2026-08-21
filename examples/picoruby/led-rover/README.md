# PicoRuby LED rover

[日本語](README.ja.md)

Two micro:bit boards communicate by radio: one is a steering-wheel controller and the other is a NeoPixel rover. The PicoRuby implementation follows the controls, motor drive, failsafe, display feedback, and NeoPixel effects of the MicroPython `examples/led-rover` version.

## Overview

- Tilt a micro:bit controller to steer a two-motor rover.
- Players: one
- Features: display, buttons A/B, radio, accelerometer, pins/PWM, and NeoPixel
- Board: micro:bit V2

## Playing

1. Flash the same program to two micro:bit V2 boards.
2. When `?` appears, press A on the controller and B on the rover.
3. Hold the controller vertically with the LED display facing you and USB at the top.

| Control | Rover motion |
| --- | --- |
| Hold A | Forward |
| Hold B | Reverse |
| Turn right while holding A or B | Steer right |
| Turn left while holding A or B | Steer left |
| Release both or hold both | Stop |

- Steering begins at roughly 5° from center.
- Increasing the angle slows the inside motor, reaching 20% of the outside motor at about 40°.
- The rover stops both motors if commands are missing for 500ms.
- NeoPixels show a rainbow while stopped and direction-specific marching blocks while moving.

## Settings

- Radio: group 23, channel 7, power 6
- Forward/reverse speed: 70%
- NeoPixel: 70 pixels, brightness 20, 20ms frame interval
- Set `STEERING_DIRECTION` in [lib/controller.rb](lib/controller.rb) to `-1` if steering is reversed.

## Rover wiring

| Purpose | micro:bit pins |
| --- | --- |
| Left motor IN1 / IN2 / PWM | P8 / P9 / P13 |
| Right motor IN1 / IN2 / PWM | P14 / P15 / P16 |
| NeoPixel data | P0 |

If a motor rotates in the wrong direction, add `-1` as the fourth argument to its `Motor.new` call in [lib/rover.rb](lib/rover.rb).

Do not power the motors or NeoPixels directly from the micro:bit. Use a suitable external supply, share GND with the micro:bit, and hold the motor driver's STBY input high.

## Flashing

```sh
mbremote run examples/picoruby/led-rover --language ruby --board v2 --all --force
```
