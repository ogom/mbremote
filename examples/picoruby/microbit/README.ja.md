# PicoRuby micro:bit API

FemtoRubyからmicro:bit V2のLED、A/Bボタン、ロゴタッチ、加速度センサーを使用するサンプルです。

```sh
mbremote run examples/picoruby/microbit --language picoruby --board v2 --force
```

Aボタンを押すと左矢印、Bボタンを押すと右矢印、ロゴをタッチするとひし形を表示します。加速度のXYZ値（milli-g）はシリアルモニターへ出力されます。

使用できるAPI:

```ruby
sleep_ms(milliseconds)
Microbit.running_time # 起動からのミリ秒
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
display.show(pattern) # 5文字×5行、行はコロンで区切る
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
accelerometer.sample # 同時取得した [x, y, z]
digital_output.write(value)  # value: 0 または 1
digital_input.read           # 0 または 1
analog_output.write(value)   # value: 0..1023
analog_input.read            # 0..1023
analog_output.period = millis # 1..262ms
analog_read_write.write(value)
analog_read_write.read
analog_read_write.period = millis
pixels.configure(pin, count)      # 最大256灯
pixels.set_pixel(index, r, g, b) # RGB: 0..255
pixels.fill(r, g, b)
pixels.clear
pixels.show
radio.enable(group)                 # channel=7、power=6
radio.enable(group, channel, power) # group: 0..255、channel: 0..83、power: 0..7
radio.send(message) # String: 最大29バイト
radio.receive       # String、未受信時はnil
radio.disable
```

標準Imageは `Microbit::Image::HEART`、`YES`、`NO`、`HAPPY`、`SAD`、`ARROW_N`、`DIAMOND`、`SQUARE_SMALL` などの定数として使用できます。

無線通信、Pin/PWMによるモーター制御、NeoPixelの点灯は [led-rover](../led-rover/README.ja.md) を参照してください。
