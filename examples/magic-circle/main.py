import gc
import radio
import random

from microbit import Image, accelerometer, button_a, button_b, display, pin_logo
from microbit import running_time, sleep

from ml_model import LABELS, extract_features, is_confident, predict
gc.collect()
from rgb_led import (
    ANCIENT,
    CLOVER,
    DELPHINIUM,
    GERBERA,
    clear_all,
    gerbera_cross_horizontal,
    gerbera_cross_vertical,
    gerbera_fill_point,
    gerbera_fill_wipe,
    run_effect,
)
gc.collect()


RADIO_GROUP = 43
RADIO_CHANNEL = 7
RADIO_QUEUE_LENGTH = 8
CAST_WAIT_MS = 5000
RESEND_MIN_MS = 250
RESEND_MAX_MS = 450
DEBUG = True
SIDE_MIN_X_STDDEV = 0.25
SIDE_MIN_Y_STDDEV = 0.25
SIDE_MAX_Z_STDDEV = 0.45
SIDE_MAX_Z_MEAN = -0.55

ROCK = 0
PAPER = 1
SCISSORS = 2
SKULL = 3

IMAGE_ROCK = Image(
    "00900:"
    "09990:"
    "99099:"
    "99999:"
    "09990"
)

IMAGE_PAPER = Image(
    "99900:"
    "90090:"
    "90009:"
    "90009:"
    "99999"
)

IMAGE_SCISSORS = Image(
    "90009:"
    "09090:"
    "00900:"
    "99099:"
    "99099"
)

IMAGE_DRAW = Image(
    "00000:"
    "99999:"
    "00000:"
    "99999:"
    "00000"
)

HANDS = (IMAGE_ROCK, IMAGE_PAPER, IMAGE_SCISSORS)
PRACTICE_HANDS = HANDS + (Image.SKULL,)
HAND_NAMES = ("rock", "paper", "scissors", "skull")
MAGICS = (DELPHINIUM, GERBERA, CLOVER, ANCIENT)
BATTLE_SEQUENCE = ("pose", "side", "circle")
ANCIENT_SEQUENCE = ("pose", "side", "circle", "side", "circle")

radio.config(
    group=RADIO_GROUP,
    channel=RADIO_CHANNEL,
    power=6,
    queue=RADIO_QUEUE_LENGTH,
    length=32,
)
radio.on()

state = 0
round_no = 0
my_choice = ROCK
opponent_choice = None
practice_mode = False
logo_touching = False
ready_acked = False
cast_acked = False
my_time = None
opponent_time = None
my_wait_until = 0
opponent_wait_until = 0
last_send_time = 0
next_send_interval = 300
round_started = 0
spell_step = 0
current_action = None
last_prediction = running_time()
x_values = []
y_values = []
z_values = []


def debug(message):
    if DEBUG:
        print("[magic-circle]", message)


def build_sequence():
    return (
        ANCIENT_SEQUENCE
        if practice_mode and my_choice == SKULL
        else BATTLE_SEQUENCE
    )


def expected_action():
    sequence = build_sequence()
    return sequence[spell_step] if spell_step < len(sequence) else None


def is_side_motion(feature_values):
    return (
        feature_values[9] >= SIDE_MIN_X_STDDEV
        and feature_values[10] >= SIDE_MIN_Y_STDDEV
        and feature_values[11] <= SIDE_MAX_Z_STDDEV
        and feature_values[5] <= SIDE_MAX_Z_MEAN
    )


def send_ready():
    radio.send("R|{}|{}".format(round_no, my_choice))


def send_cast():
    radio.send("C|{}|{}|{}".format(round_no, my_choice, my_time))


def receive_message():
    global opponent_choice, opponent_time, opponent_wait_until
    global ready_acked, cast_acked
    message = radio.receive()
    if message is None or practice_mode:
        return False
    if message == "X":
        debug("radio reset received")
        reset_round()
        return True
    try:
        parts = message.split("|")
        received_round = int(parts[1])
        if parts[0] == "R" and len(parts) == 3:
            choice = int(parts[2])
            if received_round == round_no and ROCK <= choice <= SCISSORS:
                first_ready = opponent_choice is None
                opponent_choice = choice
                if first_ready:
                    debug("opponent ready choice={}".format(HAND_NAMES[choice]))
                radio.send("A|{}".format(round_no))
            elif received_round == round_no - 1:
                radio.send("A|{}".format(received_round))
        elif parts[0] == "A" and len(parts) == 2:
            if received_round == round_no:
                if not ready_acked:
                    debug("ready acknowledged")
                ready_acked = True
        elif parts[0] == "C" and len(parts) == 4:
            choice = int(parts[2])
            elapsed = int(parts[3])
            if received_round == round_no and ROCK <= choice <= SCISSORS and elapsed >= 0:
                opponent_choice = choice
                if opponent_time is None:
                    opponent_wait_until = running_time() + CAST_WAIT_MS
                    debug(
                        "opponent cast choice={} elapsed={}ms".format(
                            HAND_NAMES[choice], elapsed
                        )
                    )
                opponent_time = elapsed
                radio.send("K|{}".format(round_no))
            elif received_round == round_no - 1:
                radio.send("K|{}".format(received_round))
        elif parts[0] == "K" and len(parts) == 2:
            if received_round == round_no:
                if not cast_acked:
                    debug("cast acknowledged")
                cast_acked = True
    except (ValueError, IndexError):
        pass
    return True


def reset_samples():
    global current_action, last_prediction
    x_values.clear()
    y_values.clear()
    z_values.clear()
    current_action = None
    last_prediction = running_time()


def show_selection():
    choices = PRACTICE_HANDS if practice_mode else HANDS
    display.show(choices[my_choice])


def begin_build():
    global state, round_started, spell_step
    state = 2
    spell_step = 0
    reset_samples()
    clear_all()
    display.show(Image.DIAMOND_SMALL)
    round_started = running_time()
    debug(
        "build start mode={} choice={}".format(
            "practice" if practice_mode else "battle",
            HAND_NAMES[my_choice],
        )
    )


def finish_cast():
    global state, my_time, my_wait_until
    global last_send_time, next_send_interval
    finished_at = running_time()
    my_time = finished_at - round_started
    my_wait_until = finished_at + CAST_WAIT_MS
    debug("cast complete choice={} elapsed={}ms".format(HAND_NAMES[my_choice], my_time))
    display.show(Image.TARGET)
    if not practice_mode:
        state = 3
        send_cast()
        last_send_time = running_time()
        next_send_interval = random.randint(RESEND_MIN_MS, RESEND_MAX_MS)
    run_effect(MAGICS[my_choice])
    gc.collect()
    if practice_mode:
        display.show(Image.HAPPY)
        state = 4
        debug("result=complete")


def incorrect_order():
    global spell_step
    spell_step = 0
    display.show(Image.NO)


def handle_action(action):
    global spell_step
    if action == "down":
        debug("action=down build reset")
        gerbera_fill_point()
        spell_step = 0
        display.show(Image.COW)
    elif action == "up":
        debug("action=up build reset")
        clear_all()
        spell_step = 0
        display.show(Image.HOUSE)
    else:
        sequence = build_sequence()
        if spell_step >= len(sequence) or action != sequence[spell_step]:
            debug(
                "incorrect action={} expected={} step={}".format(
                    action,
                    sequence[spell_step] if spell_step < len(sequence) else "none",
                    spell_step + 1,
                )
            )
            incorrect_order()
            return
        debug("action={} step={}/{}".format(action, spell_step + 1, len(sequence)))
        if action == "pose":
            gerbera_cross_vertical()
            display.show(Image.SWORD)
        elif action == "side":
            gerbera_cross_horizontal()
            display.show(Image.ASLEEP)
        elif action == "circle":
            gerbera_fill_wipe()
            display.show(Image.DIAMOND)
        spell_step += 1
        if spell_step == len(sequence):
            finish_cast()


def show_outcome(result):
    global state
    display.show(Image.HAPPY if result > 0 else Image.SAD if result < 0 else IMAGE_DRAW)
    state = 4
    debug("result={}".format("win" if result > 0 else "lose" if result < 0 else "draw"))


def show_result():
    time_difference = my_time - opponent_time
    debug(
        "judge mine={} opponent={} my_time={}ms opponent_time={}ms".format(
            HAND_NAMES[my_choice],
            HAND_NAMES[opponent_choice],
            my_time,
            opponent_time,
        )
    )
    if abs(time_difference) > CAST_WAIT_MS:
        result = 1 if time_difference < 0 else -1
    elif my_choice == opponent_choice:
        result = 0
    elif (
        (my_choice == ROCK and opponent_choice == SCISSORS)
        or (my_choice == SCISSORS and opponent_choice == PAPER)
        or (my_choice == PAPER and opponent_choice == ROCK)
    ):
        result = 1
    else:
        result = -1
    show_outcome(result)


def reset_round():
    global state, round_no, my_choice, opponent_choice
    global ready_acked, cast_acked, my_time, opponent_time
    global my_wait_until, opponent_wait_until
    global last_send_time, next_send_interval
    if not practice_mode:
        round_no += 1
    state = 0
    my_choice = ROCK
    opponent_choice = None
    ready_acked = False
    cast_acked = False
    my_time = None
    opponent_time = None
    my_wait_until = 0
    opponent_wait_until = 0
    last_send_time = 0
    next_send_interval = random.randint(RESEND_MIN_MS, RESEND_MAX_MS)
    clear_all()
    show_selection()
    debug("round reset round={}".format(round_no))


clear_all()
show_selection()
debug("start mode=battle choice=rock")

while True:
    loop_started = running_time()
    for _ in range(RADIO_QUEUE_LENGTH):
        if not receive_message():
            break
    now = running_time()

    logo_touched = pin_logo.is_touched()
    if state == 0 and logo_touched and not logo_touching:
        practice_mode = not practice_mode
        if not practice_mode and my_choice == SKULL:
            my_choice = ROCK
        debug("mode={}".format("practice" if practice_mode else "battle"))
        display.show("1" if practice_mode else "2")
        sleep(500)
        show_selection()
    logo_touching = logo_touched

    if button_a.is_pressed() and button_b.is_pressed():
        if not practice_mode:
            radio.send("X")
        reset_round()
        while button_a.is_pressed() or button_b.is_pressed():
            sleep(20)
        button_a.was_pressed()
        button_b.was_pressed()
        continue

    if state == 0:
        if button_a.was_pressed():
            choices = PRACTICE_HANDS if practice_mode else HANDS
            my_choice = (my_choice + 1) % len(choices)
            display.show(choices[my_choice])
            debug("choice={}".format(HAND_NAMES[my_choice]))
        if button_b.was_pressed():
            if practice_mode:
                begin_build()
            else:
                state = 1
                display.show(Image.YES)
                debug("ready round={} choice={}".format(round_no, HAND_NAMES[my_choice]))
                send_ready()
                last_send_time = now
                next_send_interval = random.randint(RESEND_MIN_MS, RESEND_MAX_MS)
    elif state == 1:
        if not ready_acked and now - last_send_time >= next_send_interval:
            send_ready()
            last_send_time = now
            next_send_interval = random.randint(RESEND_MIN_MS, RESEND_MAX_MS)
        if ready_acked and opponent_choice is not None:
            begin_build()

    elif state == 2:
        x, y, z = accelerometer.get_values()
        x_values.append(x / 1000)
        y_values.append(y / 1000)
        z_values.append(z / 1000)
        if len(x_values) > 50:
            x_values.pop(0)
            y_values.pop(0)
            z_values.pop(0)
        if len(x_values) == 50 and now - last_prediction >= 250:
            feature_values = extract_features(x_values, y_values, z_values)
            action_index, confidence = predict(feature_values)
            predicted_action = LABELS[action_index]
            prediction_is_confident = is_confident(
                action_index, confidence, feature_values
            )
            if expected_action() == "side" and is_side_motion(feature_values):
                action = "side"
                if predicted_action != "side" or not prediction_is_confident:
                    debug(
                        "side fallback prediction={} confidence={} "
                        "std=({},{},{}) mean_z={}".format(
                            predicted_action,
                            confidence,
                            feature_values[9],
                            feature_values[10],
                            feature_values[11],
                            feature_values[5],
                        )
                    )
            else:
                action = predicted_action if prediction_is_confident else "unknown"
            del feature_values
            gc.collect()
            if action != current_action:
                current_action = action
                debug("prediction={} confidence={}".format(action, confidence))
                if action != "unknown":
                    handle_action(action)
                    reset_samples()
            last_prediction = running_time()
        if (
            state == 2
            and opponent_time is not None
            and running_time() >= opponent_wait_until
        ):
            debug("timeout before own cast")
            show_outcome(-1)

    elif state == 3:
        if not cast_acked and now - last_send_time >= next_send_interval:
            send_cast()
            last_send_time = now
            next_send_interval = random.randint(RESEND_MIN_MS, RESEND_MAX_MS)
        if cast_acked and opponent_time is not None:
            show_result()
        elif opponent_time is None and now >= my_wait_until:
            debug("timeout waiting for opponent cast")
            show_outcome(1)

    remaining = 20 - (running_time() - loop_started)
    if remaining > 0:
        sleep(remaining)
