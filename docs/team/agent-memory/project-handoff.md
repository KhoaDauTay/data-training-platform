---
name: project-handoff
description: "BoonData state: v47 on main (2026-11-27: IA S1–S4, Practise sets, case studies, 8 new Engine tracks); start from docs/team/handoff-2026-11-27.md"
metadata:
  node_type: memory
  type: project
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-26T21:36:30.818Z
---

2026-11-27: v47 is on main. It covers:
- IA rework S1–S4: CSDL tab with three groups, track cards, welcome goal chooser, one interview room.
- Practise sets: fix / explain / mixed.
- Domain case studies.
- Eight new Engine tracks: Redis, Time-series, OLAP & ClickHouse, Search & Elasticsearch, Telemetry (PromQL), Streaming & CDC, Graph.

Tags: v45 (S1+S3); v46 at the first all-green CI from 9137da8. Start from `docs/team/handoff-2026-11-27.md`; notes outside the repo are in `bd-wt/tools/run-v47.md` and `bd-wt/tools/v47/`.

Lessons learned:
- Merging many parallel tracks breaks tests that pin counts or lists. The coordinator fixes them on main (decision log L1100/L1101 raised the budgets once for all tracks).
- Subagents must use headless Edge, never the Chrome extension.
- A worktree add that gets interrupted leaves a half checkout.

**Why:** the next session must not re-plan finished work.

**How to apply:** new work needs the user's go; see [[feedback-no-e2e-long-tests]], [[feedback-push-wip-backup]], [[project-freeze-v23]].
