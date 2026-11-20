---
name: feedback-push-wip-backup
description: Back up work branches to origin wip/* after commits; keep worktrees out of Temp
metadata:
  node_type: memory
  type: feedback
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-20T08:14:18.731Z
---

Commit and push work before continuing, so a disk cleanup cannot lose it. Push work branches as `origin wip/<branch>` (CI only deploys `main`); `main` itself is still pushed only per version (see [[boondata-release-rule]]). Put git worktrees under `C:\Users\khoa.huynh\Documents\study\bd-wt\`, not the Temp scratchpad.

**Why:** 2026-11-20 a cleanup wiped five scratchpad worktrees (files gone, only node_modules left); user said "hãy commit và push tránh mất trước khi làm".

**How to apply:** after merging or when an agent commits, `git push origin <b>:refs/heads/wip/<b>`; tell every build agent to do the same; create new worktrees in bd-wt.
