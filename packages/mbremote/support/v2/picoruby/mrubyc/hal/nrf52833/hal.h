/*
 * mruby/c hardware abstraction for the BBC micro:bit V2.
 *
 * Based on mruby/c hal/minimal.h at commit
 * 4261cf5e5ae5579e3110dab98a04b91c7d919429:
 * https://github.com/mrubyc/mrubyc/blob/4261cf5e5ae5579e3110dab98a04b91c7d919429/hal/minimal.h
 *
 * Copyright (C) 2015-      Kyushu Institute of Technology.
 * Copyright (C) 2015-2026  Shimane IT Open-Innovation Center.
 * Copyright (C) 2026-      Shimane Institute for Industrial Technology.
 * Modifications Copyright (C) 2026 mbremote contributors.
 *
 * SPDX-License-Identifier: BSD-3-Clause
 *
 * The VM runs without a hardware timer. CODAL sleeps for one millisecond
 * whenever the scheduler is idle, then advances mruby/c's software tick.
 */
#ifndef MBREMOTE_PICORUBY_V2_HAL_H_
#define MBREMOTE_PICORUBY_V2_HAL_H_

#define MRBC_TICK_UNIT 1
#define MRBC_TIMESLICE_TICK_COUNT 10
#define MRBC_NO_TIMER
#define MRBC_SCHEDULER_EXIT 1

#ifdef __cplusplus
extern "C" {
#endif

void mrbc_tick(void);
void mbremote_picoruby_idle(void);

#define mrbc_hal_init() ((void)0)
#define mrbc_hal_enable_irq() ((void)0)
#define mrbc_hal_disable_irq() ((void)0)
#define mrbc_hal_idle_cpu() (mbremote_picoruby_idle(), mrbc_tick())

int mrbc_hal_write(int fd, const void *buf, int nbytes);
int mrbc_hal_flush(int fd);
void mrbc_hal_abort(const char *message);

#ifdef __cplusplus
}
#endif

#endif
