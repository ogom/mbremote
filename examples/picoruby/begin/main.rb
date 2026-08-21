display = Microbit::Display.new
rgb_led = RGBLed.new(
  pin: 0,
  pixel_count: 10,
  brightness: 20,
  frame_delay_ms: 20
)

display.show(Microbit::Image::HEART)
sleep_ms(1000)
display.scroll('Hello')

loop do
  rgb_led.update
  sleep_ms(rgb_led.frame_delay_ms)
end
