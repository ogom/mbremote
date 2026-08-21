# Draws the Gerbera magic circle.
class GerberaMagicCircle
  COLOR = [122, 31, 122]
  ACCENT_COLOR = [163, 41, 122]

  def initialize(lights)
    @lights = lights
  end

  def show
    cycle = 0
    while cycle < 2
      head = 0
      while head < 9
        @lights.clear
        radial_lines.each do |line|
          first = head - 1
          first = 0 if first < 0
          fill_line_part(line, first, head)
        end
        @lights.render
        Microbit.sleep(MagicCircleLights::FRAME_DELAY_MS)
        head += 1
      end

      head = 8
      while head >= 0
        @lights.clear
        radial_lines.each do |line|
          last = head + 1
          last = 8 if last > 8
          fill_line_part(line, head, last)
        end
        @lights.render
        Microbit.sleep(MagicCircleLights::FRAME_DELAY_MS)
        head -= 1
      end
      cycle += 1
    end

    @lights.show_color_sequence(
      [59, 60], COLOR, MagicCircleLights::FRAME_DELAY_MS
    )
    @lights.show_color_range(
      1, 60, COLOR, MagicCircleLights::FRAME_DELAY_MS
    )
    @lights.show_color_sequence(
      [147, 148], COLOR, MagicCircleLights::FRAME_DELAY_MS
    )
    @lights.show_color_range(
      109, 148, COLOR, MagicCircleLights::FRAME_DELAY_MS
    )

    accent_delay = MagicCircleLights::FRAME_DELAY_MS * 8
    @lights.show_color_range(221, 232, ACCENT_COLOR, accent_delay)
    @lights.show_color_range(233, 240, ACCENT_COLOR, accent_delay)
    @lights.show_color_sequence([241], ACCENT_COLOR, accent_delay)
    @lights.show_color_sequence(radial_lines[0], ACCENT_COLOR, accent_delay)
    @lights.show_color_sequence(radial_lines[1], ACCENT_COLOR, accent_delay)
  end

  def radial_lines
    MagicCircleLayout::RADIAL_LINES
  end

  def fill_line_part(line, first, last)
    index = first
    while index <= last
      @lights.set_color(line[index], COLOR)
      index += 1
    end
  end

  private :radial_lines, :fill_line_part
end
