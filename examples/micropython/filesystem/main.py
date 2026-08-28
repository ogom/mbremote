from microbit import display

try:
    with open("message.txt") as file:
        display.scroll(file.read())
except OSError:
    display.show("?")
