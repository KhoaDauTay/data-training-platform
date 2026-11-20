---
name: project-freeze-v23
description: User froze BoonData at v23 (2026-11-20) for review; no v24+ work until they say so
metadata:
  node_type: memory
  type: project
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-20T09:08:31.873Z
---

2026-11-20 the user said "Tôi cần version ổn định. Dừng ở 23. Để review." The overnight loop to v30 (decision-log L215–L218) is paused: finish v22 and v23 releases (gate + UI/UX/Product review + release), then stop. v24 work sits on branch `v24-best` / `wip/v24-best`, unmerged; v25 content on `v25-nosql-content`. Heartbeat cron removed.

**Why:** the user wants a stable version to review before more features.

**How to apply:** do not launch new feature/research agents or start v24 without the user's go; only fix what the v23 review finds. See [[feedback-push-wip-backup]].
