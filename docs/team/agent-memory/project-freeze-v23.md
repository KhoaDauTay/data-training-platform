---
name: project-freeze-v23
description: "Release gating — v24→v30 approved and shipped 2026-11-24; anything after v30 needs the user's approval"
metadata:
  node_type: memory
  type: project
  originSessionId: e927c5e6-22a4-40fa-bff6-3a9e8af9fcbc
  modified: 2026-11-24T11:07:29.704Z
---

2026-11-20 the user froze BoonData at v23; 2026-11-23 approved v23.1 and v24; 2026-11-24 asked for v30 by morning and approved ("Duyệt") the plan `bd-wt/tools/run-v30.md` (each of v25–v29 = route slice R1–R6 from product-route-v24 §4 as the primary content, old roadmap item secondary). All shipped the same night (v30 = final). Later 2026-11-24 the user approved "Phát hành duyệt làm đến v33": v30.2, v31, v32, v33 shipped (plan `bd-wt/tools/run-v33.md`). Anything after v33 needs a new go.

**Why:** the user wants releases they approve version by version.

**How to apply:** do not start a v31 or new feature work without the user's go. See [[project-handoff]].
