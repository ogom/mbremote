class RGBLed
  attr_reader :frame_delay_ms

  def initialize(pin:, pixel_count:, brightness: 20, frame_delay_ms: 20, phase_step: 2)
    raise ArgumentError, 'pixel_count must be greater than 0' if pixel_count <= 0

    @pixels = Microbit::NeoPixel.new
    @pixel_count = pixel_count
    @brightness = brightness.clamp(0, 255)
    @frame_delay_ms = frame_delay_ms
    @phase_step = phase_step
    @phase = 0
    @pixels.configure(pin, pixel_count)
  end

  def update
    @pixel_count.times do |index|
      color = brightness(rainbow(@phase + index * 256 / @pixel_count))
      @pixels.set_pixel(index, *color)
    end
    @pixels.show
    @phase = (@phase + @phase_step) % 256
  end

  private

  def rainbow(position)
    position %= 256
    return [position * 3, 255 - position * 3, 0] if position < 85

    if position < 170
      position -= 85
      [255 - position * 3, 0, position * 3]
    else
      position -= 170
      [0, position * 3, 255 - position * 3]
    end
  end

  def brightness(color)
    color.map { |value| value * @brightness / 255 }
  end
end
