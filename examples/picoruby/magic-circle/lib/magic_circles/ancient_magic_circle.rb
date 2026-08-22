# Draws the Ancient magic circle.
class AncientMagicCircle
  COLOR = [31, 122, 61]
  LINE = [31, 92, 122]
  GREEN = [31, 122, 31]
  GREEN_LINE = [61, 122, 31]

  def initialize(lights)
    @lights = lights
  end

  def show
    frame_delay = MagicCircleLights::FRAME_DELAY_MS
    cycle = 0
    while cycle < 3
      [4, 1, 2, 3].each do |petal_id|
        @lights.clear
        fill_petal(petal_id)
        Microbit.sleep(frame_delay * 10)
      end
      cycle += 1
    end

    slow_delay = frame_delay * 8
    @lights.show_color_range(221, 232, COLOR, slow_delay)
    @lights.show_color_range(233, 240, COLOR, slow_delay)
    @lights.show_color_sequence([241], COLOR, slow_delay)
    @lights.show_color_range(40, 54, LINE, frame_delay)
    @lights.show_color_sequence([104, 145], LINE, frame_delay)
    @lights.show_color_range(178, 180, LINE, frame_delay)
    @lights.show_color_range(149, 168, LINE, frame_delay)
    @lights.show_color_sequence([92, 134], LINE, frame_delay)
    @lights.show_color_range(105, 108, GREEN, frame_delay)
    @lights.show_color_range(61, 91, GREEN, frame_delay)
    @lights.show_color_range(55, 60, GREEN_LINE, frame_delay)
    @lights.show_color_range(1, 39, GREEN_LINE, frame_delay)
  end

  def fill_petal(petal_id)
    anchors = MagicCircleLayout::RADIAL_LINES[petal_id - 1]
    spans = [5, 4, 3, 2]
    limits = [148, 180, 204, 220]
    offsets = [40, 32, 24, 16]
    ring_index = 0

    while ring_index < 4
      pixel_number = anchors[ring_index + 2]
      last = pixel_number + spans[ring_index]
      while pixel_number <= last
        output_pixel = pixel_number
        if petal_id == 4 && output_pixel > limits[ring_index]
          output_pixel -= offsets[ring_index]
        end
        @lights.set_color(output_pixel, COLOR)
        pixel_number += 1
      end
      @lights.render
      ring_index += 1
    end
  end

  private :fill_petal
end
