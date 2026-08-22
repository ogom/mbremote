/**
 * @brief Imported from the micro:bit Educational Foundation ML4F runner:
 * https://github.com/microbit-foundation/pxt-microbit-ml-runner/blob/main/mlrunner/ml4f.c
 *
 * The runner is based on the ML4F sample code:
 * https://github.com/microsoft/ml4f/blob/v1.9.1/sample/ml4f.c
 *
 * Sample code: Copyright (c) Microsoft Corporation.
 * Changes to the sample code: Copyright 2024 Micro:bit Educational Foundation.
 *
 * SPDX-License-Identifier: MIT
 */
#include "ml4f.h"

#include <stdlib.h>
#include <string.h>

int ml4f_is_valid_header(const ml4f_header_t *header)
{
    if (!header ||
        header->magic0 != ML4F_MAGIC0 ||
        header->magic1 != ML4F_MAGIC1) {
        return 0;
    }
    if (header->input_type != ML4F_TYPE_FLOAT32 ||
        header->output_type != ML4F_TYPE_FLOAT32) {
        return 0;
    }
    return 1;
}

typedef void (*model_fn_t)(const ml4f_header_t *model, uint8_t *arena);

int ml4f_invoke(const ml4f_header_t *model, uint8_t *arena)
{
    if (!ml4f_is_valid_header(model)) {
        return -1;
    }
    // +1 selects Thumb mode for the generated Cortex-M4F code.
    model_fn_t fn = (model_fn_t)(
        (const uint8_t *)model + model->header_size + 1
    );
    fn(model, arena);
    return 0;
}

#define EPS 0.00002f

static int is_near(float a, float b)
{
    float diff = a - b;
    if (diff < 0) {
        diff = -diff;
    }
    if (diff < EPS) {
        return 1;
    }
    if (a < 0) {
        a = -a;
    }
    if (b < 0) {
        b = -b;
    }
    if (diff / (a + b) < EPS) {
        return 1;
    }
    return 0;
}

int ml4f_test(const ml4f_header_t *model, uint8_t *arena)
{
    if (!ml4f_is_valid_header(model)) {
        return -1;
    }
    if (!model->test_input_offset || !model->test_output_offset) {
        return 0;
    }

    memcpy(
        arena + model->input_offset,
        (const uint8_t *)model + model->test_input_offset,
        ml4f_shape_size(ml4f_input_shape(model), model->input_type)
    );
    ml4f_invoke(model, arena);

    float *actual = (float *)(arena + model->output_offset);
    const float *expected = (const float *)(
        (const uint8_t *)model + model->test_output_offset
    );
    const int elements = ml4f_shape_elements(ml4f_output_shape(model));
    for (int index = 0; index < elements; index++) {
        if (!is_near(actual[index], expected[index])) {
            return -2;
        }
    }
    return 1;
}

const uint32_t *ml4f_input_shape(const ml4f_header_t *model)
{
    return model->input_shape;
}

const uint32_t *ml4f_output_shape(const ml4f_header_t *model)
{
    const uint32_t *shape = model->input_shape;
    while (*shape) {
        shape++;
    }
    return shape + 1;
}

uint32_t ml4f_shape_elements(const uint32_t *shape)
{
    uint32_t result = 1;
    while (*shape) {
        result *= *shape++;
    }
    return result;
}

uint32_t ml4f_shape_size(const uint32_t *shape, uint32_t type)
{
    if (type != ML4F_TYPE_FLOAT32) {
        return 0;
    }
    return ml4f_shape_elements(shape) << 2;
}

int ml4f_argmax(const float *data, uint32_t size)
{
    if (size == 0) {
        return -1;
    }
    float maximum = data[0];
    int maximum_index = 0;
    for (uint32_t index = 1; index < size; index++) {
        if (data[index] > maximum) {
            maximum = data[index];
            maximum_index = index;
        }
    }
    return maximum_index;
}

int ml4f_full_invoke(
    const ml4f_header_t *model,
    const float *input,
    float *output
)
{
    if (!ml4f_is_valid_header(model)) {
        return -1;
    }
    uint8_t *arena = malloc(model->arena_bytes);
    if (!arena) {
        return -2;
    }
    const int result = ml4f_full_invoke_arena(model, arena, input, output);
    free(arena);
    return result;
}

int ml4f_full_invoke_arena(
    const ml4f_header_t *model,
    uint8_t *arena,
    const float *input,
    float *output
)
{
    if (!ml4f_is_valid_header(model)) {
        return -1;
    }
    memcpy(
        arena + model->input_offset,
        input,
        ml4f_shape_size(ml4f_input_shape(model), model->input_type)
    );
    const int result = ml4f_invoke(model, arena);
    memcpy(
        output,
        arena + model->output_offset,
        ml4f_shape_size(ml4f_output_shape(model), model->output_type)
    );
    return result;
}

int ml4f_full_invoke_argmax(
    const ml4f_header_t *model,
    const float *input
)
{
    if (!ml4f_is_valid_header(model)) {
        return -1;
    }
    uint8_t *arena = malloc(model->arena_bytes);
    if (!arena) {
        return -2;
    }
    memcpy(
        arena + model->input_offset,
        input,
        ml4f_shape_size(ml4f_input_shape(model), model->input_type)
    );
    int result = ml4f_invoke(model, arena);
    if (result == 0) {
        result = ml4f_argmax(
            (float *)(arena + model->output_offset),
            ml4f_shape_elements(ml4f_output_shape(model))
        );
    }
    free(arena);
    return result;
}
