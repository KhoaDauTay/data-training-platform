#!/bin/bash
# release.sh <worktree> <branch> <tag> <message>: npm ci, gate, push branch->main, wait deploy, live smoke, tag.
W="$1"; B="$2"; TAG="$3"; MSG="$4"; T=/c/Users/khoa.huynh/Documents/study/bd-wt/tools
cd "$W" || exit 1
[ -d node_modules/vitest ] || npm ci --no-audit --no-fund > "$T/npm-$(basename "$W").log" 2>&1 || { echo "NPM FAIL"; tail -5 "$T/npm-$(basename "$W").log"; exit 1; }
bash "$T/gate.sh" "$W" 5229 || exit 1
git push -q origin "$B:main" || { echo PUSH FAIL; exit 1; }
H=$(git rev-parse --short HEAD); sleep 20
for i in $(seq 1 60); do s=$(gh run list --workflow ci.yml --limit 1 --json status,conclusion,headSha -q '.[0].status+" "+.[0].conclusion+" "+.[0].headSha[0:7]'); case "$s" in "completed success $H"*) echo "DEPLOY $s"; break;; completed*$H*) echo "DEPLOY FAIL $s"; exit 1;; esac; sleep 30; done
SMOKE_URL=https://khoadautay.github.io/data-training-platform/ timeout 500 npm run smoke > "$T/live-smoke.log" 2>&1 || { echo "LIVE SMOKE FAIL"; grep -iE "fail|error" "$T/live-smoke.log" | head; exit 1; }; tail -1 "$T/live-smoke.log"
git -c user.name=KhoaDauTay -c user.email=cuonglieu3256@gmail.com tag -a "$TAG" -m "$MSG" && git push -q origin "$TAG" && echo "TAGGED_$TAG"
