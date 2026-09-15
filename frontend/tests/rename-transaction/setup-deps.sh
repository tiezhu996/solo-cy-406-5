#!/usr/bin/env bash
# 为无 root 的 Linux 环境准备 Chromium 系统依赖库（下载 deb 并本地解压到 .deps/）。
# 已有完整桌面系统或已安装这些库的环境无需执行。
set -euo pipefail

DEPS_DIR="$(cd "$(dirname "$0")" && pwd)/.deps"
mkdir -p "$DEPS_DIR/debs" "$DEPS_DIR/lib" /tmp/apt-lists/partial /tmp/apt-cache/archives/partial

APT_OPTS=(-o Dir::State::Lists=/tmp/apt-lists -o Dir::Cache=/tmp/apt-cache)
apt-get "${APT_OPTS[@]}" update

cd "$DEPS_DIR/debs"
apt-get "${APT_OPTS[@]}" download \
  libnspr4 libnss3 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libasound2 \
  libgbm1 libxkbcommon0 libdbus-1-3 libdrm2 libwayland-server0 libxi6

for deb in *.deb; do
  dpkg-deb -x "$deb" "$DEPS_DIR/lib"
done

echo "依赖库已解压到 $DEPS_DIR/lib"
