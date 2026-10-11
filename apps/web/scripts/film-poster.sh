#!/bin/sh
# Extracts the film card's poster: the text-free frame at 0:20 of public/film.mp4.
# Run from apps/web: pnpm film:poster
set -eu
cd "$(dirname "$0")/.."
[ -f public/film.mp4 ] || { echo "public/film.mp4 not found" >&2; exit 1; }
mkdir -p public/images
ffmpeg -loglevel error -y -ss 00:00:20 -i public/film.mp4 -frames:v 1 \
  -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" \
  -q:v 3 public/images/film-poster.jpg
echo "Wrote public/images/film-poster.jpg"
