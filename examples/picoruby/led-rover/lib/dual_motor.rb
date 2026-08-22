class DualMotor
  def initialize(left_motor, right_motor)
    @left_motor = left_motor
    @right_motor = right_motor
    stop
  end

  def drive(left_speed, right_speed)
    drive_motor(@left_motor, left_speed)
    drive_motor(@right_motor, right_speed)
  end

  def forward(speed = 100)
    drive(speed, speed)
  end

  def backward(speed = 100)
    drive(-speed, -speed)
  end

  def turn_right(speed = 100)
    drive(speed, -speed)
  end

  def turn_left(speed = 100)
    drive(-speed, speed)
  end

  def stop
    @left_motor.stop
    @right_motor.stop
  end

  def brake
    @left_motor.brake
    @right_motor.brake
  end

  def drive_motor(motor, speed)
    if speed > 0
      motor.ccw(speed)
    elsif speed < 0
      motor.cw(-speed)
    else
      motor.stop
    end
  end
end
