---
name: feedback-no-e2e-long-tests
description: "2026-11-24 user: do not run e2e or long local test runs for now; spend effort on development"
metadata:
  node_type: memory
  type: feedback
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-23T17:48:24.764Z
---

2026-11-24 the user said "Dồn token vô việc phát triển không chạy e2e nữa. Tập trung hoàn thành task" and then "Tạm thời không chạy e2e. Và test tốn thời gian."

**Why:** full e2e and long vitest/gate runs filled RAM (headless Edge grew to 16 GB) and were killed twice; they cost time and tokens without moving the work forward.

**How to apply:** until the user lifts it, skip `npm run e2e`, full `vitest run`, `gate.sh` and full smoke locally. Run `tsc --noEmit` and only the few test files touching the change; let CI (`ci.yml` on main) run the full suite. Ask before any long run. See [[project-freeze-v23]].
