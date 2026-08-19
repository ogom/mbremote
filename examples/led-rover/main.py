from microbit import Image, accelerometer, button_a, button_b, display
from microbit import pin0, pin8, pin9, pin13, pin14, pin15, pin16
from microbit import running_time, sleep
import os
import radio

from dual_motor import DualMotor
from motor import Motor
from rgb_led import RgbLed


RADIO_GROUP = 23
RADIO_CHANNEL = 7
RADIO_POWER = 6

FORWARD_SPEED = 80
BACKWARD_SPEED = 70
STEERING_DEAD_ZONE = 120
STEERING_FULL_SCALE = 850
STEERING_MAX_PERCENT = 60
STEERING_DIRECTION = 1
SEND_INTERVAL_MS = 100
RECEIVE_TIMEOUT_MS = 500
LOOP_INTERVAL_MS = 20

LED_PIXEL_COUNT = 70
LED_BRIGHTNESS = 64
LED_FRAME_DELAY_MS = 20
LED_STOP_RAINBOW_STEP = 4
LED_BLOCK_WIDTH = 10
LED_BLOCK_GAP_WIDTH = 2
LED_BLOCK_STEP = 1
LED_BLOCK_GAP_INTENSITY = 10
LED_FORWARD_PATHS = ((34, 0), (35, 69))
LED_BACKWARD_PATHS = ((0, 34), (69, 35))
LED_RIGHT_PATHS = ((0, 69),)
LED_LEFT_PATHS = ((69, 0),)
LED_FORWARD_MAIN_COLOR = (0, 255, 80)
LED_BACKWARD_MAIN_COLOR = (255, 0, 180)
LED_FORWARD_STRAIGHT_COLOR = (0, 150, 40)
LED_BACKWARD_STRAIGHT_COLOR = (255, 70, 120)
LED_RIGHT_TURN_COLOR = (255, 210, 0)
LED_LEFT_TURN_COLOR = (0, 140, 255)
LED_FORWARD_COLORS = (LED_FORWARD_MAIN_COLOR, LED_FORWARD_STRAIGHT_COLOR)
LED_BACKWARD_COLORS = (LED_BACKWARD_MAIN_COLOR, LED_BACKWARD_STRAIGHT_COLOR)
LED_FORWARD_RIGHT_COLORS = (LED_FORWARD_MAIN_COLOR, LED_RIGHT_TURN_COLOR)
LED_FORWARD_LEFT_COLORS = (LED_FORWARD_MAIN_COLOR, LED_LEFT_TURN_COLOR)
LED_BACKWARD_RIGHT_COLORS = (LED_BACKWARD_MAIN_COLOR, LED_RIGHT_TURN_COLOR)
LED_BACKWARD_LEFT_COLORS = (LED_BACKWARD_MAIN_COLOR, LED_LEFT_TURN_COLOR)

LIGHT_STOP = "stop"
LIGHT_FORWARD = "forward"
LIGHT_BACKWARD = "backward"
LIGHT_FORWARD_RIGHT = "forward_right"
LIGHT_FORWARD_LEFT = "forward_left"
LIGHT_BACKWARD_RIGHT = "backward_right"
LIGHT_BACKWARD_LEFT = "backward_left"


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def wait_for_buttons_released():
    while button_a.is_pressed() or button_b.is_pressed():
        sleep(LOOP_INTERVAL_MS)


def select_role():
    display.show("?")
    while True:
        if button_a.is_pressed():
            display.show("C")
            wait_for_buttons_released()
            return "controller"
        if button_b.is_pressed():
            display.show("R")
            wait_for_buttons_released()
            return "rover"
        sleep(LOOP_INTERVAL_MS)


def read_controller_speeds():
    forward = button_a.is_pressed()
    backward = button_b.is_pressed()
    if forward == backward:
        return 0, 0

    throttle = FORWARD_SPEED if forward else -BACKWARD_SPEED
    steering_x = accelerometer.get_x() * STEERING_DIRECTION
    if abs(steering_x) <= STEERING_DEAD_ZONE:
        steering = 0
    else:
        steering = (
            (abs(steering_x) - STEERING_DEAD_ZONE)
            * STEERING_MAX_PERCENT
            // (STEERING_FULL_SCALE - STEERING_DEAD_ZONE)
        )
        steering = clamp(
            steering,
            0,
            STEERING_MAX_PERCENT,
        )
        if steering_x < 0:
            steering = -steering

    if steering > 0:
        return throttle, throttle * (100 - steering) // 100
    if steering < 0:
        return throttle * (100 + steering) // 100, throttle
    return throttle, throttle


def encode_speeds(speeds):
    return "{}|{}".format(speeds[0], speeds[1])


def decode_speeds(message):
    parts = message.split("|")
    if len(parts) != 2:
        return None
    try:
        return (
            clamp(int(parts[0]), -100, 100),
            clamp(int(parts[1]), -100, 100),
        )
    except ValueError:
        return None


def rover_light_mode(speeds):
    left_speed, right_speed = speeds
    if speeds == (0, 0):
        return LIGHT_STOP

    backward = left_speed < 0 or right_speed < 0
    left_power = abs(left_speed)
    right_power = abs(right_speed)
    if left_power > right_power:
        return LIGHT_BACKWARD_RIGHT if backward else LIGHT_FORWARD_RIGHT
    if right_power > left_power:
        return LIGHT_BACKWARD_LEFT if backward else LIGHT_FORWARD_LEFT
    if backward:
        return LIGHT_BACKWARD
    return LIGHT_FORWARD


def update_rover_lights(rgb_led, mode):
    if mode == LIGHT_STOP:
        rgb_led.update(phase_step=LED_STOP_RAINBOW_STEP)
        return

    if mode == LIGHT_FORWARD:
        paths = LED_FORWARD_PATHS
        colors = LED_FORWARD_COLORS
    elif mode == LIGHT_BACKWARD:
        paths = LED_BACKWARD_PATHS
        colors = LED_BACKWARD_COLORS
    elif mode == LIGHT_FORWARD_RIGHT:
        paths = LED_RIGHT_PATHS
        colors = LED_FORWARD_RIGHT_COLORS
    elif mode == LIGHT_FORWARD_LEFT:
        paths = LED_LEFT_PATHS
        colors = LED_FORWARD_LEFT_COLORS
    elif mode == LIGHT_BACKWARD_RIGHT:
        paths = LED_LEFT_PATHS
        colors = LED_BACKWARD_RIGHT_COLORS
    else:
        paths = LED_RIGHT_PATHS
        colors = LED_BACKWARD_LEFT_COLORS

    rgb_led.block_march_paths(
        paths,
        colors[0],
        colors[1],
        block_width=LED_BLOCK_WIDTH,
        gap_width=LED_BLOCK_GAP_WIDTH,
        step=LED_BLOCK_STEP,
        gap_intensity=LED_BLOCK_GAP_INTENSITY,
    )


def update_motion_image(mode):
    if mode == LIGHT_FORWARD:
        image = Image.ARROW_N
    elif mode == LIGHT_BACKWARD:
        image = Image.ARROW_S
    elif mode == LIGHT_FORWARD_RIGHT:
        image = Image.ARROW_NE
    elif mode == LIGHT_FORWARD_LEFT:
        image = Image.ARROW_NW
    elif mode == LIGHT_BACKWARD_RIGHT:
        image = Image.ARROW_SE
    elif mode == LIGHT_BACKWARD_LEFT:
        image = Image.ARROW_SW
    else:
        image = Image.SQUARE_SMALL
    display.show(image)


def run_controller():
    speeds = (0, 0)
    last_sent = -SEND_INTERVAL_MS
    display.show(Image.SQUARE_SMALL)

    try:
        while True:
            next_speeds = read_controller_speeds()
            now = running_time()
            if next_speeds != speeds:
                speeds = next_speeds
                update_motion_image(rover_light_mode(speeds))
                radio.send(encode_speeds(speeds))
                last_sent = now
            elif now - last_sent >= SEND_INTERVAL_MS:
                radio.send(encode_speeds(speeds))
                last_sent = now
            sleep(LOOP_INTERVAL_MS)
    finally:
        for _ in range(3):
            radio.send(encode_speeds((0, 0)))
            sleep(20)
        radio.off()


def run_rover():
    rover_display_enabled = "nRF52833" in os.uname().machine
    if not rover_display_enabled:
        # P9をモーター制御に専有するため、ローバーではLED表示を停止する。
        display.off()
    left_motor = Motor(pin8, pin9, pin13)
    right_motor = Motor(pin14, pin15, pin16)
    dual_motor = DualMotor(left_motor, right_motor)
    rgb_led = RgbLed(
        pin=pin0,
        pixel_count=LED_PIXEL_COUNT,
        brightness=LED_BRIGHTNESS,
        frame_delay_ms=LED_FRAME_DELAY_MS,
        phase_step=1,
    )
    speeds = (0, 0)
    last_received = running_time()
    last_light_update = -LED_FRAME_DELAY_MS
    light_mode = None

    try:
        while True:
            latest_speeds = None
            message = radio.receive()
            while message is not None:
                decoded = decode_speeds(message)
                if decoded is not None:
                    latest_speeds = decoded
                message = radio.receive()

            now = running_time()
            if latest_speeds is not None:
                last_received = now
                if latest_speeds != speeds:
                    speeds = latest_speeds
                    dual_motor.drive(speeds[0], speeds[1])
            elif speeds != (0, 0) and now - last_received >= RECEIVE_TIMEOUT_MS:
                speeds = (0, 0)
                dual_motor.stop()

            next_light_mode = rover_light_mode(speeds)
            mode_changed = next_light_mode != light_mode
            if mode_changed:
                light_mode = next_light_mode
                rgb_led.reset()
                if rover_display_enabled:
                    update_motion_image(light_mode)

            if (
                mode_changed
                or now - last_light_update >= rgb_led.frame_delay_ms
            ):
                update_rover_lights(rgb_led, light_mode)
                last_light_update = now

            sleep(LOOP_INTERVAL_MS)
    finally:
        dual_motor.stop()
        rgb_led.clear()
        if rover_display_enabled:
            display.show(Image.SQUARE_SMALL)
        radio.off()


role = select_role()
radio.config(
    group=RADIO_GROUP,
    channel=RADIO_CHANNEL,
    power=RADIO_POWER,
    queue=8,
    length=16,
)
radio.on()

if role == "controller":
    run_controller()
else:
    run_rover()
