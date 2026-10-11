#!/bin/sh
# Prepares the film for the home page's in-card player: H.264 + AAC, at most 1080p,
# web-optimised (starts playing while it downloads). Usage, from apps/web:
#   pnpm film:encode path/to/film.mov
set -eu
[ $# -eq 1 ] || { echo "usage: pnpm film:encode <source video>" >&2; exit 1; }
cd "$(dirname "$0")/.."
ffmpeg -loglevel error -y -i "$1" \
  -vf "scale='min(1920,iw)':-2" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p \
  -c:a aac -b:a 128k -movflags +faststart public/film.mp4
echo "Wrote public/film.mp4 ($(du -h public/film.mp4 | cut -f1)). Commit it; the next build plays it in the card."
