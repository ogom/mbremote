display = Microbit::Display.new
button = Microbit::Button.new
logo = Microbit::Logo.new
accelerometer = Microbit::Accelerometer.new

IMAGE_CENTER = "00000:00000:00900:00000:00000"
display.show(IMAGE_CENTER)

loop do
  if logo.was_touched?
    display.show(Microbit::Image::DIAMOND)
    puts "logo touched"
  elsif button.a_was_pressed?
    display.show(Microbit::Image::ARROW_W)
    puts "button A pressed"
  elsif button.b_was_pressed?
    display.show(Microbit::Image::ARROW_E)
    puts "button B pressed"
  end

  puts "x=#{accelerometer.x} y=#{accelerometer.y} z=#{accelerometer.z}"
  sleep_ms(250)
end
