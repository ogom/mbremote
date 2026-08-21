/*
 * Copyright (c) 2026 mbremote contributors
 * SPDX-License-Identifier: MIT
 */

#include <stdbool.h>
#include <math.h>

#include <mrubyc.h>

#include "magic_circle_model.h"
#include "ml4f.h"

void mbremote_microbit_sleep(int milliseconds);
int mbremote_microbit_running_time(void);
void mbremote_microbit_display_clear(void);
void mbremote_microbit_display_set_pixel(int x, int y, int brightness);
int mbremote_microbit_display_get_pixel(int x, int y);
int mbremote_microbit_display_scroll(const void *text, int length);
int mbremote_microbit_button_a_pressed(void);
int mbremote_microbit_button_b_pressed(void);
int mbremote_microbit_button_a_was_pressed(void);
int mbremote_microbit_button_b_was_pressed(void);
int mbremote_microbit_logo_touched(void);
int mbremote_microbit_logo_was_touched(void);
int mbremote_microbit_accelerometer_x(void);
int mbremote_microbit_accelerometer_y(void);
int mbremote_microbit_accelerometer_z(void);
void mbremote_microbit_accelerometer_sample(int *x, int *y, int *z);
int mbremote_microbit_pin_available(int number);
int mbremote_microbit_pin_write_digital(int number, int value);
int mbremote_microbit_pin_read_digital(int number);
int mbremote_microbit_pin_write_analog(int number, int value);
int mbremote_microbit_pin_read_analog(int number);
int mbremote_microbit_pin_set_analog_period(int number, int milliseconds);
int mbremote_microbit_neopixel_max_pixels(void);
int mbremote_microbit_neopixel_pixel_count(void);
int mbremote_microbit_neopixel_configure(int pin, int count);
int mbremote_microbit_neopixel_set_pixel(
    int index,
    int red,
    int green,
    int blue
);
int mbremote_microbit_neopixel_fill(int red, int green, int blue);
int mbremote_microbit_neopixel_clear(void);
int mbremote_microbit_neopixel_show(void);
int mbremote_microbit_radio_max_message_size(void);
int mbremote_microbit_radio_enable(int group, int channel, int power);
int mbremote_microbit_radio_disable(void);
int mbremote_microbit_radio_send(const void *message, int length);
int mbremote_microbit_radio_receive(void *message, int capacity);

static bool expect_arguments(mrbc_vm *vm, int argc, int expected)
{
    if (argc == expected) {
        return true;
    }
    mrbc_raisef(
        vm,
        MRBC_CLASS(ArgumentError),
        "wrong number of arguments (given %d, expected %d)",
        argc,
        expected
    );
    return false;
}

static void define_image_constant(
    mrbc_vm *vm,
    mrbc_class *image,
    const char *name,
    const char *pattern
)
{
    mrbc_value value = mrbc_string_new_cstr(vm, pattern);
    mrbc_set_class_const(image, mrbc_str_to_symid(name), &value);
}

static bool integer_argument(
    mrbc_vm *vm,
    mrbc_value *value,
    int argument_number,
    int *result
)
{
    if (mrbc_type(*value) == MRBC_TT_INTEGER) {
        *result = value->i;
        return true;
    }
    mrbc_raisef(
        vm,
        MRBC_CLASS(TypeError),
        "argument %d must be Integer",
        argument_number
    );
    return false;
}

enum {
    ML_INPUT_SIZE = 24,
    ML_OUTPUT_SIZE = 5,
    ML_AXIS_COUNT = 3,
    ML_FEATURES_PER_AXIS = 8,
    ML_MAX_SAMPLES = 64,
    ML_DEVICE_SAMPLES_LENGTH = 50
};

#define ML_SIDE_MIN_X_STDDEV 0.20f
#define ML_SIDE_MIN_Y_STDDEV 0.20f
#define ML_SIDE_MAX_Z_STDDEV 0.45f
#define ML_SIDE_MAX_Z_MEAN -0.55f

static uint8_t ml_model_arena[
    MBREMOTE_MAGIC_CIRCLE_MODEL_ARENA_BYTES
] __attribute__((aligned(4)));

static bool ml_array_argument(
    mrbc_vm *vm,
    mrbc_value *value,
    int argument_number,
    int expected_size
)
{
    if (mrbc_type(*value) != MRBC_TT_ARRAY) {
        mrbc_raisef(
            vm,
            MRBC_CLASS(TypeError),
            "argument %d must be Array",
            argument_number
        );
        return false;
    }
    if (expected_size >= 0 && mrbc_array_size(value) != expected_size) {
        mrbc_raisef(
            vm,
            MRBC_CLASS(ArgumentError),
            "argument %d has invalid size",
            argument_number
        );
        return false;
    }
    return true;
}

static bool ml_number_at(
    mrbc_vm *vm,
    mrbc_value *array,
    int index,
    int argument_number,
    float *result
)
{
    mrbc_value *value = mrbc_array_get_p(array, index);
    if (value != NULL && mrbc_type(*value) == MRBC_TT_INTEGER) {
        *result = (float)mrbc_integer(*value);
        return true;
    }
    if (value != NULL && mrbc_type(*value) == MRBC_TT_FLOAT) {
        *result = (float)mrbc_float(*value);
        return true;
    }
    mrbc_raisef(
        vm,
        MRBC_CLASS(TypeError),
        "argument %d must contain numbers",
        argument_number
    );
    return false;
}

static float ml_peaks(const float *values, int length)
{
    const int lag = 5;
    float filtered[ML_MAX_SAMPLES];
    float window_total = 0.0f;
    float window_squared_total = 0.0f;
    for (int index = 0; index < length; index++) {
        const float value = values[index];
        filtered[index] = value;
        if (index < lag) {
            window_total += value;
            window_squared_total += value * value;
        }
    }

    float average = window_total / lag;
    float deviation = average;
    float deviation_squared = 0.0f;
    bool has_deviation_squared = false;
    int previous_signal = 0;
    int count = 0;

    for (int index = lag; index < length; index++) {
        const float difference = fabsf(values[index] - average);
        const bool over_deviation = has_deviation_squared
            ? difference * difference > 12.25f * deviation_squared
            : difference > 3.5f * deviation;
        int signal;
        if (difference > 0.1f && over_deviation) {
            signal = values[index] > average ? 1 : -1;
            if (signal == 1 && previous_signal == 0) {
                count++;
            }
            filtered[index] = 0.5f * (values[index] + filtered[index - 1]);
        } else {
            signal = 0;
            filtered[index] = values[index];
        }

        if (index > lag) {
            const float removed = filtered[index - lag - 1];
            const float added = filtered[index - 1];
            window_total += added - removed;
            window_squared_total += added * added - removed * removed;
        }
        average = window_total / lag;
        deviation_squared = window_squared_total / lag - average * average;
        if (deviation_squared < 0.0f) {
            deviation_squared = 0.0f;
        }
        has_deviation_squared = true;
        previous_signal = signal;
    }
    return (float)count;
}

static bool ml_axis_features(
    mrbc_vm *vm,
    mrbc_value *values,
    int argument_number,
    float *features
)
{
    const int length = mrbc_array_size(values);
    float normalized[ML_MAX_SAMPLES];
    float total = 0.0f;
    float squared_total = 0.0f;
    float absolute_total = 0.0f;
    float minimum = 0.0f;
    float maximum = 0.0f;
    int crossings = 0;

    for (int index = 0; index < length; index++) {
        float raw_value;
        if (!ml_number_at(vm, values, index, argument_number, &raw_value)) {
            return false;
        }
        const float value = raw_value / 1000.0f;
        normalized[index] = value;
        total += value;
        squared_total += value * value;
        absolute_total += fabsf(value);
        if (index == 0 || value < minimum) {
            minimum = value;
        }
        if (index == 0 || value > maximum) {
            maximum = value;
        }
        if (index > 0 &&
            ((value >= 0.0f && normalized[index - 1] < 0.0f) ||
             (value < 0.0f && normalized[index - 1] >= 0.0f))) {
            crossings++;
        }
    }

    const float average = total / length;
    float variance_total = 0.0f;
    for (int index = 0; index < length; index++) {
        const float difference = normalized[index] - average;
        variance_total += difference * difference;
    }

    features[0] = maximum;
    features[1] = average;
    features[2] = minimum;
    features[3] = sqrtf(variance_total / length);
    features[4] = ml_peaks(normalized, length);
    features[5] = absolute_total * ML_DEVICE_SAMPLES_LENGTH / length;
    features[6] = (float)crossings / (length - 1);
    features[7] = sqrtf(squared_total / length);
    return true;
}

static void c_ml_evaluate(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 3)) {
        return;
    }
    if (!ml_array_argument(vm, &v[1], 1, -1)) {
        return;
    }
    const int sample_count = mrbc_array_size(&v[1]);
    if (sample_count < 5 || sample_count > ML_MAX_SAMPLES) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "sample count must be 5..64");
        return;
    }
    if (!ml_array_argument(vm, &v[2], 2, sample_count) ||
        !ml_array_argument(vm, &v[3], 3, sample_count)) {
        return;
    }

    float axis_features[ML_AXIS_COUNT][ML_FEATURES_PER_AXIS];
    for (int axis = 0; axis < ML_AXIS_COUNT; axis++) {
        if (!ml_axis_features(vm, &v[axis + 1], axis + 1, axis_features[axis])) {
            return;
        }
    }
    float features[ML_INPUT_SIZE];
    for (int feature = 0; feature < ML_FEATURES_PER_AXIS; feature++) {
        for (int axis = 0; axis < ML_AXIS_COUNT; axis++) {
            features[feature * ML_AXIS_COUNT + axis] = axis_features[axis][feature];
        }
    }

    float probabilities[ML_OUTPUT_SIZE];
    const ml4f_header_t *model = (const ml4f_header_t *)(
        mbremote_magic_circle_model
    );
    if (!ml4f_is_valid_header(model) ||
        model->arena_bytes > sizeof(ml_model_arena) ||
        ml4f_shape_elements(ml4f_input_shape(model)) != ML_INPUT_SIZE ||
        ml4f_shape_elements(ml4f_output_shape(model)) != ML_OUTPUT_SIZE) {
        mrbc_raise(vm, MRBC_CLASS(RuntimeError), "invalid ML4F model");
        return;
    }
    if (ml4f_full_invoke_arena(
        model,
        ml_model_arena,
        features,
        probabilities
    ) != 0) {
        mrbc_raise(vm, MRBC_CLASS(RuntimeError), "ML4F inference failed");
        return;
    }

    int best_index = 0;
    float best_confidence = 0.0f;
    float best_delta = -2.0f;
    for (int index = 0; index < ML_OUTPUT_SIZE; index++) {
        const float confidence = probabilities[index];
        const float delta = confidence -
            mbremote_magic_circle_required_confidence[index];
        if (delta > best_delta) {
            best_index = index;
            best_confidence = confidence;
            best_delta = delta;
        }
    }

    bool confident = best_confidence >=
        mbremote_magic_circle_required_confidence[best_index];
    if (confident && best_index <= 2) {
        float motion = features[9];
        if (features[10] > motion) motion = features[10];
        if (features[11] > motion) motion = features[11];
        confident = motion >=
            mbremote_magic_circle_minimum_gesture_motion;
    }

    const bool side_fallback =
        features[9] >= ML_SIDE_MIN_X_STDDEV &&
        features[10] >= ML_SIDE_MIN_Y_STDDEV &&
        features[11] <= ML_SIDE_MAX_Z_STDDEV &&
        features[5] <= ML_SIDE_MAX_Z_MEAN;

    mrbc_value result = mrbc_array_new(vm, 8);
    mrbc_array_set(&result, 0, &mrbc_integer_value(best_index));
    mrbc_array_set(&result, 1, &mrbc_float_value(vm, best_confidence));
    mrbc_array_set(&result, 2, &mrbc_bool_value(confident));
    mrbc_array_set(&result, 3, &mrbc_bool_value(side_fallback));
    mrbc_array_set(&result, 4, &mrbc_float_value(vm, features[9]));
    mrbc_array_set(&result, 5, &mrbc_float_value(vm, features[10]));
    mrbc_array_set(&result, 6, &mrbc_float_value(vm, features[11]));
    mrbc_array_set(&result, 7, &mrbc_float_value(vm, features[5]));
    SET_RETURN(result);
}

static bool string_argument(
    mrbc_vm *vm,
    mrbc_value *value,
    int argument_number
)
{
    if (mrbc_type(*value) == MRBC_TT_STRING) {
        return true;
    }
    mrbc_raisef(
        vm,
        MRBC_CLASS(TypeError),
        "argument %d must be String",
        argument_number
    );
    return false;
}

static bool pin_argument(
    mrbc_vm *vm,
    mrbc_value *value,
    int argument_number,
    int *result
)
{
    if (!integer_argument(vm, value, argument_number, result)) {
        return false;
    }
    if (mbremote_microbit_pin_available(*result)) {
        return true;
    }
    mrbc_raise(
        vm,
        MRBC_CLASS(ArgumentError),
        "pin must be 0..16, 19, or 20"
    );
    return false;
}

enum {
    PIN_MODE_IN = 0,
    PIN_MODE_OUT = 1
};

static void define_pin_mode_constants(mrbc_class *pin)
{
    mrbc_set_class_const(
        pin,
        mrbc_str_to_symid("IN"),
        &mrbc_integer_value(PIN_MODE_IN)
    );
    mrbc_set_class_const(
        pin,
        mrbc_str_to_symid("OUT"),
        &mrbc_integer_value(PIN_MODE_OUT)
    );
}

static mrbc_sym pin_number_sym;
static mrbc_sym pin_mode_sym;

static bool pin_attribute(
    mrbc_vm *vm,
    mrbc_value *self,
    mrbc_sym attribute,
    const char *name,
    int *result
)
{
    mrbc_value *value = mrbc_instance_getiv_p(self, attribute);
    if (value != NULL && mrbc_type(*value) == MRBC_TT_INTEGER) {
        *result = value->i;
        return true;
    }
    mrbc_raisef(vm, MRBC_CLASS(RuntimeError), "Pin %s is not initialized", name);
    return false;
}

static bool initialized_pin(
    mrbc_vm *vm,
    mrbc_value *self,
    int required_mode,
    int *result
)
{
    int mode;
    if (!pin_attribute(vm, self, pin_number_sym, "number", result) ||
        !pin_attribute(vm, self, pin_mode_sym, "mode", &mode)) {
        return false;
    }
    if (mode == required_mode) {
        return true;
    }
    mrbc_raise(
        vm,
        MRBC_CLASS(RuntimeError),
        required_mode == PIN_MODE_OUT
            ? "Pin is not configured for output"
            : "Pin is not configured for input"
    );
    return false;
}

static bool initialized_pin_number(
    mrbc_vm *vm,
    mrbc_value *self,
    int *result
)
{
    return pin_attribute(vm, self, pin_number_sym, "number", result);
}

static bool pin_operation_succeeded(
    mrbc_vm *vm,
    const char *operation,
    int result
)
{
    if (result == 0) {
        return true;
    }
    mrbc_raisef(
        vm,
        MRBC_CLASS(RuntimeError),
        "pin %s failed (%d)",
        operation,
        result
    );
    return false;
}

static bool color_argument(
    mrbc_vm *vm,
    mrbc_value *value,
    int argument_number,
    int *result
)
{
    if (!integer_argument(vm, value, argument_number, result)) {
        return false;
    }
    if (0 <= *result && *result <= 255) {
        return true;
    }
    mrbc_raisef(
        vm,
        MRBC_CLASS(ArgumentError),
        "color argument %d must be 0..255",
        argument_number
    );
    return false;
}

static bool neopixel_operation_succeeded(
    mrbc_vm *vm,
    const char *operation,
    int result
)
{
    if (result == 0) {
        return true;
    }
    mrbc_raisef(
        vm,
        MRBC_CLASS(RuntimeError),
        "NeoPixel %s failed (%d)",
        operation,
        result
    );
    return false;
}

static bool radio_operation_succeeded(
    mrbc_vm *vm,
    const char *operation,
    int result
)
{
    if (result == 0) {
        return true;
    }
    mrbc_raisef(
        vm,
        MRBC_CLASS(RuntimeError),
        "radio %s failed (%d)",
        operation,
        result
    );
    return false;
}

static bool pixel_coordinates(mrbc_vm *vm, int x, int y)
{
    if (0 <= x && x <= 4 && 0 <= y && y <= 4) {
        return true;
    }
    mrbc_raise(vm, MRBC_CLASS(ArgumentError), "pixel coordinates must be 0..4");
    return false;
}

static void c_microbit_sleep(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int milliseconds;
    if (!expect_arguments(vm, argc, 1) ||
        !integer_argument(vm, &v[1], 1, &milliseconds)) {
        return;
    }
    if (milliseconds < 0) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "milliseconds must be 0 or greater");
        return;
    }
    mbremote_microbit_sleep(milliseconds);
    SET_NIL_RETURN();
}

static void c_microbit_running_time(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_INT_RETURN(mbremote_microbit_running_time());
}

static void c_display_clear(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    mbremote_microbit_display_clear();
    SET_NIL_RETURN();
}

static void c_display_set_pixel(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int x;
    int y;
    int brightness;
    if (!expect_arguments(vm, argc, 3) ||
        !integer_argument(vm, &v[1], 1, &x) ||
        !integer_argument(vm, &v[2], 2, &y) ||
        !integer_argument(vm, &v[3], 3, &brightness)) {
        return;
    }
    if (!pixel_coordinates(vm, x, y)) {
        return;
    }
    if (brightness < 0 || 9 < brightness) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "brightness must be 0..9");
        return;
    }
    mbremote_microbit_display_set_pixel(x, y, brightness);
    SET_NIL_RETURN();
}

static void c_display_get_pixel(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int x;
    int y;
    if (!expect_arguments(vm, argc, 2) ||
        !integer_argument(vm, &v[1], 1, &x) ||
        !integer_argument(vm, &v[2], 2, &y)) {
        return;
    }
    if (!pixel_coordinates(vm, x, y)) {
        return;
    }
    SET_INT_RETURN(mbremote_microbit_display_get_pixel(x, y));
}

static void c_display_show(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 1) ||
        !string_argument(vm, &v[1], 1)) {
        return;
    }

    const int size = v[1].string->size;
    const bool separated = size == 29;
    if (size != 25 && !separated) {
        mrbc_raise(
            vm,
            MRBC_CLASS(ArgumentError),
            "display pattern must contain five rows of five digits"
        );
        return;
    }

    const unsigned char *pattern = v[1].string->data;
    for (int y = 0; y < 5; y++) {
        if (separated && y < 4 && pattern[y * 6 + 5] != ':') {
            mrbc_raise(
                vm,
                MRBC_CLASS(ArgumentError),
                "display pattern rows must be separated by colons"
            );
            return;
        }
        for (int x = 0; x < 5; x++) {
            const int offset = separated ? y * 6 + x : y * 5 + x;
            if (pattern[offset] < '0' || '9' < pattern[offset]) {
                mrbc_raise(
                    vm,
                    MRBC_CLASS(ArgumentError),
                    "display brightness must be 0..9"
                );
                return;
            }
        }
    }

    for (int y = 0; y < 5; y++) {
        for (int x = 0; x < 5; x++) {
            const int offset = separated ? y * 6 + x : y * 5 + x;
            mbremote_microbit_display_set_pixel(x, y, pattern[offset] - '0');
        }
    }
    SET_NIL_RETURN();
}

static void c_display_scroll(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 1) ||
        !string_argument(vm, &v[1], 1)) {
        return;
    }

    const int result = mbremote_microbit_display_scroll(
        v[1].string->data,
        v[1].string->size
    );
    if (result != 0) {
        mrbc_raisef(vm, MRBC_CLASS(RuntimeError), "display scroll failed (%d)", result);
        return;
    }
    SET_NIL_RETURN();
}

static void c_button_a_pressed(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_BOOL_RETURN(mbremote_microbit_button_a_pressed());
}

static void c_button_b_pressed(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_BOOL_RETURN(mbremote_microbit_button_b_pressed());
}

static void c_button_a_was_pressed(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_BOOL_RETURN(mbremote_microbit_button_a_was_pressed());
}

static void c_button_b_was_pressed(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_BOOL_RETURN(mbremote_microbit_button_b_was_pressed());
}

static void c_logo_touched(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_BOOL_RETURN(mbremote_microbit_logo_touched());
}

static void c_logo_was_touched(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_BOOL_RETURN(mbremote_microbit_logo_was_touched());
}

static void c_accelerometer_x(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_INT_RETURN(mbremote_microbit_accelerometer_x());
}

static void c_accelerometer_y(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_INT_RETURN(mbremote_microbit_accelerometer_y());
}

static void c_accelerometer_z(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    SET_INT_RETURN(mbremote_microbit_accelerometer_z());
}

static void c_accelerometer_sample(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int x;
    int y;
    int z;
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }

    mbremote_microbit_accelerometer_sample(&x, &y, &z);
    mrbc_value result = mrbc_array_new(vm, 3);
    mrbc_array_set(&result, 0, &mrbc_integer_value(x));
    mrbc_array_set(&result, 1, &mrbc_integer_value(y));
    mrbc_array_set(&result, 2, &mrbc_integer_value(z));
    SET_RETURN(result);
}

static void c_pin_initialize(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int pin;
    int mode;
    if (!expect_arguments(vm, argc, 2) ||
        !pin_argument(vm, &v[1], 1, &pin) ||
        !integer_argument(vm, &v[2], 2, &mode)) {
        return;
    }
    if (mode != PIN_MODE_IN && mode != PIN_MODE_OUT) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "Pin mode must be IN or OUT");
        return;
    }
    mrbc_instance_setiv(&v[0], pin_number_sym, &v[1]);
    mrbc_instance_setiv(&v[0], pin_mode_sym, &v[2]);
    /* Keep v[0] as self so mruby/c's Class#new returns the Pin instance. */
}

static void c_analog_read_write_pin_initialize(
    mrbc_vm *vm,
    mrbc_value *v,
    int argc
)
{
    int pin;
    if (!expect_arguments(vm, argc, 1) ||
        !pin_argument(vm, &v[1], 1, &pin)) {
        return;
    }
    mrbc_instance_setiv(&v[0], pin_number_sym, &v[1]);
    /* Keep v[0] as self so mruby/c's Class#new returns the Pin instance. */
}

static void c_digital_pin_write(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int pin;
    int value;
    if (!expect_arguments(vm, argc, 1) ||
        !initialized_pin(vm, &v[0], PIN_MODE_OUT, &pin) ||
        !integer_argument(vm, &v[1], 1, &value)) {
        return;
    }
    if (value != 0 && value != 1) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "digital value must be 0 or 1");
        return;
    }
    if (!pin_operation_succeeded(
            vm,
            "write_digital",
            mbremote_microbit_pin_write_digital(pin, value))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_digital_pin_read(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int pin;
    if (!expect_arguments(vm, argc, 0) ||
        !initialized_pin(vm, &v[0], PIN_MODE_IN, &pin)) {
        return;
    }
    const int result = mbremote_microbit_pin_read_digital(pin);
    if (result < 0) {
        pin_operation_succeeded(vm, "read_digital", result);
        return;
    }
    SET_INT_RETURN(result);
}

static void c_analog_pin_write(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int pin;
    int value;
    if (!expect_arguments(vm, argc, 1) ||
        !initialized_pin(vm, &v[0], PIN_MODE_OUT, &pin) ||
        !integer_argument(vm, &v[1], 1, &value)) {
        return;
    }
    if (value < 0 || 1023 < value) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "analog value must be 0..1023");
        return;
    }
    if (!pin_operation_succeeded(
            vm,
            "write_analog",
            mbremote_microbit_pin_write_analog(pin, value))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_analog_pin_read(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int pin;
    if (!expect_arguments(vm, argc, 0) ||
        !initialized_pin(vm, &v[0], PIN_MODE_IN, &pin)) {
        return;
    }
    const int result = mbremote_microbit_pin_read_analog(pin);
    if (result < 0) {
        pin_operation_succeeded(vm, "read_analog", result);
        return;
    }
    SET_INT_RETURN(result);
}

static void c_analog_pin_set_period(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int pin;
    int milliseconds;
    if (!expect_arguments(vm, argc, 1) ||
        !initialized_pin(vm, &v[0], PIN_MODE_OUT, &pin) ||
        !integer_argument(vm, &v[1], 1, &milliseconds)) {
        return;
    }
    if (milliseconds < 1 || 262 < milliseconds) {
        mrbc_raise(
            vm,
            MRBC_CLASS(ArgumentError),
            "analog period must be 1..262 milliseconds"
        );
        return;
    }
    if (!pin_operation_succeeded(
            vm,
            "set_analog_period",
            mbremote_microbit_pin_set_analog_period(pin, milliseconds))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_analog_read_write_pin_write(
    mrbc_vm *vm,
    mrbc_value *v,
    int argc
)
{
    int pin;
    int value;
    if (!expect_arguments(vm, argc, 1) ||
        !initialized_pin_number(vm, &v[0], &pin) ||
        !integer_argument(vm, &v[1], 1, &value)) {
        return;
    }
    if (value < 0 || 1023 < value) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "analog value must be 0..1023");
        return;
    }
    if (!pin_operation_succeeded(
            vm,
            "write_analog",
            mbremote_microbit_pin_write_analog(pin, value))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_analog_read_write_pin_read(
    mrbc_vm *vm,
    mrbc_value *v,
    int argc
)
{
    int pin;
    if (!expect_arguments(vm, argc, 0) ||
        !initialized_pin_number(vm, &v[0], &pin)) {
        return;
    }
    const int result = mbremote_microbit_pin_read_analog(pin);
    if (result < 0) {
        pin_operation_succeeded(vm, "read_analog", result);
        return;
    }
    SET_INT_RETURN(result);
}

static void c_analog_read_write_pin_set_period(
    mrbc_vm *vm,
    mrbc_value *v,
    int argc
)
{
    int pin;
    int milliseconds;
    if (!expect_arguments(vm, argc, 1) ||
        !initialized_pin_number(vm, &v[0], &pin) ||
        !integer_argument(vm, &v[1], 1, &milliseconds)) {
        return;
    }
    if (milliseconds < 1 || 262 < milliseconds) {
        mrbc_raise(
            vm,
            MRBC_CLASS(ArgumentError),
            "analog period must be 1..262 milliseconds"
        );
        return;
    }
    if (!pin_operation_succeeded(
            vm,
            "set_analog_period",
            mbremote_microbit_pin_set_analog_period(pin, milliseconds))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_neopixel_configure(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int pin;
    int count;
    if (!expect_arguments(vm, argc, 2) ||
        !pin_argument(vm, &v[1], 1, &pin) ||
        !integer_argument(vm, &v[2], 2, &count)) {
        return;
    }
    const int maximum = mbremote_microbit_neopixel_max_pixels();
    if (count < 1 || maximum < count) {
        mrbc_raisef(
            vm,
            MRBC_CLASS(ArgumentError),
            "NeoPixel count must be 1..%d",
            maximum
        );
        return;
    }
    if (!neopixel_operation_succeeded(
            vm,
            "configure",
            mbremote_microbit_neopixel_configure(pin, count))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_neopixel_set_pixel(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int index;
    int red;
    int green;
    int blue;
    if (!expect_arguments(vm, argc, 4) ||
        !integer_argument(vm, &v[1], 1, &index) ||
        !color_argument(vm, &v[2], 2, &red) ||
        !color_argument(vm, &v[3], 3, &green) ||
        !color_argument(vm, &v[4], 4, &blue)) {
        return;
    }

    const int count = mbremote_microbit_neopixel_pixel_count();
    if (count < 1) {
        mrbc_raise(vm, MRBC_CLASS(RuntimeError), "NeoPixel is not configured");
        return;
    }
    if (index < 0 || count <= index) {
        mrbc_raisef(
            vm,
            MRBC_CLASS(ArgumentError),
            "NeoPixel index must be 0..%d",
            count - 1
        );
        return;
    }
    if (!neopixel_operation_succeeded(
            vm,
            "set_pixel",
            mbremote_microbit_neopixel_set_pixel(index, red, green, blue))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_neopixel_fill(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int red;
    int green;
    int blue;
    if (!expect_arguments(vm, argc, 3) ||
        !color_argument(vm, &v[1], 1, &red) ||
        !color_argument(vm, &v[2], 2, &green) ||
        !color_argument(vm, &v[3], 3, &blue)) {
        return;
    }
    if (!neopixel_operation_succeeded(
            vm,
            "fill",
            mbremote_microbit_neopixel_fill(red, green, blue))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_neopixel_clear(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    if (!neopixel_operation_succeeded(
            vm,
            "clear",
            mbremote_microbit_neopixel_clear())) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_neopixel_show(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    if (!neopixel_operation_succeeded(
            vm,
            "show",
            mbremote_microbit_neopixel_show())) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_radio_enable(mrbc_vm *vm, mrbc_value *v, int argc)
{
    int group;
    int channel = 7;
    int power = 6;
    if (argc != 1 && argc != 3) {
        mrbc_raisef(
            vm,
            MRBC_CLASS(ArgumentError),
            "wrong number of arguments (given %d, expected 1 or 3)",
            argc
        );
        return;
    }
    if (!integer_argument(vm, &v[1], 1, &group) ||
        (argc == 3 &&
         (!integer_argument(vm, &v[2], 2, &channel) ||
          !integer_argument(vm, &v[3], 3, &power)))) {
        return;
    }
    if (group < 0 || 255 < group) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "radio group must be 0..255");
        return;
    }
    if (channel < 0 || 83 < channel) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "radio channel must be 0..83");
        return;
    }
    if (power < 0 || 7 < power) {
        mrbc_raise(vm, MRBC_CLASS(ArgumentError), "radio power must be 0..7");
        return;
    }
    if (!radio_operation_succeeded(
            vm,
            "enable",
            mbremote_microbit_radio_enable(group, channel, power))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_radio_disable(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }
    if (!radio_operation_succeeded(
            vm,
            "disable",
            mbremote_microbit_radio_disable())) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_radio_send(mrbc_vm *vm, mrbc_value *v, int argc)
{
    if (!expect_arguments(vm, argc, 1) ||
        !string_argument(vm, &v[1], 1)) {
        return;
    }

    const int length = v[1].string->size;
    const int maximum = mbremote_microbit_radio_max_message_size();
    if (length > maximum) {
        mrbc_raisef(
            vm,
            MRBC_CLASS(ArgumentError),
            "radio message must be %d bytes or fewer",
            maximum
        );
        return;
    }
    if (!radio_operation_succeeded(
            vm,
            "send",
            mbremote_microbit_radio_send(v[1].string->data, length))) {
        return;
    }
    SET_NIL_RETURN();
}

static void c_radio_receive(mrbc_vm *vm, mrbc_value *v, int argc)
{
    unsigned char message[32];
    if (!expect_arguments(vm, argc, 0)) {
        return;
    }

    const int length = mbremote_microbit_radio_receive(
        message,
        sizeof(message)
    );
    if (length == -1) {
        SET_NIL_RETURN();
        return;
    }
    if (length < 0) {
        radio_operation_succeeded(vm, "receive", length);
        return;
    }
    SET_RETURN(mrbc_string_new(vm, message, length));
}

void mbremote_picoruby_api_init(mrbc_vm *vm)
{
    mrbc_class *microbit = mrbc_define_module(vm, "Microbit");
    mrbc_class *display =
        mrbc_define_class_under(vm, microbit, "Display", mrbc_class_object);
    mrbc_class *image =
        mrbc_define_class_under(vm, microbit, "Image", mrbc_class_object);
    mrbc_class *button =
        mrbc_define_class_under(vm, microbit, "Button", mrbc_class_object);
    mrbc_class *logo =
        mrbc_define_class_under(vm, microbit, "Logo", mrbc_class_object);
    mrbc_class *accelerometer =
        mrbc_define_class_under(vm, microbit, "Accelerometer", mrbc_class_object);
    mrbc_class *digital_pin =
        mrbc_define_class_under(vm, microbit, "DigitalPin", mrbc_class_object);
    mrbc_class *analog_pin =
        mrbc_define_class_under(vm, microbit, "AnalogPin", mrbc_class_object);
    mrbc_class *analog_read_write_pin = mrbc_define_class_under(
        vm,
        microbit,
        "AnalogReadWritePin",
        mrbc_class_object
    );
    mrbc_class *neopixel =
        mrbc_define_class_under(vm, microbit, "NeoPixel", mrbc_class_object);
    mrbc_class *radio =
        mrbc_define_class_under(vm, microbit, "Radio", mrbc_class_object);
    mrbc_class *ml = mrbc_define_module_under(vm, microbit, "ML");

    mrbc_define_method(vm, microbit, "sleep", c_microbit_sleep);
    mrbc_define_method(vm, microbit, "running_time", c_microbit_running_time);
    mrbc_define_method(vm, display, "clear", c_display_clear);
    mrbc_define_method(vm, display, "show", c_display_show);
    mrbc_define_method(vm, display, "scroll", c_display_scroll);
    mrbc_define_method(vm, display, "set_pixel", c_display_set_pixel);
    mrbc_define_method(vm, display, "get_pixel", c_display_get_pixel);
    mrbc_define_method(vm, button, "a_pressed?", c_button_a_pressed);
    mrbc_define_method(vm, button, "b_pressed?", c_button_b_pressed);
    mrbc_define_method(vm, button, "a_was_pressed?", c_button_a_was_pressed);
    mrbc_define_method(vm, button, "b_was_pressed?", c_button_b_was_pressed);
    mrbc_define_method(vm, logo, "touched?", c_logo_touched);
    mrbc_define_method(vm, logo, "was_touched?", c_logo_was_touched);
    mrbc_define_method(vm, accelerometer, "x", c_accelerometer_x);
    mrbc_define_method(vm, accelerometer, "y", c_accelerometer_y);
    mrbc_define_method(vm, accelerometer, "z", c_accelerometer_z);
    mrbc_define_method(vm, accelerometer, "sample", c_accelerometer_sample);
    pin_number_sym = mrbc_str_to_symid("number");
    pin_mode_sym = mrbc_str_to_symid("mode");
    define_pin_mode_constants(digital_pin);
    define_pin_mode_constants(analog_pin);
    mrbc_define_method(vm, digital_pin, "initialize", c_pin_initialize);
    mrbc_define_method(vm, digital_pin, "write", c_digital_pin_write);
    mrbc_define_method(vm, digital_pin, "read", c_digital_pin_read);
    mrbc_define_method(vm, analog_pin, "initialize", c_pin_initialize);
    mrbc_define_method(vm, analog_pin, "write", c_analog_pin_write);
    mrbc_define_method(vm, analog_pin, "read", c_analog_pin_read);
    mrbc_define_method(vm, analog_pin, "period=", c_analog_pin_set_period);
    mrbc_define_method(
        vm,
        analog_read_write_pin,
        "initialize",
        c_analog_read_write_pin_initialize
    );
    mrbc_define_method(
        vm,
        analog_read_write_pin,
        "write",
        c_analog_read_write_pin_write
    );
    mrbc_define_method(
        vm,
        analog_read_write_pin,
        "read",
        c_analog_read_write_pin_read
    );
    mrbc_define_method(
        vm,
        analog_read_write_pin,
        "period=",
        c_analog_read_write_pin_set_period
    );
    mrbc_define_method(vm, neopixel, "configure", c_neopixel_configure);
    mrbc_define_method(vm, neopixel, "set_pixel", c_neopixel_set_pixel);
    mrbc_define_method(vm, neopixel, "fill", c_neopixel_fill);
    mrbc_define_method(vm, neopixel, "clear", c_neopixel_clear);
    mrbc_define_method(vm, neopixel, "show", c_neopixel_show);
    mrbc_define_method(vm, radio, "enable", c_radio_enable);
    mrbc_define_method(vm, radio, "disable", c_radio_disable);
    mrbc_define_method(vm, radio, "send", c_radio_send);
    mrbc_define_method(vm, radio, "receive", c_radio_receive);
    mrbc_define_method(vm, ml, "evaluate", c_ml_evaluate);

    define_image_constant(vm, image, "HEART", "09090:99999:99999:09990:00900");
    define_image_constant(vm, image, "HAPPY", "00000:09090:00000:90009:09990");
    define_image_constant(vm, image, "SAD", "00000:09090:00000:09990:90009");
    define_image_constant(vm, image, "ASLEEP", "00000:99099:00000:09990:00000");
    define_image_constant(vm, image, "YES", "00000:00009:00090:90900:09000");
    define_image_constant(vm, image, "NO", "90009:09090:00900:09090:90009");
    define_image_constant(vm, image, "ARROW_N", "00900:09990:90909:00900:00900");
    define_image_constant(vm, image, "ARROW_NE", "00999:00099:00909:09000:90000");
    define_image_constant(vm, image, "ARROW_E", "00900:00090:99999:00090:00900");
    define_image_constant(vm, image, "ARROW_SE", "90000:09000:00909:00099:00999");
    define_image_constant(vm, image, "ARROW_S", "00900:00900:90909:09990:00900");
    define_image_constant(vm, image, "ARROW_SW", "00009:00090:90900:99000:99900");
    define_image_constant(vm, image, "ARROW_W", "00900:09000:99999:09000:00900");
    define_image_constant(vm, image, "ARROW_NW", "99900:99000:90900:00090:00009");
    define_image_constant(vm, image, "DIAMOND", "00900:09090:90009:09090:00900");
    define_image_constant(vm, image, "DIAMOND_SMALL", "00000:00900:09090:00900:00000");
    define_image_constant(vm, image, "SQUARE_SMALL", "00000:09990:09090:09990:00000");
    define_image_constant(vm, image, "COW", "90009:90009:99999:09990:00900");
    define_image_constant(vm, image, "TARGET", "00900:09990:99099:09990:00900");
    define_image_constant(vm, image, "HOUSE", "00900:09990:99999:09990:09090");
    define_image_constant(vm, image, "SWORD", "00900:00900:00900:09990:00900");
    define_image_constant(vm, image, "SKULL", "09990:90909:99999:09990:09990");
}
