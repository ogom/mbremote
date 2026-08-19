import neopixel


class RgbLed:
    def __init__(
        self,
        pin,
        pixel_count,
        brightness=20,
        frame_delay_ms=20,
        phase_step=2,
    ):
        if pixel_count <= 0:
            raise ValueError("pixel_count must be greater than 0")

        self.pixel_count = pixel_count
        self.brightness = max(0, min(255, brightness))
        self.frame_delay_ms = frame_delay_ms
        self.phase_step = phase_step
        self.pixels = neopixel.NeoPixel(pin, pixel_count)
        self.phase = 0
        self.comet_phase = 0
        self.block_phase = 0

    @staticmethod
    def rainbow(position):
        position %= 256
        if position < 85:
            return position * 3, 255 - position * 3, 0
        if position < 170:
            position -= 85
            return 255 - position * 3, 0, position * 3
        position -= 170
        return 0, position * 3, 255 - position * 3

    def set_brightness(self, color):
        return tuple(value * self.brightness // 255 for value in color)

    def update(self, phase_step=None):
        if phase_step is None:
            phase_step = self.phase_step
        for index in range(self.pixel_count):
            position = self.phase + index * 256 // self.pixel_count
            self.pixels[index] = self.set_brightness(self.rainbow(position))
        self.pixels.show()
        self.phase = (self.phase + phase_step) % 256

    def fill(self, color):
        color = self.set_brightness(color)
        for index in range(self.pixel_count):
            self.pixels[index] = color
        self.pixels.show()

    def chase(self, color, direction=1, spacing=10, width=3):
        color = self.set_brightness(color)
        tail = tuple(value // 4 for value in color)
        for index in range(self.pixel_count):
            offset = (index - self.phase) % spacing
            if offset < width:
                self.pixels[index] = color
            elif offset == width:
                self.pixels[index] = tail
            else:
                self.pixels[index] = (0, 0, 0)
        self.pixels.show()
        self.phase = (self.phase + direction * self.phase_step) % spacing

    def chase_paths(self, color, paths, width=3):
        color = self.set_brightness(color)
        path_length = 1
        self.pixels.clear()

        for start, end in paths:
            path_length = max(path_length, abs(end - start) + 1)
            direction = 1 if end >= start else -1
            length = abs(end - start) + 1
            head = start + direction * (self.phase % length)

            for trail_index in range(width):
                pixel_index = head - direction * trail_index
                if direction > 0 and pixel_index < start:
                    break
                if direction < 0 and pixel_index > start:
                    break
                self.pixels[pixel_index] = tuple(
                    value * (width - trail_index) // width for value in color
                )

        self.pixels.show()
        self.phase = (self.phase + self.phase_step) % path_length

    def rainbow_chase_paths(self, paths, width=5, comet_count=3):
        path_length = 1
        self.pixels.clear()

        for path_index, path in enumerate(paths):
            start, end = path
            path_length = max(path_length, abs(end - start) + 1)
            direction = 1 if end >= start else -1
            length = abs(end - start) + 1

            for comet_index in range(comet_count):
                position = (
                    self.phase + comet_index * length // comet_count
                ) % length
                head = start + direction * position
                rainbow_position = (
                    self.phase * 6
                    + comet_index * 256 // comet_count
                    + path_index * 32
                )
                color = self.set_brightness(self.rainbow(rainbow_position))

                for trail_index in range(width):
                    pixel_index = head - direction * trail_index
                    if direction > 0 and pixel_index < start:
                        break
                    if direction < 0 and pixel_index > start:
                        break
                    self.pixels[pixel_index] = tuple(
                        value * (width - trail_index) // width for value in color
                    )

        self.pixels.show()
        self.phase = (self.phase + self.phase_step) % path_length

    def gradient_paths(
        self,
        paths,
        color_a,
        color_b,
        phase_step=6,
        wave_count=1,
        minimum_intensity=20,
        contrast=1,
        comet_count=0,
        comet_width=5,
        comet_step=8,
    ):
        minimum_intensity = max(0, min(100, minimum_intensity))
        contrast = max(1, min(4, contrast))
        for path_index, path in enumerate(paths):
            start, end = path
            direction = 1 if end >= start else -1
            length = abs(end - start) + 1

            for offset in range(length):
                wave = (
                    offset * 256 * wave_count // length - self.phase
                ) % 256
                blend = wave * 2 if wave < 128 else (255 - wave) * 2
                color = tuple(
                    (first * (255 - blend) + second * blend) // 255
                    for first, second in zip(color_a, color_b)
                )
                darkness = 255 - blend
                for _ in range(contrast - 1):
                    darkness = darkness * (255 - blend) // 255
                intensity = (
                    100
                    - (100 - minimum_intensity) * darkness // 255
                )
                color = self.set_brightness(color)
                self.pixels[start + direction * offset] = tuple(
                    value * intensity // 100 for value in color
                )

            path_comet_count = comet_count

            for comet_index in range(path_comet_count):
                position = (
                    self.comet_phase * length // 256
                    + comet_index * length // path_comet_count
                ) % length
                comet_color = (
                    color_a
                    if (path_index + comet_index) % 2 == 0
                    else color_b
                )
                comet_color = self.set_brightness(comet_color)

                for trail_index in range(comet_width):
                    trail_position = (position - trail_index) % length
                    pixel_index = start + direction * trail_position
                    self.pixels[pixel_index] = tuple(
                        value * (comet_width - trail_index) // comet_width
                        for value in comet_color
                    )

        self.pixels.show()
        self.phase = (self.phase + phase_step) % 256
        self.comet_phase = (self.comet_phase + comet_step) % 256

    def block_march_paths(
        self,
        paths,
        color_a,
        color_b,
        block_width=10,
        gap_width=2,
        step=1,
        gap_intensity=10,
    ):
        block_width = max(1, block_width)
        gap_width = max(0, gap_width)
        gap_intensity = max(0, min(100, gap_intensity))
        section_width = block_width + gap_width
        pattern_width = section_width * 2

        for start, end in paths:
            direction = 1 if end >= start else -1
            length = abs(end - start) + 1

            for offset in range(length):
                position = (offset - self.block_phase) % pattern_width
                if position < block_width:
                    color = color_a
                    intensity = 100
                elif position < section_width:
                    color = color_a
                    intensity = gap_intensity
                elif position < section_width + block_width:
                    color = color_b
                    intensity = 100
                else:
                    color = color_b
                    intensity = gap_intensity

                color = self.set_brightness(color)
                self.pixels[start + direction * offset] = tuple(
                    value * intensity // 100 for value in color
                )

        self.pixels.show()
        self.block_phase = (self.block_phase + step) % pattern_width

    def reset(self):
        self.phase = 0
        self.comet_phase = 0
        self.block_phase = 0

    def clear(self):
        self.pixels.clear()
        self.pixels.show()
