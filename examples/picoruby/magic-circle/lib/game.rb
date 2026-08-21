class Game
  RADIO_QUEUE_LENGTH = 8
  CAST_WAIT_MS = 10_000
  CAST_LIGHT_DELAY_MS = 100
  RESEND_MIN_MS = 250
  RESEND_MAX_MS = 450
  RESET_RESEND_MS = 300
  LOOP_INTERVAL_MS = 20

  STATE_SELECT = 0
  STATE_READY = 1
  STATE_BUILD = 2
  STATE_WAIT_CAST = 3
  STATE_RESULT = 4

  ROCK = 0
  PAPER = 1
  SCISSORS = 2
  SKULL = 3

  IMAGE_ROCK = "00900:09990:99099:99999:09990"
  IMAGE_PAPER = "99900:90090:90009:90009:99999"
  IMAGE_SCISSORS = "90009:09090:00900:99099:99099"
  IMAGE_DRAW = "00000:99999:00000:99999:00000"
  IMAGE_MODE_ONE = "00900:09900:00900:00900:09990"
  IMAGE_MODE_TWO = "09990:90009:00090:00900:99999"

  HANDS = [IMAGE_ROCK, IMAGE_PAPER, IMAGE_SCISSORS]
  PRACTICE_HANDS = [IMAGE_ROCK, IMAGE_PAPER, IMAGE_SCISSORS, Microbit::Image::SKULL]
  HAND_NAMES = ["rock", "paper", "scissors", "skull"]

  def initialize(
    display:,
    button:,
    logo:,
    lights:,
    magic_circles:,
    builder:,
    judge:,
    protocol:
  )
    @display = display
    @button = button
    @logo = logo
    @lights = lights
    @magic_circles = magic_circles
    @builder = builder
    @judge = judge
    @protocol = protocol

    @state = STATE_SELECT
    @round_no = 0
    @my_choice = ROCK
    @opponent_choice = nil
    @practice_mode = false
    @logo_touching = false
    @ready_acked = false
    @cast_acked = false
    @my_time = nil
    @opponent_time = nil
    @my_wait_until = 0
    @opponent_wait_until = 0
    @last_send_time = 0
    @next_send_interval = 300
    @reset_wait_round = nil
    @last_reset_send_time = 0
    @handled_reset_round = 0
    @round_started = 0
    @builder.reset
    show_selection
    debug("start mode=battle choice=rock")
  end

  def run
    loop do
      loop_started = Microbit.running_time
      received = 0
      while received < RADIO_QUEUE_LENGTH
        break unless receive_message
        received += 1
      end
      now = Microbit.running_time

      if @reset_wait_round &&
         now - @last_reset_send_time >= RESET_RESEND_MS
        send_reset
      end

      handle_logo

      if @button.a_pressed? && @button.b_pressed?
        handle_reset_buttons
        next
      end

      if @state == STATE_SELECT
        update_selection(now)
      elsif @state == STATE_READY
        update_ready(now)
      elsif @state == STATE_BUILD
        update_build
        if @state == STATE_BUILD &&
           @opponent_time &&
           Microbit.running_time >= @opponent_wait_until
          debug("timeout before own cast")
          show_outcome(-1)
        end
      elsif @state == STATE_WAIT_CAST
        update_wait_cast(now)
      end

      remaining = LOOP_INTERVAL_MS - (Microbit.running_time - loop_started)
      Microbit.sleep(remaining) if remaining > 0
    end
  end

  def handle_logo
    touching = @logo.touched?
    if @state == STATE_SELECT && touching && !@logo_touching
      @practice_mode = !@practice_mode
      unless @practice_mode
        @my_choice = ROCK if @my_choice == SKULL
      end
      debug("mode=#{@practice_mode ? "practice" : "battle"}")
      @display.show(@practice_mode ? IMAGE_MODE_ONE : IMAGE_MODE_TWO)
      Microbit.sleep(500)
      show_selection
    end
    @logo_touching = touching
  end

  def handle_reset_buttons
    if @practice_mode
      reset_round(nil)
    else
      @reset_wait_round = @round_no + 1
      reset_round(@reset_wait_round)
      send_reset
    end
    while @button.a_pressed? || @button.b_pressed?
      Microbit.sleep(LOOP_INTERVAL_MS)
    end
    @button.a_was_pressed?
    @button.b_was_pressed?
  end

  def update_selection(now)
    if @button.a_was_pressed?
      choice_count = @practice_mode ? PRACTICE_HANDS.length : HANDS.length
      @my_choice = (@my_choice + 1) % choice_count
      show_selection
      debug("choice=#{HAND_NAMES[@my_choice]}")
    end

    return unless @button.b_was_pressed?

    if @practice_mode
      begin_build
    else
      @state = STATE_READY
      @display.show(Microbit::Image::YES)
      debug("ready round=#{@round_no} choice=#{HAND_NAMES[@my_choice]}")
      send_ready
      @last_send_time = now
      @next_send_interval = next_resend_interval
    end
  end

  def update_ready(now)
    unless @ready_acked
      if now - @last_send_time >= @next_send_interval
        send_ready
        @last_send_time = now
        @next_send_interval = next_resend_interval
      end
    end
    begin_build if @ready_acked && @opponent_choice
  end

  def update_build
    event = @builder.update
    return unless event

    if event[0] == "timeout"
      debug("action timeout expected=#{event[1]} step=#{event[2]}")
    elsif event[0] == "up"
      debug("action=up build reset")
    elsif event[0] == "complete"
      finish_cast
    else
      debug("action=#{event[1]} step=#{event[2]}/#{event[3]}")
    end
  end

  def update_wait_cast(now)
    unless @cast_acked
      if now - @last_send_time >= @next_send_interval
        send_cast
        @last_send_time = now
        @next_send_interval = next_resend_interval
      end
    end

    if @cast_acked && @opponent_time
      show_result
    elsif @opponent_time.nil? && now >= @my_wait_until
      debug("timeout waiting for opponent cast")
      show_outcome(1)
    end
  end

  def begin_build
    @state = STATE_BUILD
    ancient = @practice_mode && @my_choice == SKULL
    @builder.start(ancient)
    @round_started = Microbit.running_time
    debug("build start mode=#{@practice_mode ? "practice" : "battle"} choice=#{HAND_NAMES[@my_choice]}")
  end

  def finish_cast
    finished_at = Microbit.running_time
    @my_time = finished_at - @round_started
    @my_wait_until = finished_at + CAST_WAIT_MS
    debug("cast complete choice=#{HAND_NAMES[@my_choice]} elapsed=#{@my_time}ms")
    @display.show(Microbit::Image::TARGET)

    unless @practice_mode
      @state = STATE_WAIT_CAST
      send_cast
      @last_send_time = Microbit.running_time
      @next_send_interval = next_resend_interval
    end

    Microbit.sleep(CAST_LIGHT_DELAY_MS)
    @magic_circles[@my_choice].show
    if @practice_mode
      @display.show(Microbit::Image::HAPPY)
      @state = STATE_RESULT
      debug("result=complete")
    end
  end

  def show_result
    debug("judge mine=#{HAND_NAMES[@my_choice]} opponent=#{HAND_NAMES[@opponent_choice]} my_time=#{@my_time}ms opponent_time=#{@opponent_time}ms")
    show_outcome(
      @judge.judge(
        @my_choice,
        @opponent_choice,
        @my_time,
        @opponent_time,
        CAST_WAIT_MS
      )
    )
  end

  def show_outcome(result)
    if result > 0
      @display.show(Microbit::Image::HAPPY)
      @lights.show_win_effect
      @magic_circles[@my_choice].show
      name = "win"
    elsif result < 0
      @display.show(Microbit::Image::SAD)
      @lights.show_lose_effect
      name = "lose"
    else
      @display.show(IMAGE_DRAW)
      @lights.show_draw_effect
      @magic_circles[@my_choice].show
      name = "draw"
    end
    @state = STATE_RESULT
    debug("result=#{name}")
  end

  def send_ready
    @protocol.send_ready(@round_no, @my_choice)
  end

  def send_cast
    @protocol.send_cast(@round_no, @my_choice, @my_time)
  end

  def send_reset
    return unless @reset_wait_round
    @protocol.send_reset(@reset_wait_round)
    @last_reset_send_time = Microbit.running_time
  end

  def receive_message
    parts = @protocol.receive
    return false unless parts
    return false if @practice_mode

    return true if parts.length < 2
    kind = parts[0]
    received_round = parts[1].to_i

    if kind == "X" && parts.length == 2
      if received_round > @handled_reset_round
        reset_round(received_round)
        debug("radio reset received round=#{@round_no}")
      end
      @protocol.send_reset_ack(@round_no)
    elsif kind == "Z" && parts.length == 2
      reset_round(received_round) if received_round > @round_no
      if @reset_wait_round && received_round >= @reset_wait_round
        @reset_wait_round = nil
        debug("reset acknowledged round=#{@round_no}")
      end
    elsif kind == "R" && parts.length == 3
      choice = parts[2].to_i
      if received_round == @round_no && choice >= ROCK && choice <= SCISSORS
        first_ready = !@opponent_choice
        @opponent_choice = choice
        debug("opponent ready choice=#{HAND_NAMES[choice]}") if first_ready
        @protocol.send_ready_ack(@round_no)
      elsif received_round == @round_no - 1
        @protocol.send_ready_ack(received_round)
      end
    elsif kind == "A" && parts.length == 2
      if received_round == @round_no
        debug("ready acknowledged") unless @ready_acked
        @ready_acked = true
      end
    elsif kind == "C" && parts.length == 4
      choice = parts[2].to_i
      elapsed = parts[3].to_i
      if received_round == @round_no &&
         choice >= ROCK && choice <= SCISSORS && elapsed >= 0
        @opponent_choice = choice
        unless @opponent_time
          @opponent_wait_until = Microbit.running_time + CAST_WAIT_MS
          debug("opponent cast choice=#{HAND_NAMES[choice]} elapsed=#{elapsed}ms")
        end
        @opponent_time = elapsed
        @protocol.send_cast_ack(@round_no)
      elsif received_round == @round_no - 1
        @protocol.send_cast_ack(received_round)
      end
    elsif kind == "K" && parts.length == 2
      if received_round == @round_no
        debug("cast acknowledged") unless @cast_acked
        @cast_acked = true
      end
    end
    true
  end

  def reset_round(target_round)
    unless @practice_mode
      target_round = @round_no + 1 unless target_round
      @round_no = target_round if target_round > @round_no
      if @round_no > @handled_reset_round
        @handled_reset_round = @round_no
      end
    end

    @state = STATE_SELECT
    @my_choice = ROCK
    @opponent_choice = nil
    @ready_acked = false
    @cast_acked = false
    @my_time = nil
    @opponent_time = nil
    @my_wait_until = 0
    @opponent_wait_until = 0
    @last_send_time = 0
    @next_send_interval = next_resend_interval
    @builder.reset
    show_selection
    debug("round reset round=#{@round_no}")
  end

  def show_selection
    choices = @practice_mode ? PRACTICE_HANDS : HANDS
    @display.show(choices[@my_choice])
  end

  def next_resend_interval
    width = RESEND_MAX_MS - RESEND_MIN_MS + 1
    seed = Microbit.running_time + @round_no * 53 + @my_choice * 29
    RESEND_MIN_MS + seed % width
  end

  def debug(message)
    puts "[magic-circle] #{message}"
  end

  private :handle_logo, :handle_reset_buttons, :update_selection, :update_ready
  private :update_build, :update_wait_cast, :begin_build
  private :finish_cast, :show_result, :show_outcome
  private :send_ready, :send_cast, :send_reset, :receive_message, :reset_round
  private :show_selection, :next_resend_interval, :debug
end
