# PicoRuby magic-circle rock-paper-scissors

[日本語](README.ja.md)

This is a one-player practice and two-player rock-paper-scissors game that builds magic circles through motion recognition. The PicoRuby implementation follows the game rules, radio synchronization, outcome rules, and NeoPixel effects of the MicroPython `examples/magic-circle` version.

## Playing

Connect the data input of the 241-pixel NeoPixel installation to P16. Use an adequate external power supply and share GND with the micro:bit.

| Control | Action |
| --- | --- |
| Button A | Select rock, paper, or scissors; Ancient is also available in practice |
| Button B | Confirm a hand in battle or start construction in practice |
| A+B | Reset the current practice or battle and synchronize a rematch |
| Logo touch | Switch between practice (`1`) and battle (`2`) |
| `down` | Light the center and begin construction |
| `up` | Clear the pixels and reset the construction sequence |

In battle, both players confirm their hands with button B before construction begins. After completing a magic circle, the board waits up to ten seconds for the opponent. If both players complete in time, their hands and completion times are exchanged with acknowledgements, then normal rock-paper-scissors rules decide the result. If the opponent does not complete in time, the completed side wins.

- Win: happy face and green/gold expansion, followed by the original magic circle
- Loss: sad face and red contraction
- Draw: horizontal lines and alternating blue/white rings, followed by the original magic circle
- A+B: synchronize the next round and play again

## Magic-circle motions

| Selection | Magic circle | Sequence |
| --- | --- | --- |
| Rock | DELPHINIUM | `down` → `pose` → `side` → `circle` |
| Paper | GERBERA | `down` → `pose` → `side` → `circle` |
| Scissors | CLOVER | `down` → `pose` → `side` → `circle` |
| Ancient (practice only) | ANCIENT | `down` → `pose` → `side` → `circle` → `side` → `circle` |

Make each motion large and deliberate over roughly 0.6–0.8 seconds. Construction always starts with `down`.

### Recognition and retry

- After `down`, if the next motion is not recognized within two seconds, the pixels clear and the game returns to waiting for `down`.
- Turning the board `up` clears the pixels and restarts the sequence from `down` at any time.
- Only the motion required by the current step is evaluated. For example, a temporary `side` classification while waiting for `pose` does not reset construction.
- The next learned-motion samples are collected while the LED action animation is playing. This supports `pose → side`, `side → circle`, and the Ancient `circle → side` transition without waiting for the animation to end.
- Samples collected during an action animation are evaluated only after it completes, preventing the tail of the previous motion from being recognized immediately as the next one.

### LED effects

Each magic-circle NeoPixel effect is implemented in an attribute-specific class under `lib/magic_circles`. `MagicCircleLights` provides common drawing operations and `MagicCircleLayout` defines the LED layout. `Game` coordinates gameplay, `Builder` handles motion-based construction, `Judge` decides outcomes, and `Protocol` owns the radio message format.

## Machine learning

`pose`, `side`, and `circle` use a PicoRuby-local neural network. `up` and `down` are detected from board orientation.

| Item | Detail |
| --- | --- |
| Input | 24 features calculated from XYZ acceleration |
| Network | 16-unit hidden layer with five outputs: `circle`, `pose`, `side`, `up`, and `down` |
| Training data | `data/data-samples.json` |
| Trained model | `data/model.json` |
| Confidence thresholds | 0.80 for `pose`, `side`, and `circle`; 0.90 for `up` and `down` in `scripts/model-config.mjs` |

ML4F converts the learned weights to Cortex-M4F machine code linked into the firmware. `lib/ml_model.rb` contains only label definitions and the native API call.

### Retraining, generation, and verification

After editing the training data, retrain, regenerate, and verify the firmware model:

```sh
npm run train:ml4f:magic-circle
node examples/picoruby/magic-circle/scripts/generate-ml-model.mjs
npm run generate:ml4f:magic-circle
npm run verify:ml4f:magic-circle
```

If only `data/model.json` changes, regenerate the Ruby metadata and firmware model:

```sh
node examples/picoruby/magic-circle/scripts/generate-ml-model.mjs
npm run generate:ml4f:magic-circle
```

The following command compares the embedded machine-code model with the PicoRuby-local model across 50 training recordings and 40 runtime partial windows. It also reproduces the single-precision feature calculations used on Cortex-M4F, and fails if a probability, selected label, or confidence decision differs.

```sh
npm run verify:ml4f:magic-circle
```

## Performance optimizations

The implementation uses the following techniques to minimize the delay between a motion, its LED response, and recognition of the next motion.

- **Cortex-M4F inference**: Feature extraction and neural-network inference run in C/ML4F rather than Ruby. The generated machine-code model takes about 0.05 ms at 64 MHz.
- **Synchronized XYZ sampling**: A single `sample` call retrieves all three acceleration axes, avoiding per-axis waits.
- **Frequent recognition**: The game loop runs every 20 ms and learned motions are evaluated every three samples. `pose` uses 35 samples, `side` 30, and `circle` 50.
- **Immediate first LED**: The first NeoPixel lights as soon as the motion is recognized. The rest of the action animation advances incrementally in the game loop without blocking it.
- **Collect during effects**: The next motion's acceleration samples are collected during the `pose`, `side`, and `circle` LED effects. Including Ancient's `circle → side`, this allows recognition soon after the effect completes.

## Flashing

One board for practice:

```sh
mbremote run examples/picoruby/magic-circle --language ruby --board v2 --force
```

The same program on two boards:

```sh
mbremote run examples/picoruby/magic-circle --language ruby --board v2 --all --force
```

Radio uses group 43, channel 7, and power 6. The serial log reports state changes, recognized motions, radio traffic, completion times, and outcomes.
