#!/bin/bash
# Gate: tsc, full vitest, build, budget, smoke. Usage: gate.sh <worktree> [smoke-port]
W="$1"; P="${2:-5229}"; cd "$W" || exit 1
L="/c/Users/khoa.huynh/Documents/study/bd-wt/tools/gate-$(basename "$W").log"
npx tsc --noEmit > "$L" 2>&1 || { echo "TSC FAIL"; tail -20 "$L"; exit 1; }; echo "tsc ok"
npx vitest run --no-file-parallelism --testTimeout=60000 > "$L" 2>&1; t=$?; grep -E "Tests " "$L"; [ $t -eq 0 ] || { echo "TESTS FAIL"; grep -E "FAIL" "$L" | head -20; exit 1; }
npm run build > "$L" 2>&1 || { echo "BUILD FAIL"; tail -20 "$L"; exit 1; }; echo "build ok"
node scripts/check-budget.mjs > "$L" 2>&1 || { echo "BUDGET FAIL"; grep FAIL "$L"; exit 1; }; grep -E " (main|css|html) " "$L"
SMOKE_PORT=$P timeout 400 npm run smoke > "$L" 2>&1 || { echo "SMOKE FAIL"; grep -iE "fail|error" "$L" | head -20; exit 1; }; tail -1 "$L"
echo GATE_OK
