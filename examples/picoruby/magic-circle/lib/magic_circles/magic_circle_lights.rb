# Provides shared NeoPixel drawing operations for magic circles.
class MagicCircleLights
  PIXEL_PIN = 16
  PIXEL_COUNT = 241
  FRAME_DELAY_MS = 10
  ACTION_DELAY_MS = 20

  LINE_COLOR = [31, 92, 122]
  WIN_COLOR = [31, 122, 46]
  WIN_ACCENT = [122, 92, 31]
  LOSE_COLOR = [122, 20, 20]
  LOSE_DIM = [46, 5, 5]
  DRAW_COLOR = [31, 92, 122]
  DRAW_ACCENT = [92, 92, 92]

  DOWN_SEQUENCE = [241]
  POSE_SEQUENCE = [
    13, 71, 117, 155, 185, 208, 223, 234, 241,
    241, 238, 229, 216, 197, 171, 137, 95, 43
  ]
  SIDE_SEQUENCE = [
    28, 83, 127, 163, 191, 212, 226, 236, 241,
    241, 240, 232, 220, 203, 179, 147, 107, 58
  ]
  CIRCLE_SEQUENCE = [
    205, 206, 207, 208, 209, 210, 211, 212,
    213, 214, 215, 216, 217, 218, 219, 220
  ]

  def initialize
    @pixels = Microbit::NeoPixel.new
    @pixels.configure(PIXEL_PIN, PIXEL_COUNT)
    cancel_action
    clear
  end

  def clear
    cancel_action
    @pixels.clear
    render
  end

  def show_down
    start_action_sequence("down", DOWN_SEQUENCE)
  end

  def show_pose
    start_action_sequence("pose", POSE_SEQUENCE)
  end

  def show_side
    start_action_sequence("side", SIDE_SEQUENCE)
  end

  def show_circle
    start_action_sequence("circle", CIRCLE_SEQUENCE)
  end

  def update_action
    return nil unless @action_sequence

    now = Microbit.running_time
    return nil if now < @action_next_at

    advance_action(now)
  end

  def action_active?
    !@action_sequence.nil?
  end

  def show_win_effect
    clear
    ring_id = 9
    while ring_id > 0
      color = ring_id % 2 == 1 ? WIN_ACCENT : WIN_COLOR
      fill_ring(ring_id, color)
      render
      Microbit.sleep(60)
      ring_id -= 1
    end

    [WIN_COLOR, WIN_ACCENT, WIN_COLOR].each do |color|
      fill_all(color)
      render
      Microbit.sleep(120)
    end
  end

  def show_lose_effect
    fill_all(LOSE_COLOR)
    render
    Microbit.sleep(140)

    ring_id = 1
    while ring_id < 9
      fill_ring(ring_id, [0, 0, 0])
      render
      Microbit.sleep(70)
      ring_id += 1
    end
    fill_ring(9, LOSE_DIM)
    render
  end

  def show_draw_effect
    clear
    ring_id = 1
    while ring_id <= 9
      color = ring_id % 2 == 1 ? DRAW_COLOR : DRAW_ACCENT
      fill_ring(ring_id, color)
      render
      Microbit.sleep(70)
      ring_id += 1
    end
    Microbit.sleep(140)
  end

  def render
    @pixels.show
  end

  def show_color_range(first, last, color, delay_ms)
    show_colored_range(
      first, last, color[0], color[1], color[2], delay_ms
    )
  end

  def show_color_sequence(sequence, color, delay_ms)
    show_colored_sequence(
      sequence, color[0], color[1], color[2], delay_ms
    )
  end

  def fill_color_sequence(sequence, color)
    sequence.each do |pixel_number|
      set_color(pixel_number, color)
    end
  end

  def set_color(pixel_number, color)
    set_pixel(pixel_number, color[0], color[1], color[2])
  end

  def start_action_sequence(action, sequence)
    cancel_action
    started_at = Microbit.running_time
    @pixels.clear
    @action_name = action
    @action_sequence = sequence
    @action_index = 0
    @action_started_at = started_at
    @action_first_frame_at = nil
    @action_next_at = started_at

    completed = advance_action(started_at)
    if completed
      [completed[1], completed[2], completed[3]]
    else
      [started_at, @action_first_frame_at, nil]
    end
  end

  def advance_action(now)
    pixel_number = @action_sequence[@action_index]
    set_color(pixel_number, LINE_COLOR)
    render
    shown_at = Microbit.running_time
    @action_first_frame_at = shown_at unless @action_first_frame_at
    @action_index += 1

    if @action_index >= @action_sequence.length
      completed = [
        @action_name,
        @action_started_at,
        @action_first_frame_at,
        shown_at
      ]
      cancel_action
      completed
    else
      @action_next_at = now + ACTION_DELAY_MS
      nil
    end
  end

  def cancel_action
    @action_name = nil
    @action_sequence = nil
    @action_index = 0
    @action_started_at = 0
    @action_first_frame_at = nil
    @action_next_at = 0
  end

  def show_colored_range(first, last, red, green, blue, delay_ms)
    pixel_number = first
    while pixel_number <= last
      set_pixel(pixel_number, red, green, blue)
      render
      Microbit.sleep(delay_ms)
      pixel_number += 1
    end
  end

  def show_colored_sequence(sequence, red, green, blue, delay_ms)
    sequence.each do |pixel_number|
      set_pixel(pixel_number, red, green, blue)
      render
      Microbit.sleep(delay_ms)
    end
  end

  def fill_ring(ring_id, color)
    pixel_number = MagicCircleLayout::RING_STARTS[ring_id]
    while pixel_number <= MagicCircleLayout::RING_ENDS[ring_id]
      set_color(pixel_number, color)
      pixel_number += 1
    end
  end

  def fill_all(color)
    pixel_number = 1
    while pixel_number <= PIXEL_COUNT
      set_color(pixel_number, color)
      pixel_number += 1
    end
  end

  def set_pixel(pixel_number, red, green, blue)
    @pixels.set_pixel(pixel_number - 1, red, green, blue)
  end

  private :start_action_sequence, :advance_action, :cancel_action
  private :show_colored_range, :show_colored_sequence
  private :fill_ring, :fill_all, :set_pixel
end
