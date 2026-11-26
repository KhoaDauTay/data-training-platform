---
name: project-handoff
description: "BoonData state: v44 live (2026-11-26 evening: 171 SVG figures, Extensions shelf, Data stack engine, explanation rewrites); start from docs/team/handoff-2026-11-26b.md"
metadata:
  node_type: memory
  type: project
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-26T15:38:34.424Z
---

2026-11-26 evening: v44 is live. Since v41.1: ER mode + "Giải thích sơ đồ" (v42), titled id links (v42.1), figure batches 1–6 + quick-lesson and BP figure slots (171 specs), PostgreSQL Extensions shelf (14 lessons, PostGIS + pgvector, no XP), Data stack engine `stack` (19 lessons, dbt-style compiler), explanation rewrites across all areas, global timestamp display fix. Start from `docs/team/handoff-2026-11-26b.md`. Notes outside the repo: `bd-wt/tools/run-v41.md`, `bd-wt/tools/v42..v44/`. No plan after v44.

Lessons: read LIVE smoke before tagging (503 precache flakes → rerun); give each subagent its own decision-log range; content .md must not get CR CR LF (contentJson test); fresh eye reviews always found P2s the overlap checker missed.

**Why:** the next session must not re-plan finished work or trust a green run or the checker blindly.

**How to apply:** new work needs the user's go; keep [[feedback-no-e2e-long-tests]] until lifted; see [[feedback-push-wip-backup]], [[reference-sql-knowledge]], [[project-freeze-v23]].
