/*
 * mruby/c hardware abstraction for the BBC micro:bit V2.
 *
 * Implements the interface from mruby/c hal/minimal.h at commit
 * 4261cf5e5ae5579e3110dab98a04b91c7d919429:
 * https://github.com/mrubyc/mrubyc/blob/4261cf5e5ae5579e3110dab98a04b91c7d919429/hal/minimal.h
 *
 * Copyright (C) 2015-      Kyushu Institute of Technology.
 * Copyright (C) 2015-2026  Shimane IT Open-Innovation Center.
 * Copyright (C) 2026-      Shimane Institute for Industrial Technology.
 * Modifications Copyright (C) 2026 mbremote contributors.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 */

#include <string.h>

#include "hal.h"

void mbremote_picoruby_serial_write(const void *buf, int nbytes);
void mbremote_picoruby_abort(void);

int mrbc_hal_write(int fd, const void *buf, int nbytes)
{
    (void)fd;
    mbremote_picoruby_serial_write(buf, nbytes);
    return nbytes;
}

int mrbc_hal_flush(int fd)
{
    (void)fd;
    return 0;
}

void mrbc_hal_abort(const char *message)
{
    if (message != NULL) {
        mbremote_picoruby_serial_write(message, (int)strlen(message));
    }
    mbremote_picoruby_abort();
}
