#!/usr/bin/env bash
#
# Regenerates the PWA icon set in web/icons/ from assets/icon.png.
#
# Run this by hand (macOS only — it uses `sips`) whenever assets/icon.png
# changes; the results are committed so the deploy workflow never needs an
# image toolchain. scripts/build-pwa.mjs only copies them into dist/.
#
#   ./scripts/gen-pwa-icons.sh
#
# The maskable variants inset the artwork to ~80% and pad the remainder with
# the app's own paper background (palette.paper, #F7F7F7) so that whatever
# shape Android masks the icon into, nothing meaningful is clipped.
set -euo pipefail

cd "$(dirname "$0")/.."

SRC="assets/icon.png"
OUT="web/icons"
PAD_COLOR="F7F7F7" # src/theme/tokens.ts -> palette.paper

test -f "$SRC" || { echo "missing $SRC" >&2; exit 1; }
mkdir -p "$OUT"

square() { # square <size> <dest>
  sips -s format png -z "$1" "$1" "$SRC" --out "$2" >/dev/null
}

maskable() { # maskable <size> <dest>  — artwork at 80%, padded to size
  local size="$1" dest="$2" inner
  inner=$(( size * 80 / 100 ))
  sips -s format png -z "$inner" "$inner" "$SRC" --out "$dest" >/dev/null
  sips -p "$size" "$size" --padColor "$PAD_COLOR" "$dest" --out "$dest" >/dev/null
}

square 192 "$OUT/icon-192.png"
square 512 "$OUT/icon-512.png"
square 180 "$OUT/apple-touch-icon.png"
maskable 192 "$OUT/icon-maskable-192.png"
maskable 512 "$OUT/icon-maskable-512.png"

echo "wrote:"
for f in "$OUT"/*.png; do
  printf '  %s  %s\n' "$f" "$(sips -g pixelWidth -g pixelHeight "$f" | tr -d '\n' | sed 's/.*pixelWidth: \([0-9]*\).*pixelHeight: \([0-9]*\)/\1x\2/')"
done
