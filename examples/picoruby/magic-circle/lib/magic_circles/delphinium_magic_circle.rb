# Draws the Delphinium magic circle.
class DelphiniumMagicCircle
  BLUE = [51, 102, 204]
  PETAL = [15, 56, 138]
  POINT = [31, 71, 71]
  POINT_DIM = [41, 61, 61]
  CENTER = [20, 82, 82]

  PETALS = [
    [5, 6, 64, 66, 111, 113, 150, 152, 181, 183, 205, 207, 221, 222, 233],
    [13, 70, 72, 116, 118, 154, 156, 184, 186, 207, 209, 222, 224, 234],
    [21, 20, 76, 78, 121, 123, 158, 160, 187, 189, 209, 211, 224, 225, 235],
    [28, 82, 84, 126, 128, 162, 164, 190, 192, 211, 213, 225, 227, 236],
    [36, 35, 88, 90, 131, 133, 166, 168, 193, 195, 213, 215, 227, 228, 237],
    [43, 94, 96, 136, 138, 170, 172, 196, 198, 215, 217, 228, 230, 238],
    [51, 50, 100, 102, 141, 143, 174, 176, 199, 201, 217, 219, 230, 231, 239],
    [58, 106, 108, 146, 148, 178, 180, 202, 204, 219, 221, 231, 233, 240]
  ]
  POINTS = [
    [112, 151, 182], [117, 155, 185], [122, 159, 188], [127, 163, 191],
    [132, 167, 194], [137, 171, 197], [142, 175, 200], [147, 179, 203]
  ]

  def initialize(lights)
    @lights = lights
  end

  def show
    frame_delay = MagicCircleLights::FRAME_DELAY_MS
    @lights.clear
    @lights.show_color_range(1, 60, BLUE, frame_delay)
    @lights.show_color_range(109, 148, BLUE, frame_delay)
    @lights.show_color_range(221, 232, BLUE, frame_delay)

    [8, 1, 2, 3, 4, 5, 6, 7].each do |petal_id|
      @lights.fill_color_sequence(PETALS[petal_id - 1], PETAL)
      @lights.render
      Microbit.sleep(frame_delay * 8)
    end

    POINTS.each do |point|
      @lights.set_color(point[0], POINT)
      @lights.render
      Microbit.sleep(frame_delay * 8)
      @lights.set_color(point[1], POINT_DIM)
      @lights.render
      Microbit.sleep(frame_delay * 8)
      @lights.set_color(point[2], POINT)
      @lights.render
      Microbit.sleep(frame_delay * 8)
    end

    Microbit.sleep(frame_delay * 10)
    @lights.show_color_range(233, 240, CENTER, frame_delay * 8)
    @lights.show_color_sequence([241], CENTER, frame_delay * 8)
  end
end
