class RGBLed
  attr_reader :frame_delay_ms

  def initialize(pin:, pixel_count:, brightness: 20, frame_delay_ms: 20, phase_step: 2)
    raise ArgumentError, 'pixel_count must be greater than 0' if pixel_count <= 0

    @pixels = Microbit::NeoPixel.new
    @pixel_count = pixel_count
    @brightness = clamp(brightness, 0, 255)
    @frame_delay_ms = frame_delay_ms
    @phase_step = phase_step
    @phase = 0
    @block_phase = 0
    @pixels.configure(pin, pixel_count)
  end

  def rainbow(position)
    position %= 256
    if position < 85
      [position * 3, 255 - position * 3, 0]
    elsif position < 170
      position -= 85
      [255 - position * 3, 0, position * 3]
    else
      position -= 170
      [0, position * 3, 255 - position * 3]
    end
  end

  def set_brightness(color)
    [
      color[0] * @brightness / 255,
      color[1] * @brightness / 255,
      color[2] * @brightness / 255
    ]
  end

  def update(phase_step = nil)
    phase_step = @phase_step unless phase_step
    index = 0
    while index < @pixel_count
      position = @phase + index * 256 / @pixel_count
      color = set_brightness(rainbow(position))
      @pixels.set_pixel(index, color[0], color[1], color[2])
      index += 1
    end
    @pixels.show
    @phase = (@phase + phase_step) % 256
  end

  def block_march_paths(paths, color_a, color_b, block_width, gap_width, step, gap_intensity)
    block_width = 1 if block_width < 1
    gap_width = 0 if gap_width < 0
    gap_intensity = clamp(gap_intensity, 0, 100)
    section_width = block_width + gap_width
    pattern_width = section_width * 2

    paths.each do |path|
      start_pixel = path[0]
      end_pixel = path[1]
      direction = end_pixel >= start_pixel ? 1 : -1
      length = end_pixel - start_pixel
      length = -length if length < 0
      length += 1
      offset = 0

      while offset < length
        position = (offset - @block_phase) % pattern_width
        if position < block_width
          color = color_a
          intensity = 100
        elsif position < section_width
          color = color_a
          intensity = gap_intensity
        elsif position < section_width + block_width
          color = color_b
          intensity = 100
        else
          color = color_b
          intensity = gap_intensity
        end

        color = set_brightness(color)
        @pixels.set_pixel(
          start_pixel + direction * offset,
          color[0] * intensity / 100,
          color[1] * intensity / 100,
          color[2] * intensity / 100
        )
        offset += 1
      end
    end

    @pixels.show
    @block_phase = (@block_phase + step) % pattern_width
  end

  def reset
    @phase = 0
    @block_phase = 0
  end

  def clear
    @pixels.clear
    @pixels.show
  end

  def clamp(value, minimum, maximum)
    value = minimum if value < minimum
    value = maximum if value > maximum
    value
  end

  private :rainbow, :set_brightness, :clamp
end
