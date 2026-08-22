RADIO_GROUP = 43
RADIO_CHANNEL = 7
RADIO_POWER = 6

def call
  display = Microbit::Display.new
  radio = Microbit::Radio.new
  button = Microbit::Button.new
  logo = Microbit::Logo.new
  accelerometer = Microbit::Accelerometer.new
  lights = MagicCircleLights.new
  magic_circles = [
    DelphiniumMagicCircle.new(lights),
    GerberaMagicCircle.new(lights),
    CloverMagicCircle.new(lights),
    AncientMagicCircle.new(lights)
  ]
  builder = Builder.new(
    display: display,
    accelerometer: accelerometer,
    lights: lights,
    orientation_gesture: OrientationGesture.new,
    pose_gesture: PoseGesture.new,
    side_gesture: SideGesture.new,
    circle_gesture: CircleGesture.new
  )
  radio.enable(RADIO_GROUP, RADIO_CHANNEL, RADIO_POWER)

  game = Game.new(
    display: display,
    button: button,
    logo: logo,
    lights: lights,
    magic_circles: magic_circles,
    builder: builder,
    judge: Judge.new,
    protocol: Protocol.new(radio)
  )
  game.run
end

call
