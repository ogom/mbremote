class Rover
  RECEIVE_TIMEOUT_MS = 500
  LOOP_INTERVAL_MS = 20

  LED_PIN = 0
  LED_PIXEL_COUNT = 70
  LED_BRIGHTNESS = 20
  LED_FRAME_DELAY_MS = 20
  LED_STOP_RAINBOW_STEP = 4
  LED_BLOCK_WIDTH = 10
  LED_BLOCK_GAP_WIDTH = 2
  LED_BLOCK_STEP = 1
  LED_BLOCK_GAP_INTENSITY = 10

  LED_FORWARD_PATHS = [[34, 0], [35, 69]]
  LED_BACKWARD_PATHS = [[0, 34], [69, 35]]
  LED_RIGHT_PATHS = [[0, 69]]
  LED_LEFT_PATHS = [[69, 0]]

  LED_FORWARD_MAIN_COLOR = [0, 255, 80]
  LED_BACKWARD_MAIN_COLOR = [255, 0, 180]
  LED_FORWARD_STRAIGHT_COLOR = [0, 150, 40]
  LED_BACKWARD_STRAIGHT_COLOR = [255, 70, 120]
  LED_RIGHT_TURN_COLOR = [255, 210, 0]
  LED_LEFT_TURN_COLOR = [0, 140, 255]

  LIGHT_STOP = 0
  LIGHT_FORWARD = 1
  LIGHT_BACKWARD = 2
  LIGHT_FORWARD_RIGHT = 3
  LIGHT_FORWARD_LEFT = 4
  LIGHT_BACKWARD_RIGHT = 5
  LIGHT_BACKWARD_LEFT = 6

  def initialize(display, radio)
    @display = display
    @radio = radio
    left_motor = Motor.new(8, 9, 13)
    right_motor = Motor.new(14, 15, 16)
    @dual_motor = DualMotor.new(left_motor, right_motor)
    @rgb_led = RGBLed.new(
      pin: LED_PIN,
      pixel_count: LED_PIXEL_COUNT,
      brightness: LED_BRIGHTNESS,
      frame_delay_ms: LED_FRAME_DELAY_MS,
      phase_step: 1
    )
  end

  def run
    current_speeds = [0, 0]
    last_received = Microbit.running_time
    last_light_update = -LED_FRAME_DELAY_MS
    current_light_mode = nil

    begin
      loop do
        latest_speeds = receive_latest_speeds
        now = Microbit.running_time

        if latest_speeds
          last_received = now
          if latest_speeds != current_speeds
            current_speeds = latest_speeds
            @dual_motor.drive(current_speeds[0], current_speeds[1])
          end
        elsif current_speeds != [0, 0] && now - last_received >= RECEIVE_TIMEOUT_MS
          current_speeds = [0, 0]
          @dual_motor.stop
        end

        next_light_mode = light_mode(current_speeds)
        mode_changed = next_light_mode != current_light_mode
        if mode_changed
          current_light_mode = next_light_mode
          @rgb_led.reset
          update_motion_image(current_light_mode)
        end

        if mode_changed || now - last_light_update >= @rgb_led.frame_delay_ms
          update_lights(current_light_mode)
          last_light_update = now
        end

        sleep_ms(LOOP_INTERVAL_MS)
      end
    ensure
      @dual_motor.stop
      @rgb_led.clear
      @display.show(Microbit::Image::SQUARE_SMALL)
      @radio.disable
    end
  end

  def receive_latest_speeds
    latest_speeds = nil
    message = @radio.receive
    while message
      decoded = decode_speeds(message)
      latest_speeds = decoded if decoded
      message = @radio.receive
    end
    latest_speeds
  end

  def decode_speeds(message)
    parts = message.split("|")
    return nil unless parts.length == 2
    return nil unless canonical_integer?(parts[0])
    return nil unless canonical_integer?(parts[1])

    [
      clamp(parts[0].to_i, -100, 100),
      clamp(parts[1].to_i, -100, 100)
    ]
  end

  def canonical_integer?(text)
    text == text.to_i.to_s
  end

  def light_mode(speeds)
    left_speed = speeds[0]
    right_speed = speeds[1]
    return LIGHT_STOP if left_speed == 0 && right_speed == 0

    backward = left_speed < 0 || right_speed < 0
    left_power = left_speed < 0 ? -left_speed : left_speed
    right_power = right_speed < 0 ? -right_speed : right_speed
    if left_power > right_power
      backward ? LIGHT_BACKWARD_RIGHT : LIGHT_FORWARD_RIGHT
    elsif right_power > left_power
      backward ? LIGHT_BACKWARD_LEFT : LIGHT_FORWARD_LEFT
    elsif backward
      LIGHT_BACKWARD
    else
      LIGHT_FORWARD
    end
  end

  def update_lights(mode)
    if mode == LIGHT_STOP
      @rgb_led.update(LED_STOP_RAINBOW_STEP)
      return
    end

    if mode == LIGHT_FORWARD
      paths = LED_FORWARD_PATHS
      color_a = LED_FORWARD_MAIN_COLOR
      color_b = LED_FORWARD_STRAIGHT_COLOR
    elsif mode == LIGHT_BACKWARD
      paths = LED_BACKWARD_PATHS
      color_a = LED_BACKWARD_MAIN_COLOR
      color_b = LED_BACKWARD_STRAIGHT_COLOR
    elsif mode == LIGHT_FORWARD_RIGHT
      paths = LED_RIGHT_PATHS
      color_a = LED_FORWARD_MAIN_COLOR
      color_b = LED_RIGHT_TURN_COLOR
    elsif mode == LIGHT_FORWARD_LEFT
      paths = LED_LEFT_PATHS
      color_a = LED_FORWARD_MAIN_COLOR
      color_b = LED_LEFT_TURN_COLOR
    elsif mode == LIGHT_BACKWARD_RIGHT
      paths = LED_LEFT_PATHS
      color_a = LED_BACKWARD_MAIN_COLOR
      color_b = LED_RIGHT_TURN_COLOR
    else
      paths = LED_RIGHT_PATHS
      color_a = LED_BACKWARD_MAIN_COLOR
      color_b = LED_LEFT_TURN_COLOR
    end

    @rgb_led.block_march_paths(
      paths,
      color_a,
      color_b,
      LED_BLOCK_WIDTH,
      LED_BLOCK_GAP_WIDTH,
      LED_BLOCK_STEP,
      LED_BLOCK_GAP_INTENSITY
    )
  end

  def update_motion_image(mode)
    image = if mode == LIGHT_FORWARD
      Microbit::Image::ARROW_N
    elsif mode == LIGHT_BACKWARD
      Microbit::Image::ARROW_S
    elsif mode == LIGHT_FORWARD_RIGHT
      Microbit::Image::ARROW_NE
    elsif mode == LIGHT_FORWARD_LEFT
      Microbit::Image::ARROW_NW
    elsif mode == LIGHT_BACKWARD_RIGHT
      Microbit::Image::ARROW_SE
    elsif mode == LIGHT_BACKWARD_LEFT
      Microbit::Image::ARROW_SW
    else
      Microbit::Image::SQUARE_SMALL
    end
    @display.show(image)
  end

  def clamp(value, minimum, maximum)
    value = minimum if value < minimum
    value = maximum if value > maximum
    value
  end

  private :receive_latest_speeds, :decode_speeds, :canonical_integer?, :light_mode,
          :update_lights, :update_motion_image, :clamp
end
