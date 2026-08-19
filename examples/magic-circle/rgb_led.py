import neopixel
from microbit import pin16, sleep


NUM_PIXELS = 241

GERBERA = 0
DELPHINIUM = 1
CLOVER = 2
ANCIENT = 3

GERBERA_PINK = (122, 31, 122)
GERBERA_ACCENT = (163, 41, 122)
GERBERA_LINE = (31, 92, 122)
DELPHINIUM_BLUE = (51, 102, 204)
DELPHINIUM_PETAL = (15, 56, 138)
DELPHINIUM_POINT = (31, 71, 71)
DELPHINIUM_POINT_DIM = (41, 61, 61)
DELPHINIUM_CENTER = (20, 82, 82)
CLOVER_RING = (92, 122, 31)
CLOVER_LINE = (61, 122, 31)
CLOVER_LEAF = (31, 122, 46)
ANCIENT_COLOR = (31, 122, 61)
ANCIENT_LINE = (31, 92, 122)
ANCIENT_GREEN = (31, 122, 31)

RINGS = (
    (),
    tuple(range(1, 61)),
    tuple(range(61, 109)),
    tuple(range(109, 149)),
    tuple(range(149, 181)),
    tuple(range(181, 205)),
    tuple(range(205, 221)),
    tuple(range(221, 233)),
    tuple(range(233, 241)),
    (241,),
)
RADIAL_LINES = (
    (13, 71, 117, 155, 185, 208, 223, 234, 241),
    (28, 83, 127, 163, 191, 212, 226, 236, 241),
    (43, 95, 137, 171, 197, 216, 229, 238, 241),
    (58, 107, 147, 179, 203, 220, 232, 240, 241),
)
GERBERA_LINES = (
    RADIAL_LINES[0], (), (), RADIAL_LINES[1], (), (),
    RADIAL_LINES[2], (), (), RADIAL_LINES[3],
)
DELPHINIUM_PETALS = (
    (5, 6, 64, 66, 111, 113, 150, 152, 181, 183, 205, 207, 221, 222, 233),
    (13, 70, 72, 116, 118, 154, 156, 184, 186, 207, 209, 222, 224, 234),
    (21, 20, 76, 78, 121, 123, 158, 160, 187, 189, 209, 211, 224, 225, 235),
    (28, 82, 84, 126, 128, 162, 164, 190, 192, 211, 213, 225, 227, 236),
    (36, 35, 88, 90, 131, 133, 166, 168, 193, 195, 213, 215, 227, 228, 237),
    (43, 94, 96, 136, 138, 170, 172, 196, 198, 215, 217, 228, 230, 238),
    (51, 50, 100, 102, 141, 143, 174, 176, 199, 201, 217, 219, 230, 231, 239),
    (58, 106, 108, 146, 148, 178, 180, 202, 204, 219, 221, 231, 233, 240),
)
DELPHINIUM_POINTS = tuple(
    (112 + index * 5, 151 + index * 4, 182 + index * 3)
    for index in range(8)
)
CLOVER_LINES = (
    (122, 159, 188, 210),
    (132, 167, 194, 214),
    (142, 175, 200, 218),
    (112, 151, 182, 206),
)
pixels = neopixel.NeoPixel(pin16, NUM_PIXELS)


def set_pixel(index, color):
    if 1 <= index <= NUM_PIXELS:
        pixels[index - 1] = color


def clear_all():
    for index in range(NUM_PIXELS):
        pixels[index] = (0, 0, 0)
    pixels.show()


def show_sequence(sequence, color, delay_ms):
    for index in sequence:
        set_pixel(index, color)
        pixels.show()
        sleep(delay_ms)


def fill_sequence(sequence, color):
    for index in sequence:
        set_pixel(index, color)


def gerbera_cross_vertical(delay_ms=20):
    clear_all()
    show_sequence(
        RADIAL_LINES[0] + (241, 238, 229, 216, 197, 171, 137, 95, 43),
        GERBERA_LINE,
        delay_ms,
    )


def gerbera_cross_horizontal(delay_ms=20):
    clear_all()
    show_sequence(
        RADIAL_LINES[1] + (241, 240, 232, 220, 203, 179, 147, 107, 58),
        GERBERA_LINE,
        delay_ms,
    )


def gerbera_fill_wipe(delay_ms=20):
    clear_all()
    show_sequence(
        RINGS[6], GERBERA_LINE, delay_ms
    )


def gerbera_fill_point(delay_ms=20):
    clear_all()
    show_sequence(
        RINGS[9], GERBERA_LINE, delay_ms
    )


def gerbera_matrix(delay_ms=20, tail=2):
    for _ in range(2):
        for head in range(9):
            clear_all()
            for line in GERBERA_LINES:
                fill_sequence(line[max(0, head - tail + 1) : head + 1], GERBERA_PINK)
            pixels.show()
            sleep(delay_ms)
        for head in range(8, -1, -1):
            clear_all()
            for line in GERBERA_LINES:
                fill_sequence(line[head : head + tail], GERBERA_PINK)
            pixels.show()
            sleep(delay_ms)

    show_sequence((59, 60) + RINGS[1], GERBERA_PINK, delay_ms)
    show_sequence((147, 148) + RINGS[3], GERBERA_PINK, delay_ms)
    for ring_id in (7, 8, 9):
        show_sequence(RINGS[ring_id], GERBERA_ACCENT, delay_ms * 8)
    for line_id in (0, 1):
        show_sequence(GERBERA_LINES[line_id * 3], GERBERA_ACCENT, delay_ms * 8)


def delphinium_fill_petal(petal_id):
    fill_sequence(
        DELPHINIUM_PETALS[petal_id - 1],
        DELPHINIUM_PETAL,
    )
    pixels.show()


def delphinium_matrix(delay_ms=20):
    clear_all()
    for ring_id in (1, 3, 7):
        show_sequence(RINGS[ring_id], DELPHINIUM_BLUE, delay_ms)
    for petal_id in (8, 1, 2, 3, 4, 5, 6, 7):
        delphinium_fill_petal(petal_id)
        sleep(delay_ms * 8)
    for point in DELPHINIUM_POINTS:
        colors = (DELPHINIUM_POINT, DELPHINIUM_POINT_DIM, DELPHINIUM_POINT)
        for index, color in zip(point, colors):
            set_pixel(index, color)
            pixels.show()
            sleep(delay_ms * 8)
    sleep(delay_ms * 10)
    for ring_id in (8, 9):
        show_sequence(RINGS[ring_id], DELPHINIUM_CENTER, delay_ms * 8)


def clover_fill_leaf(leaf_id):
    anchors = RADIAL_LINES[leaf_id - 1][:-1]
    first = anchors[0]
    spans = (13, 10, 8, 6, 4, 2, 1, 0)
    for ring_index in range(8):
        base = anchors[ring_index]
        for index in range(base + 1, base + spans[ring_index] + 2):
            if index in (
                first + 1,
                first + 6,
                first + 7,
                first + 8,
                first + 9,
                first + 14,
                anchors[1] + 6,
            ):
                continue
            if leaf_id == 4:
                limits = (60, 108, 148, 180, 204, 220, 232, 240)
                offsets = (60, 48, 40, 32, 24, 16, 12, 8)
                if index > limits[ring_index]:
                    index -= offsets[ring_index]
            set_pixel(index, CLOVER_LEAF)
        pixels.show()


def clover_matrix(delay_ms=20):
    clear_all()
    for _ in range(3):
        for leaf_id in (4, 1, 2, 3):
            clear_all()
            clover_fill_leaf(leaf_id)
            sleep(delay_ms * 10)
    for leaf_id in (4, 1, 2, 3):
        clover_fill_leaf(leaf_id)
    show_sequence(RINGS[8] + RINGS[9], CLOVER_RING, delay_ms * 8)
    for line in CLOVER_LINES:
        show_sequence(line, CLOVER_LINE, delay_ms * 8)


def ancient_fill_petal(petal_id):
    anchors = RADIAL_LINES[petal_id - 1][2:6]
    for ring_index, span in enumerate((5, 4, 3, 2)):
        for index in range(anchors[ring_index], anchors[ring_index] + span + 1):
            if petal_id == 4:
                limits = (148, 180, 204, 220)
                offsets = (40, 32, 24, 16)
                if index > limits[ring_index]:
                    index -= offsets[ring_index]
            set_pixel(index, ANCIENT_COLOR)
        pixels.show()


def ancient_matrix(delay_ms=20):
    clear_all()
    for _ in range(3):
        for petal_id in (4, 1, 2, 3):
            clear_all()
            ancient_fill_petal(petal_id)
            sleep(delay_ms * 10)
    for ring_id in (7, 8, 9):
        show_sequence(RINGS[ring_id], ANCIENT_COLOR, delay_ms * 8)
    sequence = (
        tuple(range(40, 55))
        + (104, 145)
        + tuple(range(178, 181))
        + tuple(range(149, 169))
        + (92, 134)
    )
    show_sequence(sequence, ANCIENT_LINE, delay_ms)
    show_sequence(
        tuple(range(105, 109)) + tuple(range(61, 92)),
        ANCIENT_GREEN,
        delay_ms,
    )
    show_sequence(tuple(range(55, 61)) + RINGS[1][:39], CLOVER_LINE, delay_ms)


def run_effect(magic):
    if magic == GERBERA:
        gerbera_matrix()
    elif magic == DELPHINIUM:
        delphinium_matrix()
    elif magic == CLOVER:
        clover_matrix()
    elif magic == ANCIENT:
        ancient_matrix()
