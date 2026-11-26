---
name: project-handoff
description: "BoonData state: v41.1 live (2026-11-26, SVG figures v39–v41 on top of the v34–v38 multi-tenant theme); start from docs/team/handoff-2026-11-26.md"
metadata:
  node_type: memory
  type: project
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-26T06:24:07.751Z
---

2026-11-26: v41.1 is live. v38.1–v41.1 added the SVG figure system (`figures:` field, specs in `content/figures/`, builder chunk `engineFigure`, 46 figures on 66 pages) and fixed overlaps in the old `viz:` diagrams; the overlap checker (`npm run overlap`, rules a–j) plus Vitest (`tests/figures.test.ts`, `arrowTips`/`headOnText`) block overlaps. Start from `docs/team/handoff-2026-11-26.md`; previous theme in `handoff-2026-11-25.md`. Plans/notes outside the repo: `bd-wt/tools/run-v41.md`, `bd-wt/tools/v39/`. No plan after v41.1.

Read the LIVE smoke log too before tagging (v40's live smoke failed once, flaky on rerun). The overlap checker missed three kinds of defect before (stroke, parallel lines, arrowhead on title), so a fresh eye review with screenshots stays mandatory for new figures.

Subagents must write with absolute paths (including [IO.File]); check `git status` of the main repo before merging.

**Why:** the next session must not re-plan finished work or trust a green run or the checker blindly.

**How to apply:** new work needs the user's go; keep [[feedback-no-e2e-long-tests]] until lifted; see [[feedback-push-wip-backup]], [[reference-sql-knowledge]], [[project-freeze-v23]].
