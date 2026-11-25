---
name: project-handoff
description: "BoonData state: v38 live (2026-11-25, multi-tenant theme v34–v38); start from docs/team/handoff-2026-11-25.md"
metadata:
  node_type: memory
  type: project
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-25T01:25:58.772Z
---

2026-11-25: v38 is live. v34–v38 spread a multi-tenant database theme across Design L2/L4/L5, PostgreSQL L1/L2/L4/L5, MongoDB L3/L5, DynamoDB L3–L5, BP x08/m39, hub lesson `e-ds-l4-09`, after 3 UI/UX review rounds (R1 preview, R2 preview, R3 live). Start from `docs/team/handoff-2026-11-25.md` (open items §3). Plan and private notes: `bd-wt/tools/run-v38.md`, `bd-wt/tools/v38/` (outside the repo). No plan after v38.

The smoke `preview` job's continue-on-error ends 2026-11-26; always read the log for `SMOKE OK` before tagging.

Subagents must write with absolute paths: three times a worktree agent wrote into the main repo through relative .NET paths; check `git status` in the main repo before merging.

**Why:** the next session must not re-plan finished work or trust a green smoke run blindly.

**How to apply:** new work needs the user's go; keep [[feedback-no-e2e-long-tests]] until lifted; see [[feedback-push-wip-backup]], [[reference-sql-knowledge]], [[project-freeze-v23]].
