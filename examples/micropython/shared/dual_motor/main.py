class DualMotor:
    def __init__(self, left_motor, right_motor):
        self.left_motor = left_motor
        self.right_motor = right_motor
        self.stop()

    @staticmethod
    def _drive_motor(motor, speed):
        if speed > 0:
            motor.ccw(speed)
        elif speed < 0:
            motor.cw(-speed)
        else:
            motor.stop()

    def drive(self, left_speed, right_speed):
        """左右の車輪を -100〜100 の速度で個別に動かす。"""
        self._drive_motor(self.left_motor, left_speed)
        self._drive_motor(self.right_motor, right_speed)

    def forward(self, speed=100):
        self.drive(speed, speed)

    def backward(self, speed=100):
        self.drive(-speed, -speed)

    def turn_right(self, speed=100):
        self.drive(speed, -speed)

    def turn_left(self, speed=100):
        self.drive(-speed, speed)

    def stop(self):
        self.left_motor.stop()
        self.right_motor.stop()

    def brake(self):
        self.left_motor.brake()
        self.right_motor.brake()
