# BoonData — Plan 10: v12.0 "Gọn & nhanh" (seed only what the player opens, first-run domain picker, frame and accessibility fixes)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v12.0 row of `docs/team/product-design-v7.md` §8, as amended by decision-log L81–L83:
- **§2 P1:** the worker boots empty (engine + `sandbox` only). Logistics becomes a lazy seed like `ecom`, so `ensure('logistics')` (schema id `'game'`) works like `ensure('ecom')`. `DbClient.ready(schema)` exists. Boot seeds only the remembered domain. Quick lessons seed their schema on demand and show a waiting line.
- **§2 P2:** a first-run domain picker (Logistics / E-commerce / "Chỉ học SQL" = `lab` only) inside the welcome dialog. Nothing is seeded until the player picks. The PGlite engine downloads while they decide.
- **§2 measurement:** `performance.measure('db:ensure:<schema>')` around every seed, plus a before/after table in `docs/team/review-log.md`.
- **§1.1 U1–U8:** one-line mobile top bar; one icon = one destination (with a test); learning-path sidebar rows without a Logistics chapter sub-line (L82); the Map page shows the lane brief in place; a native `<select>` on the Data page when the table list is not in the sidebar; sidebar scroll, line clamp and borderless list; the Run/Submit row does not split; Home ≠ Overview (U5).
- **§6:** A1 (`aria-live` run summary), A4 (tap targets), A5 (`lang="en"` on code), A6 (reflow at 320 px), A7 (skip links).
- **§1.2:** L1 (thank-you lines fixed per ticket), L2 (FK parents only from the JOIN chapter), L4 (`precision` per step), L5 (Sandbox starter seen, device pref).
- **v11 backlog** (`review-log.md` "v11 live"): the welcome text follows the open domain.

**Out of scope:**
- Spike S (data dir in IndexedDB): its own plan.
- v12.1+ items.
- Lesson content on `lab` (L7, decided by L84) and the `lab` RFM fix (L8): Plan 10a / v12.3, see D10-9.
- **Moved to Plan 10a** (scope change from the user, 2026-11-18): **L3** (grader reports the first mismatching column) and **L6** (compact correct line, Boon on quick lessons, ① markers on multi-line examples). Plan 10a reworks the quick-lesson "Thử ngay" box and General drills, and touches `src/grader.ts` and `src/ui/lessonCard.ts`. So this plan keeps its changes there minimal: L4 is one optional trailing parameter on the grader, and lessons only get "seed on demand + waiting line".

**Architecture:**
- **DB.** `src/db/worker.ts` creates PGlite and runs only `SANDBOX_SETUP_SQL` (`CREATE SCHEMA IF NOT EXISTS sandbox; SET search_path = logistics, sandbox`). A schema missing from `search_path` is skipped by Postgres, so the session path stays the same. `src/db/lab.ts` `LAZY_SEEDS` gains `game` (new chunk `src/db/gameSeed.ts` re-exporting `schema.sql` + `seed.sql` `?raw`). `ensureSchema(db, 'game')` runs exactly what `initDb` ran before: `CREATE SCHEMA logistics; SET search_path TO logistics;` → `schema.sql` → `seed.sql` → `SANDBOX_SETUP_SQL`. So the md5 pins do not move. `initDb` stays for tests only (engine + `ensureSchema('game')`).
- **Client.** `DbClient.ensure` no longer skips `'game'`. It dedupes concurrent seeds and measures each one. `ready(schema)` = engine ready and schema seeded. A request that **names** its schema (workspace, lessons, drills) seeds it first, queued ahead of itself. Default-schema requests never seed.
- **App.** `app.dbStatus` becomes "the data the open page needs" (`want`), not the engine. `main.ts` decides `want`:
  - at boot, from `bootPick(hash, pref, firstVisit)`;
  - on every domain route, from the router;
  - on the welcome picker, from `startWith()`.
  A finished seed calls `dataChanged()` (clear memos and cards, redraw), the same thing "My data" already does.
- **UI.** The tasks touch `index.html`, `src/ui/{topbar,sidebar,dataView,homeView,lanePanel,mapStrip,work,welcome,lessonCard,brief,vizTabs}.ts`, `src/ui/icons.ts`, `src/ui/dom.ts`, `src/theme.ts`, `src/session.ts`, `src/state.ts` and the i18n files. No new dependency, no Save change (Save stays v4).

**Tech Stack:** as HEAD (Vite 8, TypeScript, Tailwind v4, PGlite 0.5.16 in a worker, Vitest 5). No new dependency.

**Spec / decision sources:**
- `docs/team/product-design-v7.md` §1.1, §1.2, §2, §6, §8, §10.
- `docs/team/decision-log.md` L46 (browser seed timings), L55, L59 (main 290), L61 (D9-8/D9-10), L62, L63, L65, L72 (test ports and saves), L74–L83.
- `docs/team/review-log.md` "v11 reviews", "v11 live".

## Preconditions and anchors

Written against HEAD `fe218f1`, which already includes L82/L83 (c6be07a) and L85 (fe218f1: the rail is the default, names show on hover through `data-tip`/`#side-tip`, the toggle sits at the top, the Overview has its own `overview` icon). `tests/_tmp_explore.test.ts` and `.idea/` belong to other work: never stage them. Every code step below is anchored by name, not by line number. If a "replace" block does not match because HEAD moved, apply the step's intent to the code on disk and note the difference in the commit message (same rule as Plans 2–9).

| Anchor | Expected | If missing |
|---|---|---|
| `grep -c "appliesOne" src/ui/learnView.ts` | `0` (L82 applied) | Stop: commit or finish the L82 task first |
| `grep -n "icon: 'overview'" src/ui/topbar.ts` | 1 line (L85) | Stop: Task 5 assumes L85 |
| `grep -n "data-tip" src/ui/sidebar.ts` | ≥ 1 line (L85) | Stop |
| `grep -n "SAVE_VERSION = " src/save.ts` | `4` | Stop |
| `grep -n "LAZY_SEEDS" src/db/lab.ts` | 1 line | Stop |
| `grep -n "async ensure(schema: SchemaId)" src/db/client.ts` | 1 line | Stop |
| `grep -n "initDb(db)" src/db/worker.ts` | 1 line | P1 already started: diff against Task 1 |
| `grep -n "export function relatedTables" src/viz/erd.ts` | 1 line | Stop |
| `grep -n "export function welcomeNeeded\|export const welcomeNeeded" src/onboarding.ts` | 1 line | Stop |

## Decisions (D10-1 … D10-26, for the orchestrator to log as L-numbers)

**Needs the user's look:** D10-2 (seed budget), D10-12 (what `precision` means and which steps get it), D10-7 (the domain pref may hold `'general'`).

| # | Decision | Why |
|---|---|---|
| D10-1 | **Seed only what is opened** (D-P1). The worker boots empty. Logistics is a lazy seed (chunk `gameSeed`, budget group `gameseed` 16 KB; `schema.sql` + `seed.sql` = 13.3 KB gz -9 measured). The `worker` chunk shrinks by about the same amount. | §2.3; seed files leave the worker chunk exactly like `ecomSeed`. |
| D10-2 | **One seed budget `ENSURE_TIMEOUT_MS = 120_000`** for every schema (was 30 s for `lab`/`ecom`; the old Logistics boot seed had no timeout at all). A seed that times out or fails is marked **broken** in `DbClient`: requests naming that schema no longer re-seed it. The top bar shows the failed state with "Thử lại database", which restarts the worker and opens the schema again. **Needs user look.** | L46: Logistics took 10–11 s in desktop Edge. Phones are 2–4× slower. 30 s would turn "slow but works" (today) into "never loads". A 2-minute cap is hang detection, not a target. "Broken" prevents a 2-minute re-seed on every Run. |
| D10-3 | **Only requests that name their schema seed it on demand** (`DbClient.request`/`lab` with `opts.schema`). Default-schema requests (Data page, dashboard, KPI, columns, ER) never seed; `main.ts` opens the domain's schema on every domain route instead. | The workspace, lessons and drills always name their schema. A stray default-schema read (for example a hidden brief at boot) must not start a 10 s Logistics seed for an E-commerce or SQL-only player. |
| D10-4 | **`app.dbStatus` = status of the data the open page needs** (`want`), derived in `main.ts` from the engine status, `db.ready(want)` and failed seeds. Callers (`topbar.ts`, `welcome.ts`, `work.ts`) are unchanged. | One meaning for the green dot, Lily waking up and "waiting" lines. |
| D10-5 | **Every finished seed (`DbClient.onSeeded`, whoever started it: a domain route, a lesson's or drill's named request) calls `dataChanged()`**: `clearMemos()`, `resetCards()`, `work.setSchema(editorSchema())`, `panel.refresh()`, `rerender()`. This is the same callback "My data" uses, now shared. | `memoByKey` drops rejections only. An `information_schema` query that ran before the seed returned empty tables, and that result stays cached (ER, related tables, Data page). |
| D10-6 | **The picker lives on panel 1 of the welcome dialog**, not on a new screen. It shows only when there is no domain in the hash, no domain pref and `welcomeNeeded(...)` holds. Choices: Logistics, E-commerce, "Chỉ học SQL" (`lab`). Finance is not offered (not live). Esc on the picker = Logistics (the old default). | P2 with the least new UI. A player who will never see the welcome (old saves, skipped coach) is never asked and gets Logistics. |
| D10-7 | **Pref `cargo-query/domain` may hold `'general'`** (SQL only). Only `bootPick` reads that value. Every other reader still sees `isLiveDomain() === false`, so the open domain reads as Logistics for General pages. **Every domain route writes the pref**, so entering a domain later replaces `'general'` and seeds that domain. No pref and no welcome → Logistics. **Needs user look** (changes a documented pref). | The pref is the remembered place. A second key would be one more thing to keep in sync. |
| D10-8 | **"Chỉ học SQL" closes the welcome as a skip**: `cargo-query/coach-done` = true, no tour, route `#/learn`. The tour stays available from ⋯ "Xem lại hướng dẫn". | The tour is about Logistics ticket 1 (L76). Skipping matches the Esc path that already exists. |
| D10-9 | **Lessons: seed on demand plus a waiting line; the move to `lab` belongs to Plan 10a.** L84 (2026-11-18) decided that quick lessons run on `lab`, and the user put the lesson box in Plan 10a. Plan 10 does not touch lesson content or `lessonSchema()`. "Chạy ví dụ" / "Kiểm câu trả lời" seed whatever `lessonSchema(l)` returns on demand (D10-3) and say "Đang chuẩn bị dữ liệu ví dụ…" with Lily asleep while it is not ready. Today that means Logistics; after Plan 10a it means `lab` (~0.2 s in Node), with no change here. | Works before and after Plan 10a. Until Plan 10a lands, a SQL-only player waits for Logistics once (~10 s) on their first skill lesson, which is the wait every player has at boot today. |
| D10-10 | **Glossary: no change.** The notebook only prints the `columns` names and never queries the DB. The `columns exist` test uses `tests/helpers.ts` `seededDb()` → `initDb` (engine + `ensureSchema('game')`), so it still sees every Logistics table. | §2.2 listed the glossary as a Logistics dependency. It is a test-only dependency. |
| D10-11 | **CSV import uses a static `LOGISTICS_TABLES` list** (26 names, checked against `schema.sql` by a test). It replaces `MyData`'s `information_schema` read for the `_my` rename and the restore check. | With lazy Logistics, `shipments.csv` imported in an E-commerce-only session would keep the name `shipments` and later be shadowed by `logistics.shipments` (game tables win on `search_path`). |
| D10-12 | **L4 semantics: `precision: p` is strict.** A numeric cell must already sit at `p` decimals (\|v − round(v, p)\| ≤ 1e-9), then it is compared at `p`. Without `precision`, today's lenient "round both to 2 decimals" stays. **Applied now** to the steps whose prompt says "làm tròn đến/tới đồng" for the result **and** whose Solution is integral in every variant (verified, see below): `ch8-06` steps 1–3, `ch12-06` steps 2–4, `ecom-ch5-05` step 1. **Not applied:** `ch8-04` (the `amount` column keeps decimals), `ch12-01` and `ch12-06` step 1 (ratio columns), `ecom-ch5-05` steps 2–3. **Needs user look.** | "Compare at 0 decimals" would be looser than today and would not grade rounding. Strict mode grades exactly what the prompt asks. `ch2-01`'s text ("thiếu `ROUND` vẫn được tính đúng") is about 2 decimals and stays true. |
| D10-13 | **U1:** below 640 px the bar is one line: drawer · logo mark · domain chip (icon + "Ch.N") · XP pill · DB dot · ⋯. Inbox, Review, Notebook and VI\|EN + theme move into the ⋯ menu (`sm:hidden` copies). The DB dot stays beside ⋯, not inside the chip. | A failed DB shows a Retry **button**, which cannot sit inside the chip button. |
| D10-14 | **U2, on top of L85** (fe218f1: the Overview already has its own `overview` icon, and the rail shows names on hover):<br>• one table `NAV_ICON` in `src/ui/icons.ts` that every `registerNav` reads;<br>• one new icon, `database`, for the Data page (`table` is also the dashboard's table-card icon);<br>• the top bar's domain chip shows the **open** domain's icon (it is a static `anchor` today, also in E-commerce).<br>A test checks that the nav icons are unique, never equal a domain icon, and are never passed as a literal to `registerNav`. No compass/grid icons: the dashboard keeps `chart`, the map keeps `map`. | The design's rule, testable without a DOM. L85 already removed the worst duplicate (Overview = domain icon). |
| D10-15 | **U3 is mostly done already:** `content/chapters.yml` `module` titles are named by skill group, and L82 removed the domain lines from General pages. Remaining: learning-path sidebar rows show the module number, with no Logistics chapter-status sub-line and no lock icons (this also closes L80 #6). | Strike what v11/L82 already did (design note at the top of v7). |
| D10-16 | **U4:** the Map page = route map + lane list on the left, the brief on the right from 1024 px. Below that, the brief sits under the list and is scrolled into view (no fixed bottom sheet). Pins are buttons (`wirePins`, shared with the map dialog). The lane's name is announced through `#announce`. | Smallest change that does what U4 says. A bottom sheet is new UI for one page. |
| D10-17 | **U6:** the Data page shows a native `<select>` (one `<optgroup>` per chapter, row count in each option) whenever the table list is not in the expanded sidebar: below 1280 px, with the rail pref (the default since L85), and on mobile. Search filters the options. | Native select: keyboard, mobile picker and screen readers for free (§1.1). |
| D10-18 | **U5 is included, as its own cuttable task (Task 8).** The task brief listed U1–U8 but left U5 out of its parenthetical. | Scope row v12.0 says U1–U8. |
| D10-19 | **U8:** Run/Submit labels are short. The shortcut sits in a `<kbd>` hidden below `sm` (this also closes L80 #9), and `aria-keyshortcuts` keeps it for screen readers. Submit comes right after Run. The DB waiting text appears only in the line under the buttons. | §1.1 U8. |
| D10-20 | **L1:** four thank-you lines per department. Index = (chapter + number) mod 4 taken from the id (`…chN-0M`), with a string hash for other ids. Consecutive tickets of a chapter, and chN-05 → chN+1-01, always differ. | Deterministic, no Save. |
| D10-21 | **L2:** FK parents join "related tables" only from the chapter that teaches `join` in the open domain (`domainSkills(app.tickets)`: Logistics ch3, E-com C3). Drills (chapter 0) get none. | §1.2 L2. |
| D10-22 | **L5:** device pref `cargo-query/sandbox-seen` = list of domain ids. It is set the first time the player writes something other than the starter in that domain's Sandbox. An empty draft then stays empty there. | L62's reason ("a flag would bump Save") goes away with a device pref. |
| D10-23 | **A1:** one polite sentence through `#announce` after Run ("Chạy xong: 12 dòng, 3 cột." / "Lỗi ở dòng 2."). **A4:** base `button { min-height: 1.5rem }`, plus `max-lg:min-h-11` on list rows (sidebar, history, Data list, Map lane list). **A5:** `<html lang>` already follows the language; new: `h()` gives `code`/`pre` `lang="en"`, and the editor host gets `lang="en"`. **A6:** a scripted check at 320 px, with fixes per finding. **A7:** the three regions are already named; new: two skip **buttons** at the top of `#shell` (not hash links, because the router owns the hash). | Strike what exists; keep each item small. |
| D10-24 | **Budgets:** new group `gameseed` /^gameSeed-/ 16 KB. `worker` keeps 160 (it shrinks). `main` stays ≤ 290: about 45 new VI strings (thank-you lines, picker, a11y, skip) ≈ +2 KB gz. EN is a lazy chunk (budget `en` 20). | L59: new weight is lazy. |
| D10-25 | **Metric "data ready"** = `performance.now()` at the first moment the top bar shows the green dot **and** no `domain.loading`/`ecom.loading` notice is visible. Also record `db:ensure:<schema>` (after only). 3 runs each for Logistics, E-commerce direct and SQL only, Edge, `vite preview` build, idle machine, warm HTTP cache. | Same metric before and after; HEAD has no ensure measure. |
| D10-26 | **L3 and L6 move to Plan 10a** (user, 2026-11-18). | See "Out of scope". |
| D10-27 | **T10 as built:** `cellKey` keeps `dateKey` (the plan's Step 2 snippet predates it); the column-detail check (`columnCheck`, L84) gets `precision` too, so a strict cell is reported in its column. `cellKey` now has a second parameter, so `row.map(cellKey)` would pass the array index as precision: every caller wraps it (`(c) => cellKey(c)`, tests/variants and ecomContent). | Found while implementing Task 10. |
| D10-28 | **T11 as built:** `thanksKey` uses index = number + 2 x chapter, not chapter + number (D10-20): with 6-ticket chapters, chN-06 and chN+1-01 gave the same line. The new index differs for consecutive tickets also across chapters of 3 to 6 tickets (test adds ch4-06 to ch5-01 and ecom-ch2-05 to ecom-ch3-01). | Found while implementing Task 11. |

## Global Constraints

- Every rule in `CLAUDE.md`:
  - all UI text through `t()`, VI keys in `src/i18n/vi.ts`, EN in `src/i18n/en.ts` (`Record<Key, Msg>`, so a missing key fails `tsc`);
  - no emoji;
  - whole literal Tailwind class strings (`cx()` for joins; `tests/theme.test.ts` fails on template-literal classes);
  - text contrast ≥ 4.5:1 in both themes;
  - no `innerHTML` outside Mermaid;
  - device prefs through `src/storage.ts`, validated on read, never in Save.
- **Do not edit** `src/db/schema.sql`, `src/db/seed.sql`, `src/db/lab.sql` or `src/db/ecom/*.sql`. The md5 pins (`tests/seed.test.ts`, `tests/lab.test.ts`, `tests/ecomSeed.test.ts`) must stay green unchanged.
- **Save stays v4.** No new Save field, no migration, fixtures untouched.
- Schema names only from `SCHEMAS` (`src/domains.ts`), never from player text or the hash.
- `main` chunk ≤ **290 KB gz**. Lazy groups keep their budgets; only the new `gameseed` group is added (16 KB).
- After every task that touches `src/`, run `npx tsc --noEmit && npm test` (Vitest does not typecheck). After a task with a build: `npm run build && node scripts/check-budget.mjs`, and write `main`, `worker`, `gameseed` into the commit body.
- **Ports:** never 5173. Use `npm run dev -- --port 5174 --strictPort` with the test save that is already there (L72), and `:5175` with cleared localStorage for first-visit checks. Measurements use `npx vite preview --port 5174 --strictPort` after `npm run build`.
- **Commits:** one per task. `git add` only that task's files (never `-A`: other agents' files may be in the tree). Use `-c user.name=KhoaDauTay -c user.email=cuonglieu3256@gmail.com`. The message ends with a blank line and `Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M`.

## File Structure

```
src/db/gameSeed.ts           re-exports schema.sql/seed.sql ?raw: lazy worker chunk                  (create, T1)
src/db/lab.ts                LAZY_SEEDS.game                                                         (modify, T1)
src/db/init.ts               initEngine (worker) + initDb = engine + ensure game (tests)             (rewrite, T1)
src/db/worker.ts             boots with initEngine only                                              (modify, T1)
src/db/client.ts             ensure('game'), dedupe, ready(), ENSURE_TIMEOUT_MS, measure (T1); auto-seed named schema, broken (T2)
src/domains.ts               LOGISTICS_TABLES                                                        (modify, T1)
src/import/myData.ts         static game table names                                                 (modify, T1)
scripts/check-budget.mjs     gameseed 16                                                             (modify, T1)
src/onboarding.ts            bootPick, BootPick                                                      (modify, T2)
src/main.ts                  want/openSchema/syncDbStatus/dataChanged, router hook, enterDomain, startWith (T2, T3), skip links (T9)
src/state.ts                 app.dataReady (T2); actions.startWith (T3); showsParents (T11)
src/ui/lessonCard.ts         waiting line while the lesson's schema seeds                           (modify, T2)
src/ui/welcome.ts            picker on panel 1, domain-aware text                                   (modify, T3)
index.html                   top bar one line + ⋯ copies (T4); skip links, #panel tabindex (T9)
src/ui/topbar.ts             chapter in chip, ⋯ copies (T4); NAV_ICON (T5)
src/ui/icons.ts              database, NAV_ICON                                                     (modify, T5)
src/ui/sidebar.ts            module rows, clamp, scroll once (T5); sideExtra only when wide (T6)
src/ui/modes.ts, src/ui/dataView.ts, src/ui/homeView.ts, src/ui/mapStrip.ts, src/ui/lanePanel.ts   icons (T5)
src/ui/dataView.ts           <select> picker, borderless list                                       (modify, T6)
src/ui/lanePanel.ts          wirePins (shared by map dialog and Map page)                           (modify, T7)
src/ui/homeView.ts           Map page with brief in place (T7); Home resume line (T8)
src/ui/work.ts               short labels + kbd, order (T9); A1 announce (T9); precision (T10); A4/A5 (T12)
src/ui/dom.ts                announce() (T9); code/pre lang="en" (T12)
src/ui/feedback.ts           lineAt, runSummary                                                     (modify, T9)
src/grader.ts                optional precision                                                     (modify, T10)
src/tickets.ts               Step.precision, frontmatter precision                                  (modify, T10)
content/tickets/ch8/ch8-06.md, content/tickets/ch12/ch12-06.md, content/domains/ecom/tickets/ch5/ecom-ch5-05.md   precision (T10)
src/theme.ts, src/ui/brief.ts thanksKey, 4 lines per department                                     (modify, T11)
src/viz/erd.ts, src/ui/vizTabs.ts, src/ui/brief.ts   relatedTables withParents                       (modify, T11)
src/session.ts               sandbox-seen pref                                                      (modify, T11)
src/style.css                button min-height                                                      (modify, T12)
src/i18n/vi.ts, src/i18n/en.ts   new keys per task; tests/i18n.test.ts SAME_OK                      (T2–T11)
tests/startup.test.ts, tests/client.test.ts, tests/onboarding.test.ts, tests/icons.test.ts, tests/topbar.test.ts (new),
tests/grader.test.ts, tests/content.test.ts, tests/ecomContent.test.ts, tests/theme.test.ts, tests/erd.test.ts,
tests/prefs.test.ts, tests/a11y.test.ts (new), tests/seed.test.ts
CLAUDE.md, docs/team/review-log.md                                                                 (modify, T13)
```

## Verified while writing (scratch Vitest config pointing at the repo, PGlite 0.5.16, Node, 2026-11-18, no source edits)

- **Seed order empty → `ecom` → Logistics.** Steps: a new PGlite plus `SANDBOX_SETUP_SQL`; `SHOW search_path` = `logistics, sandbox` with no `logistics` schema yet (0 tables); then `ensureSchema(db, 'ecom')`; then exactly the steps `ensureSchema(db, 'game')` will run (`CREATE SCHEMA logistics; SET search_path TO logistics;` → `schema.sql` → `seed.sql` → `SANDBOX_SETUP_SQL`). Results:
  - **md5 of all 26 Logistics tables equal to the old boot order** (`tests/helpers.ts` `freshDb()`);
  - `SHOW search_path` = `logistics, sandbox` afterwards;
  - **`EXPLAIN (FORMAT JSON)` of all 8 chapter-11 Solution steps byte-identical** on both DBs (plan costs do not depend on seed order: `ANALYZE` reads every row, Plan 4).
  - Times under load (two seeds at once): `ecom` 5.5 s, Logistics 4.1 s.
- `schema.sql` holds all 26 `CREATE TABLE`s (`seed.sql` none). The names, in order: ports carriers employees customers shipments containers shipment_events trucking_orders cfs_receipts hs_codes duties_taxes customs_declarations incoterms exchange_rates rate_contracts quotations invoices payments vendor_bills master_bills house_bills free_time_terms container_events claims lane_profiles bunker_prices.
- `cat src/db/schema.sql src/db/seed.sql | gzip -9 | wc -c` = 13,599 bytes.
- **L4 candidates**, every variant, numeric cells checked for integrality:

  | Ticket | Integral (gets `precision: 0`) | Not integral |
  |---|---|---|
  | ch8-06 (1 variant) | steps 1–3 | — |
  | ch12-06 | steps 2–4 | step 1 |
  | ecom-ch5-05 | step 1 | step 2 |
  | ch8-04 (3 variants) | — | `amount` |
  | ch12-01 | — | ratio column |

  The prompts that say "làm tròn đến/tới đồng" for the result: ch12-06 steps 2, 3, 4; ecom-ch5-05 step 1; ch8-06's body ("làm tròn tới đồng ngay ở từng hóa đơn, trước khi cộng", every step).
- **Not verified:** everything else was written against HEAD's names but not run: Task 1's client/worker/init code and its test edits, the `main.ts`/UI code of Tasks 2–12, the Vite build and browser timings. Only the seed order (above) and the L4 candidates were executed.

---

### Task 0: Preconditions and baseline measurement (no source change)

**Files:** `docs/team/review-log.md` (the baseline table only).

- [ ] **Step 1: Anchors.** Run every command in "Preconditions and anchors". If one fails, stop and follow its "If missing" column.
- [ ] **Step 2: Clean tree for this plan's files.**
  ```bash
  git status --short src/db src/main.ts src/ui src/onboarding.ts src/state.ts src/grader.ts src/tickets.ts index.html
  ```
  Expected: nothing listed. If anything is listed, it belongs to another task; wait for it to be committed.
- [ ] **Step 3: Build HEAD and serve it.**
  ```bash
  npm run build && node scripts/check-budget.mjs
  npx vite preview --port 5174 --strictPort
  ```
  Write down `main`, `worker` and `initdb` from the budget output.
- [ ] **Step 4: Measure "data ready" (D10-25), 3 runs per row, Edge, idle machine.** After each navigation, paste this snippet in the console at once (seeds take ≥ 2 s, so polling always starts in time). `performance.now()` counts from navigation start.
  ```js
  (() => { const t = setInterval(() => {
    const dot = document.querySelector('#db-status .bg-emerald-600');
    const n = document.getElementById('notice');
    if (dot && n.hidden) { clearInterval(t); console.log('data-ready', Math.round(performance.now()), 'ms'); }
  }, 50); })();
  ```
  Rows:
  - (a) `http://localhost:5174/#/d/logistics` (the L72 test save, Logistics);
  - (b) `http://localhost:5174/#/d/ecommerce`, then visit `#/d/logistics` once so the pref goes back;
  - (c) SQL only: on HEAD this is `#/learn` (HEAD seeds Logistics anyway).
  Also record `performance.getEntriesByName('db:time-to-ready')[0].duration`.
- [ ] **Step 5: Write the baseline into `docs/team/review-log.md`.** Add a new section `## v12.0 (Plan 10)` with this table, filling only the "before" columns:

  | Row | before: data ready (ms, 3 runs) | before: db:time-to-ready | after: data ready | after: db:ensure:&lt;schema&gt; |
  |---|---|---|---|---|

  Commit:
  ```bash
  git add docs/team/review-log.md
  git -c user.name=KhoaDauTay -c user.email=cuonglieu3256@gmail.com commit -m "docs: v12.0 boot baseline (Plan 10 Task 0)

  Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
  ```

---

### Task 1: Logistics becomes a lazy seed; the worker boots empty (behaviour-preserving)

After this task the app still seeds Logistics at boot, because `main.ts` ensures `'game'` right after creating the client. Task 2 changes that policy, so every commit in between still boots.

**Files:**
- Create: `src/db/gameSeed.ts`
- Modify: `src/db/lab.ts`, `src/db/init.ts` (rewrite), `src/db/worker.ts`, `src/db/client.ts`, `src/main.ts`, `src/domains.ts`, `src/import/myData.ts`, `scripts/check-budget.mjs`
- Test: `tests/startup.test.ts`, `tests/client.test.ts`

**Interfaces:**
- Produces:
  - `initEngine(db: Pick<PGlite, 'exec'>): Promise<unknown>` and `initDb(db: PGlite): Promise<void>` (`src/db/init.ts`);
  - `ensureSchema(db, 'game')` (`src/db/lab.ts`);
  - `ENSURE_TIMEOUT_MS = 120_000`, `DbClient.ensure(schema): Promise<void>` (deduped, now also `'game'`), `DbClient.ready(schema): boolean`, performance measure `db:ensure:<schema>` (`src/db/client.ts`);
  - `LOGISTICS_TABLES: readonly string[]` (`src/domains.ts`).

- [ ] **Step 1: Write the failing tests.**

  Append to `tests/startup.test.ts` (keep the existing test; put the imports at the top):
  ```ts
  import { PGlite } from '@electric-sql/pglite';
  import worker from '../src/db/worker.ts?raw';
  import schemaSql from '../src/db/schema.sql?raw';
  import { initEngine } from '../src/db/init';
  import { ensureSchema } from '../src/db/lab';
  import { ECOM_TABLES, LOGISTICS_TABLES } from '../src/domains';

  describe('v12.0 P1: worker khởi động rỗng, Logistics seed lười', () => {
    it('worker không còn nạp schema.sql/seed.sql lúc khởi động', () => {
      expect(worker).not.toMatch(/seed\.sql|schema\.sql|initDb\(/);
      expect(worker).toContain('initEngine(');
    });

    it('boot rỗng → ecom → game: không có bảng logistics trước khi ensure, đủ 26 bảng sau, search_path giữ nguyên', async () => {
      const db = new PGlite();
      await initEngine(db);
      const count = async (s: string) => (await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = '${s}'`)).rows[0].n;
      expect((await db.query<{ search_path: string }>('SHOW search_path')).rows[0].search_path).toBe('logistics, sandbox');
      await ensureSchema(db, 'ecom');
      expect(await count('logistics')).toBe(0);
      expect(await count('ecom')).toBe(ECOM_TABLES.length);
      await ensureSchema(db, 'game');
      expect(await count('logistics')).toBe(LOGISTICS_TABLES.length);
      expect((await db.query<{ search_path: string }>('SHOW search_path')).rows[0].search_path).toBe('logistics, sandbox');
    }, 120_000);

    it('LOGISTICS_TABLES = mọi CREATE TABLE trong schema.sql (đổi tên CSV, D10-11)', () => {
      const names = [...schemaSql.matchAll(/^CREATE TABLE\s+([a-z_]+)/gim)].map((m) => m[1].toLowerCase());
      expect([...LOGISTICS_TABLES].sort()).toEqual(names.sort());
    });
  });
  ```
  (`tests/seed.test.ts` keeps pinning the md5 of the 26 tables through `seededDb()` → `initDb`, which now goes through `ensureSchema('game')`.)

  In `tests/client.test.ts`, test `'ensure: hạn 30 s, nhớ schema, gửi lại sau restart trước query kế tiếp'`:
  - rename it to `'ensure: hạn riêng, nhớ schema, gửi lại sau restart trước query kế tiếp'`;
  - replace
    ```ts
        await expect(db.ensure('game')).resolves.toBeUndefined();
        expect(w.posted).toHaveLength(1);
    ```
    with
    ```ts
        const g = db.ensure('game'); // v12.0 P1: Logistics is seeded through ensure too
        expect(w.posted[1]).toMatchObject({ kind: 'ensure', schema: 'game' });
        w.send({ type: 'result', id: w.posted[1].id, result: null });
        await g;
    ```
  - on `w2` the restart now replays **two** seeds (`lab`, `game`) before the `run`, so replace the tail of the test with:
    ```ts
        const next = db.run('NEXT', { schema: 'lab' });
        w2.ready();
        expect(w2.posted.map((p) => p.kind)).toEqual(['ensure']);
        w2.send({ type: 'result', id: w2.posted[0].id, result: null });
        expect(w2.posted.map((p) => p.kind)).toEqual(['ensure', 'ensure']);
        w2.send({ type: 'result', id: w2.posted[1].id, result: null });
        expect(w2.posted.map((p) => p.kind)).toEqual(['ensure', 'ensure', 'run']);
        w2.answer(2);
        await expect(next).resolves.toBeDefined();
    ```

  In `'ensure quá hạn: không gửi lại sau restart (không vòng lặp)'`, replace `await vi.advanceTimersByTimeAsync(30_000);` with `await vi.advanceTimersByTimeAsync(ENSURE_TIMEOUT_MS);`, and add `ENSURE_TIMEOUT_MS` to the import from `'../src/db/client'`.

  Add at the end of `describe('DbClient')`:
  ```ts
    it('ensure: hai lần gọi cùng lúc chỉ gửi một yêu cầu; ready() theo schema', async () => {
      const { db } = client();
      const w = last();
      w.ready();
      expect(db.ready('game')).toBe(false);
      const a = db.ensure('game');
      const b = db.ensure('game');
      expect(w.posted.filter((p) => p.kind === 'ensure')).toHaveLength(1);
      w.send({ type: 'result', id: w.posted[0].id, result: null });
      await Promise.all([a, b]);
      expect(db.ready('game')).toBe(true);
      expect(db.ready('ecom')).toBe(false);
    });

    it('ensure chờ hơn 30 s vẫn được (Logistics trên máy chậm, D10-2)', async () => {
      const { db } = client();
      const w = last();
      w.ready();
      const e = db.ensure('game');
      await vi.advanceTimersByTimeAsync(60_000);
      w.send({ type: 'result', id: w.posted[0].id, result: null });
      await expect(e).resolves.toBeUndefined();
    });
  ```

- [ ] **Step 2: Run the tests and watch them fail.**
  ```bash
  npx vitest run tests/startup.test.ts tests/client.test.ts
  ```
  Expected: FAIL. `initEngine` and `LOGISTICS_TABLES` are not exported; `ensure('game')` posts nothing; `ENSURE_TIMEOUT_MS` is undefined.

- [ ] **Step 3: Implement.**

  Create `src/db/gameSeed.ts`:
  ```ts
  // The Logistics schema and seed as raw SQL (v12.0 P1). Only src/db/lab.ts imports this, with import(), so the worker
  // fetches it as its own chunk the first time ensureSchema(db, 'game') runs (budget group `gameseed`).
  export { default as schema } from './schema.sql?raw';
  export { default as seed } from './seed.sql?raw';
  ```

  `src/db/lab.ts`:
  - in `LAZY_SEEDS` add, before `lab:`:
    ```ts
      game: async () => {
        const m = await import('./gameSeed');
        return [m.schema, m.seed];
      },
    ```
  - update the doc comment above `LAZY_SEEDS` to name `game` (Logistics, v12.0 P1) next to `lab` and `ecom`;
  - delete "The game schema is always there." from the doc comment of `ensureSchema`.

  Rewrite `src/db/init.ts`:
  ```ts
  import type { PGlite } from '@electric-sql/pglite';
  import { SANDBOX_SETUP_SQL } from './import';
  import { ensureSchema } from './lab';

  /**
   * v12.0 P1: the worker boots empty: only `sandbox` and the session search_path `logistics, sandbox` (a schema that does not
   * exist yet is skipped by Postgres). Each domain's tables come later through ensureSchema (`game` = Logistics).
   */
  export const initEngine = (db: Pick<PGlite, 'exec'>): Promise<unknown> => db.exec(SANDBOX_SETUP_SQL);

  /**
   * Engine + Logistics, as the app booted before v12.0. Tests only (tests/helpers.ts). ensureSchema('game') runs the same
   * statements the old initDb did (CREATE SCHEMA logistics; SET search_path TO logistics; schema.sql; seed.sql;
   * SANDBOX_SETUP_SQL), so the md5 pins in tests/seed.test.ts are unchanged.
   */
  export async function initDb(db: PGlite): Promise<void> {
    await initEngine(db);
    await ensureSchema(db, 'game');
  }
  ```

  `src/db/worker.ts`:
  - replace `import { initDb } from './init';` with `import { initEngine } from './init';`;
  - replace the `const ready = (async () => { … })();` block with:
    ```ts
    const ready = (async () => {
      const t0 = performance.now();
      const db = new PGlite();
      await db.waitReady;
      const t1 = performance.now();
      await initEngine(db); // v12.0 P1: no seed here; ensure requests seed each schema (lab.ts LAZY_SEEDS)
      // seedMs now times only the empty setup; the seeds are the client's `db:ensure:<schema>` measures.
      const timings = { bootMs: Math.round(t1 - t0), seedMs: Math.round(performance.now() - t1) };
      return { db, timings };
    })();
    ```

  `src/db/client.ts`:
  - below `IMPORT_TIMEOUT_MS` add:
    ```ts
    /**
     * One seed's budget (v12.0 D10-2): Logistics took 10–11 s in desktop Edge (L46) and slow phones are 2–4× slower.
     * Hang detection, not a target.
     */
    export const ENSURE_TIMEOUT_MS = 120_000;
    ```
  - below `private ensured = new Set<SchemaId>();` add:
    ```ts
      /** Seeds in flight, one per schema: a second caller waits for the same seed instead of queueing another. */
      private seeding = new Map<SchemaId, Promise<void>>();
    ```
  - replace the whole `async ensure(schema: SchemaId)` method (and its doc comment) with:
    ```ts
      /** v12.0: true once the worker is up and `schema` is seeded on it. Run waits only on the open domain's data. */
      ready(schema: SchemaId): boolean {
        return this.status === 'ready' && this.ensured.has(schema);
      }

      /**
       * Seeds `schema` once (lab.sql, the ecom files, Logistics = 'game') under its own budget, not a query's. Remembered
       * only once it succeeded and re-sent after every restart(). A seed that times out is forgotten (no restart loop) and
       * the next ensure() tries again.
       */
      ensure(schema: SchemaId): Promise<void> {
        if (this.ensured.has(schema)) return Promise.resolve();
        let p = this.seeding.get(schema);
        if (!p) {
          p = this.seed(schema).finally(() => this.seeding.delete(schema));
          this.seeding.set(schema, p);
        }
        return p;
      }

      /** The first enqueue runs synchronously, so the seed is queued ahead of anything sent after ensure() returns. */
      private async seed(schema: SchemaId): Promise<void> {
        const start = performance.now();
        for (;;) {
          try {
            await this.enqueue<void>({ kind: 'ensure', schema }, ENSURE_TIMEOUT_MS);
            break;
          } catch (e) {
            if (!(e instanceof DbRestartError)) throw e; // v11 review: queued when another query restarted the worker: send again
          }
        }
        this.ensured.add(schema);
        performance.measure(`db:ensure:${schema}`, { start }); // v12.0 §2 measurement (review-log)
      }
    ```
  - in `replayEnsured()` replace `IMPORT_TIMEOUT_MS` with `ENSURE_TIMEOUT_MS`.

  `src/domains.ts`, below `ECOM_TABLES`:
  ```ts
  /**
   * Tables of the Logistics schema (src/db/schema.sql; tests/startup.test.ts checks the list). Static because Logistics is
   * seeded lazily (v12.0 P1): a CSV import must avoid these names even before that seed (D10-11).
   */
  export const LOGISTICS_TABLES = [
    'ports', 'carriers', 'employees', 'customers', 'shipments', 'containers', 'shipment_events', 'trucking_orders', 'cfs_receipts',
    'hs_codes', 'duties_taxes', 'customs_declarations', 'incoterms', 'exchange_rates', 'rate_contracts', 'quotations', 'invoices',
    'payments', 'vendor_bills', 'master_bills', 'house_bills', 'free_time_terms', 'container_events', 'claims', 'lane_profiles', 'bunker_prices',
  ] as const;
  ```

  `src/import/myData.ts`:
  - delete the `GAME_TABLES_SQL` constant;
  - import `LOGISTICS_TABLES` from `'../domains'` next to `ECOM_TABLES`, and drop `GAME_SCHEMA` if it is now unused;
  - replace the body of `gameTables` with:
    ```ts
      private async gameTables(withEcom = true): Promise<Set<string>> {
        // v12.0 D10-11: static, because the Logistics schema may not be seeded yet (async kept for the callers).
        return new Set<string>(withEcom ? [...LOGISTICS_TABLES, ...ECOM_TABLES] : LOGISTICS_TABLES);
      }
    ```
  - in its doc comment replace "(static list: the ecom schema may not be seeded yet)" with "(static lists: no schema needs to be seeded)".
  - `tests/myData.test.ts` mocks `run` to return `[['ports']]` for this query; `ports` is in `LOGISTICS_TABLES`, so its expectations still hold. If a test asserted the query was sent, delete only that assertion.

  `src/main.ts`, directly below `const db = new DbClient(onDbStatus);`:
  ```ts
  void db.ensure('game').catch(() => undefined); // v12.0 Task 1 only: Logistics still at boot; Task 2 seeds the domain the player opens
  ```

  `scripts/check-budget.mjs`, before the `['rest', …]` line:
  ```js
    ['gameseed', /^gameSeed-/, 16], // v12.0 P1 (Plan 10 D10-1): src/db/{schema,seed}.sql, lazy in the worker on ensure('game'): 13.3 KB gz -9 on the source
  ```

- [ ] **Step 4: Run the tests and watch them pass.**
  ```bash
  npx vitest run tests/startup.test.ts tests/client.test.ts tests/seed.test.ts tests/lab.test.ts tests/myData.test.ts tests/glossary.test.ts
  npx tsc --noEmit && npm test
  ```
  Expected: all PASS, md5 pins unchanged.
- [ ] **Step 5: Build and check the budgets.**
  ```bash
  npm run build && node scripts/check-budget.mjs
  ```
  Expected: `gameseed` ≈ 14 KB ok; `worker` ≈ 13 KB smaller than in Task 0.
  Then `npm run dev -- --port 5174 --strictPort`: Logistics loads and runs as before, and `performance.getEntriesByName('db:ensure:game')` has one entry.
- [ ] **Step 6: Commit.**
  ```bash
  git add src/db/gameSeed.ts src/db/lab.ts src/db/init.ts src/db/worker.ts src/db/client.ts src/domains.ts src/import/myData.ts src/main.ts scripts/check-budget.mjs tests/startup.test.ts tests/client.test.ts tests/myData.test.ts
  git -c user.name=KhoaDauTay -c user.email=cuonglieu3256@gmail.com commit -m "feat(db): worker boots empty, Logistics is a lazy seed (gameSeed chunk), ensure dedupes and measures (v12.0 P1, Plan 10 T1)

  main/worker/gameseed: <numbers from check-budget>

  Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
  ```

---

### Task 2: Seed only the domain the player opens (P1 policy, lessons wait, retry)

**Files:**
- Modify: `src/onboarding.ts`, `src/db/client.ts`, `src/main.ts`, `src/state.ts`, `src/ui/lessonCard.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/onboarding.test.ts`, `tests/client.test.ts`, `tests/startup.test.ts`

**Interfaces:**
- Consumes: Task 1's `DbClient.ensure`/`ready`.
- Produces:
  - `type BootPick = DomainId | 'general'` and `bootPick(hashDomain: DomainId | undefined, pref: unknown, firstVisit: boolean): BootPick | undefined` (`src/onboarding.ts`);
  - `app.dataReady(schema: SchemaId): boolean` (`src/state.ts`);
  - `DbClient.onSeeded: (schema: SchemaId) => void` (fired once per successful seed);
  - in `main.ts`: `openSchema(s: SchemaId): void`, `dataChanged(): void`;
  - i18n keys `domain.loading`, `domain.failed` (param `name`) and `lesson.preparing`; `ecom.loading`/`ecom.failed` are removed.

- [ ] **Step 1: Write the failing tests.**

  `tests/onboarding.test.ts` (add `bootPick` to the import from `'../src/onboarding'`):
  ```ts
  describe('bootPick (v12.0 P1/P2)', () => {
    it('domain in the hash wins, then the pref, then Logistics for anyone who is not new', () => {
      expect(bootPick('ecommerce', 'logistics', true)).toBe('ecommerce');
      expect(bootPick(undefined, 'ecommerce', true)).toBe('ecommerce');
      expect(bootPick(undefined, 'general', false)).toBe('general');
      expect(bootPick(undefined, undefined, false)).toBe('logistics');
      expect(bootPick(undefined, 'finance', false)).toBe('logistics'); // not live
    });
    it('a first visit with nothing remembered asks (undefined = the welcome picker)', () => {
      expect(bootPick(undefined, undefined, true)).toBeUndefined();
      expect(bootPick(undefined, 42, true)).toBeUndefined();
    });
  });
  ```

  `tests/client.test.ts`:
  - make `'schema theo request: run/explain/steps/lab mang schema, vắng = game'` `async`, and replace its first two lines after `w.ready();`:
    ```ts
        void db.run('R', { schema: 'lab' });
        expect(w.posted[0]).toMatchObject({ kind: 'ensure', schema: 'lab' }); // D10-3: a named schema is seeded first
        w.send({ type: 'result', id: w.posted[0].id, result: null });
        await vi.advanceTimersByTimeAsync(0);
        expect(w.posted[1]).toMatchObject({ kind: 'run', sql: 'R', schema: 'lab' });
    ```
    Then shift every later `posted[i]` in that test by +1 (the default-schema `G` run carries no schema and seeds nothing).
  - add:
    ```ts
      it('D10-3: query mang schema thì seed trước; seed hỏng không seed lại ở mỗi lần chạy, ensure() thì thử lại', async () => {
        const { db } = client();
        const w = last();
        w.ready();
        const r = db.run('A', { schema: 'ecom' }).catch((x: unknown) => x);
        expect(w.posted.map((p) => p.kind)).toEqual(['ensure']);
        w.send({ type: 'fault', id: w.posted[0].id, message: 'boom' });
        await vi.advanceTimersByTimeAsync(0);
        expect(w.posted.map((p) => p.kind)).toEqual(['ensure', 'run']);
        w.answer(1);
        await r;
        void db.run('B', { schema: 'ecom' });
        expect(w.posted.map((p) => p.kind)).toEqual(['ensure', 'run', 'run']); // broken: no second seed
        w.answer(2);
        void db.ensure('ecom').catch(() => undefined);
        expect(w.posted.map((p) => p.kind)).toEqual(['ensure', 'run', 'run', 'ensure']);
      });
    ```

  `tests/startup.test.ts`, inside `describe('khởi động')`:
  ```ts
    it('v12.0: lựa chọn lúc khởi động được tính và mở schema trước lần vẽ đầu tiên', () => {
      const pick = src.indexOf('const pick: BootPick | undefined = bootPick(');
      expect(pick).toBeGreaterThan(-1);
      expect(pick).toBeLessThan(src.indexOf('uiReady = true'));
      expect(src).not.toContain("db.ensure('game')"); // Task 1's stop-gap is gone
    });
  ```

- [ ] **Step 2: Run them and watch them fail.**
  ```bash
  npx vitest run tests/onboarding.test.ts tests/client.test.ts tests/startup.test.ts
  ```
  Expected: FAIL (`bootPick` missing; a named-schema run is not seeded first).

- [ ] **Step 3: `bootPick`.** In `src/onboarding.ts` add `import { isLiveDomain, type DomainId } from './domains';` and:
  ```ts
  /** v12.0 P2: what the player starts in. 'general' = "Chỉ học SQL" (only `lab` is seeded). Kept in the domain pref (D10-7). */
  export type BootPick = DomainId | 'general';

  /**
   * v12.0 P1/P2: the data to seed at boot. The hash's domain, else the remembered one (pref cargo-query/domain, which may
   * be 'general'), else Logistics, except on a first visit (`firstVisit` = welcomeNeeded(...)): then undefined, and the
   * welcome dialog asks before anything is seeded.
   */
  export function bootPick(hashDomain: DomainId | undefined, pref: unknown, firstVisit: boolean): BootPick | undefined {
    if (hashDomain) return hashDomain;
    if (isLiveDomain(pref) || pref === 'general') return pref;
    return firstVisit ? undefined : 'logistics';
  }
  ```

- [ ] **Step 4: Seed named schemas; remember broken seeds.** In `src/db/client.ts`:
  - below `seeding` add:
    ```ts
      /** Seeds that failed or timed out (D10-2): requests naming them no longer re-seed (no 2-minute wait per Run). ensure() clears it. */
      private broken = new Set<SchemaId>();
    ```
  - first line of `ensure()`: `this.broken.delete(schema);`
  - in `seed()`, replace `if (!(e instanceof DbRestartError)) throw e;` with:
    ```ts
            if (!(e instanceof DbRestartError)) {
              this.broken.add(schema);
              throw e;
            }
    ```
  - add a private helper:
    ```ts
      /** v12.0 D10-3: a request that names its schema (workspace, lessons, drills) seeds it first, queued ahead of itself. */
      private seedNamed(schema?: SchemaId): void {
        if (schema && !this.ensured.has(schema) && !this.broken.has(schema)) void this.ensure(schema).catch(() => undefined);
      }
    ```
  - call `this.seedNamed(opts.schema);` as the first line of `request()` and of `lab()`.
  - one hook for every finished seed, whoever started it (a domain route, a lesson's named request, a drill):
    ```ts
      /** v12.0: a seed finished (any caller). main.ts drops cached results and loads the columns here (D10-5). */
      onSeeded: (schema: SchemaId) => void = () => {};
    ```
    and in `seed()`, after `this.ensured.add(schema);`: `this.onSeeded(schema);`
  - add to `tests/client.test.ts`:
    ```ts
      it('onSeeded: mỗi seed xong báo một lần, kể cả seed do query mang schema khởi động', async () => {
        const { db } = client();
        const seen: string[] = [];
        db.onSeeded = (s) => seen.push(s);
        const w = last();
        w.ready();
        void db.run('A', { schema: 'lab' });
        w.send({ type: 'result', id: w.posted[0].id, result: null });
        await vi.advanceTimersByTimeAsync(0);
        expect(seen).toEqual(['lab']);
      });
    ```

- [ ] **Step 5: `app.dataReady`.** In `src/state.ts` add `type SchemaId` to the `'./domains'` import, and add to `app` after `run`:
  ```ts
    /** v12.0: whether `schema` is seeded (main.ts points it at DbClient.ready). Lessons say they wait instead of looking stuck. */
    dataReady: (_schema: SchemaId): boolean => true,
  ```

- [ ] **Step 6: Boot, router and domain switch (`src/main.ts`).**

  Imports:
  - from `'./domains'` add `DOMAINS`, `DOMAIN_SCHEMA`, `type SchemaId`; drop `isLiveDomain` if unused;
  - change the `'./onboarding'` import to `import { bootPick, readTour, welcomeNeeded, type BootPick } from './onboarding';`.

  Replace everything from `let uiReady = false;` through the end of `function onDbStatus` with:
  ```ts
  let uiReady = false;
  let dbWasReady = false;
  /** The worker itself (engine). app.dbStatus is the status of the data the open pages need (D10-4). */
  let engine: DbStatus = 'loading';
  /** v12.0 P1: the schema the open pages need; undefined while a first visitor has not picked one (P2). */
  let want: SchemaId | undefined;
  const failedSeeds = new Set<SchemaId>();
  /** Also called from the DbClient constructor: the engine is 'loading' then, so `db` is never read before it exists. */
  function syncDbStatus(): void {
    app.dbStatus = engine === 'failed' || (want !== undefined && failedSeeds.has(want)) ? 'failed'
      : engine === 'ready' && want !== undefined && db.ready(want) ? 'ready' : 'loading';
  }
  function onDbStatus(s: DbStatus): void {
    engine = s;
    if (s === 'ready') dbWasReady = true;
    if (s === 'failed') app.problem = { kind: dbWasReady ? 'worker-crash' : 'db-init-failed' }; // P10
    if (s !== 'loading') app.loadProgress = undefined;
    syncDbStatus();
    if (!uiReady) return;
    renderTopbar();
    relabelWelcome(); // Lily wakes up, "I am new" becomes clickable
  }
  ```
  - In `db.onProgress` replace `if (app.dbStatus !== 'loading') return;` with `if (engine !== 'loading') return;`.
  - Delete Task 1's `void db.ensure('game')…` line.
  - After `app.run = …` add `app.dataReady = (s) => db.ready(s);`.

  After the `loadColumns` function add:
  ```ts
  /**
   * v12.0 P1: the data the open pages need. Seeds `s` once (DbClient.ensure is idempotent and queued ahead of later
   * requests). The top bar dot, the welcome screen and Run follow app.dbStatus. A finished seed calls dataChanged():
   * queries that ran before it saw empty tables, and memoByKey keeps empty results (D10-5).
   */
  function openSchema(s: SchemaId): void {
    want = s;
    syncDbStatus();
    if (uiReady) renderTopbar();
    if (db.ready(s) || failedSeeds.has(s)) return; // a failed seed waits for Retry (D10-2), never one 2-minute try per page
    const d = DOMAINS.find((x) => DOMAIN_SCHEMA[x.id] === s);
    // Never replace another banner (save warnings, new version + Reload): those matter more than "preparing".
    if (d && (!app.notice || app.notice.key.startsWith('domain.'))) app.notice = { key: 'domain.loading', params: { name: t(d.name) } };
    if (uiReady) renderTopbar();
    db.ensure(s).catch(() => {
      failedSeeds.add(s);
      if (d && (!app.notice || app.notice.key.startsWith('domain.'))) app.notice = { key: 'domain.failed', params: { name: t(d.name) } };
      syncDbStatus();
      if (uiReady) renderTopbar();
    });
  }

  /**
   * Every finished seed, whoever started it (openSchema, a lesson's or drill's named request): status, banner, caches and
   * columns follow. Queries that ran before it saw empty tables, and memoByKey keeps empty results (D10-5). Registered
   * before any seed can finish (the engine is still downloading when main.ts runs this).
   */
  db.onSeeded = (s) => {
    if (app.notice?.key === 'domain.loading') app.notice = undefined;
    syncDbStatus();
    if (uiReady) dataChanged();
    if (s === domainSchemaId() && Object.keys(app.columns).length === 0) void loadColumns();
  };

  /** Imported data changed or a seed finished: cached plans, steps, ER metadata and card results describe the old data. */
  function dataChanged(): void {
    clearMemos();
    resetCards();
    work.setSchema(editorSchema());
    panel.refresh();
    rerender();
  }
  ```
  (`work` and `panel` are declared further down; `dataChanged` only runs from `onSeeded`, after module setup, and only once `uiReady`.)

  Directly after `app.stepIndex = resumeStep(app.save, selected());` and before `initTopbar();`:
  ```ts
  // v12.0 P1/P2: seed only what the player opens, queued before the first render's queries. undefined = first visit: the
  // welcome dialog asks first (Task 3) and nothing is seeded meanwhile (the engine still downloads).
  const pick: BootPick | undefined = bootPick(domainOfHash(location.hash), readJson<unknown>(DOMAIN_KEY), welcomeNeeded(done().size, readTour(), coachDone()));
  if (pick) openSchema(pick === 'general' ? 'lab' : domainSchemaId(pick));
  ```

  Replace `enterDomain` with:
  ```ts
  /**
   * Plan 9: open a live domain's pages. Loads its content (lazy chunk), points requests that name no schema at the
   * domain's schema, opens that schema (seeded once, v12.0 P1) and redraws. Caches keyed by SQL text are cleared because
   * the same text means other tables now.
   */
  async function enterDomain(id: DomainId): Promise<void> {
    if (id === activeDomain()) return;
    const name = t(DOMAINS.find((d) => d.id === id)!.name);
    if (id !== 'logistics') { // Logistics' content is in the boot chunks
      app.notice = { key: 'domain.loading', params: { name } };
      renderTopbar();
    }
    try {
      await loadDomain(id);
    } catch {
      app.notice = { key: 'domain.failed', params: { name } };
      renderTopbar();
      return;
    }
    const wanted = domainOfHash(location.hash);
    if (wanted && wanted !== id) { // the player went to another domain while this one loaded
      if (app.notice?.key === 'domain.loading') app.notice = undefined;
      renderTopbar();
      return;
    }
    setActiveDomain(id);
    writeJson(DOMAIN_KEY, id);
    const schema = domainSchemaId(id);
    db.defaultSchema = schema;
    clearMemos();
    resetCards();
    session.mode = { kind: 'story' }; // Practice/Sandbox/drill of the other domain never carry over
    app.tickets = loadTickets();
    app.selectedId = firstOpen();
    app.stepIndex = resumeStep(app.save, selected());
    app.conclusionFor = '';
    app.lastRun = undefined;
    app.columns = {};
    openSchema(schema); // keeps or replaces the loading line until the data is in
    rerender();
    work.setTicket(selected(), app.stepIndex, true);
    work.setSchema(editorSchema());
    panel.refresh();
    if (db.ready(schema)) void loadColumns();
  }
  ```

  In `Object.assign(actions, { … })` replace `retryDb: () => db.restart(),` with:
  ```ts
    retryDb: () => {
      db.restart();
      if (want) {
        failedSeeds.delete(want); // the only place a failed seed is tried again (D10-2); restart() replays the seeded ones
        openSchema(want);
      }
    },
  ```

  Replace the three boot-domain lines (`const savedDomain = …`, `const bootDomain = …`, `if (bootDomain !== 'logistics') await enterDomain(bootDomain);`) and the `startRouter(…)` call with:
  ```ts
  if (pick && pick !== 'general' && pick !== activeDomain()) await enterDomain(pick);
  startRouter((r, initial) => {
    const d = domainOfHash(location.hash);
    if (d) {
      writeJson(DOMAIN_KEY, d); // the last domain opened; replaces 'general' (D10-7)
      openSchema(domainSchemaId(d)); // a domain page needs its data (seeded once)
    }
    if (d && d !== activeDomain()) void enterDomain(d).then(() => showRoute(r, initial));
    else showRoute(r, initial);
  });
  ```

  Replace the `new MyData(db, idbStore(), () => { … })` callback with the shared function:
  ```ts
  const myData = new MyData(db, idbStore(), () => dataChanged()); // imported tables: same caches to drop as a finished seed
  ```

- [ ] **Step 7: Lessons wait visibly (`src/ui/lessonCard.ts`).** Add `import { mascot } from './mascots';` if it is missing. In `card()`:
  - in `runExample`'s `onclick`, right after `runExample.disabled = true;`:
    ```ts
          if (!app.dataReady(lessonSchema(l))) { // v12.0 D10-9: the example's tables are being seeded (Logistics, on demand)
            exampleOut.replaceChildren(h('p', { class: 'm-0 flex items-center gap-2 text-sm text-muted', role: 'status' },
              mascot('lily', 'sleep', 'size-8 shrink-0'), t('lesson.preparing')));
          }
    ```
  - in `check`'s `onclick`, replace `verdict.textContent = t('lesson.running');` with:
    ```ts
          verdict.textContent = t(app.dataReady(lessonSchema(l)) ? 'lesson.running' : 'lesson.preparing');
    ```
  Nothing else in this file changes (Plan 10a owns the lesson box).

- [ ] **Step 8: i18n.**
  - `src/i18n/vi.ts`: delete `'ecom.loading'` and `'ecom.failed'`; add:
    ```ts
      'domain.loading': 'Đang chuẩn bị dữ liệu {name}…',
      'domain.failed': 'Chưa tải được dữ liệu {name}. Bấm "Thử lại database" hoặc tải lại trang.',
      'lesson.preparing': 'Đang chuẩn bị dữ liệu ví dụ…',
    ```
  - `src/i18n/en.ts`: delete the same two keys; add:
    ```ts
      'domain.loading': 'Preparing the {name} data…',
      'domain.failed': 'Could not load the {name} data. Press "Retry database" or reload the page.',
      'lesson.preparing': 'Preparing the example data…',
    ```
  - The quoted button name must equal `'db.retry'` in each language; copy it from there if it differs.
  - `grep -rn "ecom\.loading\|ecom\.failed" src tests` must print nothing (update any test that used them).

- [ ] **Step 9: Run the tests and watch them pass.**
  ```bash
  npx vitest run tests/onboarding.test.ts tests/client.test.ts tests/startup.test.ts tests/i18n.test.ts
  npx tsc --noEmit && npm test
  ```
  Expected: PASS.

- [ ] **Step 10: Acceptance in the browser** (`npm run dev -- --port 5174 --strictPort`, test save).
  1. Open `http://localhost:5174/#/d/ecommerce`. The notice "Đang chuẩn bị dữ liệu E-commerce…" shows, then goes, and the dot turns green.
  2. Visit Overview, Workspace, Data, Dashboard, Map, Home, Learning path and Practise SQL. **Do not open a quick lesson.**
  3. In the E-com Sandbox run `SELECT count(*) FROM information_schema.tables WHERE table_schema = 'logistics'`. Expected: **0**.
  4. Open `#/d/logistics`. The notice shows; once the dot is green, the brief's "Bảng liên quan" and the Data page are filled (proves `dataChanged()`).
  5. In a fresh tab on `#/d/ecommerce`, open a skill lesson from a skill chip and press "Chạy ví dụ": "Đang chuẩn bị dữ liệu ví dụ…" shows, then the result.
  6. Console: `performance.getEntriesByType('measure').filter((m) => m.name.startsWith('db:ensure'))` lists the seeds.
  7. Seed started by a lesson, then the domain: on `:5175` pick "Chỉ học SQL", open a skill lesson and run its example (this seeds the lesson's schema through a named request), then open `#/d/logistics`. The brief's "Bảng liên quan", the Columns tab and autocomplete are filled (proves `onSeeded`, not `openSchema`, refreshes the caches). Run this step after Task 3.
  8. With a corrupt save banner showing (`localStorage['cargo-query-save'] = '{'` on `:5175`, reload), opening a domain keeps the "save corrupt" banner (the loading line never replaces it).

- [ ] **Step 11: Commit.**
  ```bash
  git add src/onboarding.ts src/db/client.ts src/main.ts src/state.ts src/ui/lessonCard.ts src/i18n/vi.ts src/i18n/en.ts tests/onboarding.test.ts tests/client.test.ts tests/startup.test.ts
  git -c user.name=KhoaDauTay -c user.email=cuonglieu3256@gmail.com commit -m "feat(boot): seed only the domain the player opens; named schemas seed on demand; lessons wait visibly; retry a failed seed (v12.0 P1, Plan 10 T2)

  Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
  ```

---

### Task 3: First-visit domain picker in the welcome dialog; the welcome text follows the domain (P2 + v11 backlog)

**Files:**
- Modify: `src/ui/welcome.ts`, `src/state.ts`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/i18n.test.ts` (unchanged, must pass); browser check on `:5175`

**Interfaces:**
- Consumes: `BootPick` (T2), `openSchema`, `enterDomain` (main, T2).
- Produces:
  - `actions.startWith(c: BootPick): void`;
  - `initWelcome(needPick: boolean): void`;
  - keys `welcome.pickIntro`, `welcome.pickLabel`, `welcome.pickSql`, `welcome.pickSqlDesc`, `welcome.p1Ecom`.

- [ ] **Step 1: The action.**

  `src/state.ts`: add `import type { BootPick } from './onboarding';` and in `actions`:
  ```ts
    /** v12.0 P2: the welcome dialog's first-visit choice; main.ts seeds only that data (D10-6). */
    startWith(_c: BootPick): void {},
  ```

  `src/main.ts`, after `enterDomain`:
  ```ts
  /** v12.0 P2: a first visitor's choice. Seeds only that data; "SQL only" seeds `lab` and opens the learning path. */
  async function startWith(c: BootPick): Promise<void> {
    writeJson(DOMAIN_KEY, c);
    if (c === 'general') {
      openSchema('lab');
      go('learn');
      return;
    }
    if (c !== activeDomain()) await enterDomain(c);
    openSchema(domainSchemaId(c));
  }
  ```
  - Add `startWith: (c: BootPick) => void startWith(c),` to `Object.assign(actions, …)`.
  - Replace the call `initWelcome();` with `initWelcome(pick === undefined);`.

- [ ] **Step 2: The picker (`src/ui/welcome.ts`).**
  - Imports: `import { activeDomain, DOMAINS } from '../domains';`, `import { icon } from './icons';`, add `type BootPick` to the `'../onboarding'` import, and add `nodes` to the `'./dom'` import.
  - Module state next to `let replay = false;`:
    ```ts
    /** v12.0 P2: a first visitor with nothing remembered picks where to start before anything is seeded (D10-6). */
    let picking = false;
    ```
  - Add:
    ```ts
    /** Logistics, E-commerce (live domains) and "Chỉ học SQL" (lab only). Finance is not live, so it is not offered. */
    function pickList(): HTMLElement {
      const live = DOMAINS.filter((d) => d.live).map((d) => ({ id: d.id as BootPick, icon: d.icon, name: t(d.name), desc: t(d.desc) }));
      const all = [...live, { id: 'general' as BootPick, icon: 'route' as const, name: t('welcome.pickSql'), desc: t('welcome.pickSqlDesc') }];
      return h('div', { class: 'flex flex-col gap-2', role: 'group', 'aria-label': t('welcome.pickLabel') }, ...all.map((p) => h('button', {
        type: 'button', 'data-w': `pick-${p.id}`, class: 'flex items-start gap-3 rounded-(--r-ctl) px-4 py-3 text-left',
        onclick: () => pick(p.id),
      }, icon(p.icon, 'mt-0.5 size-5'), h('span', { class: 'min-w-0' }, h('b', { class: 'block' }, p.name), h('span', { class: 'block text-sm text-muted' }, p.desc)))));
    }

    function pick(c: BootPick): void {
      picking = false;
      if (c === 'general') { // D10-8: like Esc, no tour; the learning path opens
        writeJson(COACH_KEY, true);
        dialog().close();
        actions.startWith('general');
        return;
      }
      actions.startWith(c);
      go(0); // same panel, now with the chosen domain's story; rerender() redraws it once the domain is entered
    }
    ```
  - In `draw()`, the `panel === 0` branch becomes:
    ```ts
      ? nodes(title(t('welcome.title')),
        h('p', {}, t(picking ? 'welcome.pickIntro' : activeDomain() === 'ecommerce' ? 'welcome.p1Ecom' : 'welcome.p1')),
        picking ? pickList() : null,
        h('div', { class: 'flex gap-2', role: 'group', 'aria-label': t('top.lang') }, ...(['vi', 'en'] as Lang[]).map((l) => h('button', {
          type: 'button', 'data-w': l, 'aria-pressed': String(getLang() === l), class: 'rounded-full px-4 aria-pressed:bg-accent-soft aria-pressed:font-bold',
          onclick: () => actions.switchLang(l),
        }, l.toUpperCase()))))
    ```
  - The "next" button: add `disabled: picking`.
  - Replace `initWelcome` with:
    ```ts
    /** Once, after the first route is shown: the welcome screen covers the DB download for a new player (v4 §B.2 layer 1). */
    export function initWelcome(needPick: boolean): void {
      const d = dialog();
      d.addEventListener('close', () => byId('mascot-sprite').classList.remove('live'));
      // Esc on the first visit = skip the tour (v4 §B.4); the progressive disclosure still applies (V9).
      d.addEventListener('cancel', () => {
        if (replay) return;
        if (picking) { // D10-6: Esc on the picker = the old default, Logistics
          picking = false;
          actions.startWith('logistics');
        }
        startTour(false);
        writeJson(COACH_KEY, true);
        actions.rerender(); // sidebar locks (D-O3)
        actions.showTab('columns'); // and the tabs not open yet (D-O4)
      });
      picking = needPick;
      if (needPick || welcomeNeeded(done().size, readTour(), coachDone())) openWelcome(false);
    }
    ```

- [ ] **Step 3: i18n.**
  - `src/i18n/vi.ts`:
    ```ts
      'welcome.pickIntro': 'Bạn muốn bắt đầu ở đâu? Máy chỉ chuẩn bị dữ liệu của lựa chọn này; đổi lĩnh vực sau lúc nào cũng được. Ngôn ngữ ở ngay dưới.',
      'welcome.pickLabel': 'Chọn nơi bắt đầu',
      'welcome.pickSql': 'Chỉ học SQL',
      'welcome.pickSqlDesc': 'Bài học và bài luyện ngắn theo từng kỹ năng, trên dữ liệu một chuỗi cửa hàng.',
      'welcome.p1Ecom': 'Bạn là Data Analyst mới ở Chợ Lồng Đèn, sàn bán lẻ trực tuyến ở Đà Nẵng. Đồng nghiệp gửi câu hỏi nghiệp vụ; bạn trả lời bằng SQL. 6 chương, từ doanh số, giao hàng tới giữ chân khách. Chú vịt Boon sẽ dẫn chúng mình đi một vòng. Chọn ngôn ngữ:',
    ```
  - `src/i18n/en.ts`:
    ```ts
      'welcome.pickIntro': "Where would you like to start? Only this choice's data is prepared on your device; you can switch any time. The language is just below.",
      'welcome.pickLabel': 'Where to start',
      'welcome.pickSql': 'Just learn SQL',
      'welcome.pickSqlDesc': "Short lessons and practice per skill, on a shop chain's data.",
      'welcome.p1Ecom': 'You are the new Data Analyst at Lantern Market, an online marketplace in Da Nang. Colleagues send business questions; you answer them with SQL. 6 chapters, from sales and deliveries to keeping customers. Boon the duck will show us around. Pick a language:',
    ```

- [ ] **Step 4: Tests.**
  ```bash
  npx tsc --noEmit && npm test
  ```
  Expected: PASS (the i18n placeholders, the L22 scan, EN without diacritics).

- [ ] **Step 5: Browser, first visit** (`npm run dev -- --port 5175 --strictPort`; run `localStorage.clear()` in the console, then reload `http://localhost:5175/`):
  1. Three choices show and "Tiếp" is disabled. In the Network tab the PGlite `.wasm`/`.data` download already runs, and no `gameSeed`/`ecomSeed` chunk is fetched.
  2. Pick E-commerce. The Lantern Market text shows, and Lily sleeps until the green dot. Only `ecomSeed` is fetched. "Mới bắt đầu" opens E-com ticket 1.
  3. Clear and reload, pick "Chỉ học SQL". The dialog closes, `#/learn` opens, only `lab` is seeded, and `localStorage['cargo-query/domain'] === '"general"'`. Reload: no picker, `lab` again. Open `#/d/logistics`: Logistics seeds and the pref becomes `"logistics"`.
  4. Clear and reload, press Esc on the picker: Logistics seeds and no tour runs.
  5. Clear storage and open `#/d/ecommerce` directly: no picker (the hash decides), and the welcome text is the E-com one.

- [ ] **Step 6: Commit.**
  ```bash
  git add src/ui/welcome.ts src/state.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts
  git -c user.name=KhoaDauTay -c user.email=cuonglieu3256@gmail.com commit -m "feat(onboarding): first-visit domain picker before any seed; welcome text follows the domain (v12.0 P2, v11 live backlog, Plan 10 T3)

  Claude-Session: https://claude.ai/code/session_01PwPSBV1SVDP6quEZfKN56M"
  ```

---

### Task 4: One-line top bar below 640 px (U1)

**Files:**
- Modify: `index.html` (header, `#more-menu`), `src/ui/topbar.ts`, `src/main.ts` (one call in `rerender`), `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/i18n.test.ts` (`SAME_OK`)
- Test: `tests/topbar.test.ts` (new)

**Interfaces:**
- Produces:
  - `syncMenuCopies(): void` (`src/ui/topbar.ts`), called by `rerender()` after `renderReviewButton`;
  - element ids `#domain-icon` and `#domain-chapter`;
  - `[data-proxy="<id>"]` buttons in `#more-menu`;
  - key `top.chapterTiny`.

- [ ] **Step 1: Failing test.** Create `tests/topbar.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import html from '../index.html?raw';

  describe('U1 (v12.0): thanh trên một dòng dưới 640 px', () => {
    const tag = (re: RegExp) => html.match(re)?.[0] ?? '';
    it('header không xuống dòng, ngôn ngữ/giao diện và ba nút hành động ẩn ở mobile', () => {
      expect(tag(/<header class="topbar[^"]*"/)).toContain('max-sm:flex-nowrap');
      expect(tag(/<div class="top-prefs[^"]*"/)).toContain('max-sm:hidden');
      expect(tag(/<div[^>]*data-actions[^>]*>/)).toContain('max-sm:hidden');
      expect(html).toContain('id="domain-chapter"');
      expect(html).toContain('id="domain-icon"');
    });
    it('menu ⋯ có bản sao Hộp thư/Ôn tập/Sổ tay, VI|EN và theme cho mobile', () => {
      const menu = html.slice(html.indexOf('id="more-menu"'), html.indexOf('id="domain-menu"'));
      for (const id of ['inbox-btn', 'review-btn', 'notebook-btn']) expect(menu).toContain(`data-proxy="${id}"`);
      for (const a of ['data-lang="vi"', 'data-lang="en"', 'data-theme-pref="light"', 'data-theme-pref="system"', 'data-theme-pref="dark"']) expect(menu).toContain(a);
    });
  });
  ```
  Run `npx vitest run tests/topbar.test.ts`. Expected: FAIL.

- [ ] **Step 2: `index.html`.**
  - `<header class="topbar flex flex-wrap items-center gap-x-2 gap-y-2 …">`: add `max-sm:flex-nowrap max-sm:gap-x-1.5` to its class list.
  - `#domain-btn`:
    - add `max-sm:px-2.5` to its class;
    - replace its first child `<span data-icon="anchor" data-icon-class="size-4"></span>` with `<span id="domain-icon" class="contents"><span data-icon="anchor" data-icon-class="size-4"></span></span>`;
    - `<span id="domain-label">` gets `class="max-sm:sr-only"`;
    - after it add `<span id="domain-chapter" class="whitespace-nowrap sm:hidden" aria-hidden="true"></span>`;
    - the chevron's `data-icon-class` becomes `"size-3.5 rotate-90 max-sm:hidden"`.
  - The wrapper `<div class="flex shrink-0 items-center gap-1.5">` around `#inbox-btn`, `#review-btn` and `#notebook-btn`: add the attribute `data-actions` and the class `max-sm:hidden`.
  - `<div class="top-prefs flex shrink-0 …">`: add `max-sm:hidden`.
  - In `#more-menu`, as the first child of its `<div class="flex flex-col">`:
    ```html
        <!-- v12.0 U1: below 640 px the bar keeps one line; these copy the bar's Inbox / Review / Notebook and settings. -->
        <div class="mb-1 flex flex-col border-b border-line pb-1 sm:hidden">
          <button type="button" data-proxy="inbox-btn" popovertarget="more-menu" popovertargetaction="hide" class="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-left hover:bg-code"><span data-icon="inbox" data-icon-class="size-4"></span><span data-label data-i18n="top.inbox">Hộp thư</span></button>
          <button type="button" data-proxy="review-btn" popovertarget="more-menu" popovertargetaction="hide" class="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-left hover:bg-code" hidden><span data-icon="repeat" data-icon-class="size-4"></span><span data-label data-i18n="top.review">Ôn tập</span></button>
          <button type="button" data-proxy="notebook-btn" popovertarget="more-menu" popovertargetaction="hide" class="flex w-full items-center gap-2 rounded-lg border-0 bg-transparent px-3 py-2 text-left hover:bg-code"><span data-icon="book" data-icon-class="size-4"></span><span data-label data-i18n="nb.open">Sổ tay</span></button>
          <div class="flex items-center gap-1 px-3 py-2">
            <div class="flex gap-0.5" role="group" data-i18n-aria="top.lang" aria-label="Ngôn ngữ">
              <button type="button" data-lang="vi" aria-pressed="true" class="rounded-full border-0 bg-transparent px-2 py-0.5 text-sm text-ink hover:bg-code aria-pressed:bg-code aria-pressed:font-bold">VI</button>
              <button type="button" data-lang="en" aria-pressed="false" class="rounded-full border-0 bg-transparent px-2 py-0.5 text-sm text-ink hover:bg-code aria-pressed:bg-code aria-pressed:font-bold">EN</button>
            </div>
            <span class="mx-1 h-5 w-px bg-line" aria-hidden="true"></span>
            <div class="flex gap-0.5" role="group" data-i18n-aria="top.theme" aria-label="Giao diện">
              <button type="button" data-theme-pref="light" aria-pressed="false" class="grid size-7 place-items-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-code aria-pressed:bg-code" data-i18n-aria="theme.light" aria-label="Sáng"><span data-icon="sun" data-icon-class="size-4"></span></button>
              <button type="button" data-theme-pref="system" aria-pressed="true" class="grid size-7 place-items-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-code aria-pressed:bg-code" data-i18n-aria="theme.system" aria-label="Theo hệ thống"><span data-icon="monitor" data-icon-class="size-4"></span></button>
              <button type="button" data-theme-pref="dark" aria-pressed="false" class="grid size-7 place-items-center rounded-full border-0 bg-transparent p-0 text-ink hover:bg-code aria-pressed:bg-code" data-i18n-aria="theme.dark" aria-label="Tối"><span data-icon="moon" data-icon-class="size-4"></span></button>
            </div>
          </div>
        </div>
    ```
  The existing listeners already bind every `[data-lang]` (`main.ts`) and every `[data-theme-pref]` (`initTopbar`) with `querySelectorAll`, and `renderSettings()` updates them all, so the copies need no new wiring.

- [ ] **Step 3: `src/ui/topbar.ts`.**
  - In `initTopbar()` add:
    ```ts
      // v12.0 U1: the ⋯ menu's phone copies press the real bar buttons (same dialogs, counts and aria-expanded).
      for (const p of document.querySelectorAll<HTMLButtonElement>('[data-proxy]')) p.addEventListener('click', () => byId(p.dataset.proxy!).click());
    ```
  - Add:
    ```ts
    /** v12.0 U1: the ⋯ copies show what the bar buttons show (Review hidden at 0; the count is in the bar button's aria-label). */
    export function syncMenuCopies(): void {
      for (const p of document.querySelectorAll<HTMLElement>('[data-proxy]')) {
        const src = byId(p.dataset.proxy!);
        p.hidden = src.hidden;
        const label = p.querySelector<HTMLElement>('[data-label]');
        if (label) label.textContent = src.getAttribute('aria-label') ?? src.querySelector('[data-label]')?.textContent ?? '';
      }
    }
    ```
  - In `renderDomainMenu()`, after the line that sets `domain-label`:
    ```ts
      const shown = DOMAINS.find((d) => d.id === (soon ?? activeDomain()))!;
      byId('domain-icon').replaceChildren(icon(shown.icon, 'size-4')); // U2: the chip shows the open domain's icon, not a fixed anchor
    ```
    (reuse `shown` for the label line too).
  - In `renderTopbar()`, after `byId('domain-status').hidden = …`:
    ```ts
      byId('domain-chapter').textContent = inDomain(route) ? t('top.chapterTiny', { n: ch }) : ''; // U1: "Ch.4" in the chip on phones
    ```

  In `src/main.ts` `rerender()`, right after `renderReviewButton(…)`: `syncMenuCopies();` (import it from `'./ui/topbar'`).

- [ ] **Step 4: i18n.**
  - `'top.chapterTiny': 'Ch.{n}',` in both `vi.ts` and `en.ts`;
  - add `'top.chapterTiny'` to `SAME_OK` in `tests/i18n.test.ts`.

- [ ] **Step 5: Tests and browser.**
  ```bash
  npx vitest run tests/topbar.test.ts tests/i18n.test.ts && npx tsc --noEmit && npm test
  ```
  Then on `:5174` at 375 px and 320 px, both themes, check on Home, Overview and Workspace:
  - the bar is one line, 56 px high;
  - the chip shows the domain icon + "Ch.N" (the E-com chip shows the box icon);
  - ⋯ opens Inbox (dialog), Notebook (dialog) and Review (only when due); VI|EN and theme work from the menu.
  At ≥ 640 px the bar is unchanged.

- [ ] **Step 6: Commit** (`index.html src/ui/topbar.ts src/main.ts src/i18n/vi.ts src/i18n/en.ts tests/i18n.test.ts tests/topbar.test.ts`), message `feat(ui): one-line top bar on phones, actions and settings in the ⋯ menu, domain chip shows its icon (v12.0 U1, Plan 10 T4)` + blank line + `Claude-Session: …`.

---

### Task 5: One icon = one destination; learning-path rows and sidebar polish (U2, U3 remainder, U7)

**Files:**
- Modify: `src/ui/icons.ts`, `src/ui/topbar.ts`, `src/ui/modes.ts`, `src/ui/dataView.ts`, `src/ui/sidebar.ts`
- Test: `tests/icons.test.ts`

**Interfaces:**
- Produces: `NAV_ICON` (`src/ui/icons.ts`), icon `database`.

- [ ] **Step 1: Failing test** (append to `tests/icons.test.ts`; merge the imports):
  ```ts
  import { DOMAINS } from '../src/domains';
  import { NAV_ICON } from '../src/ui/icons';

  const uiSources = import.meta.glob('../src/ui/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

  describe('U2 (v12.0): một icon = một đích', () => {
    it('mỗi mục điều hướng một icon riêng, không trùng icon lĩnh vực', () => {
      const used = Object.values(NAV_ICON);
      expect(new Set(used).size).toBe(used.length);
      expect(used.filter((n) => DOMAINS.some((d) => d.icon === n))).toEqual([]);
      expect(used.filter((n) => !isIconName(n))).toEqual([]);
    });
    it('registerNav chỉ lấy icon từ NAV_ICON', () => {
      const literal = Object.entries(uiSources).flatMap(([file, src]) =>
        [...src.matchAll(/registerNav\(\{[\s\S]*?\}\);/g)].filter((m) => /icon: '/.test(m[0])).map(() => file));
      expect(literal).toEqual([]);
    });
  });
  ```
  Run `npx vitest run tests/icons.test.ts`. Expected: FAIL (`NAV_ICON` missing).

- [ ] **Step 2: `src/ui/icons.ts`.**
  - In `P`, next to `table`, add:
    ```ts
      database: 'M4 6a8 3 0 1 0 16 0a8 3 0 1 0-16 0 M4 6v12a8 3 0 0 0 16 0V6 M4 12a8 3 0 0 0 16 0',
    ```
  - After `ICON_NAMES`:
    ```ts
    /**
     * v12.0 U2: one icon per navigation destination (rail, drawer, bottom bar, top nav). Every registerNav reads this table;
     * tests/icons.test.ts keeps the values unique and apart from the domain icons (DOMAINS), which only name a domain.
     */
    export const NAV_ICON = {
      home: 'home', learn: 'route', practice: 'repeat', overview: 'overview', play: 'code', sandbox: 'flask', data: 'database', dashboard: 'chart', map: 'map',
    } as const satisfies Record<string, IconName>;
    ```
  The Plan 5 "no two icons share path data" test also covers `database`.

- [ ] **Step 3: Use the table.**
  - `src/ui/topbar.ts`: in the six `registerNav` calls replace `icon: 'home'` → `icon: NAV_ICON.home`, `'route'` → `NAV_ICON.learn`, `'overview'` → `NAV_ICON.overview`, `'code'` → `NAV_ICON.play`, `'chart'` → `NAV_ICON.dashboard`, `'map'` → `NAV_ICON.map`. Import `NAV_ICON` from `'./icons'`.
  - `src/ui/modes.ts`: `play` → `NAV_ICON.play`, `practice` → `NAV_ICON.practice`, `sandbox` → `NAV_ICON.sandbox`.
  - `src/ui/dataView.ts`: `data` → `NAV_ICON.data`.
  - `src/ui/sidebar.ts`: the practice page's `today` row `lead: icon('repeat')` → `lead: icon(NAV_ICON.practice)`.

- [ ] **Step 4: Learning-path rows (U3 remainder, L80 #6).** In `src/ui/sidebar.ts` replace the `return m.chapters.map(…)` in `modules()` with:
  ```ts
    // v12.0 U3 (L82, L80 #6): the module number and its skill-group title; no Logistics chapter state, no lock icons.
    return m.chapters.map((c) => row({
      key: `m${c.chapter}`,
      href: `${hashOf('learn')}/sql/${c.chapter}`,
      lead: h('b', {}, String(c.chapter)),
      label: moduleTitle(c.chapter, lang),
      current: c.chapter === open,
    }));
  ```
  Delete `STATUS` and the `ChapterStatus`/`Key` imports if `tsc` reports them unused.

- [ ] **Step 5: U7.** In `src/ui/sidebar.ts`:
  - `row()`: the label span `h('span', { class: 'block truncate' }, r.label)` becomes `h('span', { class: 'block line-clamp-2' }, r.label)` (the rail's hover tip of L85 still shows the full name);
  - add near `lastRoute`:
    ```ts
    /** v12.0 U7: the current row the sidebar last scrolled to; a redraw scrolls only when the current page changed. */
    let scrolledTo = '';
    ```
  - at the end of `renderSidebar()`:
    ```ts
      const cur = host.querySelector<HTMLElement>('[aria-current="page"][data-side]');
      const key = `${route}:${cur?.dataset.side ?? ''}`;
      if (cur && key !== scrolledTo) {
        scrolledTo = key;
        cur.scrollIntoView({ block: 'nearest' }); // once per page: a long module list keeps the open module in view
      }
    ```

- [ ] **Step 6: Tests and browser.**
  ```bash
  npx vitest run tests/icons.test.ts && npx tsc --noEmit && npm test
  ```
  Browser `:5174` at 1267 px (rail): the rail icons are pairwise different. Open `#/learn/sql/11` from the top and check that the rail's list scrolls to module 11 once. Expand the sidebar at 1440 px: long module names wrap to two lines.

- [ ] **Step 7: Commit** (`src/ui/icons.ts src/ui/topbar.ts src/ui/modes.ts src/ui/dataView.ts src/ui/sidebar.ts tests/icons.test.ts`), message `feat(nav): one icon per destination (NAV_ICON + test), module rows without chapter state, sidebar clamp and scroll once (v12.0 U2/U3/U7, Plan 10 T5)` + `Claude-Session: …`.

---

### Task 6: Data page: native table picker when the list is not in the sidebar; borderless list (U6, U7)

**Files:**
- Modify: `src/ui/sidebar.ts`, `src/ui/dataView.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: `parseSidePref`, `SIDE_KEY` (same file).
- Produces: `sideExtra()` returns a node only when the sidebar is wide (≥ 1280 px, pref `'open'`, not the workspace); key `data.pick`.

- [ ] **Step 1: `src/ui/sidebar.ts`.**
  - Replace `sideExtra`:
    ```ts
    /** The sidebar shows labels and lists: ≥ 1280 px with the 'open' pref, never on the workspace (v12.0 U6; rail is the default, L85). */
    const sideWide = (): boolean => mq(XL) && parseSidePref(readJson<unknown>(SIDE_KEY)) === 'open' && lastRoute !== 'play';

    /**
     * Where the Data page puts its table list (V11): the sidebar when it is wide, else undefined (the page shows a <select>,
     * U6). One node for the page's lifetime, so a redraw moves it instead of rebuilding it (search keeps focus and IME state).
     */
    export function sideExtra(): HTMLElement | undefined {
      return sideWide() ? (extra ??= h('div', { class: 'side-extra mt-2 px-1' })) : undefined;
    }
    ```
  - In `toggle()`'s `onclick`, replace the last line `renderSidebar(route);` with `if (route === 'data') actions.rerender(); else renderSidebar(route);` (the list moves between page and sidebar).
  - In `initSidebar()` replace `matchMedia(XL).addEventListener('change', () => renderSidebar(lastRoute));` with:
    ```ts
      matchMedia(XL).addEventListener('change', () => (lastRoute === 'data' ? actions.rerender() : renderSidebar(lastRoute)));
    ```

- [ ] **Step 2: `src/ui/dataView.ts`.** In `renderData()`:
  - after `const side = sideExtra();` add:
    ```ts
      // v12.0 U6: no sidebar list (rail, below 1280 px, phones): a native <select> grouped by chapter, filtered by the search box.
      const select = side ? undefined : h('select', {
        id: 'data-select', class: 'mt-2 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink max-lg:min-h-11', 'aria-label': t('data.pick'),
        onchange: () => go(select!.value),
      });
    ```
  - in `picker`, insert `select ?? null,` between `count,` and the `h('h2', { id: 'data-list-title' … })`;
  - in `drawList()` replace the `list.replaceChildren(…)` call with:
    ```ts
        const locked2 = locked.length ? h('details', { class: 'mt-3 text-muted' },
          h('summary', { class: 'cursor-pointer text-sm' }, t('data.lockedGroup', { n: locked.length })),
          h('ul', { class: 'mt-1 list-none space-y-1 p-0 text-sm opacity-75' }, ...locked.map((x) =>
            h('li', {}, h('code', {}, x), ` · ${t('data.lockedAt', { n: chapterOf(x) })}`)))) : null;
        if (select) {
          select.replaceChildren(...groups.map(([c, ts]) => h('optgroup', { label: t('nav.chapterOption', { n: c, title: chapterTitle(c, getLang()) }) },
            ...ts.map((x) => h('option', { value: x, selected: x === sel }, rowText(x) ? `${x} · ${rowText(x)}` : x)))));
          if (!hits.includes(sel)) select.prepend(h('option', { value: sel, selected: true, disabled: true }, sel)); // the open table stays named while the search hides it
          list.replaceChildren(...nodes(needle && hits.length === 0 ? h('p', { class: 'text-muted' }, t('data.none', { q: view.query.trim() })) : null, locked2));
        } else {
          list.replaceChildren(...nodes(
            needle && hits.length === 0 ? h('p', { class: 'text-muted' }, t('data.none', { q: view.query.trim() })) : null,
            ...groups.map(([c, ts]) => h('div', { class: 'mt-3' },
              h('h3', { class: 'm-0 text-sm font-semibold text-muted' }, t('nav.chapterOption', { n: c, title: chapterTitle(c, getLang()) })),
              h('ul', { class: 'mt-1 grid list-none gap-1 p-0' }, ...ts.map((x) => {
                const cols = matchCols(x);
                return h('li', {}, h('a', {
                  href: tableHash(x),
                  // v12.0 U7: a list that breathes, no ring per row; the open table keeps its ring
                  class: 'block rounded-lg px-2 py-1 no-underline hover:bg-code max-lg:min-h-11 aria-[current=page]:bg-accent-soft aria-[current=page]:ring-2 aria-[current=page]:ring-accent',
                  'aria-current': x === sel ? 'page' : false,
                }, ...nodes(
                  h('code', { class: 'font-semibold' }, x),
                  rowText(x) ? h('span', { class: 'block text-xs text-muted' }, rowText(x)) : null,
                  cols.length ? h('span', { class: 'block text-xs text-muted' }, `${t('data.matchCols')} `, cols.join(', ')) : null)));
              })))),
            locked2));
        }
    ```
    (`md:max-lg:grid-cols-2` goes away: below 1280 px the select replaces the list.)
  - the `list` nav class `'max-lg:max-h-64 max-lg:overflow-auto'` stays.

- [ ] **Step 3: i18n.** `'data.pick': 'Chọn bảng'` (vi), `'data.pick': 'Pick a table'` (en).

- [ ] **Step 4: Check.**
  ```bash
  npx tsc --noEmit && npm test
  ```
  Browser `:5174` `#/d/logistics/data`:
  - at 1267 px (rail) and 375 px: a select grouped "Chương N · …", picking an option opens that table, and typing "port" in the search keeps only the matching options;
  - at 1440 px with the sidebar expanded: the list in the sidebar, rows without rings;
  - toggling the sidebar there moves the list to the select and back.

- [ ] **Step 5: Commit** (`src/ui/sidebar.ts src/ui/dataView.ts src/i18n/vi.ts src/i18n/en.ts`), message `feat(data): native table picker when the sidebar is a rail, borderless table list (v12.0 U6/U7, Plan 10 T6)` + `Claude-Session: …`.

---

### Task 7: Map page shows the lane brief in place (U4)

**Files:**
- Modify: `src/ui/lanePanel.ts`, `src/ui/mapStrip.ts`, `src/ui/homeView.ts`

**Interfaces:**
- Produces: `wirePins(parts: Pick<MapParts, 'svg' | 'pins'>, harbor: Harbor, pick: (port: string) => void): void` (`src/ui/lanePanel.ts`).

- [ ] **Step 1: Extract the pin wiring.** In `src/ui/lanePanel.ts` add `import type { MapParts } from '../art/logistics';` and:
  ```ts
  /**
   * Map pins as buttons (map dialog and the Map page, v12.0 U4): a one-line tooltip each (D-B6: days and side tasks, never
   * shipment counts); `pick` opens that lane's brief. The HTML lane list says the same in text (L34).
   */
  export function wirePins(parts: Pick<MapParts, 'svg' | 'pins'>, harbor: Harbor, pick: (port: string) => void): void {
    for (const r of ROUTES) {
      const pin = parts.pins[r.port];
      const tip = `${r.name} · ${laneInfo(r, harbor)}`;
      pin.setAttribute('r', '9'); // a bigger target than the 6-unit dot
      pin.setAttribute('role', 'button');
      pin.setAttribute('tabindex', '0');
      pin.setAttribute('aria-label', tip);
      pin.setAttribute('class', `${pin.getAttribute('class') ?? ''} cursor-pointer`);
      pin.replaceChildren(document.createElementNS('http://www.w3.org/2000/svg', 'title'));
      pin.firstChild!.textContent = tip;
      pin.addEventListener('click', () => pick(r.port));
      pin.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(r.port); } });
    }
    parts.svg.removeAttribute('role'); // the pins inside are controls now
  }
  ```
  In `src/ui/mapStrip.ts` `fill()`, replace the `for (const r of ROUTES) { … }` loop and the `parts.svg.removeAttribute('role');` line with `wirePins(parts, harbor, pick);` (import `wirePins` from `'./lanePanel'`).

- [ ] **Step 2: Map page (`src/ui/homeView.ts`).**
  - Add `wirePins` to the `'./lanePanel'` import.
  - Replace everything from `let stopMap` through the end of `routesSection()`, and from `/** Lane whose brief is open on the Map page` through the end of `lanesSection()`, with:
    ```ts
    let stopMap: (() => void) | undefined;
    /** Lane whose brief is open on the Map page (session only). */
    let mapLane: string | undefined;

    /** v12.0 U4: a pin or a list row opens that lane's brief beside the map (under it below 1024 px); its name is announced. */
    function pickLane(port: string): void {
      mapLane = port;
      actions.rerender();
      byId('announce').textContent = LANES.find((r) => r.port === port)?.name ?? '';
      byId('home').querySelector<HTMLElement>('#lane-title')?.scrollIntoView({ block: 'nearest' });
    }

    function routesSection(): HTMLElement {
      if (activeDomain() !== 'logistics') {
        return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
          h('h2', { id: 'routes-title', class: 'm-0 mb-2 text-lg font-bold' }, t('ecom.map.title')), ecomArt('map'));
      }
      const harbor = derive(app.tickets, done());
      const list = h('ul', { class: 'mt-3 mb-0 grid list-none gap-1.5 p-0 text-sm sm:grid-cols-2' }, ...LANES.map((r) =>
        h('li', {}, h('button', {
          type: 'button', id: `lane-btn-${r.port}`, 'aria-current': r.port === mapLane ? 'true' : false,
          class: cx('flex w-full items-center gap-2 px-3 py-1.5 text-left max-lg:min-h-11', r.port === mapLane && 'ring-2 ring-accent', !harbor.open.has(r.port) && 'text-muted'),
          onclick: () => pickLane(r.port),
        }, icon(harbor.open.has(r.port) ? 'route' : 'lock', 'size-4'), h('b', {}, r.name), h('span', { class: 'ml-auto text-muted' }, laneInfo(r, harbor))))));
      const brief = mapLane
        ? h('div', { class: 'min-w-0 rounded-xl p-4 ring-1 ring-line' }, lanePanel(mapLane, harbor, (task) => homeHooks.startLane?.(task)))
        : h('p', { class: 'm-0 self-start rounded-xl bg-code p-4 text-sm text-muted' }, t('lane.pick'));
      return h('section', { class: cx(CARD, 'p-5'), 'aria-labelledby': 'routes-title' },
        h('div', { class: 'mb-2 flex flex-wrap items-end justify-between gap-2' },
          h('h2', { id: 'routes-title', class: 'm-0 text-lg font-bold' }, t('routes.title')),
          h('p', { class: 'm-0 text-sm text-muted' }, t('routes.subtitle'))),
        h('div', { class: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]' },
          h('div', { class: 'min-w-0' },
            artSlot('aspect-[980/260] rounded-xl', (a) => {
              stopMap?.(); // one fleet per page: the previous drawing's loop ends here
              const p = a.routeMap(harbor);
              wirePins(p, harbor, pickLane);
              stopMap = a.liveMap(p, harbor, takeNewRoutes(harbor.open), fleetOrder());
              return p.svg;
            }),
            list),
          brief));
    }
    ```
  - Delete `registerHomeSection({ id: 'lanes', … render: lanesSection });`.
  - Remove imports `tsc` now reports unused (`routeItems` if nothing else uses it; keep `callout`).
  - If `grep -rn "'map.openLane'\|map.lanesTitle" src --include=*.ts` finds no other user, delete those keys from `vi.ts`/`en.ts`.

- [ ] **Step 3: Check.**
  ```bash
  npx tsc --noEmit && npm test
  ```
  Browser `:5174` `#/d/logistics/map`:
  - 1267 px: map + list on the left, "Bấm một cảng…" on the right. Click a pin: its brief appears on the right and a screen reader hears the lane name. Keyboard: Tab to a pin, Enter.
  - 375 px: the brief appears under the list and scrolls into view.
  - The workspace's map dialog still works ("Xem bản đồ" on the task bar).

- [ ] **Step 4: Commit** (`src/ui/lanePanel.ts src/ui/mapStrip.ts src/ui/homeView.ts src/i18n/vi.ts src/i18n/en.ts`), message `feat(map): lane brief beside the map on the Map page, pins shared with the dialog (v12.0 U4, Plan 10 T7)` + `Claude-Session: …`.

---

### Task 8: Home is across domains; Overview owns the colleague's message (U5, cuttable)

**Files:**
- Modify: `src/ui/homeView.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`

- [ ] **Step 1: Implement.** In `src/ui/homeView.ts`:
  - add `nextTicket` to the `'../progress'` import;
  - add:
    ```ts
    /** v12.0 U5: Home is across domains: one line to go on (task · domain), no colleague's message (that card is the Overview's). */
    function resumeLine(): HTMLElement | null {
      const next = nextTicket(app.tickets, done());
      if (!next) return null;
      const domain = t(DOMAINS.find((d) => d.id === activeDomain())!.name);
      return h('section', { class: cx(CARD, 'flex flex-wrap items-center gap-3 p-4'), 'aria-labelledby': 'resume-title' },
        h('p', { id: 'resume-title', class: 'm-0 min-w-0 flex-1' },
          h('span', { class: 'text-muted' }, t('home.resumeLabel')), ' ', h('b', {}, textOf(next, getLang()).title), h('span', { class: 'text-muted' }, ` · ${domain}`)),
        h('button', { type: 'button', class: cx(BTN_GO, 'group flex items-center gap-2 px-4 py-2'), onclick: () => resume(next.id) },
          t('home.resume'), icon('arrowRight', 'size-4 transition group-hover:translate-x-0.5')));
    }
    ```
  - `registerHomeSection({ id: 'continue', … pages: ['home', 'overview'] …})` → `pages: ['overview']`;
  - add `registerHomeSection({ id: 'resume', order: 10, span: 'full', pages: ['home'], render: resumeLine });`;
  - in `continueCard`, `chapterTitle(m.chapter, lang, currentRoute() === 'home' ? CHAPTERS : chaptersOf())` becomes `chapterTitle(m.chapter, lang, chaptersOf())`, since it is only on the Overview now. Drop `CHAPTERS`/`currentRoute` imports only if `tsc` reports them unused.
- [ ] **Step 2: i18n.** `'home.resumeLabel': 'Tiếp tục:'` (vi), `'home.resumeLabel': 'Continue:'` (en).
- [ ] **Step 3: Check.**
  ```bash
  npx tsc --noEmit && npm test
  ```
  Browser `:5174`:
  - Home (`#/`): one "Tiếp tục: <việc> · Logistics" line; no avatar or message bubble.
  - Overview: the message card as before.
  - In E-com, Home's line says "· E-commerce".
- [ ] **Step 4: Commit** (`src/ui/homeView.ts src/i18n/vi.ts src/i18n/en.ts`), message `feat(home): Home shows one resume line across domains, the colleague's message stays on the Overview (v12.0 U5, Plan 10 T8)` + `Claude-Session: …`.

---

### Task 9: Run/Submit row, run summary for screen readers, skip links (U8, A1, A7)

**Files:**
- Modify: `src/ui/work.ts`, `src/ui/dom.ts`, `src/ui/feedback.ts`, `index.html`, `src/main.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `tests/i18n.test.ts`
- Test: `tests/a11y.test.ts` (new)

**Interfaces:**
- Produces:
  - `announce(text: string): void` (`src/ui/dom.ts`);
  - `lineAt(text: string, pos: number): number` and `runSummary(r: { result?: QueryResult; error?: unknown; offset: number }, doc: string): string` (`src/ui/feedback.ts`);
  - keys `work.runKeys`, `work.submitKeys`, `a11y.ran`, `a11y.runError`, `a11y.runErrorLine`, `skip.editor`, `skip.result`; `work.waitingDb` is removed.

- [ ] **Step 1: Failing test.** Create `tests/a11y.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest';
  import { SqlError } from '../src/db/run';
  import { setLang } from '../src/i18n';
  import { lineAt, runSummary } from '../src/ui/feedback';

  describe('A1 (v12.0): một câu cho screen reader sau khi Chạy', () => {
    it('lineAt: dòng của ký tự thứ pos (1-based)', () => {
      expect(lineAt('SELECT 1', 3)).toBe(1);
      expect(lineAt('SELECT\n  x\nFROM t', 10)).toBe(2);
      expect(lineAt('a\nb', 3)).toBe(2);
    });
    it('kết quả: số dòng và số cột; lỗi: dòng của lỗi trong editor (cộng offset của vùng chọn)', async () => {
      await setLang('vi');
      expect(runSummary({ offset: 0, result: { columns: ['a', 'b', 'c'], types: [0, 0, 0], rows: [[1, 2, 3], [4, 5, 6]] } }, '')).toBe('Chạy xong: 2 dòng, 3 cột.');
      const doc = 'SELECT 1;\nSELECT nope FROM ports';
      const err = new SqlError({ message: 'column "nope" does not exist', position: 8 });
      expect(runSummary({ offset: 10, error: err }, doc)).toBe('Truy vấn lỗi ở dòng 2.');
      expect(runSummary({ offset: 0, error: new Error('x') }, doc)).toBe('Truy vấn lỗi.');
    });
  });
  ```
  Check how `tests/setLang.test.ts` switches language; if `setLang` also writes prefs, keep it, otherwise use the same helper that test uses. Run `npx vitest run tests/a11y.test.ts`. Expected: FAIL.

- [ ] **Step 2: Helpers.**
  - `src/ui/dom.ts`:
    ```ts
    /** v12.0 A1: one polite sentence for screen readers (#announce is aria-live). Cleared first so the same sentence twice is read twice. */
    export function announce(text: string): void {
      const el = typeof document === 'undefined' ? null : document.getElementById('announce');
      if (!el) return; // test harnesses without the page (tests/workRace.test.ts), like showPane's guard
      el.textContent = '';
      setTimeout(() => {
        el.textContent = text;
      }, 50);
    }
    ```
  - `src/ui/feedback.ts` (add `type QueryResult` to its `'../db/run'` import if missing):
    ```ts
    /** 1-based line of Postgres' 1-based character position `pos` in `text`. */
    export const lineAt = (text: string, pos: number): number => text.slice(0, Math.max(0, pos - 1)).split('\n').length;

    /** v12.0 A1: what a Run did, in one sentence: rows and columns, or the editor line of the error (`offset` = selection start). */
    export function runSummary(r: { result?: QueryResult; error?: unknown; offset: number }, doc: string): string {
      if (r.result) return t('a11y.ran', { rows: r.result.rows.length, cols: r.result.columns.length });
      const pos = sqlErrorInfo(r.error)?.position;
      return pos ? t('a11y.runErrorLine', { line: lineAt(doc, r.offset + pos) }) : t('a11y.runError');
    }
    ```

- [ ] **Step 3: `src/ui/work.ts`.**
  - Import `announce` from `'./dom'`, `runSummary` from `'./feedback'`, and `type Key` from `'../i18n'`.
  - Button row order (U8): `h('div', { class: 'actions' }, runBtn, submitBtn, explainBtn, formatBtn)`.
  - Above `setButtons`:
    ```ts
      /** v12.0 U8 (L80 #9): the shortcut beside a short label, hidden on phones; aria-keyshortcuts keeps it for screen readers. */
      const keys = (k: Key): HTMLElement => h('kbd', { class: 'ml-1.5 font-sans text-xs opacity-75 max-sm:hidden' }, t(k));
      runBtn.setAttribute('aria-keyshortcuts', isMac ? 'Meta+Enter' : 'Control+Enter');
      submitBtn.setAttribute('aria-keyshortcuts', isMac ? 'Meta+Shift+Enter' : 'Control+Shift+Enter');
    ```
  - In `setButtons()` replace the first line and the `submitBtn.textContent = …` / spinner lines with:
    ```ts
        runBtn.replaceChildren(t(selection ? 'work.runSel' : 'work.run'), keys('work.runKeys'));
        explainBtn.textContent = t('tab.explain');
        formatBtn.textContent = t('work.format');
        submitBtn.replaceChildren(t('work.submit'), keys('work.submitKeys'));
        // Plan 8b 8.7: a running query says so. Waiting for the DB is said in the line under the buttons, never in the label (U8).
        if (busy) runBtn.replaceChildren(h('span', { class: 'mr-1.5 inline-block size-3 animate-spin rounded-full border-2 border-current border-t-transparent align-[-1px]', 'aria-hidden': 'true' }), t('work.running'));
    ```
  - In `run()`, right after `app.lastRun = r;`: `announce(runSummary(r, ed.getValue()));`

- [ ] **Step 4: Skip links (A7).**
  - `index.html`: as the first child of `<main id="shell" class="shell" hidden>`:
    ```html
      <!-- v12.0 A7: skip links. Buttons, not #hash links: the router owns the hash. -->
      <div class="flex gap-2">
        <button type="button" data-skip="work" class="sr-only rounded-full focus:not-sr-only focus:mb-2 focus:px-4 focus:py-2" data-i18n="skip.editor">Tới editor</button>
        <button type="button" data-skip="panel" class="sr-only rounded-full focus:not-sr-only focus:mb-2 focus:px-4 focus:py-2" data-i18n="skip.result">Tới kết quả</button>
      </div>
    ```
    and add `tabindex="-1"` to `<section id="panel" …>`.
  - `src/main.ts`, next to the other `byId(…).addEventListener` lines:
    ```ts
    for (const b of document.querySelectorAll<HTMLButtonElement>('[data-skip]')) {
      b.addEventListener('click', () => {
        if (b.dataset.skip === 'work') {
          showPane('work');
          work.focus();
        } else {
          showPane('panel');
          byId('panel').focus();
        }
      });
    }
    ```

- [ ] **Step 5: i18n.**
  - `vi.ts`: change `'work.run'` to `'▶ Chạy'` and `'work.submit'` to `'Nộp'`; add `'work.runKeys': '{mod}+Enter'`, `'work.submitKeys': '{mod}+Shift+Enter'`, `'a11y.ran': 'Chạy xong: {rows} dòng, {cols} cột.'`, `'a11y.runError': 'Truy vấn lỗi.'`, `'a11y.runErrorLine': 'Truy vấn lỗi ở dòng {line}.'`, `'skip.editor': 'Tới editor'`, `'skip.result': 'Tới kết quả'`; delete `'work.waitingDb'`.
  - `en.ts`: the same keys:
    - `'work.run': '▶ Run'`, `'work.submit': 'Submit'`;
    - `'work.runKeys': '{mod}+Enter'`, `'work.submitKeys': '{mod}+Shift+Enter'`;
    - `a11y.ran` as a function message:
      ```ts
        'a11y.ran': (p) => `Run finished: ${p.rows} ${p.rows === 1 ? 'row' : 'rows'}, ${p.cols} ${p.cols === 1 ? 'column' : 'columns'}.`,
      ```
    - `'a11y.runError': 'The query failed.'`, `'a11y.runErrorLine': 'The query failed on line {line}.'`;
    - `'skip.editor': 'Skip to the editor'`, `'skip.result': 'Skip to the results'`;
    - delete `'work.waitingDb'`.
  - Add `'work.runKeys'` and `'work.submitKeys'` to `SAME_OK` in `tests/i18n.test.ts`.
  - `grep -rn "work.waitingDb" src tests` must print nothing. If a test asserts the old Run label text, update it to the new label plus the `<kbd>`.

- [ ] **Step 6: Tests and browser.**
  ```bash
  npx vitest run tests/a11y.test.ts tests/i18n.test.ts tests/workRace.test.ts && npx tsc --noEmit && npm test
  ```
  `tests/workRace.test.ts` runs Run/Submit without the page: `announce()` must be a silent no-op there (no unhandled error).
  Browser `:5174` play:
  - at 1267 px and 375 px, Run and Submit stay on one row (375 px: no shortcut text);
  - Tab from the top of the workspace shows "Tới editor"; Enter puts the caret in the editor (phone: the SQL pane);
  - with Windows Narrator or NVDA, Run reads "Chạy xong: N dòng, M cột.".

- [ ] **Step 7: Commit** (`src/ui/work.ts src/ui/dom.ts src/ui/feedback.ts index.html src/main.ts src/i18n/vi.ts src/i18n/en.ts tests/i18n.test.ts tests/a11y.test.ts`), message `feat(a11y): short Run/Submit labels with kbd, run summary for screen readers, skip links (v12.0 U8/A1/A7, Plan 10 T9)` + `Claude-Session: …`.

---

### Task 10: `precision` per step grades rounding (L4)

**Files:**
- Modify: `src/grader.ts`, `src/tickets.ts`, `src/ui/work.ts`, `content/tickets/ch8/ch8-06.md`, `content/tickets/ch12/ch12-06.md`, `content/domains/ecom/tickets/ch5/ecom-ch5-05.md`, `content/TEMPLATE.md` (one comment line)
- Test: `tests/grader.test.ts`, `tests/tickets.test.ts`, `tests/content.test.ts`, `tests/ecomContent.test.ts`

**Interfaces:**
- Produces:
  - `cellKey(v: unknown, precision?: number): string`;
  - `compareResults(expected, actual, ordered, precision?: number)`;
  - `grade(run, solutionSql, playerSql, ordered, precision?: number)`;
  - `Step.precision?: number`.
  Every new parameter is optional and trailing, so Plan 10a's grader work can build on it.

- [ ] **Step 1: Failing tests.**

  `tests/grader.test.ts`:
  ```ts
  describe('precision (L4, v12.0 D10-12)', () => {
    it('không có precision: như cũ, làm tròn 2 chữ số rồi so', () => {
      expect(compareResults(res([['1235']]), res([['1234.996']]), false).ok).toBe(true);
    });
    it('precision 0: số chưa làm tròn tới đồng là sai; đã làm tròn (kể cả 1235.00) là đúng', () => {
      expect(compareResults(res([['1235']]), res([['1234.6']]), false, 0).ok).toBe(false);
      expect(compareResults(res([['1235']]), res([['1235.00']]), false, 0).ok).toBe(true);
      expect(compareResults(res([[1235]]), res([['1235']]), false, 0).ok).toBe(true);
    });
    it('precision 2: số còn chữ số thứ ba là sai', () => {
      expect(compareResults(res([['0.33']]), res([['0.333']]), false, 2).ok).toBe(false);
      expect(compareResults(res([['0.33']]), res([['0.330']]), false, 2).ok).toBe(true);
    });
    it('-0 sau khi làm tròn vẫn bằng 0', () => {
      expect(cellKey('-0.001')).toBe(cellKey(0));
      expect(cellKey('-0.4', 0)).not.toBe(cellKey(0, 0)); // strict: -0.4 is not rounded
      expect(cellKey('-0', 0)).toBe(cellKey(0, 0));
    });
  });
  ```

  `tests/tickets.test.ts` (find the existing helper that builds a minimal valid ticket source and reuse it; if there is none, copy `content/TEMPLATE.md` and append the line to its frontmatter):
  ```ts
  it('precision: số nguyên 0–6; ticket thường một số, cột mốc một danh sách mỗi bước (L4)', () => {
    const withFm = (line: string) => template.replace(/^---\n/, `---\n${line}\n`);
    expect(parseTicket(withFm('precision: 0'), 'x').steps[0].precision).toBe(0);
    expect(() => parseTicket(withFm('precision: 1.5'), 'x')).toThrow(/precision/);
    expect(() => parseTicket(withFm('precision: [0]'), 'x')).toThrow(/precision/);
  });
  ```
  (`template` = `import template from '../content/TEMPLATE.md?raw'`, as in `tests/content.test.ts`. If TEMPLATE uses CRLF, normalise with `.replace(/\r\n/g, '\n')` first.)

  `tests/content.test.ts` (imports `cellKey` too):
  ```ts
  it('L4: bước có precision trả mọi số đã ở đúng số chữ số thập phân, ở mọi biến thể', async () => {
    const run = await runner();
    const steps = loadTicketTemplates().flatMap((tpl) => Array.from({ length: Math.max(1, variantsOf(tpl).length) }, (_, v) => applyVariant(tpl, v)))
      .flatMap((tk) => tk.steps.filter((s) => s.precision !== undefined).map((s) => [tk.id, s] as const));
    expect([...new Set(steps.map(([id]) => id))].sort()).toEqual(['ch12-06', 'ch8-06']);
    for (const [id, s] of steps) {
      const r = await run(s.solution);
      for (const row of r.rows) for (const c of row) expect(cellKey(c, s.precision).endsWith('~'), `${id}: ${String(c)}`).toBe(false);
    }
  });
  ```

  `tests/ecomContent.test.ts`: the same test, with `ecomRunner()`, `loadTicketTemplates('ecommerce')` and the expected id list `['ecom-ch5-05']`.

  Run them. Expected: FAIL (no parameter, no `precision` in content).

- [ ] **Step 2: `src/grader.ts`.** Replace `roundKey`, `cellKey` and `rowKey`, and the signatures of `compareResults`/`grade`:
  ```ts
  // ponytail: without `precision` every number is compared after rounding to 2 decimals (spec §6). Values that straddle a
  // rounding boundary (0.335 vs 0.33499) mismatch; switch to tolerance pairing if players hit it.
  // L4 (v12.0 D10-12): a step with `precision: p` grades rounding: a value not already at p decimals never matches.
  function roundKey(n: number, p = 2, strict = false): string {
    const s = n.toFixed(p);
    const key = /^-0(\.0*)?$/.test(s) ? s.slice(1) : s;
    return strict && Math.abs(n - Number(s)) > 1e-9 ? `${key}~` : key;
  }

  export function cellKey(v: unknown, precision?: number): string {
    const num = (n: number): string => roundKey(n, precision ?? 2, precision !== undefined);
    if (v === null || v === undefined) return '∅';
    if (typeof v === 'number' || typeof v === 'bigint') return num(Number(v));
    if (typeof v === 'string' && NUMERIC_RE.test(v)) return num(Number(v));
    if (v instanceof Date) return v.toISOString();
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  }

  const rowKey = (row: unknown[], precision?: number) => row.map((c) => cellKey(c, precision)).join('\u0001');
  ```
  - `compareResults(expected: QueryResult, actual: QueryResult, ordered: boolean, precision?: number)`: use `expected.rows.map((r) => rowKey(r, precision))` and the same for `actual`.
  - `grade(run: Runner, solutionSql: string, playerSql: string, ordered: boolean, precision?: number)`: `return compareResults(expected, actual, ordered, precision);`.
  - `cellKey('-0.001')` stays `'0.00'` (the regex covers `-0.00`).

- [ ] **Step 3: `src/tickets.ts`.**
  - In `Step` add:
    ```ts
      /** L4 (v12.0): `precision:`. Numbers must already be at this many decimals (src/grader.ts); absent = lenient 2-decimal compare. */
      precision?: number;
    ```
  - In `parseTicket`, after the `perStep('lab', …)` lines:
    ```ts
      // L4: like columns: one number on a normal ticket, one entry per step (null = none) on a promotion review.
      if (fm.precision !== undefined) {
        const list = t.beat === 'boss' ? fm.precision : [fm.precision];
        const ok = (x: unknown): boolean => x === null || (Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 6);
        if (!Array.isArray(list) || list.length !== t.steps.length || !list.every(ok)) {
          fail('precision: số nguyên 0–6; ticket thường một số, cột mốc một danh sách mỗi bước (null = không có)');
        }
        (list as (number | null)[]).forEach((p, i) => { if (p !== null) t.steps[i].precision = p; });
      }
    ```
  - Check that `applyVariant` (`src/variants.ts`) copies `steps` with spread (`{ ...s, … }`) so `precision` survives. If it builds new step objects field by field, add `precision: s.precision`.

- [ ] **Step 4: `src/ui/work.ts`.** In `submit()`, the `grade(…)` call gets the step's precision:
  ```ts
      r = await grade((s) => (s === sql ? playerRun(s) : deps.db.run(s, { schema })), tk.steps[i].solution, sql, tk.ordered, tk.steps[i].precision);
  ```

- [ ] **Step 5: Content (D10-12, verified while writing).** Add one frontmatter line to each file, after `ordered:`:
  - `content/tickets/ch8/ch8-06.md`: `precision: [0, 0, 0]`
  - `content/tickets/ch12/ch12-06.md`: `precision: [null, 0, 0, 0]`
  - `content/domains/ecom/tickets/ch5/ecom-ch5-05.md`: `precision: [0, null, null]`
  - `content/TEMPLATE.md`: a YAML comment under its frontmatter options: `# precision: 0   (tùy chọn, L4: kết quả phải đã làm tròn tới số chữ số này; chỉ khi đề nói rõ "làm tròn đến đồng")`

- [ ] **Step 6: Run the tests and watch them pass.**
  ```bash
  npx vitest run tests/grader.test.ts tests/tickets.test.ts tests/content.test.ts tests/ecomContent.test.ts tests/variants.test.ts && npx tsc --noEmit && npm test
  ```
  Expected: PASS.
- [ ] **Step 7: Commit** (the 9 files above), message `feat(grader): precision per step grades rounding; three promotion reviews use it for money rounded to the dong (v12.0 L4, Plan 10 T10)` + `Claude-Session: …`.

---

### Task 11: Thank-you lines per ticket, related tables without early FK parents, Sandbox starter once (L1, L2, L5)

**Files:**
- Modify: `src/theme.ts`, `src/ui/brief.ts`, `src/viz/erd.ts`, `src/ui/vizTabs.ts`, `src/state.ts`, `src/session.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`
- Test: `tests/theme.test.ts`, `tests/erd.test.ts`, `tests/prefs.test.ts`

**Interfaces:**
- Produces:
  - `thanksKey(dept: string, ticketId: string): Key` (`src/theme.ts`);
  - `relatedTables(core, unlocked, cons, max = 10, withParents = true)`;
  - `showsParents(tk: Ticket): boolean` (`src/state.ts`);
  - `SANDBOX_SEEN_KEY`, `sandboxSeen(d, storage?)`, `markSandboxSeen(d, storage?)` (`src/session.ts`).

- [ ] **Step 1: Failing tests.**

  `tests/theme.test.ts` (import `DEPT` and `thanksKey` from `'../src/theme'`):
  ```ts
  describe('L1 (v12.0): lời cảm ơn', () => {
    it('mỗi phòng 4 câu khác nhau', () => {
      for (const [name, d] of Object.entries(DEPT)) expect(new Set(d.thanks).size, name).toBe(4);
    });
    it('cùng việc cùng câu; việc liền nhau khác câu, cả khi sang chương', () => {
      expect(thanksKey('Ops', 'ch3-02')).toBe(thanksKey('Ops', 'ch3-02'));
      for (let n = 1; n < 6; n++) expect(thanksKey('Ops', `ch3-0${n}`)).not.toBe(thanksKey('Ops', `ch3-0${n + 1}`));
      expect(thanksKey('Sales', 'ch3-05')).not.toBe(thanksKey('Sales', 'ch4-01'));
      expect(thanksKey('Finance', 'ecom-ch2-03')).not.toBe(thanksKey('Finance', 'ecom-ch2-04'));
      expect(thanksKey('Nobody', 'x')).toMatch(/^chat\.thanksOps/);
    });
  });
  ```

  `tests/erd.test.ts`, inside `describe('relatedTables (ui-ux-v4 §4)')`, reusing that block's `all`/`cons` fixtures:
  ```ts
    it('L2: withParents false = chỉ bảng của việc và cầu nối, không bảng cha FK', () => {
      expect(relatedTables(['c'], all, cons, 10, false)).toEqual({ tables: ['c'], dropped: [] });
    });
  ```
  and a new block (imports: `app`, `showsParents` from `'../src/state'`, `loadTickets` from `'../src/content'`):
  ```ts
  describe('L2: bảng cha FK chỉ từ chương dạy JOIN', () => {
    it('Logistics: chương 1–2 không, từ chương 3 có', () => {
      app.tickets = loadTickets('logistics');
      const ch = (n: number) => app.tickets.find((x) => x.chapter === n)!;
      expect(showsParents(ch(1))).toBe(false);
      expect(showsParents(ch(2))).toBe(false);
      expect(showsParents(ch(3))).toBe(true);
    });
  });
  ```

  `tests/prefs.test.ts` (add `vi` to the vitest import, and `writeDraft` to the `'../src/session'` import):
  ```ts
  describe('L5 (v12.0): Sandbox đã sửa thì không hiện lại câu mẫu', () => {
    it('câu mẫu chỉ tới khi người chơi gõ khác câu mẫu; theo từng lĩnh vực', () => {
      const data = new Map<string, string>();
      vi.stubGlobal('window', { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } });
      session.mode = { kind: 'sandbox' };
      app.save.sandboxDraft = '';
      expect(readDraft()).toBe(SANDBOX_STARTER);
      writeDraft(SANDBOX_STARTER); // the starter itself is not an edit
      expect(readDraft()).toBe(SANDBOX_STARTER);
      writeDraft('SELECT 1');
      writeDraft('');
      expect(readDraft()).toBe('');
      expect(JSON.parse(data.get('cargo-query/sandbox-seen')!)).toEqual(['logistics']);
      session.mode = { kind: 'story' };
      vi.unstubAllGlobals();
    });
  });
  ```

  Run them. Expected: FAIL.

- [ ] **Step 2: L1 (`src/theme.ts` + `src/ui/brief.ts`).**
  - `Dept.thanks` becomes `readonly [Key, Key, Key, Key]`. In `DEPT`, each `thanks: 'chat.thanksX'` becomes `thanks: ['chat.thanksX', 'chat.thanksX2', 'chat.thanksX3', 'chat.thanksX4']`. `NEUTRAL_DEPT` uses the Ops list. Update the doc comment ("thanks: four thank-you lines, one per ticket by thanksKey").
  - Add:
    ```ts
    /** L1 (v12.0): one of the sender's department's four thank-you lines, fixed per ticket; consecutive tickets differ (D10-20). */
    export function thanksKey(dept: string, ticketId: string): Key {
      const m = /ch(\d+)-(\d+)$/.exec(ticketId);
      const i = m ? Number(m[1]) + Number(m[2]) : [...ticketId].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0);
      return deptOf(dept).thanks[i % 4];
    }
    ```
  - `src/ui/brief.ts`: `t(deptOf(tk.from.dept).thanks)` becomes `t(thanksKey(tk.from.dept, tk.id))` (import `thanksKey`; drop `deptOf` if unused).
  - `vi.ts` (keep the existing first line of each department):
    ```ts
      'chat.thanksManagement2': 'Rõ ràng và gọn. Ban điều hành sẽ dùng bảng này.',
      'chat.thanksManagement3': 'Cảm ơn, đúng thứ mình cần trước buổi họp.',
      'chat.thanksManagement4': 'Số liệu chắc chắn. Mình chuyển cho các trưởng phòng.',
      'chat.thanksOps2': 'Nhận rồi, đội hiện trường xử lý ngay.',
      'chat.thanksOps3': 'Cảm ơn bạn, ca chiều đỡ phải dò tay.',
      'chat.thanksOps4': 'Chuẩn rồi, mình dán lên bảng điều độ.',
      'chat.thanksSales2': 'Cảm ơn nhé, khách hỏi đúng câu này sáng nay.',
      'chat.thanksSales3': 'Hay quá, có số này mình chốt giá dễ hơn.',
      'chat.thanksSales4': 'Nhận rồi, mình đưa vào báo giá tuần này.',
      'chat.thanksCustoms2': 'Khớp hồ sơ. Mình nộp tờ khai luôn.',
      'chat.thanksCustoms3': 'Cảm ơn, không phải đối chiếu tay nữa.',
      'chat.thanksCustoms4': 'Đúng yêu cầu của hải quan. Cảm ơn bạn.',
      'chat.thanksFinance2': 'Cảm ơn, kỳ khóa sổ này nhẹ hơn hẳn.',
      'chat.thanksFinance3': 'Số đã đối chiếu xong. Rất gọn.',
      'chat.thanksFinance4': 'Nhận rồi, mình đưa vào báo cáo tháng.',
      'chat.thanksCS2': 'Cảm ơn, mình trả lời khách ngay đây.',
      'chat.thanksCS3': 'Có số này khách yên tâm hơn nhiều.',
      'chat.thanksCS4': 'Nhận rồi, mình gửi kèm thư xin lỗi khách.',
      'chat.thanksIT2': 'Truy vấn gọn. Mình lưu lại để dùng tiếp.',
      'chat.thanksIT3': 'Cảm ơn, chạy nhanh và đúng.',
      'chat.thanksIT4': 'Nhận rồi, mình gắn vào báo cáo tự động.',
      'chat.thanksMarketing2': 'Cảm ơn, đội nội dung dùng ngay.',
      'chat.thanksMarketing3': 'Số này giúp mình chọn kênh chạy quảng cáo.',
      'chat.thanksMarketing4': 'Tuyệt, mình đưa vào bản tổng kết chiến dịch.',
      'chat.thanksCategory2': 'Cảm ơn, mình điều chỉnh tồn kho theo số này.',
      'chat.thanksCategory3': 'Rõ rồi, ngành hàng biết món nào cần đẩy.',
      'chat.thanksCategory4': 'Nhận rồi, mình gửi cho các shop đối tác.',
    ```
  - `en.ts`:
    ```ts
      'chat.thanksManagement2': 'Clear and short. The board will use this table.',
      'chat.thanksManagement3': 'Thanks, exactly what I needed before the meeting.',
      'chat.thanksManagement4': 'Solid figures. Passing them to the department heads.',
      'chat.thanksOps2': 'Got it, the field team is on it now.',
      'chat.thanksOps3': 'Thanks, the afternoon shift no longer checks this by hand.',
      'chat.thanksOps4': 'Spot on, pinning it to the dispatch board.',
      'chat.thanksSales2': 'Thanks, a customer asked exactly this this morning.',
      'chat.thanksSales3': 'Great, with this I can close the price faster.',
      'chat.thanksSales4': "Got it, it goes into this week's quotes.",
      'chat.thanksCustoms2': 'Matches the file. Filing the declaration now.',
      'chat.thanksCustoms3': 'Thanks, no more matching by hand.',
      'chat.thanksCustoms4': 'Just what customs asked for. Thank you.',
      'chat.thanksFinance2': 'Thanks, this month-end close is much lighter.',
      'chat.thanksFinance3': 'Reconciled. Very tidy.',
      'chat.thanksFinance4': 'Got it, adding it to the monthly report.',
      'chat.thanksCS2': 'Thanks, answering the customer right away.',
      'chat.thanksCS3': 'With these numbers the customer will feel much better.',
      'chat.thanksCS4': 'Got it, sending it with our apology letter.',
      'chat.thanksIT2': 'Clean query. Saving it for reuse.',
      'chat.thanksIT3': 'Thanks, fast and correct.',
      'chat.thanksIT4': 'Got it, wiring it into the automatic report.',
      'chat.thanksMarketing2': 'Thanks, the content team will use it today.',
      'chat.thanksMarketing3': 'This helps me pick the ad channels.',
      'chat.thanksMarketing4': 'Great, it goes into the campaign wrap-up.',
      'chat.thanksCategory2': 'Thanks, adjusting stock to these numbers.',
      'chat.thanksCategory3': 'Clear, now the category team knows what to push.',
      'chat.thanksCategory4': 'Got it, sending it to the partner shops.',
    ```

- [ ] **Step 3: L2.**
  - `src/viz/erd.ts` `relatedTables`: the signature becomes `(core: string[], unlocked: string[], cons: ErConstraint[], max = 10, withParents = true)`. The parents loop becomes `if (withParents) for (const stack = [...keep]; stack.length;) { … }`. Add to its doc comment: "`withParents` false (before the JOIN chapter, L2): only the task's tables and the bridges between them."
  - `src/state.ts`: add `domainSkills` to the `'./progress'` import and:
    ```ts
    /** L2 (v12.0): FK parent tables join the related tables only from the chapter that teaches JOIN in the open domain. */
    export function showsParents(tk: Ticket): boolean {
      const join = domainSkills(app.tickets).find((s) => s.id === 'join');
      return !!join && tk.chapter >= join.chapter;
    }
    ```
  - `src/ui/brief.ts` `relatedLine`: `relatedTables(tk.tables, open, m.cons)` → `relatedTables(tk.tables, open, m.cons, 10, showsParents(tk))`.
  - `src/ui/vizTabs.ts` `scoped`: `relatedTables(tk.tables, unlockedTables(), meta.cons)` → `relatedTables(tk.tables, unlockedTables(), meta.cons, 10, showsParents(tk))`.

- [ ] **Step 4: L5 (`src/session.ts`).** Import `readJson`, `writeJson` and `type KV` from `'./storage'` and `type DomainId` from `'./domains'`, then add:
  ```ts
  /** L5 (v12.0): device pref, the domains whose Sandbox the player has edited; there an empty draft stays empty. Never in Save. */
  export const SANDBOX_SEEN_KEY = 'cargo-query/sandbox-seen';
  const seenList = (storage?: KV): string[] => {
    const v = readJson<unknown>(SANDBOX_SEEN_KEY, storage);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  };
  export const sandboxSeen = (d: DomainId, storage?: KV): boolean => seenList(storage).includes(d);
  export function markSandboxSeen(d: DomainId, storage?: KV): void {
    if (!sandboxSeen(d, storage)) writeJson(SANDBOX_SEEN_KEY, [...seenList(storage), d], storage);
  }
  ```
  - `readDraft()` sandbox branch: `return draft.trim() ? draft : sandboxSeen(activeDomain()) ? '' : sandboxStarter();`
  - `writeDraft()` sandbox branch:
    ```ts
      if (m.kind === 'sandbox') {
        domainSlot(app.save, activeDomain()).sandboxDraft = v.slice(0, SANDBOX_DRAFT_MAX);
        if (v !== sandboxStarter()) markSandboxSeen(activeDomain()); // the player's own edit, not the starter loading
      }
    ```
  - Update `CLAUDE.md`'s pref list in Task 13.

- [ ] **Step 5: Run the tests and watch them pass.**
  ```bash
  npx vitest run tests/theme.test.ts tests/erd.test.ts tests/prefs.test.ts tests/i18n.test.ts && npx tsc --noEmit && npm test
  ```
  Expected: PASS.

- [ ] **Step 6: Browser** (`:5174`):
  - the Recap of ch1-01, ch1-02 and ch1-03 shows three different thank-you lines;
  - ch1 tasks' "Bảng liên quan" lists only the task's tables, while ch3 tasks list their parents too;
  - in the Sandbox, clear the editor and reload: it stays empty.

- [ ] **Step 7: Commit** (`src/theme.ts src/ui/brief.ts src/viz/erd.ts src/ui/vizTabs.ts src/state.ts src/session.ts src/i18n/vi.ts src/i18n/en.ts tests/theme.test.ts tests/erd.test.ts tests/prefs.test.ts`), message `feat(feedback): four thank-you lines per department fixed per task, FK parents only from the JOIN chapter, Sandbox starter once per device (v12.0 L1/L2/L5, Plan 10 T11)` + `Claude-Session: …`.

---

### Task 12: Tap targets, `lang="en"` on code, reflow at 320 px (A4, A5, A6)

**Files:**
- Modify: `src/style.css`, `src/ui/dom.ts`, `src/ui/work.ts`, `src/ui/sidebar.ts`, `src/ui/brief.ts` (+ whatever the 320 px check finds)
- Test: `tests/theme.test.ts`

- [ ] **Step 1: Failing test** (`tests/theme.test.ts`, which already reads `style.css?raw` as `css`; reuse that name):
  ```ts
  it('A4 (v12.0): mọi nút cao tối thiểu 24 px (WCAG 2.5.8)', () => {
    expect(css).toMatch(/@layer base[\s\S]*button[^{]*\{[^}]*min-height:\s*1\.5rem/);
  });
  ```
  Expected: FAIL.

- [ ] **Step 2: A4.**
  - `src/style.css`, in `@layer base` next to the existing button reset: `button { min-height: 1.5rem; } /* v12.0 A4: WCAG 2.5.8 target size */`.
  - Phone list rows (44 px):
    - `SIDE_LINK` in `src/ui/sidebar.ts`: add `max-lg:min-h-11`;
    - the history buttons in `src/ui/work.ts` `drawHistory()`: add `min-h-6 max-lg:min-h-11`;
    - the related-table chips in `src/ui/brief.ts` `relatedLine`: `'px-1.5 py-0 font-mono text-sm'` → `'min-h-6 px-1.5 py-0 font-mono text-sm'`.
  - The Data list and the Map lane list got `max-lg:min-h-11` in Tasks 6–7.

- [ ] **Step 3: A5.**
  - `src/ui/dom.ts` `h()`, right after `const el = document.createElement(tag);`:
    ```ts
      if ((tag === 'code' || tag === 'pre') && !('lang' in attrs)) el.lang = 'en'; // v12.0 A5: SQL and table names read in English
    ```
  - `src/ui/work.ts`: the `editorHost` attrs get `lang: 'en'`.

- [ ] **Step 4: Run the test.**
  ```bash
  npx vitest run tests/theme.test.ts && npx tsc --noEmit && npm test
  ```
  Expected: PASS.

- [ ] **Step 5: Browser checks on `:5174`** (Chrome DevTools device toolbar, both themes):
  - **A4**, at 375 px on Home, Learning path, Practise, Overview, Workspace, Data, Map and Dashboard:
    ```js
    [...document.querySelectorAll('a[href],button,[role=button],select,input,summary')].filter((e) => {
      if (!e.offsetParent || e.closest('p,li')?.matches('p')) return false; // inline links in a sentence are exempt (2.5.8)
      const r = e.getBoundingClientRect(); return r.width < 24 || r.height < 24;
    }).map((e) => e.outerHTML.slice(0, 90))
    ```
    Expected `[]`. Fix each hit with `min-h-6`/`min-w-6` on that element's class string.
  - **A5:** `document.querySelectorAll('code:not([lang]),pre:not([lang])').length` is 0 on the Workspace and the Data page.
  - **A6**, at 320 px on the same pages: `document.documentElement.scrollWidth <= innerWidth`. Expected `true`. Horizontal scroll is allowed only inside the result table and the editor (WCAG 1.4.10). For each page that fails, find the widest element (`[...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).slice(0, 5)`) and fix it: a flex child gets `min-w-0`, a table or `pre` wrapper gets `overflow-x-auto`, a fixed width gets `max-w-full`. List each fix in the commit body.

- [ ] **Step 6: Commit** (the files changed), message `feat(a11y): 24 px minimum targets, 44 px list rows on phones, code read as English, reflow at 320 px (v12.0 A4/A5/A6, Plan 10 T12)` + fixes list + `Claude-Session: …`.

---

### Task 13: Docs, measurements and full verification

**Files:**
- Modify: `CLAUDE.md`, `docs/team/review-log.md`

- [ ] **Step 1: `CLAUDE.md`.** Update these places:
  - **Architecture, worker paragraph:**
    - `initDb` → "the worker boots empty (`initEngine`: `sandbox` + `search_path = logistics, sandbox`)";
    - every domain's tables come from `ensure` (Logistics = schema id `'game'`, chunk `gameSeed`, budget `gameseed`), seeded only for what the player opens (v12.0 P1);
    - `ENSURE_TIMEOUT_MS` 120 s;
    - `DbClient.ready(schema)`;
    - a request that names its schema seeds it first; a failed seed is "broken" until `ensure()`/Retry;
    - `app.dbStatus` = the open page's data (`want`), and `DbClient.onSeeded` → `dataChanged()` runs after each seed; `openSchema` never replaces another banner and a failed seed is retried only by Retry.
  - **Commands:** budget groups include `gameseed`.
  - **Onboarding:** the welcome's first-visit domain picker (`bootPick`, `actions.startWith`); `cargo-query/domain` may hold `'general'` (SQL only, read only by `bootPick`; every domain route overwrites it).
  - **Imported data:** the `_my` rename uses the static `LOGISTICS_TABLES` ∪ `ECOM_TABLES`.
  - **localStorage list:** add `cargo-query/sandbox-seen`.
  - **Grader:** optional `precision` per step (strict, L4); frontmatter `precision:`.
  - **Navigation:** `NAV_ICON`; the Data page's `<select>` when the list is not in the wide sidebar; the Map page brief in place (`wirePins`); Home's resume line vs the Overview's message card.
  - **Accessibility:** `announce()`, skip buttons, `lang="en"` on code/pre.
  - **Colleagues:** `thanksKey` (four lines per department); related tables `showsParents`.
- [ ] **Step 2: Full checks.**
  ```bash
  npx tsc --noEmit
  npm test
  npm run build && node scripts/check-budget.mjs
  ```
  Expected: tsc clean, every test green, every budget group ok, with `main` ≤ 290, `worker` below Task 0's number and `gameseed` ≤ 16.
- [ ] **Step 3: Measurements (D10-25).** `npx vite preview --port 5174 --strictPort`, Edge, idle machine, 3 runs each, with the Task 0 snippet:
  - (a) `#/d/logistics` (test save);
  - (b) `#/d/ecommerce`, then back to `#/d/logistics`;
  - (c) SQL only on `:5175` (clear localStorage, pick "Chỉ học SQL", reload, measure on `#/learn`).
  Also record `performance.getEntriesByType('measure').filter((m) => m.name.startsWith('db:ensure'))`. Fill the "after" columns of the `## v12.0 (Plan 10)` table in `docs/team/review-log.md`. Below the table, add one line per row with the change in ms and %, and one line on whether (b) met the design's estimate (~6–8 s instead of ~16–19 s, §2.3).
- [ ] **Step 4: Browser smoke** (`npm run dev -- --port 5174 --strictPort`, test save; light and dark; **375 px and 1267 px**):
  - Home, Learning path, a module page, Practise, Overview, Workspace (Run, Submit wrong, Submit right), Data, Dashboard, Map (open a brief), the E-com Overview and Workspace;
  - the console has no errors;
  - the top bar is one line at 375 px;
  - the rail icons are unique;
  - the acceptance check of Task 2 Step 10 (E-com session: 0 `logistics` tables) passes again;
  - on `:5175` with cleared storage, the picker flow of Task 3 Step 5 works.
  Note in `review-log.md` that the test data stays on `:5174`/`:5175` (as L72 does).
- [ ] **Step 5: Commit** (`CLAUDE.md docs/team/review-log.md`), message `docs: v12.0 boot measurements, CLAUDE.md for lazy Logistics, picker, precision, nav and a11y (Plan 10 T13)` + `Claude-Session: …`.

---

## Risks

| Risk | Mitigation |
|---|---|
| Some code assumes Logistics exists at boot | Task 2 Step 10 acceptance (an E-com session visits every page, then 0 `logistics` tables). `dataChanged()` after every seed. CSV names are static (D10-11). Default-schema reads never seed (D10-3). |
| A seed is slower on phones than the budget | 120 s budget (D10-2, user look). A failed seed shows Retry and is not re-run per Run. |
| A first visitor closes the tab before picking | Nothing is seeded, and the next visit asks again (no pref was written). |
| The `'general'` pref surprises other readers | Only `bootPick` reads it; `isLiveDomain('general')` is false everywhere else; any domain route overwrites it (D10-7). |
| Strict `precision` refuses a correct but differently typed answer | Strict mode only rejects values that still have decimals beyond `p`. `1235.00` and `1235` both pass (tests). Applied to 7 steps only, all verified integral. |
| Plan 10a touches `grader.ts`/`lessonCard.ts` in parallel | This plan's changes there are one optional trailing parameter and two lines in `lessonCard.card()`. Whichever plan lands second rebases by name (anchors, not line numbers). |
| `main` grows past 290 KB | About 45 short VI strings and small code. Measured in Tasks 1 and 13. If it is over, move the 27 extra thank-you lines into the lazy `ticketSources` chunk (they belong to tickets). |
