class Motor:
    def __init__(self, in1, in2, pwm, polarity=1, pwm_period_ms=1):
        if polarity not in (-1, 1):
            raise ValueError("polarity must be -1 or 1")

        self._in1 = in1
        self._in2 = in2
        self._pwm = pwm
        self._polarity = polarity
        self._pwm.set_analog_period(pwm_period_ms)
        self.stop()

    def set_speed(self, speed):
        speed = max(-100, min(100, speed)) * self._polarity

        if speed > 0:
            self._in1.write_digital(1)
            self._in2.write_digital(0)
        elif speed < 0:
            self._in1.write_digital(0)
            self._in2.write_digital(1)
        else:
            self._in1.write_digital(0)
            self._in2.write_digital(0)

        self._pwm.write_analog(abs(speed) * 1023 // 100)

    def cw(self, speed=100):
        self.set_speed(abs(speed))

    def ccw(self, speed=100):
        self.set_speed(-abs(speed))

    def stop(self):
        self.set_speed(0)

    def brake(self):
        self._in1.write_digital(1)
        self._in2.write_digital(1)
        self._pwm.write_analog(1023)
