---
name: project-freeze-v23
description: Release gating — v24→v33 shipped 2026-11-24; 2026-11-25 the user asked for v34→v38 (multi-tenant theme); anything after v38 needs a new go
metadata:
  node_type: memory
  type: project
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-26T15:39:00.401Z
---

2026-11-20 the user froze BoonData at v23; later approved v23.1–v33 version by version (plans `bd-wt/tools/run-v30.md`, `run-v33.md`, all shipped 2026-11-24).

2026-11-25 the user asked for v38: a multi-tenant database theme (tenancy models, skills, lessons) spread across the places it fits, researched by 3 agents (product design, UI/UX, research) plus the user's local company repos (DevOps comments) and the web, with several UI/UX review phases. Plan: `bd-wt/tools/run-v38.md`, notes in `bd-wt/tools/v38/`. v34–v38 all shipped 2026-11-25. Later 2026-11-25 the user asked for SVG diagrams across the text-heavy lessons, with a careful UI check against overlapping diagrams: shipped as v38.1–v41.1 on 2026-11-26 (notes in `bd-wt/tools/v39/`). Then (same day, user's go each time) v42–v44: ER redraw, 100+ figures, PostgreSQL Extensions (PostGIS + pgvector deps approved), Data stack (dbt/Fivetran/Snowflake), explanation rewrites. Anything after v44 needs a new go.

**Why:** the user wants releases they approve explicitly.

**How to apply:** do not start work beyond the approved version without a go. The user's company material (their work repos, the multi-tenant lab folder) informs concepts only: never names, identifiers or data in the public repo, memory copy or web queries. See [[project-handoff]].
