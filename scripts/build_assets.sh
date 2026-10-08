#!/bin/sh
# Production asset pass, run in the Dockerfile's `assets` stage against a
# copy of the site (never against the working tree):
#   1. minify CSS/JS with esbuild (top-level names are kept, so the
#      plain <script> files can still share globals)
#   2. stamp ?v=<hash> on every asset URL so nginx can cache them as
#      immutable — a changed file gets a new URL
#   3. pre-gzip text files for nginx's gzip_static
set -eu
cd "${1:?usage: build_assets.sh <site-dir>}"

ESBUILD="npx --yes esbuild@0.23.1"

for f in assets/*.css assets/*.js assets/fa/*.css; do
  $ESBUILD "$f" --minify --log-level=warning --outfile="$f" --allow-overwrite
done

hash() { sha256sum "$1" | cut -c1-10; }

# Fonts first: fa.css's own hash must cover their version stamps.
for font in assets/fa/*.woff2; do
  name=$(basename "$font")
  sed -i "s|url($name)|url($name?v=$(hash "$font"))|g" assets/fa/fa.css
done

for asset in assets/*.css assets/*.js assets/fa/fa.css; do
  v=$(hash "$asset")
  find . -name '*.html' -exec sed -i "s|\(assets/${asset#assets/}\)\"|\1?v=$v\"|g" {} +
done

find . -type f \( -name '*.html' -o -name '*.css' -o -name '*.js' -o -name '*.svg' \
  -o -name '*.xml' -o -name '*.txt' -o -name '*.json' -o -name '*.webmanifest' -o -name '*.ico' \) \
  -exec gzip -9 -k -f {} +
