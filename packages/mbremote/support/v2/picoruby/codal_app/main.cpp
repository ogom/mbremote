/*
 * BBC micro:bit V2 application entry point for mbremote's mruby/c runtime.
 *
 * Based in part on MicroPython's src/codal_app/main.cpp at commit
 * 3f22f306bcbc3461b0c3c60702b74bbce6689013:
 * https://github.com/microbit-foundation/micropython-microbit-v2/blob/3f22f306bcbc3461b0c3c60702b74bbce6689013/src/codal_app/main.cpp
 *
 * Copyright (c) 2020 Damien P. George
 * Modifications Copyright (c) 2026 mbremote contributors
 *
 * SPDX-License-Identifier: MIT
 */

#include "MicroBit.h"
#include "neopixel.h"

#include <cstring>

extern "C" {
struct VM;
void mrbc_init(void *heap, unsigned int size);
void *mrbc_create_task(const void *bytecode, void *task);
int mrbc_run(void);
void mbremote_picoruby_api_init(struct VM *vm);
extern const unsigned char main_task[];
}

MicroBit uBit;

namespace {
constexpr unsigned int RUBY_HEAP_SIZE = 56 * 1024;
constexpr int NEOPIXEL_MAX_PIXELS = 256;
alignas(8) unsigned char ruby_heap[RUBY_HEAP_SIZE];
bool radio_enabled = false;
NRF52Pin *neopixel_pin = nullptr;
int neopixel_pixel_count = 0;
uint8_t neopixel_buffer[NEOPIXEL_MAX_PIXELS * 3];

NRF52Pin *edge_pin(int number)
{
    switch (number) {
        case 0: return &uBit.io.P0;
        case 1: return &uBit.io.P1;
        case 2: return &uBit.io.P2;
        case 3: return &uBit.io.P3;
        case 4: return &uBit.io.P4;
        case 5: return &uBit.io.P5;
        case 6: return &uBit.io.P6;
        case 7: return &uBit.io.P7;
        case 8: return &uBit.io.P8;
        case 9: return &uBit.io.P9;
        case 10: return &uBit.io.P10;
        case 11: return &uBit.io.P11;
        case 12: return &uBit.io.P12;
        case 13: return &uBit.io.P13;
        case 14: return &uBit.io.P14;
        case 15: return &uBit.io.P15;
        case 16: return &uBit.io.P16;
        case 19: return &uBit.io.P19;
        case 20: return &uBit.io.P20;
        default: return nullptr;
    }
}
}

extern "C" void mbremote_picoruby_serial_write(const void *buffer, int size)
{
    if (buffer == nullptr || size <= 0) {
        return;
    }
    uBit.serial.send(
        const_cast<uint8_t *>(static_cast<const uint8_t *>(buffer)),
        size,
        SYNC_SPINWAIT
    );
}

extern "C" void mbremote_picoruby_idle(void)
{
    fiber_sleep(1);
}

extern "C" void mbremote_picoruby_abort(void)
{
    target_reset();
}

extern "C" void mbremote_microbit_sleep(int milliseconds)
{
    uBit.sleep(milliseconds);
}

extern "C" int mbremote_microbit_running_time(void)
{
    return static_cast<int>(uBit.systemTime() & 0x7fffffffUL);
}

extern "C" void mbremote_microbit_display_clear(void)
{
    uBit.display.clear();
}

extern "C" void mbremote_microbit_display_set_pixel(
    int x,
    int y,
    int brightness
)
{
    const int codal_brightness = (brightness * 255) / 9;
    uBit.display.image.setPixelValue(x, y, codal_brightness);
}

extern "C" int mbremote_microbit_display_get_pixel(int x, int y)
{
    const int codal_brightness = uBit.display.image.getPixelValue(x, y);
    return (codal_brightness * 9 + 127) / 255;
}

extern "C" int mbremote_microbit_display_scroll(const void *text, int length)
{
    if (text == nullptr || length < 0 || length > INT16_MAX) {
        return DEVICE_INVALID_PARAMETER;
    }
    return uBit.display.scroll(ManagedString(
        static_cast<const char *>(text),
        static_cast<int16_t>(length)
    ));
}

extern "C" int mbremote_microbit_button_a_pressed(void)
{
    return uBit.buttonA.isPressed();
}

extern "C" int mbremote_microbit_button_b_pressed(void)
{
    return uBit.buttonB.isPressed();
}

extern "C" int mbremote_microbit_button_a_was_pressed(void)
{
    return uBit.buttonA.wasPressed() > 0;
}

extern "C" int mbremote_microbit_button_b_was_pressed(void)
{
    return uBit.buttonB.wasPressed() > 0;
}

extern "C" int mbremote_microbit_logo_touched(void)
{
    return uBit.logo.isPressed();
}

extern "C" int mbremote_microbit_logo_was_touched(void)
{
    return uBit.logo.wasPressed() > 0;
}

extern "C" int mbremote_microbit_accelerometer_x(void)
{
    return uBit.accelerometer.getX();
}

extern "C" int mbremote_microbit_accelerometer_y(void)
{
    return uBit.accelerometer.getY();
}

extern "C" int mbremote_microbit_accelerometer_z(void)
{
    return uBit.accelerometer.getZ();
}

extern "C" void mbremote_microbit_accelerometer_sample(
    int *x,
    int *y,
    int *z
)
{
    const Sample3D sample = uBit.accelerometer.getSample();
    *x = sample.x;
    *y = sample.y;
    *z = sample.z;
}

extern "C" int mbremote_microbit_pin_available(int number)
{
    return edge_pin(number) != nullptr;
}

extern "C" int mbremote_microbit_pin_write_digital(int number, int value)
{
    NRF52Pin *pin = edge_pin(number);
    return pin == nullptr ? DEVICE_INVALID_PARAMETER : pin->setDigitalValue(value);
}

extern "C" int mbremote_microbit_pin_read_digital(int number)
{
    NRF52Pin *pin = edge_pin(number);
    return pin == nullptr ? DEVICE_INVALID_PARAMETER : pin->getDigitalValue();
}

extern "C" int mbremote_microbit_pin_write_analog(int number, int value)
{
    NRF52Pin *pin = edge_pin(number);
    return pin == nullptr ? DEVICE_INVALID_PARAMETER : pin->setAnalogValue(value);
}

extern "C" int mbremote_microbit_pin_read_analog(int number)
{
    NRF52Pin *pin = edge_pin(number);
    return pin == nullptr ? DEVICE_INVALID_PARAMETER : pin->getAnalogValue();
}

extern "C" int mbremote_microbit_pin_set_analog_period(
    int number,
    int milliseconds
)
{
    NRF52Pin *pin = edge_pin(number);
    if (pin == nullptr) {
        return DEVICE_INVALID_PARAMETER;
    }
    if (!pin->isAnalog() || !pin->isOutput()) {
        const int result = pin->setAnalogValue(0);
        if (result != DEVICE_OK) {
            return result;
        }
    }
    return pin->setAnalogPeriod(milliseconds);
}

extern "C" int mbremote_microbit_neopixel_max_pixels(void)
{
    return NEOPIXEL_MAX_PIXELS;
}

extern "C" int mbremote_microbit_neopixel_pixel_count(void)
{
    return neopixel_pixel_count;
}

extern "C" int mbremote_microbit_neopixel_configure(int pin, int count)
{
    NRF52Pin *output = edge_pin(pin);
    if (output == nullptr || count < 1 || NEOPIXEL_MAX_PIXELS < count) {
        return DEVICE_INVALID_PARAMETER;
    }

    neopixel_pin = output;
    neopixel_pixel_count = count;
    std::memset(neopixel_buffer, 0, count * 3);
    return neopixel_pin->setDigitalValue(0);
}

extern "C" int mbremote_microbit_neopixel_set_pixel(
    int index,
    int red,
    int green,
    int blue
)
{
    if (neopixel_pin == nullptr) {
        return DEVICE_INVALID_STATE;
    }
    if (index < 0 || neopixel_pixel_count <= index) {
        return DEVICE_INVALID_PARAMETER;
    }

    const int offset = index * 3;
    neopixel_buffer[offset] = static_cast<uint8_t>(green);
    neopixel_buffer[offset + 1] = static_cast<uint8_t>(red);
    neopixel_buffer[offset + 2] = static_cast<uint8_t>(blue);
    return DEVICE_OK;
}

extern "C" int mbremote_microbit_neopixel_fill(int red, int green, int blue)
{
    if (neopixel_pin == nullptr) {
        return DEVICE_INVALID_STATE;
    }

    for (int index = 0; index < neopixel_pixel_count; index++) {
        const int offset = index * 3;
        neopixel_buffer[offset] = static_cast<uint8_t>(green);
        neopixel_buffer[offset + 1] = static_cast<uint8_t>(red);
        neopixel_buffer[offset + 2] = static_cast<uint8_t>(blue);
    }
    return DEVICE_OK;
}

extern "C" int mbremote_microbit_neopixel_clear(void)
{
    if (neopixel_pin == nullptr) {
        return DEVICE_INVALID_STATE;
    }

    std::memset(neopixel_buffer, 0, neopixel_pixel_count * 3);
    return DEVICE_OK;
}

extern "C" int mbremote_microbit_neopixel_show(void)
{
    if (neopixel_pin == nullptr) {
        return DEVICE_INVALID_STATE;
    }

    codal::neopixel_send_buffer(
        *neopixel_pin,
        neopixel_buffer,
        neopixel_pixel_count * 3
    );
    return DEVICE_OK;
}

extern "C" int mbremote_microbit_radio_max_message_size(void)
{
    return MICROBIT_RADIO_MAX_PACKET_SIZE - (MICROBIT_RADIO_HEADER_SIZE - 1);
}

extern "C" int mbremote_microbit_radio_enable(
    int group,
    int channel,
    int power
)
{
    int result = uBit.radio.setGroup(static_cast<uint8_t>(group));
    if (result != DEVICE_OK) {
        return result;
    }

    result = uBit.radio.setFrequencyBand(channel);
    if (result != DEVICE_OK) {
        return result;
    }

    result = uBit.radio.setTransmitPower(power);
    if (result != DEVICE_OK) {
        return result;
    }

    result = uBit.radio.enable();
    if (result == DEVICE_OK) {
        radio_enabled = true;
    }
    return result;
}

extern "C" int mbremote_microbit_radio_disable(void)
{
    if (!radio_enabled) {
        return DEVICE_OK;
    }

    const int result = uBit.radio.disable();
    if (result == DEVICE_OK) {
        radio_enabled = false;
    }
    return result;
}

extern "C" int mbremote_microbit_radio_send(
    const void *message,
    int length
)
{
    if (!radio_enabled) {
        return DEVICE_INVALID_STATE;
    }
    if (message == nullptr || length < 0 ||
        length > mbremote_microbit_radio_max_message_size()) {
        return DEVICE_INVALID_PARAMETER;
    }

    return uBit.radio.datagram.send(
        const_cast<uint8_t *>(static_cast<const uint8_t *>(message)),
        length
    );
}

extern "C" int mbremote_microbit_radio_receive(void *message, int capacity)
{
    if (!radio_enabled) {
        return DEVICE_INVALID_STATE;
    }

    const int length = uBit.radio.datagram.recv(
        static_cast<uint8_t *>(message),
        capacity
    );
    return length == DEVICE_INVALID_PARAMETER ? -1 : length;
}

int main()
{
    uBit.init();
    uBit.serial.setRxBufferSize(128);

    static const char banner[] = "mbremote PicoRuby/FemtoRuby (micro:bit V2)\r\n";
    mbremote_picoruby_serial_write(banner, sizeof(banner) - 1);

    mrbc_init(ruby_heap, sizeof(ruby_heap));
    mbremote_picoruby_api_init(nullptr);
    if (mrbc_create_task(main_task, nullptr) == nullptr) {
        static const char error[] = "failed to create Ruby task\r\n";
        mbremote_picoruby_serial_write(error, sizeof(error) - 1);
        return 1;
    }

    const int result = mrbc_run();
    static const char done[] = "Ruby program finished\r\n";
    mbremote_picoruby_serial_write(done, sizeof(done) - 1);
    return result == 1 ? 0 : result;
}
