# Schema typing and performance gate (v24 design, measured)

Status: design + measurements only, no app code changed. Answers the user's input of 2026-11-23 (product-route-v24 §1.6):
"tables need a proper id and well-chosen types (Engine, SQL path); domain data is where later lessons teach that a bad type or a
missing index is slow; add blocking performance tests: right but slow is not good enough."

Everything below was measured on PGlite in Node (same pinned build as the app) with `EXPLAIN (FORMAT JSON)` without ANALYZE:
planner cost and node types, never milliseconds. Scripts (scratch worktree, not shipped):
`C:\Users\khoa.huynh\Documents\study\bd-wt\perf-audit\tests\perfAudit.test.ts` (every Solution), `perfAuditEngine.test.ts`
(Engine labs with setup, after setup + replay), `perfVariants.test.ts` (right-but-slow vs right-and-fine rewrites, index fixes),
`perfSchema.test.ts` (catalog audit), helpers `perfLib.ts`; raw output in `perf-audit\out\*.json`, summaries `summarize.cjs`,
`deps.cjs`. Run with `npx vitest run tests/perfAudit.test.ts` etc. (≈ 20 s; Engine ≈ 2 min).

## 0. Summary

- **Worst schema findings.** (1) 14 of 26 Logistics tables were never `ANALYZE`d, so ch4–ch9 plans run on planner defaults
  (§1, S1). (2) `lab` is too small to teach performance: its biggest table is 4,284 rows / 28 pages, so a non-sargable
  rewrite costs only ×1.9–2.3 (S2). (3) Seeded schemas have no identity column anywhere, and 67 of 83 FK columns have no
  index leading with them. (4) The status/channel columns of `lab`, E-com and Finance are free `text` with no CHECK (`lab.orders.status`
  is read by 115 Solutions). (5) `shipments.incoterm` has no FK to `incoterms`.
- **Measured cost distribution** (756 Solutions, `lab:` index-lab steps excluded; plus 155 Engine lab reads): p50 = 1.6×, p90 = 3.6×,
  p95 = 6×, p99 = 85× a full read of the biggest table the query touches. A budget of "cost ≤ max(1,000, 10 × full read of
  the biggest table touched)" fails **9 Solutions** (§4.2): ch7-04, ch7-06 s1–s3 (correlated subqueries, cost 48–55k),
  ch6-06 s2–s3, interview take-home 2 s2–s3, g-a7-2. No Solution reads a big table by Seq Scan through a selective
  filter on an indexed column. Engine labs: max cost 3,266, so none would fail. **After S1 (ANALYZE)** real statistics
  expose 5 more, all the "latest rate on or before the date" range join (ch8-04, ch8-06 s1–s3, ch12-01, ch12-02, ch12-06):
  for example ch8-06 s1 goes from 1,202 to 25,015. A `LATERAL … ORDER BY rate_date DESC LIMIT 1` rewrite gives the same rows at
  1,289 (ch8-04: 1,485 → 251).
- **Gate (CI).** A new test `tests/perfGate.test.ts` checks two rules on every Solution: the cost budget above, and "no non-sargable
  Seq Scan". An allow-list holds what is slow on purpose, with a reason for each entry.
- **Learner grading.** Cost ratio alone does not work: on Logistics the planner *under*-estimates `date_trunc`/`to_char`
  filters, so non-sargable rewrites score ×0.93–1.08. A weak pass needs **either** an index lost (the Solution reads table T
  through an index and the answer Seq Scans it; scoped to the step's named table) **or** a cost ratio above 1.5 on `perf:` steps.
  Everywhere else the trigger is ratio > 3 **and** answer cost > 1,000. Measured on 17 slow and 8 good rewrites: no false
  positive. Without the table scope, index loss flags one good rewrite (ch10-03 `DISTINCT ON`).
  It misses only rewrites that really cost the same, because no index exists.
- **Migration checked on a patched copy.** S1 ANALYZE + incoterm FK on `seed.sql`, and the §2.1 `lab` identity/CHECK/index DDL:
  1104 + 1793 tests run (planCheck incl. SLOW, snapshot cost pin, seed md5, content, lanes, lab md5, general, lessons,
  interviewRoom, engineContent, tryPreview, sqlWords, noDeadEnds). **0 fail.**

## 1. Schema audit (catalog, not grep)

Read from `information_schema`/`pg_constraint`/`pg_index` after seeding (`perfSchema.test.ts`). It covers 67 seeded tables and
100 Engine setup tables in 63 setups. The "Depends" column counts the Solutions (all variants) that read the column, from
`deps.cjs`: tickets, lanes, drills, lessons and interview.

| # | Sev | Schema | Finding | Evidence (measured) | Depends |
|---|---|---|---|---|---|
| S1 | **High** | Logistics | 14 tables never analysed: `employees customers ports carriers shipment_events trucking_orders cfs_receipts hs_codes duties_taxes customs_declarations incoterms payments vendor_bills house_bills` (seed ANALYZEs only the tables it needed). The planner uses default selectivities (0.5 % for `=`, 33 % for ranges). | ANALYZE changes the cost of 116 of 165 Logistics Solutions and the plan shape of 50. ch6-06 s2 drops from 11,308 to 2,852. Every ch11 `plan:` step still passes `checkPlan` afterwards (`planFail2: ok` × 12); ch11-04 lab cost unchanged (2,168). | ch4–ch9 tickets, lanes |
| S2 | **High** | lab | Too small for performance teaching. Largest: `order_items` 4,284 rows/28 p, `fact_sales` 3,894, `app_events` 1,928/32 p, `orders` 1,428/17 p (CLAUDE.md says "~15k rows" in all). | Non-sargable rewrites of g-sargable-1 cost ×1.86 / ×2.33, a correlated rewrite ×2.62: the bar works only on ratios this small. | 16 `plan:` drills, `sargable`, `index_design`, `explain_read`, a10 |
| S3 | Med | all seeded | No identity anywhere: every `id int PRIMARY KEY` is assigned by hand in the seed. `int` is wide enough (max 108,982 rows). Text natural keys `ports.code`, `hs_codes.code` (numeric-looking with leading zeros) and `incoterms.code` are correct as text. | 0 identity columns in 67 tables | Part 9 writes (INSERT needs a default id) |
| S4 | Med | lab, ecom, fin | Enum-like `text` without CHECK: `lab.orders.status` (3 values) and `channel` (2), `app_events.event`, `assignments.variant`, `products.category`; E-com `orders.status`/`platform`, `payments.method`/`status`, `returns.*`, `web_sessions.device`/`source`, `customers.channel`, `deliveries.courier`; Finance `loans.status`, `applications.decision`/`channel`, `products.kind`, `accounts.kind`, `repayments.method`, `collection_calls.outcome` (values only in comments). Logistics has CHECKs everywhere. | distinct ≤ 12 values, no `contype = 'c'` | lab `orders.status` 115 Solutions / `channel` 29; ecom `orders.status` 31 |
| S5 | Med | Logistics | `shipments.incoterm text NOT NULL` has no FK to `incoterms(code)`, although the table exists. | catalog | ch6-05, lane r-1 |
| S6 | Med | all seeded | FK columns with no index leading with them: Logistics 33/37, E-com 13/15, Finance 12/17, lab 9/14. Joins still hash (tables are small); the cost appears in correlated or parameterised lookups. Examples: `containers.shipment_id`, `invoices.shipment_id`, `payments.invoice_id`, `container_events.container_id` (deliberate, ch11 lab), ecom `order_items.product_id`, `payments.order_id`, fin `repayments.loan_id`, lab `orders.store_id`. | `lead_idx = false` | ecom `order_items.product_id` 17, lab `orders.store_id` 92 |
| S7 | Med | ecom, fin | Domain filter columns have no secondary index at all (only PK/UNIQUE): ecom `orders.ordered_at` (30 Solutions / 12 tickets), `payments.paid_at` (12), fin `schedules.due_on` (15), `gl_entries.posted_on` (12). A non-sargable rewrite is therefore *not* slower here (×0.92–1.04). | variants §5 | as listed |
| S8 | Med | Logistics | `rate_contracts` has no index for its lookup `(pol, pod, container_type, valid_from)`: ch7-04 is the most expensive Solution (54,975). | index fix 54,975 → 27,977; JOIN rewrite 304 | ch7-04, ch7-06, ch12-02, lane r-3 |
| S9 | Low | lab | Money is mixed: `products.price_vnd int`, `order_items.unit_price_vnd int`, `payments.amount_vnd bigint`, `fact_sales.revenue_vnd bigint`. VND has no minor unit, so integers are right; the width is what is inconsistent (`sum(qty * unit_price_vnd)` is int × int). No float money anywhere (Logistics `numeric(p,2)`, ecom/fin `numeric(p,0)`). | catalog | 25 (`price_vnd`) |
| S10 | Low | lab, ecom, Logistics | `timestamp` without time zone: `lab.payments.paid_at`, `lab.app_events.ts`, ecom `ordered_at`/`paid_at`/`started_at`, `container_events.event_time`. PGlite's `TimeZone` is `UTC`; a `timestamptz` value as text gets `+00` (`'2026-10-01 09:00:00+00'`), and the JS client turns `timestamp` into local-time Dates while `timestamptz` becomes UTC instants. The grader (`dateKey`) handles both, but the `::text` output a learner sees changes. | `tz.mjs` | `app_events.ts` 10 |
| S11 | Low | lab | Gaps that are deliberate, keep and document: `payments.order_id` has no FK (orphans hook), `orders.customer_id` nullable (walk-ins), `raw_signups` all nullable text (cleaning drills), `dim_customer.valid_to` NULL = current. | head of `lab.sql` | data-quality drills |
| E1 | Med | Engine setups | 32 of 100 tables have no PK. Most are **load-bearing**: L3-02/03/05/09/10/15 heap/TOAST/freeze/WAL labs, L5-01/02/04/05/06/12/15 (index internals, BRIN, GIN pending list), L4-07/L5-15 partitions (a PK there must include the partition key). Not load-bearing (could gain a PK): L2-05 `sessions`, L4-03 `addr_plain`/`addr_stats`, L4-15 `big`. | `perfSchema.test.ts` | `fact.expect`, predict `rows`, page counts |
| E2 | Low | Engine setups | PK types: 59 `int`, 5 `bigint`, 3 `text`, 1 identity (L1-03, the lesson about it). 13 money columns are `int` (`amount`, `balance`, `total`: L2-01, L3-07, L3-10, L4-04/05/09/16, L5-08, L5-17). 12 `char(n)` columns are padding on purpose (fillfactor/page labs). 8 `timestamp` without time zone (L3-15, L5-05, L5-15). | catalog | L1 lessons teach the right types while their own later labs ignore them |

## 2. Target models

### 2.1 `lab` (General / SQL path): clean, keep every value

A typing change must not change any value, because 103+ drills compare results. Row text is what `tests/lab.test.ts` hashes
(`md5(string_agg(x::text …))`), so `int`→`bigint` and adding constraints leave the pins unchanged; adding or removing a column changes them.

| Table | Change | Why |
|---|---|---|
| every table with `id int PRIMARY KEY` | `id int GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY`, the seed keeps inserting its literal ids, then `SELECT setval(pg_get_serial_sequence('lab.<t>', 'id'), max(id)) FROM lab.<t>` | Part 9 (writes) INSERTs without an id; without the `setval` the first learner INSERT collides with id 1 (23505). `BY DEFAULT`, not `ALWAYS`, so the seed and `OVERRIDING` lessons work. |
| `orders` | `CHECK (status IN ('PAID','CANCELLED','REFUNDED'))`, `CHECK (channel IN ('ONLINE','STORE'))`, `CHECK (delivered_on >= shipped_on)`, index `orders (store_id)` | S4, S6 (92 Solutions join on `store_id`) |
| `order_items` | `CHECK (qty > 0)`, `CHECK (unit_price_vnd >= 0)`, index `(product_id)` | S6 |
| `app_events` | `CHECK (event IN ('view','add_to_cart','checkout','paid'))` | S4 |
| `assignments` | `CHECK (variant IN ('A','B'))`, index `(customer_id)` | S4, S6 |
| `products` | `CHECK (price_vnd > 0)`; keep `category text` (5 values, a lookup table would change 25 Solutions) | S4 |
| `staff`, `fact_sales` | indexes on `staff (store_id)`, `staff (manager_id)`, `fact_sales (date_key)` | S6, star-schema drills c2 |
| money | keep `int` for prices, `bigint` for totals; add a header comment: VND has no minor unit, so integer money is deliberate | S9 |
| time | **keep `timestamp`** (one-city shop on local wall-clock time); the head comment says so, and Engine L1-01 teaches `timestamptz` | S10 (answers product Q6: not worth the visible `+00`) |
| new block at the end | `lab.events_big`: about 25,000 rows, own `setseed()`, `CHECK`s, identity id, an index on `(customer_id, ts)`, no index on `kind` (the drill adds it), then `ANALYZE` | S2. Keep it ≤ 30,000 rows **or** `SET default_statistics_target = 500` around its ANALYZE: a sample above 30k rows is not seeded by `setseed()`, so costs would vary per boot (the reason seed.sql does this for `container_events`). The product doc's "≥ 50k" needs the second option. |

Deliberate gaps stay (S11) and are listed in the head comment, like the hooks are today.

### 2.2 Engine Postgres setups

L1 teaches types/identity/constraints, so labs **outside** L3/L5 internals should follow it:

- `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY` in L1/L2/L4 labs that INSERT and never quote ids in `fact`/`expect`.
  Where a lab inserts literal ids, use `int PRIMARY KEY` and say why in the setup comment.
- Money `numeric(12,2)` (or `bigint` minor units, said in the lab) in L2-01, L4-04/05/09/16. **Not** in L3-07/L3-10/L5-08/L5-17:
  there `int` is part of the tuple width the page/fillfactor facts measure.
- `timestamptz` for event times in L4-07 and L5-15 (partitions), with the partition bounds rewritten as `timestamptz` literals.
  L3-15 and L5-05 stay `timestamp` (BRIN/page labs measure widths and correlation).
- PK for L2-05 `sessions`, L4-03 `addr_*`, L4-15 `big`; never for the heap/page/index-internals tables (E1).
- Type-load-bearing (do **not** touch without re-measuring `fact.expect` and predict `rows`): L3-02, 03, 05, 07, 08, 09, 10,
  15, 16, 17, 18; L5-01, 02, 04, 05, 06, 08, 12, 15, 17. `tests/enginePgLabs.*` and `tests/enginePredict.test.ts` catch any drift.

### 2.3 Domains: keep the data, mark what is deliberate

Ids and values stay (Save ids untouched; md5 pins untouched). Every decision is either **Fix**, which needs no Solution change, or
**Keep (deliberate)**, recorded as a hook in that seed's header for a later performance lesson.

| Domain | Item | Decision | Later lesson it feeds |
|---|---|---|---|
| Logistics | ANALYZE the 14 tables (S1) | **Fix** (one line at the end of the Plan 5 block); then decide the 5 range-join Solutions in §4.2 | none; correctness of every plan |
| Logistics | `shipments.incoterm` FK (S5) | **Fix** (`ALTER TABLE … ADD FOREIGN KEY`, measured: 0 shipments with an incoterm missing from `incoterms`) | none |
| Logistics | `container_events.container_id` no index | **Keep** (ch11 index lab) | ch11-04/06 |
| Logistics | `rate_contracts` no lookup index (S8) | **Keep**, then a new ch11 or Engine-chip task: "the July margin report is slow: add the index" (measured 54,975 → 27,977; the JOIN rewrite gives 304, ×0.01) | correlated subquery vs JOIN; composite index |
| Logistics | other FKs without index (S6) | **Keep**; ch11 already teaches `shipments(customer_id)` | "index your FK" twist |
| E-com | no index on `orders.ordered_at`, `status` text | **Keep** (deliberate): measured, `orders(ordered_at)` takes ecom-ch3-02 from 980 to 547 | E-com perf chapter: range on timestamp, index, non-sargable `date_trunc` becomes slower only once the index exists |
| E-com | free-text enums (S4) | **Keep** (values are lower-case words in prompts' business language); add CHECKs only if a lesson needs them | "a CHECK lets the planner skip" (constraint exclusion) |
| Finance | no index on `schedules.due_on`, `gl_entries.posted_on`, FKs | **Keep**: `schedules(due_on)` measured 1,032 → 648 on fin-ch2-02 | Finance perf task (date range + index) |
| Finance | `loan_snapshots` PK `(loan_id, month_end)` but filtered by `month_end` | **Keep** (wrong column order on purpose) | "column order in a composite index" |
| all | `timestamp` without tz | **Keep** (in-game local time) | none |

Rule for any Keep: the seed header names it, and a later task that "fixes" it does so inside its own lab transaction
(`runLab` style). The seed never changes, so no md5 pin or snapshot moves.

## 3. Migration impact (lab + Engine + domain fixes)

| Change | Files that change | Tests and pins |
|---|---|---|
| lab identity + `setval` | `src/db/lab.sql` | **measured**: `tests/lab.test.ts` md5 unchanged. Add a test that `INSERT INTO lab.orders (customer_id, …)` without an id succeeds |
| lab CHECKs + 6 indexes | `src/db/lab.sql` | **measured**: every CHECK holds on the seed data; lab, general, lessons, interviewRoom, engineContent, tryPreview, sqlWords and noDeadEnds all pass (1793 tests); the 16 `plan:` drills still read through an index. The cost of 22 of 387 lab Solutions moves, and no new gate offender appears |
| `lab.events_big` (new block) | `src/db/lab.sql`, new drills in `content/general/*.yml`, `scripts/offline.mjs` needs no change (it already hashes `lab.sql`) | new md5 entry; seed time measured (budget: total lab seed ≤ 1 s in Node) |
| Logistics ANALYZE + incoterm FK | `src/db/seed.sql` (end of the Plan 5 block) | **measured**: `seed.test.ts` md5, the `snapshot.test.ts` ch11 `Total Cost` pin, `planCheck.test.ts` (12 `plan:` steps pass, all 6 SLOW still fail, lab `max_cost_ratio` holds), `content.test.ts` (every `wrong:` still differs) and `lanes.test.ts` all pass (1104 tests). 0 shipments have an incoterm missing from `incoterms`. Side effect: 5 range-join Solutions go over the gate budget (§4.2) |
| Engine setups | `content/engine/postgres/L1,L2,L4/*.md` (§2.2 lists **candidates, not measured**: L4-04/05/16 carry `predict.expect` and capstone plans, and a new PK on L2-05/L4-03/L4-15 adds an index. Patch one lab at a time and re-run its shard) | `tests/enginePgLabs.L*.test.ts`, `enginePredict.test.ts`, `engineIntegration.test.ts` |
| Snapshot | none: `__SEED_HASH__` hashes the seed files, so a changed `lab.sql`/`seed.sql` already drops old snapshots. **`SNAPSHOT_FORMAT` bump only if `ensureSchema`/`SANDBOX_SETUP_SQL` change** (not needed by this plan) | `tests/snapshot.test.ts` |
| Save | none: no id of a ticket, drill or engine lesson changes; `completed` is untouched | fixtures v1–v5 untouched |

## 4. CI performance gate (a)

### 4.1 Measurement

`perfAudit.test.ts` runs `EXPLAIN (FORMAT JSON)` on 761 Solutions: every ticket in every variant and boss step, every lane, the
232 drills (sql.yml + adv.yml), lesson examples and "Thử ngay" answers, interview questions and take-home steps. Each runs on its
own schema. One error: `a10.example`, which is itself an `EXPLAIN`. `perfAuditEngine.test.ts` runs 155 Engine lab steps that are
a single read, after setup + replay; the other 30 are writes or scripts. The 4 `lab:` (index-lab) steps are excluded: their
Solution is slow on purpose.

`norm` = root cost ÷ the cost of one full read of the biggest table in the plan (`relpages + 0.01 × rows`).
A never-analysed table uses its real size and an exact count.

| Source / schema | n | cost p50 | p90 | max | norm p50 | p90 | p99 | max |
|---|---|---|---|---|---|---|---|---|
| tickets / Logistics | 156 | 707 | 4,134 | 54,975 | 1.61 | 9.35 | 863 | 869 |
| tickets / E-com | 103 | 481 | 1,049 | 1,762 | 1.58 | 2.75 | 4.16 | 4.94 |
| tickets / Finance | 105 | 273 | 1,002 | 1,430 | 1.73 | 2.95 | 5.95 | 5.95 |
| lanes / Logistics | 9 | 688 | 752 | 752 | 1.33 | 12.25 | | 12.25 |
| drills / lab | 232 | 31 | 195 | 3,429 | 1.55 | 3.52 | 25.4 | 66.9 |
| lessons / lab | 115 | 23 | 187 | 670 | 1.41 | 3.90 | 25.3 | 25.3 |
| interview / lab | 40 | 123 | 351 | 2,694 | 2.39 | 5.38 | 86.1 | 86.1 |
| Engine labs (own setup) | 155 | 19 | 205 | 3,266 | 10.3 | 42.5 | | 875 |

Overall (756): norm p50 1.61, p90 3.59, p95 5.95, p99 84.5; 47 above 5, 25 above 10. On its own, `norm` is noisy for
tiny tables: a recursive CTE of cost 30 scores 25, and ch1-01 at cost 14 scores 11. It is also noisy for Engine catalog and
function scans. So the budget pairs it with an absolute floor.

Cost histogram (756): ≤ 50: 265 · 50–200: 195 · 200–1k: 224 · 1k–5k: 61 · 5k–20k: 5 · > 20k: 6.

### 4.2 Rule and current offenders

**Budget:** `cost ≤ max(FLOOR, K × fullRead(biggest table))`. Measured outcome:

| K, FLOOR | Solutions over budget (unique, variants folded) |
|---|---|
| 5, 1000 | 13: + ch10-01, ch10-03, ch10-06 s1, fin-ch4-03 |
| **10, 1000** | **9: ch6-06 s2, s3 · ch7-04 · ch7-06 s1, s2, s3 · g-a7-2 · g-iv-th-2-2, th-2-3** |
| 10, 500 | 10: + g-correlated-value-2 |
| 20, 1000 | same 9 |

Recommended: **K = 10, FLOOR = 1,000** for tickets, lanes, drills, lessons and interview. For Engine labs, **cost ≤ 5,000**
with no norm, because catalog and function scans make norm meaningless there (max today 3,266, 0 fail).

**Sargability rule:** fail when a Seq Scan reads a table of ≥ 5,000 rows, its Filter names a column that some index leads with,
and the planner estimates that the filter keeps ≤ 5 % of the table. Today **0 Solutions** hit it, before and after S1. On all
six `SLOW` queries of `tests/planCheck.test.ts` (known right-but-slow) it fires **6/6**, `booking_date::text >=` (estimate 33 rows)
and `upper(ref)` included.
It also fires on `extract(year …)` and `to_char` rewrites of ch2-03/ch4-02. There a whole-table read is right anyway,
which is why the learner rule (§5) compares against the Solution's plan instead.

**Offenders and what to do:**

| Solution | cost | Cause | Measured option | Proposal |
|---|---|---|---|---|
| ch7-04 (3 variants) | 54,975 | two correlated subqueries into `rate_contracts` (504 rows, no index) per quotation | index `(pol, pod, container_type, valid_from)` → 27,977; JOIN rewrite → 304 | **allow-list**: ch7 teaches correlated subqueries, and a JOIN Solution would mark the taught answer "slow" (ratio 180). The Recap shows the JOIN cost as a teaching note. Revisit as the S8 index task. |
| ch7-06 s1–s3 | 48,027–48,845 | same subquery | index → 24,539 | allow-list, same reason |
| ch6-06 s2, s3 | 11,308 / 11,022 | `JOIN shipments ON customer_id IN (a.id, b.id)` cannot hash, and `customers` was never analysed | after S1 ANALYZE: 2,852 / 2,864 (norm 5.3): **passes** | fixed by S1 |
| g-iv-th-2-2, 2-3 | 2,643 / 2,694 | `EXISTS` per customer over `orders` | index `orders (customer_id, order_date)` → 1,718 | allow-list now; under budget once lab gets the composite index (§2.1 could add it) |
| g-a7-2 | 3,429 | `jsonb_array_elements_text` lateral × products | none (a function scan) | allow-list: the a7 node teaches JSON unnesting |
| *after S1:* ch8-04, ch8-06 s1–s3, ch12-01, ch12-06 s1–s2 | 1,485 / 25,015 / 24,765 / 24,764 | `DISTINCT ON (b.id) … JOIN exchange_rates ON rate_date <= bill_date`: every earlier rate joins, then one is kept. With defaults the planner under-estimated it | `CROSS JOIN LATERAL (… ORDER BY rate_date DESC LIMIT 1)`: ch8-06 s1 25,015 → 1,289, ch8-04 1,485 → 251, same rows | rewrite the Solutions to LATERAL if ch8 may use it (check that a skill taught by then covers LATERAL), else allow-list with the LATERAL cost as a Recap note. Must be decided **before** S1 ships, or the gate goes red |
| *after S1:* ch12-02 | 297 → 6,972 | the ch7 correlated `rate_contracts` lookup inside AVG | the S8 index | allow-list with ch7 |

**Near misses:** ch10-03 sits at norm 9.9 against K = 10 (cost 18,554). Any change to statistics or PGlite can flip it. Either
allow-list it now, or rewrite it with `DISTINCT ON` (measured: 15,208, ×0.82, same rows).

### 4.3 The test

`tests/perfGate.test.ts` (Node, PGlite, same loaders as `perfAudit.test.ts`; about 20 s, plus about 2 min for Engine, which can share
the `enginePgLabs` shards):

1. Collect every Solution (the list in §4.1); skip `lab:` steps and Engine steps that are writes.
2. `EXPLAIN (FORMAT JSON)` on its schema; table facts from `pg_class` + exact counts for never-analysed tables + `pg_indexes`.
3. Fail on: an over-budget cost (§4.2), or the sargability rule. The message gives the id, cost, budget and `planLine()`.
4. `ALLOW: Record<id, reason>`, starting with ch7-04, ch7-06, g-a7-2 and g-iv-th-2-2/2-3. An allowed entry that drops under budget
   fails too ("remove from ALLOW"), so the list cannot go stale. ch6-06 goes on it only if S1 ships later than the gate.
5. Every new `perf:` step (§5) must have a `slow:` SQL that gives the same rows (`compareResults`) and is graded weak, as
   `planCheck.test.ts` does today.

Put the logic in `src/planCheck.ts` (`planFacts(json, facts)`, `overBudget`, `nonSargable`) so the grader and CI share one rule.

## 5. Learner grading: "right but slow" (b)

### 5.1 Two populations, measured

Each rewrite gives the Solution's rows (`compareResults`, multiset), with the variant's own literals. The exception is the
correlated `max()` of ch10-03: it was not run, because execution would take minutes. "Index lost" is computed
(`perfVariants.test.ts`): the tables the Solution reads with Index/Index Only/Bitmap Heap Scan, minus those the rewrite
Seq Scans (≥ 5,000 rows).
Ratio = cost(rewrite) ÷ cost(Solution).

| Solution | Rewrite | Kind | Ratio | Index lost (Solution reads T by index, rewrite Seq Scans T)? |
|---|---|---|---|---|
| ch11-01 | `customer_id + 0 = …` | slow | 1.52 | yes (shipments) |
| ch11-02 | `date_trunc('week', booking_date) = …` | slow | 2.00 | yes |
| ch11-03 | `upper(ref) = upper(…)` | slow | 39.76 | yes |
| ch11-06 s1 | `to_char(booking_date,'YYYY-MM') = …` | slow | 1.78 | yes |
| ch11-05 | `to_char(booking_date,'YYYY-MM') = …` | slow | 1.63 | yes |
| ch11-06 s2 | `::text` casts | slow | 8.79 | yes |
| ch2-03 | `extract(year …) = 2025` | slow | **0.93** | no (the Solution also Seq Scans: 50 % of rows) |
| ch4-02 | `to_char` range | slow | **1.08** | no (same) |
| ch10-03 | correlated `max()` per container | slow | **12,609** | yes (containers) |
| ecom-ch3-02 | correlated category name | slow | 3.52 | no |
| ecom-ch3-02 | `date_trunc` | slow | 0.95 | no (no index exists) |
| ecom-ch5-01 | `paid_at::date BETWEEN` | slow | 0.92 | no (no index) |
| fin-ch2-02 | correlated `paid_on` ×3 | slow | **240** | no |
| fin-ch2-02 | `to_char(due_on)` | slow | 1.04 | no (no index) |
| fin-ch3-01 | `month_end::text`, `branch_id + 0` | slow | 0.87 | no (no usable index) |
| g-sargable-1 | `date_trunc('week')` / `::text` | slow | 1.86 / 2.33 | no at ≥ 5,000 rows (`orders` has 1,428); yes at the lab threshold ≥ 1,000 |
| g-correlated-value-2 | correlated + `customer_id + 0` | slow | 2.62 | no |
| ch2-03 | `BETWEEN` | good | 1.00 | |
| ch7-04 | JOIN instead of 2 subqueries | good | 0.01 | |
| ch10-03 | `DISTINCT ON` | good | 0.82 | **yes (containers)**: false positive unless scoped |
| ecom-ch3-02 | `IN (subquery)` | good | 1.00 | |
| fin-ch3-01 | `EXISTS` | good | 1.00 | |
| g-sargable-1 | `BETWEEN` | good | 1.00 | |
| g-correlated-value-2 | LEFT JOIN + GROUP BY | good | 0.08 | |

Findings:

- **Good rewrites never exceed 1.00.** Slow rewrites that really are slower fall at 1.52 or above.
- **Cost ratio is blind to non-sargable predicates** whenever the Solution itself reads the whole table (ch2-03, ch4-02),
  or no index exists (E-com, Finance). That is right, not a miss: those rewrites really cost the same on that data. On Logistics
  the planner even estimates `date_trunc(...) = x` at 0.5 % of rows, which makes the slow plan look cheaper.
- **Index loss** catches every non-sargable case where it matters (6/6 on ch11), independent of the ratio. But it also fires on a
  good rewrite (ch10-03 `DISTINCT ON` Seq Scans `containers`, which the Solution reads by index, and is still ×0.82 cheaper).
  So it is scoped to the table the step names, and needs ratio > 1.
- Correlated rewrites show up as large ratios (×3.5, ×240, ×12,609) everywhere.

### 5.2 Rule

`slowVerdict(solutionPlan, answerPlan, spec)` in `src/planCheck.ts`, used only after the result is right:

- **indexLost**: T = the step's named table (`perf.table`, like `plan: { index: t }`). The Solution reads T through an index
  (Index, Index Only or Bitmap Heap Scan), the answer Seq Scans T, T has ≥ 5,000 rows (lab: ≥ 1,000), **and** ratio > 1.
- **ratio** = root cost(answer) ÷ root cost(Solution), from the same DB in the same request (as `runLab` does).

| Where | Trigger | Outcome |
|---|---|---|
| Steps with `perf:` (General Part 11, sargable/cast/date drills, ch11, Engine `plan` steps, capstones) | `indexLost` **or** ratio > `perf.max_ratio` (default **1.5**) | **not passed** (blocks): "Đúng kết quả nhưng chậm" with `planLine()` of both plans and the trap of the skill |
| Every other story, lane, drill and interview step | ratio > **3** **and** answer cost > **1,000**, the same floor as the CI gate, so an extra sort on a 24-row table never matters (only correlated or repeated scans; measured slow catches 3,450 / 248,030 / 2.3e8; good ≤ ×1.00) | **weak pass** (drills: weak like a used scaffold; story: full XP, plus Boon's note and both plan lines in the Recap). Never blocks outside `perf:` |
| `perf:` steps whose Solution cost < 50 (tiny tables) | none | no bar: on tables this small the planner chooses Seq Scan regardless (product §2 "small table" rule); the test refuses `perf:` there |

Why not block everywhere: outside performance lessons, a learner who writes a correlated subquery where a JOIN is cheaper has
still answered the business question. The user said "right but slow is not good enough", so that answer becomes weak with a
note there, not wrong. Inside performance lessons the bar blocks, which is what the user asked.

Measured headroom: 1.5 sits between the good maximum (1.00) and the slowest slow ratio that matters (1.52, ch11-01). That margin
is thin, so every `perf:` step also needs `indexLost` to carry the non-sargable cases. Its `slow:` test proves the bar fires, and
a `good:` test, a second accepted rewrite where one exists, proves it does not.

DynamoDB already does this with `noScan`, `maxScanned` and `maxRcu`, which make a right answer weak. Under `perf:` the same
fields block (product §1.6). MongoDB keeps rule-based checks (ESR, covered), since mingo has no planner.

### 5.3 Costs at grading time

One extra `EXPLAIN` of the Solution and one of the answer per Submit. Both are planner-only, cost-based and deterministic, and
the Solution's plan can be memoised per step+variant (`memoByKey`). Explain runs inside the same `BEGIN … ROLLBACK`. Never
`EXPLAIN ANALYZE`, because timings vary run to run and the 5 s timeout already bounds the real run.

## 6. Open questions for the user

1. S1 (ANALYZE the 14 Logistics tables) changes 116 plan costs, but none of the 12 ch11 `plan:` results and not ch11-04's lab
   cost. It fixes ch6-06 and exposes the ch8/ch12 range join. Should it ship with the gate, together with LATERAL Solutions or
   allow-list entries for ch8/ch12?
2. Should ch7-04/ch7-06 stay correlated (allow-listed, JOIN cost shown in the Recap), or become a later "make this report fast"
   task (S8)?
3. `lab.events_big`: 25k rows with a deterministic default sample, or ≥ 50k (the product doc) with `default_statistics_target = 500`
   (a slower seed: measure before deciding)?
