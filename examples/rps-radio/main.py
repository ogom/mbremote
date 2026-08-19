from microbit import Image, button_a, button_b, display, running_time, sleep
import radio
import random


RADIO_GROUP = 42
RADIO_CHANNEL = 7
RESULT_TIME_MS = 3000
RESEND_MIN_MS = 250
RESEND_MAX_MS = 450

ROCK = 0
PAPER = 1
SCISSORS = 2

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

radio.config(
    group=RADIO_GROUP,
    channel=RADIO_CHANNEL,
    power=6,
    queue=8,
    length=32,
)
radio.on()

round_no = 0
my_choice = ROCK
opponent_choice = None
locked = False
my_acked = False
state = "SELECT"
last_send_time = 0
next_send_interval = 300
result_until = 0


def send_choice():
    radio.send("J|" + str(round_no) + "|" + str(my_choice))


def send_ack(received_round):
    radio.send("A|" + str(received_round))


def receive_message():
    global opponent_choice, my_acked

    message = radio.receive()
    if message is None:
        return

    try:
        parts = message.split("|")

        if parts[0] == "J" and len(parts) == 3:
            received_round = int(parts[1])
            received_choice = int(parts[2])

            if round_no == received_round:
                if ROCK <= received_choice <= SCISSORS:
                    opponent_choice = received_choice
                    send_ack(received_round)
            elif received_round == round_no - 1:
                send_ack(received_round)

        elif parts[0] == "A" and len(parts) == 2:
            received_round = int(parts[1])
            if received_round == round_no:
                my_acked = True
    except (ValueError, IndexError):
        pass


def judge(mine, opponent):
    if mine == opponent:
        return 0
    if (
        (mine == ROCK and opponent == SCISSORS)
        or (mine == SCISSORS and opponent == PAPER)
        or (mine == PAPER and opponent == ROCK)
    ):
        return 1
    return -1


def show_result():
    global state, result_until

    result = judge(my_choice, opponent_choice)
    if result == 1:
        display.show(Image.HAPPY)
    elif result == -1:
        display.show(Image.SAD)
    else:
        display.show(IMAGE_DRAW)

    state = "RESULT"
    result_until = running_time() + RESULT_TIME_MS


def reset_round():
    global round_no, my_choice, opponent_choice
    global locked, my_acked, state
    global last_send_time, next_send_interval

    round_no += 1
    my_choice = ROCK
    opponent_choice = None
    locked = False
    my_acked = False
    state = "SELECT"
    last_send_time = 0
    next_send_interval = random.randint(RESEND_MIN_MS, RESEND_MAX_MS)
    display.show(HANDS[my_choice])


display.show(HANDS[my_choice])

while True:
    receive_message()

    if state == "SELECT":
        if not locked:
            if button_a.was_pressed():
                my_choice = (my_choice + 1) % len(HANDS)
                display.show(HANDS[my_choice])

            if button_b.was_pressed():
                locked = True
                send_choice()
                last_send_time = running_time()
                next_send_interval = random.randint(
                    RESEND_MIN_MS,
                    RESEND_MAX_MS,
                )

        if locked and not my_acked:
            now = running_time()
            if now - last_send_time >= next_send_interval:
                send_choice()
                last_send_time = now
                next_send_interval = random.randint(
                    RESEND_MIN_MS,
                    RESEND_MAX_MS,
                )

        if locked and opponent_choice is not None and my_acked:
            show_result()

    elif state == "RESULT" and running_time() >= result_until:
        reset_round()

    sleep(20)
