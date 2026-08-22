class Controller
  FORWARD_SPEED = 70
  BACKWARD_SPEED = 70
  STEERING_DEAD_ZONE = 80
  STEERING_FULL_SCALE = 650
  STEERING_MAX_PERCENT = 80
  STEERING_DIRECTION = 1
  SEND_INTERVAL_MS = 100
  LOOP_INTERVAL_MS = 20

  LIGHT_STOP = 0
  LIGHT_FORWARD = 1
  LIGHT_BACKWARD = 2
  LIGHT_FORWARD_RIGHT = 3
  LIGHT_FORWARD_LEFT = 4
  LIGHT_BACKWARD_RIGHT = 5
  LIGHT_BACKWARD_LEFT = 6

  def initialize(display, radio, button)
    @display = display
    @radio = radio
    @button = button
    @accelerometer = Microbit::Accelerometer.new
  end

  def run
    current_speeds = [0, 0]
    last_sent = -SEND_INTERVAL_MS
    @display.show(Microbit::Image::SQUARE_SMALL)

    begin
      loop do
        next_speeds = calculate_speeds
        now = Microbit.running_time
        if next_speeds != current_speeds
          current_speeds = next_speeds
          update_motion_image(light_mode(current_speeds))
          @radio.send(encode_speeds(current_speeds))
          last_sent = now
        elsif now - last_sent >= SEND_INTERVAL_MS
          @radio.send(encode_speeds(current_speeds))
          last_sent = now
        end
        sleep_ms(LOOP_INTERVAL_MS)
      end
    ensure
      attempts = 0
      while attempts < 3
        @radio.send(encode_speeds([0, 0]))
        sleep_ms(20)
        attempts += 1
      end
      @radio.disable
    end
  end

  def calculate_speeds
    forward = @button.a_pressed?
    backward = @button.b_pressed?
    return [0, 0] if forward == backward

    throttle = forward ? FORWARD_SPEED : -BACKWARD_SPEED
    steering_x = @accelerometer.x * STEERING_DIRECTION
    absolute_x = steering_x < 0 ? -steering_x : steering_x

    if absolute_x <= STEERING_DEAD_ZONE
      steering = 0
    else
      steering = (
        (absolute_x - STEERING_DEAD_ZONE) * STEERING_MAX_PERCENT /
        (STEERING_FULL_SCALE - STEERING_DEAD_ZONE)
      )
      steering = clamp(steering, 0, STEERING_MAX_PERCENT)
      steering = -steering if steering_x < 0
    end

    if steering > 0
      [throttle, throttle * (100 - steering) / 100]
    elsif steering < 0
      [throttle * (100 + steering) / 100, throttle]
    else
      [throttle, throttle]
    end
  end

  def encode_speeds(speeds)
    "#{speeds[0]}|#{speeds[1]}"
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

  private :calculate_speeds, :encode_speeds, :light_mode, :update_motion_image, :clamp
end
