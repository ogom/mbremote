# Draws the Clover magic circle.
class CloverMagicCircle
  RING = [92, 122, 31]
  LINE = [61, 122, 31]
  LEAF = [31, 122, 46]

  LINES = [
    [122, 159, 188, 210],
    [132, 167, 194, 214],
    [142, 175, 200, 218],
    [112, 151, 182, 206]
  ]

  def initialize(lights)
    @lights = lights
  end

  def show
    frame_delay = MagicCircleLights::FRAME_DELAY_MS
    cycle = 0
    while cycle < 3
      [4, 1, 2, 3].each do |leaf_id|
        @lights.clear
        fill_leaf(leaf_id)
        Microbit.sleep(frame_delay * 10)
      end
      cycle += 1
    end

    [4, 1, 2, 3].each do |leaf_id|
      fill_leaf(leaf_id)
    end
    slow_delay = frame_delay * 8
    @lights.show_color_range(233, 240, RING, slow_delay)
    @lights.show_color_sequence([241], RING, slow_delay)
    LINES.each do |line|
      @lights.show_color_sequence(line, LINE, slow_delay)
    end
  end

  def fill_leaf(leaf_id)
    anchors = MagicCircleLayout::RADIAL_LINES[leaf_id - 1]
    spans = [13, 10, 8, 6, 4, 2, 1, 0]
    limits = [60, 108, 148, 180, 204, 220, 232, 240]
    offsets = [60, 48, 40, 32, 24, 16, 12, 8]
    ring_index = 0

    while ring_index < 8
      first = anchors[0]
      pixel_number = anchors[ring_index] + 1
      last = anchors[ring_index] + spans[ring_index] + 1
      while pixel_number <= last
        unless skip_leaf_pixel?(pixel_number, first, anchors[1])
          output_pixel = pixel_number
          if leaf_id == 4 && output_pixel > limits[ring_index]
            output_pixel -= offsets[ring_index]
          end
          @lights.set_color(output_pixel, LEAF)
        end
        pixel_number += 1
      end
      @lights.render
      ring_index += 1
    end
  end

  def skip_leaf_pixel?(pixel_number, first, second_anchor)
    pixel_number == first + 1 ||
      pixel_number == first + 6 ||
      pixel_number == first + 7 ||
      pixel_number == first + 8 ||
      pixel_number == first + 9 ||
      pixel_number == first + 14 ||
      pixel_number == second_anchor + 6
  end

  private :fill_leaf, :skip_leaf_pixel?
end
