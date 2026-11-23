---
name: reference-sql-knowledge
description: "Where the SQL/database knowledge base and the global `sql` skill live, and how they stay in sync"
metadata:
  node_type: memory
  type: reference
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-23T09:33:05.285Z
---

2026-11-23: `docs/knowledge/database/` (repo) holds the database knowledge base (own words, primary sources, 105 PG examples verified on PGlite), the structure-only route map of tutorialspoint's 36 database tutorials (`tutorial-routes.md/.json`, 1,430 chapters) and `boondata-gap-map.md` (Engine + learning path only; domains excluded by the user). The user-level skill `~/.claude/skills/sql/` (SKILL.md checklist, `references/` = copies, `scripts/run.mjs` block runner) is built from it.

**Why:** user plan: inventory every tutorial route point → document → align BoonData's Engine + learning path to that route → keep docs updated → one global SQL skill for review in any project. Tutorial text is never copied (copyright); only titles/URLs/order.

**How to apply:** edit the repo folder first, then re-copy changed files into the skill's `references/`. Aligning BoonData content to the route is product work: still under [[project-freeze-v23]] until the user says go.
