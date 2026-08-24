# PicoRuby micro:bit API

This example uses the micro:bit V2 LED display, A/B buttons, touch logo, and accelerometer from FemtoRuby.

```sh
mbremote run examples/picoruby/microbit --language picoruby --board v2 --force
```

Button A shows a left arrow, button B shows a right arrow, and touching the logo shows a diamond. Accelerometer XYZ values in milli-g are written to the serial monitor.

Available APIs:

```ruby
sleep_ms(milliseconds)
Microbit.running_time # milliseconds since startup
display = Microbit::Display.new
button = Microbit::Button.new
logo = Microbit::Logo.new
accelerometer = Microbit::Accelerometer.new
pixels = Microbit::NeoPixel.new
radio = Microbit::Radio.new
digital_output = Microbit::DigitalPin.new(0, Microbit::DigitalPin::OUT)
digital_input = Microbit::DigitalPin.new(1, Microbit::DigitalPin::IN)
analog_output = Microbit::AnalogPin.new(2, Microbit::AnalogPin::OUT)
analog_input = Microbit::AnalogPin.new(3, Microbit::AnalogPin::IN)
analog_read_write = Microbit::AnalogReadWritePin.new(4)
display.clear
display.show(pattern) # five rows of five digits, colon-separated
display.show(Microbit::Image::HEART)
display.scroll(text)
display.set_pixel(x, y, brightness) # x/y: 0..4, brightness: 0..9
display.get_pixel(x, y)
button.a_pressed?
button.b_pressed?
button.a_was_pressed?
button.b_was_pressed?
logo.touched?
logo.was_touched?
accelerometer.x
accelerometer.y
accelerometer.z
accelerometer.sample # simultaneously captured [x, y, z]
digital_output.write(value)  # value: 0 or 1
digital_input.read           # 0 or 1
analog_output.write(value)   # value: 0..1023
analog_input.read            # 0..1023
analog_output.period = millis # 1..262 ms
analog_read_write.write(value)
analog_read_write.read
analog_read_write.period = millis
pixels.configure(pin, count)      # up to 256 pixels
pixels.set_pixel(index, r, g, b) # RGB: 0..255
pixels.fill(r, g, b)
pixels.clear
pixels.show
radio.enable(group)                 # channel=7, power=6
radio.enable(group, channel, power) # group: 0..255, channel: 0..83, power: 0..7
radio.send(message) # String: up to 29 bytes
radio.receive       # String, or nil when no packet is queued
radio.disable
```

Standard images are available as constants such as `Microbit::Image::HEART`, `YES`, `NO`, `HAPPY`, `SAD`, `ARROW_N`, `DIAMOND`, and `SQUARE_SMALL`.

See [led-rover](../led-rover/README.md) for radio, pin/PWM motor control, and NeoPixel output.
