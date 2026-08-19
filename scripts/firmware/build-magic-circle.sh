#!/bin/sh

set -eu
unset DEBUG

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
source_dir=${MICROBIT_V2_SOURCE_DIR:-"$project_dir/tmp/microbit-foundation/micropython-microbit-v2"}
manifest="$project_dir/scripts/firmware/magic-circle-manifest.py"
output="$project_dir/firmware/microbit-micropython-v2-magic-circle.hex"
tools_dir="$project_dir/tmp/firmware-tools"
gcc_version=10.3-2021.10
gcc_dir="$tools_dir/gcc-arm-none-eabi-$gcc_version"
gcc_archive="$tools_dir/gcc-arm-none-eabi-$gcc_version-mac.tar.bz2"

if [ ! -d "$source_dir/.git" ]; then
  mkdir -p "$(dirname -- "$source_dir")"
  git clone https://github.com/microbit-foundation/micropython-microbit-v2.git "$source_dir"
fi

git -C "$source_dir" submodule update --init lib/codal lib/micropython
if [ ! -x "$tools_dir/bin/cmake" ]; then
  python3 -m venv "$tools_dir"
  "$tools_dir/bin/python" -m pip install cmake==3.28.3
fi
if [ ! -x "$gcc_dir/bin/arm-none-eabi-gcc" ]; then
  curl -L \
    "https://developer.arm.com/-/media/Files/downloads/gnu-rm/$gcc_version/gcc-arm-none-eabi-$gcc_version-mac.tar.bz2" \
    -o "$gcc_archive"
  printf '%s  %s\n' \
    fb613dacb25149f140f73fe9ff6c380bb43328e6bf813473986e9127e2bc283b \
    "$gcc_archive" | shasum -a 256 -c -
  tar -xjf "$gcc_archive" -C "$tools_dir"
fi
PATH="$gcc_dir/bin:$tools_dir/bin:$PATH"
export PATH
make -C "$source_dir/lib/micropython/mpy-cross" \
  CFLAGS_EXTRA="-Wno-error -Wno-gnu-folding-constant -Wno-unterminated-string-initialization"
make -C "$source_dir/src" \
  FROZEN_MANIFEST="$manifest" \
  MICROPY_MANIFEST_PROJECT_DIR="$project_dir"
mkdir -p "$(dirname -- "$output")"
cp "$source_dir/src/MICROBIT.hex" "$output"
printf 'built: %s\n' "$output"
