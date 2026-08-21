RADIO_GROUP = 23
RADIO_CHANNEL = 7
RADIO_POWER = 6

ROLE_CONTROLLER = 0
ROLE_ROVER = 1

LOOP_INTERVAL_MS = 20

IMAGE_WAITING = "09990:90009:00990:00000:00900"
IMAGE_CONTROLLER = "09990:90000:90000:90000:09990"
IMAGE_ROVER = "99900:90090:99900:90090:90009"

def call
  display = Microbit::Display.new
  button = Microbit::Button.new
  role = select_role(display, button)
  radio = Microbit::Radio.new
  radio.enable(RADIO_GROUP, RADIO_CHANNEL, RADIO_POWER)

  if role == ROLE_CONTROLLER
    Controller.new(display, radio, button).run
  else
    Rover.new(display, radio).run
  end
end

def select_role(display, button)
  display.show(IMAGE_WAITING)
  loop do
    if button.a_pressed?
      display.show(IMAGE_CONTROLLER)
      wait_for_buttons_released(button)
      return ROLE_CONTROLLER
    end
    if button.b_pressed?
      display.show(IMAGE_ROVER)
      wait_for_buttons_released(button)
      return ROLE_ROVER
    end
    sleep_ms(LOOP_INTERVAL_MS)
  end
end

def wait_for_buttons_released(button)
  while button.a_pressed? || button.b_pressed?
    sleep_ms(LOOP_INTERVAL_MS)
  end
end

call
