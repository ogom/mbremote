class Motor
  def initialize(in1, in2, pwm, polarity = 1, pwm_period_ms = 1)
    raise "polarity must be -1 or 1" unless polarity == -1 || polarity == 1

    @in1 = Microbit::DigitalPin.new(in1, Microbit::DigitalPin::OUT)
    @in2 = Microbit::DigitalPin.new(in2, Microbit::DigitalPin::OUT)
    @pwm = Microbit::AnalogPin.new(pwm, Microbit::AnalogPin::OUT)
    @polarity = polarity
    @pwm.period = pwm_period_ms
    stop
  end

  def set_speed(speed)
    speed = 100 if speed > 100
    speed = -100 if speed < -100
    speed *= @polarity

    if speed > 0
      @in1.write(1)
      @in2.write(0)
      power = speed
    elsif speed < 0
      @in1.write(0)
      @in2.write(1)
      power = -speed
    else
      @in1.write(0)
      @in2.write(0)
      power = 0
    end

    @pwm.write(power * 1023 / 100)
  end

  def cw(speed = 100)
    speed = -speed if speed < 0
    set_speed(speed)
  end

  def ccw(speed = 100)
    speed = -speed if speed < 0
    set_speed(-speed)
  end

  def stop
    set_speed(0)
  end

  def brake
    @in1.write(1)
    @in2.write(1)
    @pwm.write(1023)
  end
end
