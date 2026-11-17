#!/usr/bin/env bash
# Post-deploy check: every DB/parser asset is reachable under the deployed base, plus content-type/encoding report.
# Usage: bash scripts/check-deploy.sh https://<user>.github.io/cargo-query/   (STRICT=1: missing compression fails)
set -u
URL="${1%/}"
fail=0
get() { curl -fsS "$URL/$1"; }
MAIN=$(get "" | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$MAIN" ] || { echo "FAIL index.html has no assets/index-*.js under $URL/"; exit 1; }
WORKER=$(get "$MAIN" | grep -oE 'worker-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$WORKER" ] || { echo "FAIL $MAIN does not reference worker-*.js"; exit 1; }
WJS=$(get "assets/$WORKER")
FILES=$(printf '%s' "$WJS" | grep -oE '(pglite|initdb)-[A-Za-z0-9_-]+\.(wasm|data)' | sort -u)
[ -n "$FILES" ] || { echo "FAIL $WORKER does not reference pglite/initdb assets"; exit 1; }
# The SQL parser (steps tab): worker -> parser-*.js -> libpg-query-*.js -> libpg-query-*.wasm
PARSER=$(printf '%s' "$WJS" | grep -oE 'parser-[A-Za-z0-9_-]+\.js' | head -1)
LIBJS=$([ -n "$PARSER" ] && get "assets/$PARSER" | grep -oE 'libpg-query-[A-Za-z0-9_-]+\.js' | head -1)
LIBWASM=$([ -n "$LIBJS" ] && get "assets/$LIBJS" | grep -oE 'libpg-query-[A-Za-z0-9_-]+\.wasm' | head -1)
[ -n "$LIBWASM" ] || { echo "FAIL no libpg-query-*.wasm via $WORKER -> parser-*.js -> libpg-query-*.js"; exit 1; }
# Ticket content (lazy chunk the app awaits before its first render, L41/L43)
TICKETS=$(get "$MAIN" | grep -oE 'ticketSources-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$TICKETS" ] || { echo "FAIL $MAIN does not reference ticketSources-*.js"; exit 1; }
# Plan 5: lane content and the EN dictionary are lazy chunks awaited before the first render too.
LANES=$(get "$MAIN" | grep -oE 'laneSources-[A-Za-z0-9_-]+\.js' | head -1)
EN=$(get "$MAIN" | grep -oE '\./en-[A-Za-z0-9_-]+\.js' | head -1 | cut -c3-)
[ -n "$LANES" ] && [ -n "$EN" ] || { echo "FAIL $MAIN does not reference laneSources-*.js and en-*.js"; exit 1; }
# Plan 6: the quick lessons are a lazy chunk awaited before the first render too.
LESSONS=$(get "$MAIN" | grep -oE 'lessonSources-[A-Za-z0-9_-]+\.js' | head -1)
[ -n "$LESSONS" ] || { echo "FAIL $MAIN does not reference lessonSources-*.js"; exit 1; }
for f in $MAIN "assets/$WORKER" "assets/$TICKETS" "assets/$LANES" "assets/$EN" "assets/$LESSONS" $(printf 'assets/%s ' $FILES $LIBWASM); do
  H=$(curl -sS -o /dev/null -D - -H 'Accept-Encoding: br, gzip' "$URL/$f" | tr -d '\r')
  status=$(printf '%s\n' "$H" | head -1 | cut -d' ' -f2)
  type=$(printf '%s\n' "$H" | grep -i '^content-type:' | cut -d' ' -f2-)
  enc=$(printf '%s\n' "$H" | grep -i '^content-encoding:' | cut -d' ' -f2-)
  cache=$(printf '%s\n' "$H" | grep -i '^cache-control:' | cut -d' ' -f2-)
  verdict=ok
  if [ "$status" != 200 ]; then verdict=FAIL; fail=1
  elif [[ $f == *.wasm && $type != application/wasm* ]]; then verdict=WARN   # PGlite falls back to ArrayBuffer
  elif [[ $f == *.wasm || $f == *.data ]] && [ -z "$enc" ]; then
    verdict=WARN; [ "${STRICT:-0}" = 1 ] && { verdict=FAIL; fail=1; }
  fi
  printf '%-4s %-36s %s type=%s enc=%s cache=%s\n' "$verdict" "$f" "$status" "${type:--}" "${enc:--}" "${cache:--}"
done
exit $fail
