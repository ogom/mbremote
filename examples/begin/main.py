from microbit import Image, display, pin1, sleep
from rgb_led import RgbLed


rgb_led = RgbLed(
    pin=pin1,
    pixel_count=10,
    brightness=20,
    frame_delay_ms=20,
)

display.show(Image.HEART)
sleep(1000)
display.scroll('Hello')

while True:
    rgb_led.update()
    sleep(rgb_led.frame_delay_ms)
