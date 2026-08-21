# Builds a magic circle from a sequence of motion gestures.
class Builder
  ACTION_WAIT_MS = 2000

  BATTLE_SEQUENCE = ["down", "pose", "side", "circle"]
  ANCIENT_SEQUENCE = ["down", "pose", "side", "circle", "side", "circle"]

  def initialize(
    display:,
    accelerometer:,
    lights:,
    orientation_gesture:,
    pose_gesture:,
    side_gesture:,
    circle_gesture:
  )
    @display = display
    @accelerometer = accelerometer
    @lights = lights
    @orientation = orientation_gesture
    @pose = pose_gesture
    @side = side_gesture
    @circle = circle_gesture
    @sequence = BATTLE_SEQUENCE
    reset_progress
  end

  def start(ancient)
    @sequence = ancient ? ANCIENT_SEQUENCE : BATTLE_SEQUENCE
    reset_progress
    @lights.clear
    @display.show(Microbit::Image::DIAMOND_SMALL)
  end

  def reset
    @sequence = BATTLE_SEQUENCE
    reset_progress
    @lights.clear
  end

  def update
    animation = @lights.update_action
    log_animation_timing(animation) if animation

    if @pending_complete && !@lights.action_active?
      completed = @pending_complete
      @pending_complete = nil
      return ["complete", completed[0], completed[1], completed[2]]
    end

    update_started_at = Microbit.running_time

    if @spell_step > 0 &&
       @action_wait_until > 0 &&
       Microbit.running_time > @action_wait_until
      expected = expected_action
      step = @spell_step + 1
      fail_build
      return ["timeout", expected, step]
    end

    sample = @accelerometer.sample
    orientation_action = @orientation.update(sample)
    if orientation_action == "up"
      reset_progress
      @lights.clear
      @display.show(Microbit::Image::HOUSE)
      return ["up"]
    end

    expected = expected_action
    if @lights.action_active?
      collect_next_motion(expected, sample)
      @step_sample_count += 1
      return nil
    end

    @step_sample_count += 1
    detected = if expected == "down"
      orientation_action == "down" ? "down" : nil
    elsif expected == "pose"
      @pose.update(sample)
    elsif expected == "side"
      @side.update(sample)
    elsif expected == "circle"
      @circle.update(sample)
    end
    return nil unless detected

    detected_at = Microbit.running_time
    timing = show_action(detected)
    shown_at = Microbit.running_time
    message = "[magic-circle] motion_timing action=#{detected}"
    message += " update_ms=#{detected_at - update_started_at}"
    message += " wait_ms=#{detected_at - @step_started_at}"
    message += " sample_count=#{@step_sample_count}"
    message += " led_start_ms=#{timing[0] - detected_at}"
    message += " first_frame_ms=#{timing[1] - detected_at}"
    if timing[2]
      message += " animation_ms=#{timing[2] - timing[0]}"
    else
      message += " animation_ms=async"
    end
    message += " display_ms=#{shown_at - timing[1]}"
    puts message
    reset_motion_detectors
    @spell_step += 1
    @step_started_at = shown_at
    @step_sample_count = 0
    step = @spell_step
    total = @sequence.length

    if @spell_step == total
      @action_wait_until = 0
      if @lights.action_active?
        @pending_complete = [detected, step, total]
        ["action", detected, step, total]
      else
        ["complete", detected, step, total]
      end
    else
      @action_wait_until = Microbit.running_time + ACTION_WAIT_MS
      ["action", detected, step, total]
    end
  end

  def expected_action
    @sequence[@spell_step]
  end

  def show_action(action)
    if action == "down"
      timing = @lights.show_down
      @display.show(Microbit::Image::COW)
    elsif action == "pose"
      timing = @lights.show_pose
      @display.show(Microbit::Image::SWORD)
    elsif action == "side"
      timing = @lights.show_side
      @display.show(Microbit::Image::ASLEEP)
    elsif action == "circle"
      timing = @lights.show_circle
      @display.show(Microbit::Image::DIAMOND)
    end
    timing
  end

  def fail_build
    reset_progress
    @lights.clear
    @display.show(Microbit::Image::NO)
  end

  def reset_progress
    @spell_step = 0
    @action_wait_until = 0
    @pending_complete = nil
    @step_started_at = Microbit.running_time
    @step_sample_count = 0
    reset_motion_detectors
  end

  def log_animation_timing(timing)
    message = "[magic-circle] animation_timing action=#{timing[0]}"
    message += " first_frame_ms=#{timing[2] - timing[1]}"
    message += " animation_ms=#{timing[3] - timing[1]}"
    puts message
  end

  def reset_motion_detectors
    @pose.reset
    @side.reset
    @circle.reset
  end

  def collect_next_motion(expected, sample)
    if expected == "pose"
      @pose.collect(sample)
    elsif expected == "side"
      @side.collect(sample)
    elsif expected == "circle"
      @circle.collect(sample)
    end
  end

  private :expected_action, :show_action, :fail_build, :reset_progress
  private :reset_motion_detectors, :collect_next_motion, :log_animation_timing
end
