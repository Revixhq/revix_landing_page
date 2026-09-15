#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
# Revix landing — fetch self-hosted fonts
#
# Run once, commit the result. Two variable woff2 files:
#
#   Inter Variable    body, UI, labels        wght 100–900
#   Archivo Variable  display headlines       wght 100–900 + wdth 62–125
#
# Both SIL Open Font Licence — free for commercial use and
# redistributable, which is what makes self-hosting legal here.
#
# Why self-host at all: docs/design.md §3.2 mandates Inter, and a
# bare font-family declaration doesn't deliver it. Without these
# files the page renders in Roboto on Android (86% of the market),
# SF Pro on Mac and Segoe on Windows — three different designs.
#
# Why not a CDN: an external font request is a blocking third-party
# dependency on connections that can't afford one (design.md §7).
#
# NOTE — when this ports into revix-web (stack.md §2.2), delete this
# script. next/font self-hosts, subsets and preloads with no build
# step. This exists only because the reference build is static files.
# ═══════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts

INTER="https://cdn.jsdelivr.net/fontsource/fonts/inter:vf@latest/latin-wght-normal.woff2"
ARCHIVO="https://cdn.jsdelivr.net/fontsource/fonts/archivo:vf@latest/latin-standard-normal.woff2"

get() {
  local url="$1" out="fonts/$2" name="$3"
  printf '  %-22s ' "$name"
  if curl -fsSL --retry 2 --max-time 60 "$url" -o "$out"; then
    printf 'ok   %s\n' "$(du -h "$out" | cut -f1)"
  else
    printf 'FAILED\n'; rm -f "$out"; return 1
  fi
}

echo "Fetching fonts →  landing/fonts/"
get "$INTER"   "inter-var.woff2"   "Inter Variable"
get "$ARCHIVO" "archivo-var.woff2" "Archivo Variable"

echo
echo "Done. Both files are latin-subset variable woff2."
echo "Commit landing/fonts/ so the page works without running this again."
