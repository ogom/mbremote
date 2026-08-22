# Third-Party Notices

The mbremote original source code is licensed under the MIT License. The
following files distributed with mbremote contain or are based on third-party
source code and remain subject to the license stated below:

- `support/v2/picoruby/codal.patch`
- `support/v2/picoruby/codal_app/codal.json`
- `support/v2/picoruby/codal_app/magic_circle_model.c`
- `support/v2/picoruby/codal_app/main.cpp`
- `support/v2/picoruby/codal_app/ml4f.c`
- `support/v2/picoruby/codal_app/ml4f.h`
- `support/v2/picoruby/mrubyc/hal/nrf52833/hal.c`
- `support/v2/picoruby/mrubyc/hal/nrf52833/hal.h`

## MicroPython V2 and CODAL — MIT License

The CODAL application and build integration are based in part on these files:

- MicroPython V2 `src/codal.patch`, `src/codal_app/codal.json`, and
  `src/codal_app/main.cpp` at commit
  `3f22f306bcbc3461b0c3c60702b74bbce6689013`
- CODAL `CMakeLists.txt` at commit
  `871d0fccaf385a57f7cd2c2d61c644ec04107914`

https://github.com/microbit-foundation/micropython-microbit-v2/tree/3f22f306bcbc3461b0c3c60702b74bbce6689013/src

https://github.com/lancaster-university/codal/blob/871d0fccaf385a57f7cd2c2d61c644ec04107914/CMakeLists.txt

Copyright (c) 2020 Damien P. George
Copyright (c) 2017 Lancaster University

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## ML4F C runner and generated model — MIT License

The firmware's ML4F invocation code is based on the micro:bit Educational
Foundation ML4F runner. `magic_circle_model.c` is generated with
`@microbit/ml4f` 2.0.0-beta.0 from the mbremote magic-circle model:

https://github.com/microbit-foundation/pxt-microbit-ml-runner/tree/main/mlrunner

https://github.com/microbit-foundation/ml4f

Copyright (c) Microsoft Corporation
Copyright (c) 2024 Micro:bit Educational Foundation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## mruby/c — BSD 3-Clause License

These files implement the BBC micro:bit V2 port of the interface provided by
mruby/c `hal/minimal.h` at commit
`4261cf5e5ae5579e3110dab98a04b91c7d919429`:

https://github.com/mrubyc/mrubyc/blob/4261cf5e5ae5579e3110dab98a04b91c7d919429/hal/minimal.h

Copyright (C) 2015-     Kyushu Institute of Technology All right reserved.
Copyright (C) 2015-2026 Shimane IT Open-Innovation Center.All right reserved.
Copyright (C) 2026-     Shimane Institute for Industrial Technology.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

The PicoRuby firmware build downloads additional third-party components. Their
license terms remain in their respective source checkouts and also apply to
the generated firmware.
