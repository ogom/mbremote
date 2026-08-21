#!/bin/sh

set -eu

if [ "$#" -ne 3 ]; then
  echo "usage: build.sh INPUT.rb OUTPUT.hex CACHE_DIR" >&2
  exit 2
fi

input=$1
output=$2
cache_dir=$3
support_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
picoruby_revision=c99418b2b02b292c7f0e2a75a782d116942a6292
microbit_revision=3f22f306bcbc3461b0c3c60702b74bbce6689013

input=$(CDPATH= cd -- "$(dirname -- "$input")" && pwd)/$(basename -- "$input")
mkdir -p "$cache_dir" "$(dirname -- "$output")"
cache_dir=$(CDPATH= cd -- "$cache_dir" && pwd)
output=$(CDPATH= cd -- "$(dirname -- "$output")" && pwd)/$(basename -- "$output")

picoruby_dir=${PICORUBY_SOURCE:-"$cache_dir/picoruby"}
microbit_dir=${MICROBIT_V2_SOURCE_DIR:-"$cache_dir/micropython-microbit-v2"}
work_dir="$cache_dir/picoruby-microbit-v2"
app_dir="$work_dir/codal_app"
vm_build_dir="$work_dir/mrubyc-build-symbols512-regs256-op-ext-math"
codal_build_source_dir="$work_dir/codal"
cmake_source_key=$(printf '%s' "$codal_build_source_dir" | cksum | awk '{print $1}')
cmake_build_dir="$work_dir/cmake-build-$cmake_source_key"

if [ ! -f "$input" ]; then
  echo "Ruby input does not exist: $input" >&2
  exit 2
fi

mkdir -p "$work_dir"
lock_dir="$work_dir/build.lock"
if ! mkdir "$lock_dir" 2>/dev/null; then
  echo "another PicoRuby build is using this cache: $work_dir" >&2
  echo "remove a stale lock only when no build is running: $lock_dir" >&2
  exit 2
fi
printf '%s\n' "$$" > "$lock_dir/pid"
release_lock() {
  rm -f "$lock_dir/pid"
  rmdir "$lock_dir" 2>/dev/null || true
}
trap release_lock EXIT
trap 'exit 1' HUP INT TERM

mkdir -p "$app_dir" "$vm_build_dir" "$cmake_build_dir"

ensure_clean_checkout() {
  checkout_name=$1
  checkout_dir=$2
  if [ -n "$(git -C "$checkout_dir" status --porcelain --untracked-files=no)" ]; then
    echo "$checkout_name checkout has tracked local changes: $checkout_dir" >&2
    echo "commit or restore those changes before building" >&2
    exit 2
  fi
}

if [ ! -d "$picoruby_dir/.git" ]; then
  git clone --recurse-submodules https://github.com/picoruby/picoruby.git "$picoruby_dir"
  git -C "$picoruby_dir" checkout --detach "$picoruby_revision"
fi
if [ "$(git -C "$picoruby_dir" rev-parse HEAD)" != "$picoruby_revision" ]; then
  echo "unsupported PicoRuby checkout: $picoruby_dir" >&2
  echo "expected revision: $picoruby_revision" >&2
  exit 2
fi
git -C "$picoruby_dir" submodule update --init --recursive
ensure_clean_checkout "PicoRuby" "$picoruby_dir"

if [ ! -d "$microbit_dir/.git" ]; then
  git clone https://github.com/microbit-foundation/micropython-microbit-v2.git "$microbit_dir"
  git -C "$microbit_dir" checkout --detach "$microbit_revision"
fi
if [ "$(git -C "$microbit_dir" rev-parse HEAD)" != "$microbit_revision" ]; then
  echo "unsupported micro:bit V2 CODAL checkout: $microbit_dir" >&2
  echo "expected revision: $microbit_revision" >&2
  exit 2
fi
git -C "$microbit_dir" submodule update --init lib/codal
ensure_clean_checkout "micro:bit V2" "$microbit_dir"

codal_source_dir="$microbit_dir/lib/codal"
codal_revision=$(git -C "$codal_source_dir" rev-parse HEAD)
if [ -e "$codal_build_source_dir" ] && [ ! -d "$codal_build_source_dir/.git" ]; then
  echo "invalid CODAL build cache: $codal_build_source_dir" >&2
  exit 2
fi
if [ ! -d "$codal_build_source_dir/.git" ]; then
  git clone "$codal_source_dir" "$codal_build_source_dir"
fi
git -C "$codal_build_source_dir" checkout -- CMakeLists.txt
if ! git -C "$codal_build_source_dir" cat-file -e "$codal_revision^{commit}"; then
  git -C "$codal_build_source_dir" fetch "$codal_source_dir" "$codal_revision"
fi
if [ "$(git -C "$codal_build_source_dir" rev-parse HEAD)" != "$codal_revision" ]; then
  git -C "$codal_build_source_dir" checkout --detach "$codal_revision"
fi
git -C "$codal_build_source_dir" apply "$support_dir/codal.patch"

run_with_ruby() {
  if command -v mise >/dev/null 2>&1; then
    MISE_RUBY_VERSION=${PICORUBY_RUBY_VERSION:-3.4.8} mise exec -- "$@"
  else
    "$@"
  fi
}

mrbc="$picoruby_dir/bin/mrbc"
if [ ! -x "$mrbc" ]; then
  (cd "$picoruby_dir" && run_with_ruby env MRUBY_CONFIG=mrbc rake)
fi

cp "$support_dir/codal_app/main.cpp" "$app_dir/main.cpp"
cp "$support_dir/codal_app/microbit_api.c" "$app_dir/microbit_api.c"
cp "$support_dir/codal_app/codal.json" "$app_dir/codal.json"
cp "$support_dir/codal_app/ml4f.c" "$app_dir/ml4f.c"
cp "$support_dir/codal_app/ml4f.h" "$app_dir/ml4f.h"
cp "$support_dir/codal_app/magic_circle_model.c" "$app_dir/magic_circle_model.c"
cp "$support_dir/codal_app/magic_circle_model.h" "$app_dir/magic_circle_model.h"
"$mrbc" -Bmain_task -o "$app_dir/main_task.c" "$input"

mrubyc_dir="$picoruby_dir/mrbgems/picoruby-mrubyc/lib/mrubyc"
mrubyc_source_dir="$mrubyc_dir/src"
if [ ! -f "$mrubyc_source_dir/_autogen_builtin_symbol.h" ]; then
  (cd "$mrubyc_source_dir" && run_with_ruby make autogen)
fi

toolchain_dir=${ARM_NONE_EABI_TOOLCHAIN_DIR:-}
if [ -z "$toolchain_dir" ] && [ -x "$cache_dir/firmware-tools/gcc-arm-none-eabi-10.3-2021.10/bin/arm-none-eabi-gcc" ]; then
  toolchain_dir="$cache_dir/firmware-tools/gcc-arm-none-eabi-10.3-2021.10"
fi
if [ -n "$toolchain_dir" ]; then
  arm_cc="$toolchain_dir/bin/arm-none-eabi-gcc"
  arm_ar="$toolchain_dir/bin/arm-none-eabi-ar"
else
  arm_cc=$(command -v arm-none-eabi-gcc || true)
  arm_ar=$(command -v arm-none-eabi-ar || true)
fi
if [ ! -x "$arm_cc" ] || [ ! -x "$arm_ar" ]; then
  echo "Arm GNU Toolchain is required (set ARM_NONE_EABI_TOOLCHAIN_DIR)" >&2
  exit 2
fi

hal_dir="$support_dir/mrubyc/hal/nrf52833"
vm_cflags="-Os -DNDEBUG -D_DEFAULT_SOURCE -DMAX_VM_COUNT=1 -DMAX_REGS_SIZE=256 -DMAX_SYMBOLS_COUNT=512 -DMRBC_SUPPORT_OP_EXT -DMRBC_USE_MATH=1 -I$hal_dir -ffunction-sections -fdata-sections -std=c99 --specs=nosys.specs -mcpu=cortex-m4 -mthumb -mfpu=fpv4-sp-d16 -mfloat-abi=softfp"
make -C "$mrubyc_source_dir" \
  BUILD_DIR="$vm_build_dir" \
  MRBC_USE_HAL="$hal_dir" \
  CC="$arm_cc" \
  AR="$arm_ar" \
  ARFLAGS=rcs \
  CFLAGS="$vm_cflags"

if [ -n "${CMAKE_COMMAND:-}" ]; then
  cmake_command=$CMAKE_COMMAND
elif [ -x "$cache_dir/firmware-tools/bin/cmake" ]; then
  cmake_command="$cache_dir/firmware-tools/bin/cmake"
else
  cmake_command=$(command -v cmake || true)
fi
if [ ! -x "$cmake_command" ]; then
  echo "CMake is required (set CMAKE_COMMAND)" >&2
  exit 2
fi

toolchain_bin=$(dirname -- "$arm_cc")
PATH="$toolchain_bin:$PATH"
export PATH
"$cmake_command" \
  -U CMAKE_TOOLCHAIN_FILE \
  -S "$codal_build_source_dir" \
  -B "$cmake_build_dir" \
  -DCMAKE_BUILD_TYPE=MinSizeRel \
  -DMBREMOTE_PICORUBY_APP_DIR="$app_dir" \
  -DMBREMOTE_PICORUBY_LIBRARY="$vm_build_dir/libmrubyc.a" \
  -DMBREMOTE_PICORUBY_INCLUDE="$mrubyc_source_dir;$hal_dir"
"$cmake_command" --build "$cmake_build_dir" --parallel "${BUILD_JOBS:-4}"

mkdir -p "$(dirname -- "$output")"
cp "$codal_build_source_dir/MICROBIT.hex" "$output"
printf 'built: %s\n' "$output"
