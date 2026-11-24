---
name: project-handoff
description: "BoonData state: v33 live (2026-11-24); start from docs/team/handoff-2026-11-24.md"
metadata:
  node_type: memory
  type: project
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-24T11:07:27.890Z
---

2026-11-24: v33 is live (tags up to v30.1, then v30.2 readability, v31 readability + phones + 3 hidden smoke regressions fixed, v32 gap-map content (515 covered / 1 partial / 0 missing), v33 NoSQL L1–L2 lengths + chunk splits). Start from `docs/team/handoff-2026-11-24.md` (rewritten after v33, open items §3), then review-v33/v32/v302-readability. No plan after v33.

The smoke `preview` job has continue-on-error (L150), so a green run can hide failures: always grep the log for `SMOKE OK` before tagging — this hid regressions from v30 to v30.2.

**Why:** the next session must not re-plan finished work or trust a green smoke run blindly.

**How to apply:** new work needs the user's go; keep [[feedback-no-e2e-long-tests]] until lifted; see [[feedback-push-wip-backup]], [[reference-sql-knowledge]], [[project-freeze-v23]].
