# Cargo Query — Plan 1: Engine + chương 1–3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web game học SQL chạy hoàn toàn trong trình duyệt: PGlite trong Web Worker, seed dữ liệu forwarder lõi, grader, lưu tiến độ, UI inbox/editor/kết quả, và 15 ticket chương 1–3.

**Architecture:** Vite + TypeScript thuần DOM. Một dedicated Web Worker chạy PGlite, khởi tạo schema + seed tất định, chạy mọi query trong `BEGIN … ROLLBACK`. Grader là hàm thuần so kết quả query người chơi với Solution. Ticket là file markdown nạp bằng `import.meta.glob`. Tiến độ lưu JSON có version trong `localStorage`.

**Tech Stack:** Vite, TypeScript, Vitest, `@electric-sql/pglite` 0.5.16 (Postgres 18.6), CodeMirror 6 (`codemirror`, `@codemirror/lang-sql`, `@codemirror/lint` 6.9.8), `sql-formatter` 15.9.0 (tải lười), `yaml`.

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md`

**Thứ tự bản phát hành:** bản đầu tiên = Plan 1 + Plan 2 (bảng Ops/Hải quan/Tài chính/Pricing + chương 4–5) + Plan 3 (Chứng từ/D&D/Claims + câu chuyện + chương 6–7). Plan 1 chỉ là bước xây đầu, chưa phát hành riêng. Thứ tự thực hiện các plan (Plan 1 → 1b → 1c → Import; Deploy song song sau Task 2): xem mục "Thứ tự thực hiện" đầu spec.

## Global Constraints

- `@electric-sql/pglite` cài **đúng 0.5.16** (`--save-exact`); đổi version có thể đổi dữ liệu seed. Dependency mới cũng pin exact: `@codemirror/lint@6.9.8`, `sql-formatter@15.9.0` (Task 10).
- "Hôm nay" trong game = **2026-10-31**. Solution không dùng `CURRENT_DATE`, `now()`, `current_timestamp`, `localtimestamp`.
- Mỗi khối random trong `seed.sql` bắt đầu bằng `setseed()` riêng; khối mới chỉ thêm vào **cuối** file.
- Ticket có thứ tự / top-N phải nêu tiêu chí phá hòa đầy đủ trong đề.
- UI và nội dung có VI + EN, VI là bản gốc. Tên bảng/cột, SQL và lỗi Postgres giữ tiếng Anh. Chuỗi UI đi qua `t(key)` (`src/i18n`); chữ ticket đi qua `textOf(ticket, lang)`.
- Không đưa chuỗi từ nội dung/kết quả vào `innerHTML`; luôn dùng `textContent`/`append`.
- Mọi truy cập `localStorage`/IndexedDB bọc try/catch.
- Backend (nếu sau này có) viết bằng Python — không thuộc plan này.
- Vitest không kiểm kiểu: mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit` và phải không lỗi.

## File Structure

```
package.json, tsconfig.json, vite.config.ts, .gitignore, index.html, CLAUDE.md
src/
  db/schema.sql        DDL 6 bảng lõi
  db/seed.sql          seed tất định
  db/init.ts           initDb(db): chạy schema + seed
  db/run.ts            runSandboxed(db, sql): BEGIN → query (rowMode array) → ROLLBACK; QueryResult, SqlError, sqlErrorInfo, MAX_ROWS_WORKER
  db/worker.ts         Web Worker: PGlite + hàng đợi tuần tự; báo tiến độ tải
  db/client.ts         DbClient: hàng đợi query, timeout 5s → terminate + khởi động lại; lỗi typed không kèm chữ; onProgress
  db/loadProgress.ts   countingFetch: đếm byte .wasm/.data PGlite tải về
  grader.ts            cellKey, compareResults, grade, errorMessage; type GradeResult
  tickets.ts           Ticket, TicketText, Lang, parseTicket (# EN, ## Task, columns, starter, variants), textOf, byOrder
  content.ts           loadTickets() qua import.meta.glob
  progress.ts          SKILLS, CHAPTERS (từ content/*.yml), chapterTitle, CHAPTER_TABLES, tablesUnlocked, nextTicket, visibleTickets, currentChapter, xpFor, contentProblems
  save.ts              Save versioned (key cargo-query-save): parseSave, loadSave, writeSave, serializeSave, oldSaveKey, lỗi typed
  storage.ts           localStore, readJson, writeJson (try/catch cho key tiện ích)
  i18n/index.ts        Lang, Key, Msg, t, getLang, locale, setLang, applyStatic; key cargo-query/prefs
  i18n/vi.ts, en.ts    từ điển (vi là nguồn khóa; en: Record<Key, Msg>)
  history.ts           lịch sử query theo ticket (key cargo-query/history, 15 mục)
  shape.ts             kindOf, shapeOf, compareShape cho thẻ "Kết quả mong đợi"
  state.ts             app, actions, done, selected, draftKey, stepKey, unlockedTables, persist, editorSchema, expectedShape
  ui/dom.ts            h(), nodes(), richText(), byId()
  ui/resultTable.ts    renderResult, formatCell, MAX_ROWS
  ui/sqlErrors.ts      explainError: SQLSTATE/message → khóa giải thích
  ui/feedback.ts       gradeMessage, errorText, errorView
  ui/editor.ts         createEditor (CodeMirror: schema Compartment, vùng chọn, gạch lỗi, format, 3 phím tắt)
  ui/coach.ts          coach mark onboarding (key cargo-query/coach-done)
  ui/tabs.ts           registerTab, createPanel (tablist ARIA), registerCoreTabs (Kết quả, Cột)
  ui/splitter.ts       initLayout: 2 thanh chia dùng được bằng bàn phím (key cargo-query/layout)
  ui/topbar.ts         renderTopbar (chương, XP, VI|EN, trạng thái DB, thông báo)
  ui/inbox.ts          renderInbox
  ui/brief.ts          renderBrief: đề, Yêu cầu, shape card, gợi ý, kết luận, Recap
  ui/work.ts           mountWork: editor, Chạy/Định dạng/Nộp, phản hồi, lịch sử
  main.ts              nối DbClient + các vùng: rerender, selectTicket, complete
  style.css
content/skills.yml, content/chapters.yml, content/TEMPLATE.md
content/tickets/ch1..ch3/*.md
tests/helpers.ts, seed.test.ts, run.test.ts, client.test.ts, grader.test.ts, tickets.test.ts, progress.test.ts, save.test.ts, content.test.ts
tests/i18n.test.ts, history.test.ts, shape.test.ts, sqlErrors.test.ts, loadProgress.test.ts
tests/fixtures/save-v1.json
```

---

### Task 1: Khởi tạo dự án, schema + seed lõi

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`
- Create: `src/db/schema.sql`, `src/db/seed.sql`, `src/db/init.ts`, `src/db/run.ts`
- Test: `tests/helpers.ts`, `tests/seed.test.ts`

**Interfaces:**
- Produces:
  - `initDb(db: { exec(sql: string): Promise<unknown> }): Promise<void>`
  - `interface QueryResult { columns: string[]; types: number[]; rows: unknown[][] }`
  - `runSandboxed(db: PGlite, sql: string): Promise<QueryResult>` — throw `Error` (message của Postgres) khi SQL lỗi
  - tests: `seededDb(): Promise<PGlite>` (dùng chung trong một file test), `freshDb(): Promise<PGlite>`, `runner(): Promise<(sql: string) => Promise<QueryResult>>`

- [ ] **Step 1: Tạo `package.json`, cài dependency**

```json
{
  "name": "cargo-query",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

Run:
```bash
npm i --save-exact @electric-sql/pglite@0.5.16
npm i codemirror @codemirror/lang-sql @codemirror/view @codemirror/state yaml
npm i -D vite typescript vitest
```
Expected: cài xong, `package.json` có `"@electric-sql/pglite": "0.5.16"` (không có `^`).

- [ ] **Step 2: Tạo `tsconfig.json`, `vite.config.ts`, `.gitignore`**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true
  },
  "include": ["src", "tests", "vite.config.ts"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // PGlite tự nạp file .wasm/.data qua import.meta.url; pre-bundle sẽ làm hỏng đường dẫn.
  optimizeDeps: { exclude: ['@electric-sql/pglite'] },
  worker: { format: 'es' },
  test: { testTimeout: 60_000, hookTimeout: 60_000 },
});
```

`.gitignore`:
```
node_modules
dist
```

- [ ] **Step 3: Tạo `src/db/schema.sql`**

```sql
CREATE TABLE ports (
  code text PRIMARY KEY,
  name text NOT NULL,
  country text NOT NULL,
  region text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('SEAPORT', 'AIRPORT')),
  base_transit_days int NOT NULL
);

CREATE TABLE carriers (
  id int PRIMARY KEY,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  mode text NOT NULL CHECK (mode IN ('SEA', 'AIR'))
);

CREATE TABLE employees (
  id int PRIMARY KEY,
  full_name text NOT NULL,
  dept text NOT NULL,
  title text NOT NULL,
  manager_id int REFERENCES employees(id),
  hired_at date NOT NULL
);

CREATE TABLE customers (
  id int PRIMARY KEY,
  name text NOT NULL,
  industry text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  sales_rep_id int NOT NULL REFERENCES employees(id),
  created_at date NOT NULL
);

CREATE TABLE shipments (
  id int PRIMARY KEY,
  ref text NOT NULL UNIQUE,
  customer_id int NOT NULL REFERENCES customers(id),
  direction text NOT NULL CHECK (direction IN ('EXPORT', 'IMPORT')),
  mode text NOT NULL CHECK (mode IN ('SEA', 'AIR')),
  load_type text CHECK (load_type IN ('FCL', 'LCL')),
  pol text NOT NULL REFERENCES ports(code),
  pod text NOT NULL REFERENCES ports(code),
  carrier_id int NOT NULL REFERENCES carriers(id),
  incoterm text NOT NULL,
  sales_rep_id int NOT NULL REFERENCES employees(id),
  booking_date date NOT NULL,
  etd date NOT NULL,
  eta date NOT NULL,
  atd date,
  ata date,
  status text NOT NULL CHECK (status IN ('BOOKED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED')),
  gross_weight_kg numeric(10, 2) NOT NULL,
  volume_cbm numeric(8, 2) NOT NULL
);

CREATE TABLE containers (
  id int PRIMARY KEY,
  container_no text NOT NULL UNIQUE,
  shipment_id int NOT NULL REFERENCES shipments(id),
  container_type text NOT NULL CHECK (container_type IN ('20GP', '40GP', '40HC', '40RF')),
  teu int NOT NULL,
  gross_weight_kg numeric(10, 2) NOT NULL
);
```

- [ ] **Step 4: Tạo `src/db/seed.sql`**

```sql
-- Cargo Query seed. Deterministic: every random block starts with its own setseed(),
-- so adding tables later never re-rolls existing ones. Append new blocks at the END.
-- Game "today" = 2026-10-31. Ticket solutions use literal dates, never CURRENT_DATE/now().
-- Story hooks (tickets and tests depend on them):
--   * customers 171-190 stop booking from 2026-03-01 (churn, Ch3)
--   * customers 191-200 duplicate customers 1-10 with English-style names (trap, Ch4+)
--   * ~2% of AIR shipments carry incoterm FOB (trap: FOB is sea-only, Ch6)
--   * reserved for Plan 3: Europe lane (NLRTM/DEHAM/BEANR) margin drop in Q3 2026,
--     customer 1 D&D spike, carrier 3 (Blue Anchor Lines) high claim rate

INSERT INTO ports VALUES
  ('VNSGN', 'Ho Chi Minh (Cat Lai)', 'Vietnam', 'Vietnam', 'SEAPORT', 0),
  ('VNHPH', 'Hai Phong', 'Vietnam', 'Vietnam', 'SEAPORT', 0),
  ('VNDAD', 'Da Nang', 'Vietnam', 'Vietnam', 'SEAPORT', 0),
  ('CNSHA', 'Shanghai', 'China', 'Asia', 'SEAPORT', 5),
  ('CNNGB', 'Ningbo', 'China', 'Asia', 'SEAPORT', 5),
  ('SGSIN', 'Singapore', 'Singapore', 'Asia', 'SEAPORT', 3),
  ('KRPUS', 'Busan', 'South Korea', 'Asia', 'SEAPORT', 6),
  ('JPTYO', 'Tokyo', 'Japan', 'Asia', 'SEAPORT', 8),
  ('THLCH', 'Laem Chabang', 'Thailand', 'Asia', 'SEAPORT', 3),
  ('INNSA', 'Nhava Sheva', 'India', 'South Asia', 'SEAPORT', 14),
  ('NLRTM', 'Rotterdam', 'Netherlands', 'Europe', 'SEAPORT', 30),
  ('DEHAM', 'Hamburg', 'Germany', 'Europe', 'SEAPORT', 32),
  ('BEANR', 'Antwerp', 'Belgium', 'Europe', 'SEAPORT', 31),
  ('USLAX', 'Los Angeles', 'United States', 'North America', 'SEAPORT', 20),
  ('USNYC', 'New York', 'United States', 'North America', 'SEAPORT', 35),
  ('AUSYD', 'Sydney', 'Australia', 'Oceania', 'SEAPORT', 16),
  ('SGN', 'Tan Son Nhat Airport', 'Vietnam', 'Vietnam', 'AIRPORT', 0),
  ('HAN', 'Noi Bai Airport', 'Vietnam', 'Vietnam', 'AIRPORT', 0),
  ('PVG', 'Shanghai Pudong Airport', 'China', 'Asia', 'AIRPORT', 1),
  ('ICN', 'Incheon Airport', 'South Korea', 'Asia', 'AIRPORT', 1),
  ('NRT', 'Narita Airport', 'Japan', 'Asia', 'AIRPORT', 1),
  ('FRA', 'Frankfurt Airport', 'Germany', 'Europe', 'AIRPORT', 2),
  ('LAX', 'Los Angeles Airport', 'United States', 'North America', 'AIRPORT', 2),
  ('SYD', 'Sydney Airport', 'Australia', 'Oceania', 'AIRPORT', 2);

INSERT INTO carriers VALUES
  (1, 'Oceanic Star Line', 'OSL', 'SEA'),
  (2, 'Pacific Bridge Shipping', 'PBS', 'SEA'),
  (3, 'Blue Anchor Lines', 'BAL', 'SEA'),
  (4, 'Golden Lotus Container', 'GLC', 'SEA'),
  (5, 'Northwind Maritime', 'NWM', 'SEA'),
  (6, 'Meridian Express Line', 'MEL', 'SEA'),
  (7, 'SkyBridge Cargo', 'SBC', 'AIR'),
  (8, 'Lotus Air Freight', 'LAF', 'AIR'),
  (9, 'Eastwing Cargo', 'EWC', 'AIR');

INSERT INTO employees (id, full_name, dept, title, manager_id, hired_at)
SELECT i,
  (ARRAY['Nguyễn','Trần','Lê','Phạm','Hoàng','Huỳnh','Võ','Đặng','Bùi','Đỗ'])[1 + i % 10] || ' ' ||
  (ARRAY['An','Bình','Châu','Dũng','Duyên','Giang','Hà','Hải','Hạnh','Hiếu','Hoa','Hùng','Hương','Khánh','Khoa','Lan','Linh','Long','Mai','Minh',
         'My','Nam','Ngân','Ngọc','Nhung','Phong','Phúc','Phương','Quân','Quang','Quỳnh','Sơn','Tâm','Thảo','Thắng','Thu','Trang','Trung','Tuấn','Vy'])[i],
  CASE WHEN i = 1 THEN 'Management' WHEN i <= 13 THEN 'Sales' WHEN i <= 23 THEN 'Ops'
       WHEN i <= 29 THEN 'Customs' WHEN i <= 35 THEN 'Finance' ELSE 'CS' END,
  CASE WHEN i = 1 THEN 'Director' WHEN i IN (2, 14, 24, 30, 36) THEN 'Manager' ELSE 'Staff' END,
  CASE WHEN i = 1 THEN NULL WHEN i IN (2, 14, 24, 30, 36) THEN 1 WHEN i <= 13 THEN 2
       WHEN i <= 23 THEN 14 WHEN i <= 29 THEN 24 WHEN i <= 35 THEN 30 ELSE 36 END,
  DATE '2018-01-01' + (i * 97) % 2400
FROM generate_series(1, 40) i;

SELECT setseed(0.101);
INSERT INTO customers (id, name, industry, city, country, sales_rep_id, created_at)
SELECT i,
  (ARRAY['Công ty TNHH','Công ty CP','Công ty TNHH MTV'])[1 + floor(random() * 3)::int] || ' ' ||
  (ARRAY['Thành Công','Phú Thịnh','Hưng Phát','Đại Việt','Sao Mai','Hoàng Long','Tân Tiến','Minh Phát','An Khang','Bảo Ngọc',
         'Việt Hưng','Đông Á','Nam Phong','Kim Sơn','Thiên Phúc','Trường An','Hải Âu','Phương Đông','Toàn Cầu','Lạc Hồng'])[1 + (i - 1) % 20] || ' ' ||
  (ARRAY['Textile','Seafood','Furniture','Coffee','Electronics','Footwear','Rice','Cashew','Steel','Plastics'])[1 + ((i - 1) / 20) % 10],
  (ARRAY['Textile','Seafood','Furniture','Coffee','Electronics','Footwear','Rice','Cashew','Steel','Plastics'])[1 + ((i - 1) / 20) % 10],
  (ARRAY['Ho Chi Minh','Ho Chi Minh','Binh Duong','Dong Nai','Ha Noi','Hai Phong','Da Nang','Can Tho'])[1 + floor(random() * 8)::int],
  'Vietnam',
  2 + i % 12,
  DATE '2019-01-01' + floor(random() * 2100)::int
FROM generate_series(1, 190) i;

-- Duplicates of customers 1-10: same company, English-style name, created later.
INSERT INTO customers (id, name, industry, city, country, sales_rep_id, created_at)
SELECT 190 + id,
  regexp_replace(name, '^Công ty (TNHH MTV|TNHH|CP) ', '') || ' Co., Ltd',
  industry, city, country, sales_rep_id, DATE '2025-06-01' + id
FROM customers WHERE id <= 10;

SELECT setseed(0.202);
WITH base AS (
  SELECT g AS id,
    DATE '2024-11-01' + floor(random() * 730)::int AS booking_date,
    random() AS r_cust, random() AS r_dup, random() AS r_dir, random() AS r_mode, random() AS r_load,
    random() AS r_vn, random() AS r_far, random() AS r_carrier, random() AS r_inc, random() AS r_lead,
    random() AS r_transit, random() AS r_dep, random() AS r_arr, random() AS r_cancel, random() AS r_deliv,
    random() AS r_w, random() AS r_v
  FROM generate_series(1, 20000) g
), c AS (
  SELECT b.*,
    CASE WHEN b.r_dup < 0.01 AND b.booking_date >= DATE '2025-07-01' THEN 191 + floor(b.r_dup * 1000)::int % 10
         ELSE 1 + floor(190 * power(b.r_cust, 2.2))::int END AS cid0,
    CASE WHEN b.r_dir < 0.6 THEN 'EXPORT' ELSE 'IMPORT' END AS direction,
    CASE WHEN b.r_mode < 0.85 THEN 'SEA' ELSE 'AIR' END AS mode
  FROM base b
), d AS (
  SELECT c.*,
    CASE WHEN cid0 BETWEEN 171 AND 190 AND booking_date >= DATE '2026-03-01' THEN 1 + cid0 % 50 ELSE cid0 END AS customer_id,
    CASE WHEN mode = 'SEA' THEN (ARRAY['VNSGN','VNSGN','VNHPH','VNDAD'])[1 + floor(r_vn * 4)::int]
         ELSE (ARRAY['SGN','SGN','HAN'])[1 + floor(r_vn * 3)::int] END AS vn_port,
    CASE WHEN mode = 'SEA' THEN (ARRAY['CNSHA','CNNGB','SGSIN','KRPUS','JPTYO','THLCH','INNSA','NLRTM',
                                       'DEHAM','BEANR','USLAX','USNYC','AUSYD','CNSHA','NLRTM','USLAX'])[1 + floor(r_far * 16)::int]
         ELSE (ARRAY['PVG','ICN','NRT','FRA','LAX','SYD'])[1 + floor(r_far * 6)::int] END AS far_port,
    CASE WHEN mode = 'SEA' THEN 1 + floor(r_carrier * 6)::int ELSE 7 + floor(r_carrier * 3)::int END AS carrier_id,
    CASE WHEN mode = 'AIR' THEN NULL WHEN r_load < 0.7 THEN 'FCL' ELSE 'LCL' END AS load_type,
    CASE WHEN mode = 'SEA' THEN (ARRAY['FOB','FOB','CIF','CFR','EXW','FCA','DAP'])[1 + floor(r_inc * 7)::int]
         WHEN r_inc < 0.02 THEN 'FOB'
         ELSE (ARRAY['FCA','CPT','CIP','EXW','DAP'])[1 + floor(r_inc * 5)::int] END AS incoterm
  FROM c
), e AS (
  SELECT d.*, p.base_transit_days, d.booking_date + 3 + floor(d.r_lead * 8)::int AS etd
  FROM d JOIN ports p ON p.code = d.far_port
), f AS (
  SELECT e.*,
    etd + base_transit_days + floor(r_transit * 3)::int AS eta,
    etd + CASE WHEN r_dep < 0.8 THEN 0 WHEN r_dep < 0.95 THEN 1 ELSE 2 + floor((r_dep - 0.95) * 60)::int END AS atd0
  FROM e
), g AS (
  SELECT f.*,
    eta + (atd0 - etd) + CASE WHEN r_arr < 0.6 THEN 0 WHEN r_arr < 0.8 THEN -1
                              WHEN r_arr < 0.93 THEN 1 + floor((r_arr - 0.8) * 20)::int
                              ELSE 4 + floor((r_arr - 0.93) * 100)::int END AS ata0
  FROM f
)
INSERT INTO shipments (id, ref, customer_id, direction, mode, load_type, pol, pod, carrier_id, incoterm,
                       sales_rep_id, booking_date, etd, eta, atd, ata, status, gross_weight_kg, volume_cbm)
SELECT g.id,
  'CQ' || to_char(g.booking_date, 'YYMM') || lpad(g.id::text, 5, '0'),
  g.customer_id, g.direction, g.mode, g.load_type,
  CASE WHEN g.direction = 'EXPORT' THEN g.vn_port ELSE g.far_port END,
  CASE WHEN g.direction = 'EXPORT' THEN g.far_port ELSE g.vn_port END,
  g.carrier_id, g.incoterm, cu.sales_rep_id, g.booking_date, g.etd, g.eta,
  CASE WHEN g.r_cancel < 0.03 OR g.atd0 > DATE '2026-10-31' THEN NULL ELSE g.atd0 END,
  CASE WHEN g.r_cancel < 0.03 OR g.ata0 > DATE '2026-10-31' THEN NULL ELSE g.ata0 END,
  CASE WHEN g.r_cancel < 0.03 THEN 'CANCELLED'
       WHEN g.atd0 > DATE '2026-10-31' THEN 'BOOKED'
       WHEN g.ata0 > DATE '2026-10-31' THEN 'IN_TRANSIT'
       WHEN g.ata0 + 3 + floor(g.r_deliv * 5)::int > DATE '2026-10-31' THEN 'ARRIVED'
       ELSE 'DELIVERED' END,
  round((CASE WHEN g.mode = 'AIR' THEN 20 + g.r_w * 1980
              WHEN g.load_type = 'LCL' THEN 100 + g.r_w * 4900
              ELSE 2000 + g.r_w * 48000 END)::numeric, 2),
  round((CASE WHEN g.mode = 'AIR' THEN 0.1 + g.r_v * 12
              WHEN g.load_type = 'LCL' THEN 0.5 + g.r_v * 14.5
              ELSE 20 + g.r_v * 180 END)::numeric, 2)
FROM g JOIN customers cu ON cu.id = g.customer_id
ORDER BY g.id;

SELECT setseed(0.303);
WITH fcl AS (
  SELECT s.id AS shipment_id, s.gross_weight_kg,
    1 + floor(power(random(), 1.5) * 4)::int AS n, random() AS r_type
  FROM shipments s WHERE s.load_type = 'FCL'
), boxes AS (
  SELECT f.shipment_id, k,
    (ARRAY['20GP','40GP','40HC','40HC','40RF'])[1 + floor(f.r_type * 5)::int] AS container_type,
    round(f.gross_weight_kg / f.n, 2) AS w
  FROM fcl f CROSS JOIN LATERAL generate_series(1, f.n) k
)
INSERT INTO containers (id, container_no, shipment_id, container_type, teu, gross_weight_kg)
SELECT row_number() OVER (ORDER BY shipment_id, k),
  'CQLU' || lpad((row_number() OVER (ORDER BY shipment_id, k))::text, 7, '0'),
  shipment_id, container_type,
  CASE WHEN container_type = '20GP' THEN 1 ELSE 2 END,
  w
FROM boxes;
```

- [ ] **Step 5: Tạo `src/db/init.ts` và `src/db/run.ts`**

`src/db/init.ts`:
```ts
import schema from './schema.sql?raw';
import seed from './seed.sql?raw';

export async function initDb(db: { exec(sql: string): Promise<unknown> }): Promise<void> {
  await db.exec(schema);
  await db.exec(seed);
}
```

`src/db/run.ts`:
```ts
import type { PGlite } from '@electric-sql/pglite';

export interface QueryResult {
  columns: string[];
  /** Postgres type OID per column (1082 = date, 1114 = timestamp, 1700 = numeric...). */
  types: number[];
  rows: unknown[][];
}

/**
 * Runs exactly one statement inside BEGIN … ROLLBACK so players can never change data.
 * PGlite rejects multi-statement input, so a player cannot smuggle a COMMIT + DML pair.
 */
export async function runSandboxed(db: PGlite, sql: string): Promise<QueryResult> {
  await db.exec('BEGIN');
  try {
    const r = await db.query<unknown[]>(sql, [], { rowMode: 'array' });
    return {
      columns: r.fields.map((f) => f.name),
      types: r.fields.map((f) => f.dataTypeID),
      rows: r.rows,
    };
  } finally {
    await db.exec('ROLLBACK');
  }
}
```

- [ ] **Step 6: Viết test seed (failing trước khi có helpers)**

`tests/helpers.ts`:
```ts
import { PGlite } from '@electric-sql/pglite';
import { initDb } from '../src/db/init';
import { runSandboxed, type QueryResult } from '../src/db/run';

export async function freshDb(): Promise<PGlite> {
  const db = new PGlite();
  await initDb(db);
  return db;
}

let shared: Promise<PGlite> | undefined;
/** One seeded DB per test file (Vitest isolates modules per file). */
export function seededDb(): Promise<PGlite> {
  shared ??= freshDb();
  return shared;
}

export async function runner(): Promise<(sql: string) => Promise<QueryResult>> {
  const db = await seededDb();
  return (sql) => runSandboxed(db, sql);
}
```

`tests/seed.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { freshDb, seededDb } from './helpers';

const TABLES = ['ports', 'carriers', 'employees', 'customers', 'shipments', 'containers'];

async function one<T>(sql: string): Promise<T> {
  const db = await seededDb();
  return (await db.query<T>(sql)).rows[0];
}

describe('seed', () => {
  it('tất định: hai lần seed cho cùng dữ liệu', async () => {
    const [a, b] = await Promise.all([freshDb(), freshDb()]);
    for (const t of TABLES) {
      const q = `SELECT md5(string_agg(x::text, '|' ORDER BY x::text)) AS h FROM ${t} x`;
      const ha = (await a.query<{ h: string }>(q)).rows[0].h;
      const hb = (await b.query<{ h: string }>(q)).rows[0].h;
      expect(ha, t).toBe(hb);
    }
  });

  it('quy mô đúng', async () => {
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM shipments')).n).toBe(20000);
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM customers')).n).toBe(200);
    expect((await one<{ n: number }>('SELECT count(*) AS n FROM containers')).n).toBeGreaterThan(20000);
  });

  it('không có ngày thực tế sau "hôm nay" 2026-10-31', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE atd > '2026-10-31' OR ata > '2026-10-31' OR booking_date > '2026-10-31'`);
    expect(r.n).toBe(0);
  });

  it('móc câu chuyện: khách 171-190 ngừng book từ 2026-03-01', async () => {
    const after = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE customer_id BETWEEN 171 AND 190 AND booking_date >= '2026-03-01'`);
    const before = await one<{ n: number }>(`SELECT count(DISTINCT customer_id) AS n FROM shipments WHERE customer_id BETWEEN 171 AND 190 AND booking_date < '2026-03-01'`);
    expect(after.n).toBe(0);
    expect(before.n).toBe(20);
  });

  it('móc câu chuyện: khách 191-200 là bản trùng của 1-10 và có lô hàng', async () => {
    const r = await one<{ n: number }>(`SELECT count(*) AS n FROM customers WHERE id > 190 AND name LIKE '% Co., Ltd'`);
    const s = await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE customer_id > 190`);
    expect(r.n).toBe(10);
    expect(s.n).toBeGreaterThan(0);
  });

  it('móc câu chuyện: có lô AIR ghi FOB; khách 1 lớn nhất', async () => {
    expect((await one<{ n: number }>(`SELECT count(*) AS n FROM shipments WHERE mode = 'AIR' AND incoterm = 'FOB'`)).n).toBeGreaterThan(0);
    const top = await one<{ customer_id: number }>(`SELECT customer_id FROM shipments GROUP BY customer_id ORDER BY count(*) DESC LIMIT 1`);
    expect(top.customer_id).toBe(1);
  });
});
```

- [ ] **Step 7: Chạy test**

Run: `npx vitest run tests/seed.test.ts`
Expected: 6 test PASS (seed mất ~2s mỗi lần). Nếu lỗi `Cannot find module './schema.sql?raw'` → kiểm tra `"types": ["vite/client"]` trong tsconfig.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts .gitignore src/db tests/helpers.ts tests/seed.test.ts
git commit -m "feat: project scaffold with deterministic core seed"
```

---

### Task 2: Worker, DbClient và smoke test trên trình duyệt

> **Đã sửa sau review (commit `68b5520`; code thật nằm ở `src/db/`, code ở các bước dưới là bản đầu tiên, giữ lại làm lịch sử):**
> - `client.ts` tự xếp hàng: mỗi lúc chỉ một query nằm trong worker, timer 5s bắt đầu khi query được `postMessage`, nên query sau không bị tính cả thời gian chạy của query trước.
> - `restart()` reject mọi query đang chờ hoặc đang chạy bằng `DbRestartError`, kể cả lúc đang boot. Worker lỗi (`initError` hoặc `onerror`, trước hay sau `ready`) → `DbFailedError(detail)`, worker bị terminate, `run()` sau đó reject ngay; `restart()` thử lại được.
> - Lỗi không kèm chữ (UI dịch theo `instanceof`): `QueryTimeoutError(timeoutMs)`, `DbRestartError`, `DbFailedError(detail)`.
> - Giao thức: `{ type: 'ready'; timings: { bootMs, seedMs } }` và `{ type: 'error'; id; error: SqlErrorInfo }`. `DbClient.timings`; `performance.mark` `db:spawn`, `db:ready`, `db:restart` và `performance.measure('db:time-to-ready')`.
> - `run.ts`: `SqlErrorInfo { message; position?; code?; hint? }`, `class SqlError` (giữ nguyên message của Postgres, `position` là số, đếm từ 1 theo ký tự), `sqlErrorInfo(e)`; `runSandboxed(db, sql, maxRows = MAX_ROWS_WORKER)` cắt kết quả ở `MAX_ROWS_WORKER = 50_000` dòng và đặt `truncated: true` trên `QueryResult`.
> - Test chạy trong Node: `tests/client.test.ts` (Worker giả + fake timers), `tests/run.test.ts`.
> - Trang smoke tạm `src/main.ts` giờ in `timeout: ` với phần message rỗng (lỗi không kèm chữ). Ở Step 5, dòng đó rỗng vẫn là đạt.

Làm sớm để kiểm PGlite trong Web Worker thật (Vite bundle `.wasm`/`.data`, `terminate()` khi CPU đang bận) trước khi xây phần còn lại.

**Files:**
- Create: `src/db/worker.ts`, `src/db/client.ts`
- Create (tạm, Task 10 ghi đè): `index.html`, `src/main.ts`

**Interfaces:**
- Consumes: `initDb`, `runSandboxed`, `QueryResult` (Task 1)
- Produces:
  - Giao thức worker: main → worker `{ id: number; sql: string }`; worker → main `{ type: 'ready' } | { type: 'initError'; message: string } | { type: 'result'; id: number; result: QueryResult } | { type: 'error'; id: number; message: string }`
  - `type DbStatus = 'loading' | 'ready' | 'failed'`
  - `class DbClient { constructor(onStatus: (s: DbStatus, message?: string) => void, timeoutMs?: number); run(sql: string): Promise<QueryResult>; restart(): void }`
  - `class QueryTimeoutError extends Error`

- [ ] **Step 1: Viết `src/db/worker.ts`**

```ts
import { PGlite } from '@electric-sql/pglite';
import { initDb } from './init';
import { runSandboxed } from './run';

const ready = (async () => {
  const db = new PGlite();
  await initDb(db);
  return db;
})();

ready.then(
  () => postMessage({ type: 'ready' }),
  (e: unknown) => postMessage({ type: 'initError', message: e instanceof Error ? e.message : String(e) }),
);

// One query at a time: BEGIN … ROLLBACK pairs from two runs must never interleave.
let queue: Promise<void> = Promise.resolve();

onmessage = (e: MessageEvent<{ id: number; sql: string }>) => {
  const { id, sql } = e.data;
  queue = queue.then(async () => {
    try {
      const db = await ready;
      postMessage({ type: 'result', id, result: await runSandboxed(db, sql) });
    } catch (err) {
      postMessage({ type: 'error', id, message: err instanceof Error ? err.message : String(err) });
    }
  });
};
```

- [ ] **Step 2: Viết `src/db/client.ts`**

```ts
import type { QueryResult } from './run';

export type DbStatus = 'loading' | 'ready' | 'failed';
export class QueryTimeoutError extends Error {}

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'initError'; message: string }
  | { type: 'result'; id: number; result: QueryResult }
  | { type: 'error'; id: number; message: string };

interface Pending {
  resolve: (r: QueryResult) => void;
  reject: (e: Error) => void;
}

/**
 * Owns the PGlite worker. statement_timeout does not work in PGlite, so a runaway query
 * is stopped by terminating the worker and booting a fresh one (re-seeds, ~3s).
 */
export class DbClient {
  private worker!: Worker;
  private ready!: Promise<void>;
  private pending = new Map<number, Pending>();
  private nextId = 1;

  constructor(
    private readonly onStatus: (s: DbStatus, message?: string) => void,
    private readonly timeoutMs = 5000,
  ) {
    this.start();
  }

  private start(): void {
    this.onStatus('loading');
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    this.ready = new Promise<void>((resolve, reject) => {
      this.worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
        const m = e.data;
        if (m.type === 'ready') {
          this.onStatus('ready');
          resolve();
        } else if (m.type === 'initError') {
          this.onStatus('failed', m.message);
          reject(new Error(m.message));
        } else {
          const p = this.pending.get(m.id);
          if (!p) return;
          this.pending.delete(m.id);
          if (m.type === 'result') p.resolve(m.result);
          else p.reject(new Error(m.message));
        }
      };
      this.worker.onerror = (e) => {
        this.onStatus('failed', e.message);
        reject(new Error(e.message || 'Worker lỗi'));
      };
    });
    this.ready.catch(() => {}); // surfaced through run() and onStatus
  }

  async run(sql: string): Promise<QueryResult> {
    await this.ready;
    const id = this.nextId++;
    return new Promise<QueryResult>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        this.restart();
        reject(new QueryTimeoutError(`Query chạy quá ${this.timeoutMs / 1000} giây nên đã bị dừng. Database đang được nạp lại.`));
      }, this.timeoutMs);
      this.pending.set(id, {
        resolve: (r) => { clearTimeout(timer); resolve(r); },
        reject: (e) => { clearTimeout(timer); reject(e); },
      });
      this.worker.postMessage({ id, sql });
    });
  }

  restart(): void {
    this.worker.terminate();
    for (const p of this.pending.values()) p.reject(new Error('Database đang khởi động lại.'));
    this.pending.clear();
    this.start();
  }
}
```

- [ ] **Step 3: Trang smoke tạm**

`index.html`:
```html
<!doctype html>
<html lang="vi">
  <head><meta charset="UTF-8" /><title>Cargo Query smoke</title></head>
  <body>
    <pre id="out">smoke test</pre>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/main.ts`:
```ts
import { DbClient } from './db/client';

const out = document.getElementById('out')!;
const log = (s: string) => { out.textContent += `
${s}`; };
const db = new DbClient((s, m) => log(`status: ${s}${m ? ` ${m}` : ''}`));

(async () => {
  log(`count: ${JSON.stringify((await db.run('SELECT count(*) FROM shipments')).rows)}`);
  try {
    // CPU-bound (400 triệu dòng), không phải pg_sleep: kiểm terminate() khi worker đang bận tính toán.
    await db.run('SELECT count(*) FROM shipments a, shipments b');
    log('LỖI: query nặng không bị dừng');
  } catch (e) {
    log(`timeout: ${(e as Error).message}`);
  }
  log(`after restart: ${JSON.stringify((await db.run('SELECT 42')).rows)}`);
  log('DONE');
})();
```

- [ ] **Step 4: Typecheck và build**

Run: `npx tsc --noEmit && npx vite build`
Expected: không lỗi kiểu; `dist/assets` có `worker-*.js`, `pglite-*.wasm` và `pglite-*.data` (đã xác nhận bằng spike với Vite 8.3: wasm ~3.3MB gzip, data ~6.2MB).

- [ ] **Step 5: Chạy trên trình duyệt**

Run: `npm run dev`, mở URL Vite in ra.
Expected (sau ~15 giây), theo thứ tự:
```
status: loading
status: ready
count: [[20000]]
status: loading
timeout: Query chạy quá 5 giây nên đã bị dừng. Database đang được nạp lại.
status: ready
after restart: [[42]]
DONE
```
Lặp lại với `npm run build && npx vite preview` cho bản build. Nếu dòng `LỖI` xuất hiện hoặc trang treo: dừng lại, báo người dùng — kiến trúc timeout của spec cần xem lại.

- [ ] **Step 6: Commit**

```bash
git add src/db/worker.ts src/db/client.ts index.html src/main.ts
git commit -m "feat: PGlite worker with timeout kill switch"
```

---

### Task 3: Grader

> **Đã sửa sau review (commit `68b5520`; code thật ở `src/grader.ts`):** biến thể lỗi đổi thành `{ ok: false; reason: 'error'; message: string; error?: SqlErrorInfo }`. `error` chỉ có khi query người chơi gặp lỗi Postgres (lấy bằng `sqlErrorInfo`), để editor vẫn gạch được lỗi khi Nộp. Lỗi khác (timeout, restart, worker chết) vẫn trả `reason: 'error'` với `message = errorMessage(e)`. Thêm 2 test vào `tests/grader.test.ts`.

**Files:**
- Create: `src/grader.ts`
- Test: `tests/grader.test.ts`

**Interfaces:**
- Consumes: `QueryResult`, `runSandboxed` (Task 1); `runner()`, `seededDb()` (tests/helpers.ts)
- Produces:
  - `type GradeResult = { ok: true } | { ok: false; reason: 'error'; message: string } | { ok: false; reason: 'columns'; expected: number; actual: number } | { ok: false; reason: 'rows'; missing: number; extra: number; sample?: unknown[] } | { ok: false; reason: 'order' }`
  - `type Runner = (sql: string) => Promise<QueryResult>`
  - `cellKey(v: unknown): string`
  - `compareResults(expected: QueryResult, actual: QueryResult, ordered: boolean): GradeResult`
  - `grade(run: Runner, solutionSql: string, playerSql: string, ordered: boolean): Promise<GradeResult>` — lỗi của query người chơi → `reason: 'error'`; lỗi của Solution thì **throw** (bug nội dung)
  - `errorMessage(e: unknown): string`

- [ ] **Step 1: Viết test**

`tests/grader.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { QueryResult } from '../src/db/run';
import { cellKey, compareResults, grade } from '../src/grader';
import { runner, seededDb } from './helpers';

const res = (rows: unknown[][], columns = rows[0]?.map((_, i) => `c${i}`) ?? ['c0']): QueryResult => ({
  columns, types: columns.map(() => 0), rows,
});

describe('cellKey', () => {
  it('số: int, float, chuỗi numeric đều làm tròn 2 chữ số', () => {
    expect(cellKey(3)).toBe('3.00');
    expect(cellKey('3.004')).toBe('3.00');
    expect(cellKey(18827.3127)).toBe('18827.31');
    expect(cellKey(-0.001)).toBe('0.00');
  });
  it('NULL, ngày, chữ', () => {
    expect(cellKey(null)).toBe('∅');
    expect(cellKey(new Date('2026-10-31T00:00:00Z'))).toBe('2026-10-31T00:00:00.000Z');
    expect(cellKey('CQ2610')).toBe('CQ2610');
  });
});

describe('compareResults', () => {
  const exp = res([[1, 'a'], [2, 'b']]);
  it('khớp khi không xét thứ tự', () => {
    expect(compareResults(exp, res([[2, 'b'], [1, 'a']]), false)).toEqual({ ok: true });
  });
  it('bỏ qua tên cột', () => {
    expect(compareResults(exp, res([[1, 'a'], [2, 'b']], ['x', 'y']), false)).toEqual({ ok: true });
  });
  it('sai thứ tự khi ordered', () => {
    expect(compareResults(exp, res([[2, 'b'], [1, 'a']]), true)).toEqual({ ok: false, reason: 'order' });
  });
  it('sai số cột', () => {
    expect(compareResults(exp, res([[1], [2]]), false)).toEqual({ ok: false, reason: 'columns', expected: 2, actual: 1 });
  });
  it('thiếu dòng', () => {
    expect(compareResults(exp, res([[1, 'a']]), false)).toEqual({ ok: false, reason: 'rows', missing: 1, extra: 0, sample: undefined });
  });
  it('giá trị lệch: báo dòng của người chơi', () => {
    expect(compareResults(exp, res([[1, 'a'], [2, 'z']]), false)).toEqual({ ok: false, reason: 'rows', missing: 1, extra: 1, sample: [2, 'z'] });
  });
  it('dòng trùng được đếm đúng', () => {
    expect(compareResults(res([[1], [1]]), res([[1]]), false)).toMatchObject({ reason: 'rows', missing: 1, extra: 0 });
  });
});

describe('grade trên DB thật', () => {
  const sol = "SELECT code, name FROM ports WHERE region = 'Europe' AND kind = 'SEAPORT'";

  it('alias và thứ tự cột-dòng khác vẫn đúng', async () => {
    const run = await runner();
    const r = await grade(run, sol, "SELECT p.code AS ma, p.name AS ten FROM ports p WHERE kind = 'SEAPORT' AND region = 'Europe' ORDER BY name", false);
    expect(r).toEqual({ ok: true });
  });

  it('ROUND(AVG) khớp AVG không làm tròn', async () => {
    const run = await runner();
    const r = await grade(run, 'SELECT AVG(gross_weight_kg) FROM shipments', 'SELECT ROUND(AVG(gross_weight_kg), 2) FROM shipments', false);
    expect(r).toEqual({ ok: true });
  });

  it('lỗi SQL của người chơi → reason error', async () => {
    const run = await runner();
    const r = await grade(run, sol, 'SELEC 1', false);
    expect(r).toMatchObject({ ok: false, reason: 'error' });
  });

  it('nhiều câu lệnh bị từ chối', async () => {
    const run = await runner();
    const r = await grade(run, sol, 'SELECT 1; SELECT 2', false);
    expect(r).toMatchObject({ ok: false, reason: 'error' });
  });

  it('UPDATE thành công của người chơi vẫn bị rollback', async () => {
    const run = await runner();
    // Câu lệnh chạy được (không lỗi FK), nên grader báo sai số cột chứ không phải lỗi SQL.
    expect(await grade(run, sol, "UPDATE ports SET name = 'x'", false)).toMatchObject({ ok: false, reason: 'columns' });
    const db = await seededDb();
    expect((await db.query<{ n: number }>("SELECT count(*) AS n FROM ports WHERE name = 'x'")).rows[0].n).toBe(0);
  });

  it('Solution lỗi thì throw (bug nội dung)', async () => {
    const run = await runner();
    await expect(grade(run, 'SELEC broken', 'SELECT 1', false)).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/grader.test.ts`
Expected: FAIL — `Failed to resolve import "../src/grader"`.

- [ ] **Step 3: Viết `src/grader.ts`**

```ts
import type { QueryResult } from './db/run';

export type GradeResult =
  | { ok: true }
  | { ok: false; reason: 'error'; message: string }
  | { ok: false; reason: 'columns'; expected: number; actual: number }
  | { ok: false; reason: 'rows'; missing: number; extra: number; sample?: unknown[] }
  | { ok: false; reason: 'order' };

export type Runner = (sql: string) => Promise<QueryResult>;

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

// ponytail: every number is compared after rounding to 2 decimals (spec §6). Values that
// straddle a rounding boundary (0.335 vs 0.33499) mismatch; switch to tolerance pairing if players hit it.
function roundKey(n: number): string {
  const s = n.toFixed(2);
  return s === '-0.00' ? '0.00' : s;
}

export function cellKey(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number' || typeof v === 'bigint') return roundKey(Number(v));
  if (typeof v === 'string' && NUMERIC_RE.test(v)) return roundKey(Number(v));
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

const rowKey = (row: unknown[]) => row.map(cellKey).join('\u0001');

export function compareResults(expected: QueryResult, actual: QueryResult, ordered: boolean): GradeResult {
  if (expected.columns.length !== actual.columns.length) {
    return { ok: false, reason: 'columns', expected: expected.columns.length, actual: actual.columns.length };
  }
  const eKeys = expected.rows.map(rowKey);
  const aKeys = actual.rows.map(rowKey);
  const remaining = new Map<string, number>();
  for (const k of eKeys) remaining.set(k, (remaining.get(k) ?? 0) + 1);
  let extra = 0;
  let sample: unknown[] | undefined;
  actual.rows.forEach((row, i) => {
    const n = remaining.get(aKeys[i]) ?? 0;
    if (n > 0) remaining.set(aKeys[i], n - 1);
    else {
      extra++;
      sample ??= row;
    }
  });
  let missing = 0;
  for (const n of remaining.values()) missing += n;
  if (missing || extra) return { ok: false, reason: 'rows', missing, extra, sample };
  if (ordered && eKeys.some((k, i) => k !== aKeys[i])) return { ok: false, reason: 'order' };
  return { ok: true };
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export async function grade(run: Runner, solutionSql: string, playerSql: string, ordered: boolean): Promise<GradeResult> {
  let actual: QueryResult;
  try {
    actual = await run(playerSql);
  } catch (e) {
    return { ok: false, reason: 'error', message: errorMessage(e) };
  }
  const expected = await run(solutionSql); // throws on a broken Solution: content bug, surfaced to the caller
  return compareResults(expected, actual, ordered);
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/grader.test.ts`
Expected: tất cả PASS.

- [ ] **Step 5: Commit**

```bash
git add src/grader.ts tests/grader.test.ts
git commit -m "feat: result grader with sandboxed runs"
```

---

### Task 4: Parser ticket (song ngữ, `## Task`, `columns`, `starter`, `variants`)

Định dạng theo quyết định của user: D1 (khối `# EN` ở cuối cùng file, `title_en`/`conclusion_en`, frontmatter và SQL chỉ có một bản), D4 (`columns:`, mục `## Task`, `starter:`), D2 (`variants` với template `{{x}}`). Task này chỉ **đọc và kiểm định dạng**. Việc thay biến thể vào đề/Solution và toàn bộ logic Luyện tập thuộc Plan 1c.

````markdown
---
id: ch1-02
chapter: 1
title: Cảng châu Âu
title_en: European ports
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
columns: [code]              # tùy chọn; boss: một danh sách cho mỗi bước, ví dụ [[ref], [ref, eta]]
variants:                    # tùy chọn, 2–4 bộ; variants[0] là bản Học chính; boss không có
  - { region: Europe }
  - { region: Asia }
---
Bối cảnh: lời nhắn của phòng ban.

## Task
Lấy mã các cảng ở `{{region}}`.

## Hints
1. …
2. …
3. …

## Solution
```sql
SELECT code FROM ports WHERE region = '{{region}}'
```

# EN
Context: the department's message.

## Task
List the codes of the ports in `{{region}}`.

## Hints
1. …
2. …
3. …
````

Luật của parser (sai thì throw `Error` có `origin`):
- Phần VI: thân bài, `## Task` (tùy chọn), `## Hints` (đúng 3), `## Solution` (ticket thường) hoặc 2+ `## Step N: <tiêu đề>` (boss), mỗi mục có ```` ```sql ````. Heading `##` khác là lỗi, vì nội dung dưới heading lạ sẽ bị mất mà không ai biết.
- Khối `# EN` (tối đa một): cùng các mục nhưng **không có** ```` ```sql ```` và không có `## Solution`; đúng 3 hints; boss có cùng số `## Step N`; có `## Task` khi và chỉ khi bản VI có. Có `# EN` thì bắt buộc có `title_en`, boss thì có thêm `conclusion_en` cùng số lựa chọn (dùng chung `answer`). Có `title_en`/`conclusion_en` mà không có `# EN` cũng là lỗi. Ticket chưa có `# EN` vẫn hợp lệ ở bước này; luật "0 ticket thiếu EN" nằm ở test nội dung (Task 7).
- `columns:` là nhãn cột kết quả cho thẻ "Kết quả mong đợi" (grader vẫn so theo vị trí). Ticket thường là một danh sách; boss là một danh sách cho mỗi bước.
- `starter:` là chuỗi SQL nạp sẵn vào editor khi draft rỗng (dùng cho `ch1-01`).
- `variants`: 2–4 bộ; giá trị khớp `^[\w .:/-]{1,40}$` (số được đổi thành chuỗi); mọi bộ có **đúng** các khóa `{{x}}` được dùng ở bất kỳ đâu (đề VI/EN, Task, hints, step, Solution, `columns`, `starter`); boss không có `variants`; dùng `{{x}}` mà không có `variants` là lỗi.

**Files:**
- Create: `src/tickets.ts`
- Test: `tests/tickets.test.ts`

**Interfaces:**
- Consumes: `yaml` (dependency đã có từ Task 1)
- Produces:
  - `type Lang = 'vi' | 'en'` (`src/i18n` của Task 10 re-export type này)
  - `type Beat = 'teach' | 'develop' | 'twist' | 'rest' | 'boss'`
  - `interface Step { title: string; prompt: string; solution: string; columns?: string[] }`
  - `interface Conclusion { question: string; options: string[]; answer: number }`
  - `interface TicketText { title: string; body: string; task: string; hints: string[]; steps: { title: string; prompt: string }[]; conclusion?: { question: string; options: string[] } }` — `steps` song song với `Ticket.steps`
  - `type Variant = Record<string, string>`
  - `interface Ticket { id: string; chapter: number; title: string; from: { name: string; dept: string }; difficulty: number; beat: Beat; requires: string[]; grants: string[]; tables: string[]; ordered: boolean; body: string; task: string; hints: string[]; steps: Step[]; conclusion?: Conclusion; starter?: string; variants?: Variant[]; en?: TicketText }` — chữ VI nằm ở các trường gốc, chữ EN ở `en`; `task` là `''` khi không có `## Task`; ticket thường có đúng 1 step (`title: ''`, `prompt: ''`), boss có ≥ 2 step + `conclusion`
  - `parseTicket(source: string, origin: string): Ticket` — throw `Error` có `origin` khi sai định dạng
  - `textOf(t: Ticket, lang: Lang): TicketText & { fallback: boolean }` — `lang = 'en'` mà ticket chưa có `# EN` thì trả bản VI với `fallback: true` (UI gắn nhãn "chưa dịch")
  - `byOrder(a: Ticket, b: Ticket): number` — sắp theo chương rồi id

- [ ] **Step 1: Viết test**

`tests/tickets.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseTicket, textOf } from '../src/tickets';

const NORMAL = `---
id: ch1-02
chapter: 1
title: Cảng châu Âu
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
---
Lọc giúp mình các cảng ở \`Europe\`.

Dòng thứ hai.

## Hints
1. Gợi ý một
2. Gợi ý hai
3. Gợi ý ba

## Solution
\`\`\`sql
SELECT code FROM ports WHERE region = 'Europe'
\`\`\`
`;

const BOSS = `---
id: ch1-05
chapter: 1
title: Lô đi Rotterdam
from: { name: Trần An, dept: Management }
difficulty: 2
beat: boss
requires: [where]
grants: []
tables: [shipments]
ordered: true
conclusion:
  question: Lọc theo cột nào?
  options: [status, eta]
  answer: 0
---
Mở đầu.

## Step 1: Đang trên đường
Liệt kê lô.
\`\`\`sql
SELECT ref FROM shipments WHERE status = 'IN_TRANSIT'
\`\`\`

## Step 2: Sắp cập cảng
Thêm điều kiện.
\`\`\`sql
SELECT ref FROM shipments WHERE status = 'IN_TRANSIT' AND eta < '2026-11-15'
\`\`\`

## Hints
1. a
2. b
3. c
`;

/** NORMAL + title_en, columns, "## Task" and an EN block. */
const NORMAL_BI = NORMAL
  .replace('title: Cảng châu Âu\n', 'title: Cảng châu Âu\ntitle_en: European ports\ncolumns: [port]\n')
  .replace('Dòng thứ hai.\n', 'Dòng thứ hai.\n\n## Task\nLấy mã cảng.\n') + `
# EN
Please list the ports in \`Europe\`.

## Task
Return the port codes.

## Hints
1. Hint one
2. Hint two
3. Hint three
`;

const BOSS_BI = BOSS
  .replace('title: Lô đi Rotterdam\n', 'title: Lô đi Rotterdam\ntitle_en: Shipments to Rotterdam\ncolumns: [[ref], [ref]]\n')
  .replace('  answer: 0\n', '  answer: 0\nconclusion_en:\n  question: Which column do you filter on?\n  options: [status, eta]\n') + `
# EN
Intro.

## Step 1: In transit
List the shipments.

## Step 2: Arriving soon
Add a condition.

## Hints
1. a
2. b
3. c
`;

/** NORMAL with {{region}} templates and two variants. */
const VARIANT = NORMAL
  .replace('tables: [ports]\n', 'tables: [ports]\nvariants:\n  - { region: Europe }\n  - { region: Asia }\n')
  .replace('`Europe`', '`{{region}}`')
  .replace("region = 'Europe'", "region = '{{region}}'");

describe('parseTicket', () => {
  it('ticket thường', () => {
    const t = parseTicket(NORMAL, 'x.md');
    expect(t).toMatchObject({
      id: 'ch1-02', chapter: 1, title: 'Cảng châu Âu', from: { name: 'Hoàng Khánh', dept: 'Ops' },
      difficulty: 1, beat: 'develop', requires: ['select'], grants: ['where'], tables: ['ports'], ordered: false,
      hints: ['Gợi ý một', 'Gợi ý hai', 'Gợi ý ba'], task: '',
    });
    expect(t.body).toBe('Lọc giúp mình các cảng ở `Europe`.\n\nDòng thứ hai.');
    expect(t.steps).toEqual([{ title: '', prompt: '', solution: "SELECT code FROM ports WHERE region = 'Europe'" }]);
    expect(t.conclusion).toBeUndefined();
    expect(t.en).toBeUndefined();
  });

  it('boss ticket có nhiều bước và kết luận', () => {
    const t = parseTicket(BOSS, 'b.md');
    expect(t.ordered).toBe(true);
    expect(t.steps.map((s) => s.title)).toEqual(['Đang trên đường', 'Sắp cập cảng']);
    expect(t.steps[1].prompt).toBe('Thêm điều kiện.');
    expect(t.conclusion).toEqual({ question: 'Lọc theo cột nào?', options: ['status', 'eta'], answer: 0 });
  });

  it('chấp nhận xuống dòng CRLF', () => {
    expect(parseTicket(NORMAL.replace(/\n/g, '\r\n'), 'crlf.md').hints).toHaveLength(3);
    expect(parseTicket(NORMAL_BI.replace(/\n/g, '\r\n'), 'crlf.md').en?.hints).toHaveLength(3);
  });

  it('báo lỗi khi thiếu frontmatter, thiếu solution, sai beat, boss thiếu kết luận, mục lạ', () => {
    expect(() => parseTicket('no frontmatter', 'a.md')).toThrow(/a\.md/);
    expect(() => parseTicket(NORMAL.replace(/## Solution[\s\S]*$/, ''), 'b.md')).toThrow(/b\.md/);
    expect(() => parseTicket(NORMAL.replace('beat: develop', 'beat: party'), 'c.md')).toThrow(/beat/);
    expect(() => parseTicket(BOSS.replace(/conclusion:[\s\S]*?answer: 0\n/, ''), 'd.md')).toThrow(/conclusion/);
    expect(() => parseTicket(NORMAL.replace('3. Gợi ý ba\n', ''), 'e.md')).toThrow(/3 hints/);
    expect(() => parseTicket(NORMAL.replace('## Hints', '## Gợi ý'), 'f.md')).toThrow(/mục lạ/);
  });
});

describe('song ngữ (# EN), ## Task, columns, starter', () => {
  it('ticket thường: VI ở trường gốc, EN trong en', () => {
    const t = parseTicket(NORMAL_BI, 'bi.md');
    expect(t.body).toBe('Lọc giúp mình các cảng ở `Europe`.\n\nDòng thứ hai.');
    expect(t.task).toBe('Lấy mã cảng.');
    expect(t.steps[0].columns).toEqual(['port']);
    expect(t.en).toEqual({
      title: 'European ports', body: 'Please list the ports in `Europe`.', task: 'Return the port codes.',
      hints: ['Hint one', 'Hint two', 'Hint three'], steps: [{ title: '', prompt: '' }],
    });
  });

  it('textOf: EN có thì dùng EN; thiếu EN thì trả VI và fallback', () => {
    const bi = parseTicket(NORMAL_BI, 'bi.md');
    expect(textOf(bi, 'en')).toMatchObject({ title: 'European ports', task: 'Return the port codes.', fallback: false });
    expect(textOf(bi, 'vi')).toMatchObject({ title: 'Cảng châu Âu', task: 'Lấy mã cảng.', fallback: false });
    expect(textOf(parseTicket(NORMAL, 'x.md'), 'en')).toMatchObject({ title: 'Cảng châu Âu', fallback: true });
  });

  it('boss: EN có cùng các bước, conclusion_en dùng chung answer', () => {
    const t = parseTicket(BOSS_BI, 'boss.md');
    expect(t.steps.map((s) => s.columns)).toEqual([['ref'], ['ref']]);
    expect(t.en?.steps).toEqual([{ title: 'In transit', prompt: 'List the shipments.' }, { title: 'Arriving soon', prompt: 'Add a condition.' }]);
    expect(textOf(t, 'en').conclusion).toEqual({ question: 'Which column do you filter on?', options: ['status', 'eta'] });
    expect(textOf(t, 'vi').conclusion).toEqual({ question: 'Lọc theo cột nào?', options: ['status', 'eta'] });
  });

  it('starter là chuỗi SQL', () => {
    const teach = NORMAL.replace('beat: develop', 'beat: teach').replace('tables: [ports]\n', 'tables: [ports]\nstarter: SELECT * FROM ports\n');
    expect(parseTicket(teach, 't.md').starter).toBe('SELECT * FROM ports');
    expect(() => parseTicket(teach.replace('starter: SELECT * FROM ports', 'starter: [1]'), 'd.md')).toThrow(/starter/);
  });

  it('báo lỗi định dạng song ngữ và columns', () => {
    const bad = (src: string) => () => parseTicket(src, 'bad.md');
    expect(bad(`${NORMAL_BI}\n# EN\nx\n`)).toThrow(/một khối/);
    expect(bad(NORMAL_BI.replace('3. Hint three\n', '3. Hint three\n\n## Solution\n```sql\nSELECT 1\n```\n'))).toThrow(/SQL dùng chung/);
    expect(bad(NORMAL_BI.replace('3. Hint three\n', ''))).toThrow(/EN cần đúng 3 hints/);
    expect(bad(NORMAL_BI.replace('title_en: European ports\n', ''))).toThrow(/title_en/);
    expect(bad(NORMAL_BI.replace('## Task\nReturn the port codes.\n', ''))).toThrow(/Task/);
    expect(bad(NORMAL.replace('title: Cảng châu Âu\n', 'title: Cảng châu Âu\ntitle_en: x\n'))).toThrow(/# EN/);
    expect(bad(BOSS_BI.replace('## Step 2: Arriving soon\nAdd a condition.\n', ''))).toThrow(/Step N/);
    expect(bad(BOSS_BI.replace(/(conclusion_en:\n.*\n  options:) \[status, eta\]/, '$1 [status]'))).toThrow(/conclusion_en/);
    expect(bad(BOSS_BI.replace('columns: [[ref], [ref]]', 'columns: [[ref]]'))).toThrow(/columns/);
    expect(bad(NORMAL_BI.replace('columns: [port]', 'columns: port'))).toThrow(/columns/);
  });
});

describe('variants', () => {
  it('đọc biến thể; giá trị số thành chuỗi', () => {
    expect(parseTicket(VARIANT, 'v.md').variants).toEqual([{ region: 'Europe' }, { region: 'Asia' }]);
    const numeric = VARIANT.replace('{ region: Europe }', '{ region: 2026 }');
    expect(parseTicket(numeric, 'v.md').variants?.[0]).toEqual({ region: '2026' });
  });

  it('báo lỗi biến thể', () => {
    const bad = (src: string) => () => parseTicket(src, 'v.md');
    expect(bad(VARIANT.replace('  - { region: Asia }\n', ''))).toThrow(/2–4/);
    expect(bad(VARIANT.replace('{ region: Asia }', '{ area: Asia }'))).toThrow(/variants\[1\].*region/);
    expect(bad(VARIANT.replace('{ region: Asia }', '{ region: Asia, extra: x }'))).toThrow(/variants\[1\]/);
    expect(bad(VARIANT.replace('{ region: Asia }', `{ region: "Asia'" }`))).toThrow(/variants\[1\]\.region/);
    expect(bad(VARIANT.replace(/variants:\n(.*\n){2}/, ''))).toThrow(/\{\{region\}\} nhưng không có variants/);
    expect(bad(BOSS.replace('ordered: true\n', 'ordered: true\nvariants:\n  - { a: x }\n  - { a: y }\n'))).toThrow(/boss không có variants/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/tickets.test.ts`
Expected: FAIL — không resolve được `../src/tickets`.

- [ ] **Step 3: Viết `src/tickets.ts`**

```ts
import { parse as parseYaml } from 'yaml';

export type Lang = 'vi' | 'en';
export type Beat = 'teach' | 'develop' | 'twist' | 'rest' | 'boss';
export interface Step {
  title: string;
  prompt: string;
  solution: string;
  /** Expected result column labels from `columns:` (shape card only; the grader compares by position). */
  columns?: string[];
}
export interface Conclusion { question: string; options: string[]; answer: number }
/** Player-facing text in one language. `steps` runs parallel to Ticket.steps. */
export interface TicketText {
  title: string;
  body: string;
  task: string;
  hints: string[];
  steps: { title: string; prompt: string }[];
  conclusion?: { question: string; options: string[] };
}
/** Values for the {{name}} templates. variants[0] is the version used in the main path. */
export type Variant = Record<string, string>;
export interface Ticket {
  id: string;
  chapter: number;
  /** VI text lives in the top-level fields; EN in `en`. */
  title: string;
  from: { name: string; dept: string };
  difficulty: number;
  beat: Beat;
  requires: string[];
  grants: string[];
  tables: string[];
  ordered: boolean;
  body: string;
  /** "## Task" section: the concrete request. '' when the ticket has none. */
  task: string;
  hints: string[];
  /** Normal tickets: exactly one step with empty title/prompt. Boss: 2+ steps. */
  steps: Step[];
  conclusion?: Conclusion;
  /** SQL preloaded into an empty editor (spec: ch1-01). */
  starter?: string;
  variants?: Variant[];
  en?: TicketText;
}

const BEATS: Beat[] = ['teach', 'develop', 'twist', 'rest', 'boss'];
const FM_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const EN_RE = /^# EN[ \t]*$/m;
const SQL_RE = /```sql\n([\s\S]*?)```/;
const VAR_RE = /\{\{(\w+)\}\}/g;
const VARIANT_VALUE_RE = /^[\w .:/-]{1,40}$/;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

interface Sections { body: string; task: string; hints: string[]; steps: Step[] }

/** VI part: steps carry ```sql. EN part: same headings, never ```sql (SQL is shared). */
function parseSections(part: string, fail: (msg: string) => never, lang: Lang): Sections {
  const [body, ...sections] = part.split(/^## /m);
  const out: Sections = { body: body.trim(), task: '', hints: [], steps: [] };
  for (const sec of sections) {
    const nl = sec.indexOf('\n');
    const heading = (nl === -1 ? sec : sec.slice(0, nl)).trim();
    const content = nl === -1 ? '' : sec.slice(nl + 1);
    if (heading === 'Task') {
      out.task = content.trim();
    } else if (heading === 'Hints') {
      for (const line of content.split('\n')) {
        const h = /^\d+\.\s+(.*)$/.exec(line.trim());
        if (h) out.hints.push(h[1]);
      }
    } else if (heading === 'Solution' || /^Step \d+:/.test(heading)) {
      const sql = SQL_RE.exec(content);
      if (lang === 'en' && (sql || heading === 'Solution')) fail('khối # EN không được chứa ```sql hay "## Solution" — SQL dùng chung');
      if (lang === 'vi' && !sql) fail(`mục "${heading}" thiếu khối \`\`\`sql`);
      out.steps.push({
        title: heading === 'Solution' ? '' : heading.replace(/^Step \d+:\s*/, ''),
        prompt: heading === 'Solution' ? '' : content.replace(SQL_RE, '').trim(),
        solution: sql ? sql[1].trim() : '',
      });
    } else {
      fail(`mục lạ "## ${heading}"`);
    }
  }
  return out;
}

/** Every {{name}} used anywhere in the ticket's text, SQL and labels. */
function templateNames(t: Ticket): Set<string> {
  const texts = (x: TicketText) => [x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
    ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : [])];
  const all = [
    ...texts(textOf(t, 'vi')),
    ...(t.en ? texts(t.en) : []),
    ...t.steps.flatMap((s) => [s.solution, ...(s.columns ?? [])]),
    t.starter ?? '',
  ];
  return new Set(all.flatMap((s) => [...s.matchAll(VAR_RE)].map((m) => m[1])));
}

export function parseTicket(source: string, origin: string): Ticket {
  const fail = (msg: string): never => {
    throw new Error(`${origin}: ${msg}`);
  };
  const m = FM_RE.exec(source.replace(/\r\n/g, '\n'));
  if (!m) return fail('thiếu frontmatter ---');
  const fm = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  const [viPart, enPart, extra] = m[2].split(EN_RE);
  if (extra !== undefined) fail('chỉ được một khối "# EN"');
  const vi = parseSections(viPart, fail, 'vi');

  const from = fm.from as { name?: unknown; dept?: unknown } | undefined;
  const beat = fm.beat as Beat;
  const t: Ticket = {
    id: typeof fm.id === 'string' ? fm.id : fail('thiếu id'),
    chapter: typeof fm.chapter === 'number' ? fm.chapter : fail('thiếu chapter'),
    title: typeof fm.title === 'string' ? fm.title : fail('thiếu title'),
    from: typeof from?.name === 'string' && typeof from?.dept === 'string' ? { name: from.name, dept: from.dept } : fail('thiếu from.name/from.dept'),
    difficulty: typeof fm.difficulty === 'number' && fm.difficulty >= 1 && fm.difficulty <= 5 ? fm.difficulty : fail('difficulty phải từ 1 đến 5'),
    beat: BEATS.includes(beat) ? beat : fail(`beat phải là một trong ${BEATS.join(', ')}`),
    requires: strings(fm.requires),
    grants: strings(fm.grants),
    tables: strings(fm.tables),
    ordered: fm.ordered === true,
    body: vi.body,
    task: vi.task,
    hints: vi.hints,
    steps: vi.steps,
  };

  if (t.hints.length !== 3) fail('cần đúng 3 hints');
  if (t.beat === 'boss') {
    const c = fm.conclusion as Partial<Conclusion> | undefined;
    if (!c || typeof c.question !== 'string' || !Array.isArray(c.options) || typeof c.answer !== 'number' || c.answer < 0 || c.answer >= c.options.length) {
      fail('boss cần conclusion { question, options, answer } hợp lệ');
    }
    t.conclusion = { question: c!.question!, options: c!.options!.map(String), answer: c!.answer! };
    if (t.steps.length < 2 || t.steps.some((s) => s.title === '')) fail('boss cần ≥ 2 mục "## Step N: ..." và không có "## Solution"');
  } else if (t.steps.length !== 1 || t.steps[0].title !== '') {
    fail('ticket thường cần đúng một mục "## Solution"');
  }

  if (fm.columns !== undefined) {
    // Normal ticket: one list of labels. Boss: one list per step.
    const lists = t.beat === 'boss' ? fm.columns : [fm.columns];
    const ok = Array.isArray(lists) && lists.length === t.steps.length
      && lists.every((l) => Array.isArray(l) && l.length > 0 && l.every((c) => typeof c === 'string' && c.trim() !== ''));
    if (!ok) fail('columns: ticket thường là danh sách nhãn cột; boss là danh sách nhãn cột cho từng bước');
    (lists as string[][]).forEach((l, i) => (t.steps[i].columns = l));
  }

  if (fm.starter !== undefined) {
    if (typeof fm.starter !== 'string') fail('starter phải là chuỗi SQL');
    t.starter = (fm.starter as string).trim();
  }

  if (enPart !== undefined) {
    const en = parseSections(enPart, fail, 'en');
    if (typeof fm.title_en !== 'string') fail('khối # EN cần title_en');
    if (en.hints.length !== 3) fail('khối # EN cần đúng 3 hints');
    if ((en.task === '') !== (t.task === '')) fail('"## Task" phải có ở cả VI và EN');
    if (t.beat === 'boss' ? en.steps.length !== t.steps.length || en.steps.some((s) => s.title === '') : en.steps.length !== 0) {
      fail('khối # EN phải có cùng các mục "## Step N: ..." với bản VI');
    }
    t.en = {
      title: fm.title_en as string,
      body: en.body,
      task: en.task,
      hints: en.hints,
      steps: t.beat === 'boss' ? en.steps.map((s) => ({ title: s.title, prompt: s.prompt })) : [{ title: '', prompt: '' }],
    };
    if (t.conclusion) {
      const c = fm.conclusion_en as { question?: unknown; options?: unknown } | undefined;
      if (!c || typeof c.question !== 'string' || !Array.isArray(c.options) || c.options.length !== t.conclusion.options.length) {
        fail('boss cần conclusion_en { question, options } cùng số lựa chọn với conclusion');
      }
      t.en.conclusion = { question: c!.question as string, options: (c!.options as unknown[]).map(String) };
    }
  } else if (fm.title_en !== undefined || fm.conclusion_en !== undefined) {
    fail('title_en/conclusion_en cần khối "# EN"');
  }

  const names = [...templateNames(t)].sort();
  if (fm.variants !== undefined) {
    const vs = fm.variants;
    if (t.beat === 'boss') fail('boss không có variants');
    if (!Array.isArray(vs) || vs.length < 2 || vs.length > 4) fail('variants cần 2–4 biến thể');
    t.variants = (vs as unknown[]).map((v, i) => {
      if (!v || typeof v !== 'object' || Array.isArray(v)) fail(`variants[${i}] phải là bảng { tên: giá trị }`);
      const out: Variant = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        const s = typeof x === 'number' ? String(x) : x;
        if (typeof s !== 'string' || !VARIANT_VALUE_RE.test(s)) fail(`variants[${i}].${k}: giá trị phải khớp ${VARIANT_VALUE_RE}`);
        out[k] = s as string;
      }
      if (Object.keys(out).sort().join() !== names.join()) fail(`variants[${i}] phải có đúng các khóa: ${names.join(', ')}`);
      return out;
    });
  } else if (names.length) {
    fail(`dùng {{${names[0]}}} nhưng không có variants`);
  }
  return t;
}

/** Text in `lang`. A ticket without "# EN" falls back to VI with fallback = true (UI labels it). */
export function textOf(t: Ticket, lang: Lang): TicketText & { fallback: boolean } {
  if (lang === 'en' && t.en) return { ...t.en, fallback: false };
  return {
    title: t.title,
    body: t.body,
    task: t.task,
    hints: t.hints,
    steps: t.steps.map((s) => ({ title: s.title, prompt: s.prompt })),
    ...(t.conclusion ? { conclusion: { question: t.conclusion.question, options: t.conclusion.options } } : {}),
    fallback: lang === 'en',
  };
}

export const byOrder = (a: Ticket, b: Ticket): number => a.chapter - b.chapter || a.id.localeCompare(b.id);
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/tickets.test.ts && npx tsc --noEmit`
Expected: 11 test PASS; `tsc` không lỗi.

- [ ] **Step 5: Commit**

```bash
git add src/tickets.ts tests/tickets.test.ts
git commit -m "feat: bilingual markdown ticket parser"
```

---

### Task 5: Tiến trình chơi, kỹ năng/chương và kiểm tra nội dung

Bỏ `CHAPTER_TITLES` khỏi code. Tiêu đề chương, mục tiêu chương (outcomes) và thẻ kỹ năng là **dữ liệu nội dung**, nằm trong `content/skills.yml` và `content/chapters.yml`, có VI/EN. `progress.ts` nạp hai file này lúc build (`?raw`) và `contentProblems` kiểm chúng cùng với ticket.

Phạm vi trong Plan 1: `skills.yml` chỉ có 11 kỹ năng của chương 1–3; `chapters.yml` có tiêu đề cả 7 chương nhưng chỉ chương 1–3 có outcomes. Plan 2/3 thêm kỹ năng và outcomes của chương 4–7 **trước** khi viết ticket chương đó. Luật "mỗi kỹ năng được dạy đúng 1 lần" chỉ áp cho kỹ năng thuộc chương đã có ticket, để Task 7–9 viết từng chương mà test vẫn xanh.

Luật `contentProblems` (rỗng = hợp lệ):
1. Như cũ: trùng id; `requires` phải được ticket trước đó `grants` (soft-lock); `tables` phải đã mở ở chương đó; nhịp teach → … → rest → boss, đúng một boss.
2. Mọi id trong `requires`/`grants` có trong `skills.yml`.
3. Mỗi kỹ năng (thuộc chương đã có ticket) được `grants` đúng 1 lần, và ticket grant nằm đúng chương ghi trong `skills.yml`.
4. Outcome của chương N chỉ dùng kỹ năng có trong `skills.yml` và thuộc chương ≤ N.
5. Mỗi kỹ năng có đủ thẻ: `label`, `when`, `trap` có cả vi/en, và có `syntax`. Mỗi chương có tiêu đề vi/en; mỗi outcome có vi/en.
6. Chương nào có ticket thì phải có trong `chapters.yml`.
7. (D4) Mọi kỹ năng mà ticket twist của chương `grants` phải nằm trong `requires` của boss cùng chương. Hệ quả cho Task 7–9: `ch1-05` cần thêm `limit`, `ch2-05` cần `having`, `ch3-05` cần `left_join` và `anti_join` (bước 3 của boss).

**Files:**
- Create: `content/skills.yml`, `content/chapters.yml`, `src/progress.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Consumes: `Ticket`, `Beat`, `Lang` (Task 4)
- Produces:
  - `interface Bilingual { vi: string; en: string }`
  - `interface Skill { id: string; chapter: number; label: Bilingual; syntax: string; when: Bilingual; trap: Bilingual }`
  - `interface Outcome extends Bilingual { skills: string[] }`, `interface Chapter { chapter: number; title: Bilingual; outcomes: Outcome[] }`
  - `parseSkills(source: string, origin?: string): Skill[]`, `parseChapters(source: string, origin?: string): Chapter[]` — throw khi sai cấu trúc (không phải danh sách, thiếu id/chapter, trùng id kỹ năng); thẻ thiếu chữ thì để `contentProblems` báo
  - `SKILLS: Skill[]`, `CHAPTERS: Chapter[]` — nạp từ `content/skills.yml`, `content/chapters.yml`
  - `chapterTitle(chapter: number, lang: Lang): string` — `''` nếu không có
  - `CHAPTER_TABLES: Record<number, string[]>`, `tablesUnlocked(chapter: number): string[]`
  - `nextTicket(tickets: Ticket[], completed: Set<string>): Ticket | undefined` — `tickets` đã sắp theo `byOrder`; tiến trình tuyến tính
  - `visibleTickets(tickets: Ticket[], completed: Set<string>): Ticket[]` — đã xong + ticket kế tiếp
  - `currentChapter(tickets: Ticket[], completed: Set<string>): number`
  - `xpFor(ticket: Ticket, hintsUsed: number): number` — `difficulty × 100 × (1 − 0.25 × min(hints, 3))`
  - `contentProblems(tickets: Ticket[], skills: Skill[] = SKILLS, chapters: Chapter[] = CHAPTERS): string[]` — rỗng = hợp lệ

- [ ] **Step 1: Tạo `content/skills.yml` và `content/chapters.yml`**

`content/skills.yml`:
```yaml
# Danh mục kỹ năng. id là khóa dùng trong requires/grants của ticket.
# Mỗi kỹ năng được đúng một ticket grant, ở đúng chương ghi ở đây.
# Thẻ kỹ năng (syntax/when/trap) hiện trong Sổ tay; tổng cộng ≤ 6 dòng.
# Kỹ năng chương 4–6 thêm vào đây TRƯỚC khi viết ticket của chương đó (Plan 2/3).
# Mọi chuỗi đặt trong nháy kép (dấu phẩy trong { … } sẽ cắt chuỗi nếu không có nháy).

- id: select
  chapter: 1
  label: { vi: "Chọn cột", en: "Select columns" }
  syntax: "SELECT code, name FROM ports"
  when: { vi: "Chỉ lấy những cột cần cho câu hỏi.", en: "Pull only the columns the question needs." }
  trap: { vi: "SELECT * kéo cả cột thừa và làm sai số cột khi nộp.", en: "SELECT * drags in extra columns and fails the column count." }

- id: where
  chapter: 1
  label: { vi: "Lọc dòng", en: "Filter rows" }
  syntax: "WHERE region = 'Europe' AND kind IN ('SEAPORT', 'AIRPORT')"
  when: { vi: "Giữ lại các dòng thỏa điều kiện.", en: "Keep only the rows that match a condition." }
  trap: { vi: "Chuỗi dùng nháy đơn, nháy kép là tên cột. Trộn AND với OR thì đặt ngoặc.", en: "Strings take single quotes, double quotes mean a column name. Mixing AND with OR needs parentheses." }

- id: order_by
  chapter: 1
  label: { vi: "Sắp xếp và phá hòa", en: "Sort with a tie-break" }
  syntax: "ORDER BY gross_weight_kg DESC, ref"
  when: { vi: "Đề yêu cầu thứ tự hoặc xếp hạng.", en: "The question asks for an order or a ranking." }
  trap: { vi: "Thiếu cột phá hòa thì các dòng bằng nhau có thể đổi chỗ.", en: "Without a tie-break column, equal rows can come back in any order." }

- id: limit
  chapter: 1
  label: { vi: "Lấy top N", en: "Top N" }
  syntax: "ORDER BY gross_weight_kg DESC, ref LIMIT 5"
  when: { vi: "Chỉ cần N dòng đầu sau khi sắp xếp.", en: "You only need the first N rows after sorting." }
  trap: { vi: "LIMIT không có ORDER BY trả về N dòng bất kỳ.", en: "LIMIT without ORDER BY returns any N rows." }

- id: aggregate
  chapter: 2
  label: { vi: "COUNT/SUM/AVG/MIN/MAX, ROUND", en: "COUNT/SUM/AVG/MIN/MAX, ROUND" }
  syntax: "SELECT count(*), ROUND(AVG(gross_weight_kg), 2) FROM shipments"
  when: { vi: "Gộp nhiều dòng thành một con số.", en: "Collapse many rows into one number." }
  trap: { vi: "count(cột) bỏ qua NULL, còn count(*) đếm mọi dòng.", en: "count(column) skips NULLs, count(*) counts every row." }

- id: group_by
  chapter: 2
  label: { vi: "Nhóm theo chiều", en: "Group by" }
  syntax: "SELECT carrier_id, count(*) FROM shipments GROUP BY carrier_id"
  when: { vi: "Cần một con số cho mỗi hãng tàu, mỗi tháng, mỗi khách.", en: "You need one number per carrier, month or customer." }
  trap: { vi: "Cột trong SELECT không nằm trong hàm gộp thì phải có trong GROUP BY.", en: "Every SELECT column outside an aggregate must be in GROUP BY." }

- id: having
  chapter: 2
  label: { vi: "Lọc nhóm", en: "Filter groups" }
  syntax: "GROUP BY customer_id HAVING count(*) >= 100"
  when: { vi: "Lọc theo kết quả của hàm gộp.", en: "Filter on the result of an aggregate." }
  trap: { vi: "WHERE lọc dòng trước khi nhóm, HAVING lọc nhóm sau khi gộp.", en: "WHERE filters rows before grouping, HAVING filters groups after." }

- id: join
  chapter: 3
  label: { vi: "Nối 2 bảng", en: "Inner join" }
  syntax: "FROM shipments s JOIN customers c ON c.id = s.customer_id"
  when: { vi: "Cần cột của bảng khác qua khóa ngoại.", en: "You need columns from another table through a foreign key." }
  trap: { vi: "Thiếu hoặc sai ON thì số dòng bị nhân lên.", en: "A missing or wrong ON multiplies the rows." }

- id: multi_join
  chapter: 3
  label: { vi: "Nối nhiều bảng", en: "Multi-table join" }
  syntax: "FROM containers k JOIN shipments s ON s.id = k.shipment_id JOIN carriers r ON r.id = s.carrier_id"
  when: { vi: "Dữ liệu cần nằm cách nhau từ 2 khóa ngoại trở lên.", en: "The data you need is two or more foreign keys apart." }
  trap: { vi: "Mỗi JOIN cần ON riêng. Dùng alias để biết cột thuộc bảng nào.", en: "Every JOIN needs its own ON. Use aliases to tell columns apart." }

- id: left_join
  chapter: 3
  label: { vi: "Giữ dòng không khớp", en: "Left join" }
  syntax: "FROM customers c LEFT JOIN shipments s ON s.customer_id = c.id"
  when: { vi: "Phải giữ mọi dòng bên trái, kể cả dòng không có cặp.", en: "Keep every left-hand row, even without a match." }
  trap: { vi: "Điều kiện trên bảng bên phải đặt ở WHERE sẽ biến LEFT JOIN thành JOIN thường. Đặt nó vào ON.", en: "A WHERE condition on the right-hand table turns it back into an inner join. Put it in ON." }

- id: anti_join
  chapter: 3
  label: { vi: "Tìm cái “không có”", en: "Anti-join" }
  syntax: "LEFT JOIN shipments s ON s.customer_id = c.id WHERE s.id IS NULL"
  when: { vi: "Tìm khách không book, cảng không có lô hàng…", en: "Find customers with no bookings, ports with no shipments…" }
  trap: { vi: "NOT IN trên danh sách có NULL trả về rỗng. Dùng LEFT JOIN … IS NULL hoặc NOT EXISTS.", en: "NOT IN over a list containing NULL returns nothing. Use LEFT JOIN … IS NULL or NOT EXISTS." }
```

`content/chapters.yml`:
```yaml
# Tiêu đề chương và mục tiêu "sau chương này bạn có thể…".
# Outcome được tick khi mọi kỹ năng trong skills đã học; chỉ dùng kỹ năng của chương này hoặc chương trước.
# Outcome chương 4–7 thêm cùng lúc với kỹ năng của chương đó (Plan 2/3).
# Mọi chuỗi đặt trong nháy kép.

- chapter: 1
  title: { vi: "Tuần thử việc", en: "Probation week" }
  outcomes:
    - { vi: "Lấy đúng cột cần từ một bảng", en: "Pull exactly the columns you need", skills: [select] }
    - { vi: "Lọc lô hàng theo nhiều điều kiện", en: "Filter shipments by several conditions", skills: [where] }
    - { vi: "Xếp hạng có tiêu chí phá hòa và lấy top N", en: "Rank with a tie-break and take the top N", skills: [order_by, limit] }

- chapter: 2
  title: { vi: "Báo cáo sản lượng", en: "Volume reports" }
  outcomes:
    - { vi: "Đếm, tính tổng và trung bình cho một tập lô hàng", en: "Count, sum and average a set of shipments", skills: [aggregate] }
    - { vi: "Lập báo cáo theo hãng tàu hoặc phương thức", en: "Report by carrier or by mode", skills: [group_by] }
    - { vi: "Lọc nhóm bằng HAVING và phân biệt với WHERE", en: "Filter groups with HAVING and tell it apart from WHERE", skills: [having] }

- chapter: 3
  title: { vi: "Nối dữ liệu", en: "Joining data" }
  outcomes:
    - { vi: "Ghép lô hàng với khách hàng và hãng tàu", en: "Match shipments with customers and carriers", skills: [join] }
    - { vi: "Nối từ 3 bảng trở lên", en: "Join three or more tables", skills: [multi_join] }
    - { vi: "Tìm khách không book bằng LEFT JOIN hoặc anti-join", en: "Find customers who never booked with a LEFT JOIN or an anti-join", skills: [left_join, anti_join] }

- chapter: 4
  title: { vi: "Thời gian & phân loại", en: "Time and classification" }
  outcomes: []

- chapter: 5
  title: { vi: "Câu hỏi nhiều bước", en: "Multi-step questions" }
  outcomes: []

- chapter: 6
  title: { vi: "Xu hướng", en: "Trends" }
  outcomes: []

- chapter: 7
  title: { vi: "Điều tra", en: "Investigation" }
  outcomes: []
```

- [ ] **Step 2: Viết test**

`tests/progress.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import {
  chapterTitle, CHAPTERS, contentProblems, currentChapter, nextTicket, parseChapters, parseSkills, SKILLS,
  tablesUnlocked, visibleTickets, xpFor,
} from '../src/progress';
import type { Beat, Ticket } from '../src/tickets';

const mk = (id: string, beat: Beat, extra: Partial<Ticket> = {}): Ticket => ({
  id, chapter: Number(id[2]), title: id, from: { name: 'A', dept: 'Ops' }, difficulty: 2, beat,
  requires: [], grants: [], tables: ['ports'], ordered: false, body: '', task: '', hints: ['a', 'b', 'c'],
  steps: [{ title: '', prompt: '', solution: 'SELECT 1' }], ...extra,
});

const card = (id: string, chapter: number) => `
- id: ${id}
  chapter: ${chapter}
  label: { vi: "nhãn ${id}", en: "label ${id}" }
  syntax: "SELECT"
  when: { vi: "khi", en: "when" }
  trap: { vi: "bẫy", en: "trap" }`;

// aggregate thuộc chương 2: chưa có ticket chương 2 nên chưa bắt buộc được dạy.
const skills = parseSkills([card('select', 1), card('where', 1), card('order_by', 1), card('aggregate', 2)].join('\n'));
const chapters = parseChapters(`
- chapter: 1
  title: { vi: "Tuần thử việc", en: "Probation week" }
  outcomes:
    - { vi: "Lọc", en: "Filter", skills: [select, where] }
`);

const chapter1 = [
  mk('ch1-01', 'teach', { grants: ['select'] }),
  mk('ch1-02', 'develop', { requires: ['select'], grants: ['where'] }),
  mk('ch1-03', 'twist', { requires: ['select'], grants: ['order_by'] }),
  mk('ch1-04', 'rest'),
  mk('ch1-05', 'boss', { requires: ['where', 'order_by'] }),
];
const problems = (tickets: Ticket[], s = skills, c = chapters) => contentProblems(tickets, s, c);
const swap = (id: string, patch: Partial<Ticket>) => chapter1.map((t) => (t.id === id ? { ...t, ...patch } : t));

describe('tiến trình', () => {
  it('tuyến tính: chỉ thấy ticket đã xong + ticket kế tiếp', () => {
    const done = new Set(['ch1-01']);
    expect(nextTicket(chapter1, done)?.id).toBe('ch1-02');
    expect(visibleTickets(chapter1, done).map((t) => t.id)).toEqual(['ch1-01', 'ch1-02']);
    expect(currentChapter(chapter1, done)).toBe(1);
  });

  it('xong hết thì currentChapter là chương cuối, không còn ticket kế tiếp', () => {
    const done = new Set(chapter1.map((t) => t.id));
    expect(nextTicket(chapter1, done)).toBeUndefined();
    expect(currentChapter(chapter1, done)).toBe(1);
  });

  it('bảng mở dần theo chương', () => {
    expect(tablesUnlocked(1)).toContain('shipments');
    expect(tablesUnlocked(1)).not.toContain('containers');
    expect(tablesUnlocked(2)).toContain('containers');
  });

  it('XP trừ 25% mỗi gợi ý, tối đa 3', () => {
    expect(xpFor(mk('ch1-01', 'teach'), 0)).toBe(200);
    expect(xpFor(mk('ch1-01', 'teach'), 1)).toBe(150);
    expect(xpFor(mk('ch1-01', 'teach'), 9)).toBe(50);
  });
});

describe('skills.yml và chapters.yml', () => {
  it('file thật nạp được, hợp lệ khi chưa có ticket', () => {
    expect(SKILLS.map((s) => s.id)).toEqual(expect.arrayContaining(
      ['select', 'where', 'order_by', 'limit', 'aggregate', 'group_by', 'having', 'join', 'multi_join', 'left_join', 'anti_join'],
    ));
    expect(CHAPTERS.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(contentProblems([])).toEqual([]);
  });

  it('chapterTitle theo ngôn ngữ', () => {
    expect(chapterTitle(1, 'vi')).toBe('Tuần thử việc');
    expect(chapterTitle(1, 'en')).toBe('Probation week');
    expect(chapterTitle(99, 'en')).toBe('');
  });

  it('parseSkills báo lỗi cấu trúc', () => {
    expect(() => parseSkills('a: 1')).toThrow(/danh sách/);
    expect(() => parseSkills(card('select', 1) + card('select', 1))).toThrow(/trùng id "select"/);
    expect(() => parseSkills('- id: x')).toThrow(/chapter/);
  });
});

describe('contentProblems', () => {
  it('chương hợp lệ → không có lỗi', () => {
    expect(problems(chapter1)).toEqual([]);
  });

  it('phát hiện kỹ năng chưa dạy (soft-lock)', () => {
    expect(problems(swap('ch1-02', { requires: ['join'] }))).toContain('ch1-02: cần kỹ năng "join" nhưng chưa ticket nào trước đó dạy');
  });

  it('phát hiện bảng chưa mở', () => {
    expect(problems(swap('ch1-03', { tables: ['containers'] }))).toContain('ch1-03: dùng bảng "containers" chưa mở ở chương 1');
  });

  it('phát hiện sai nhịp chương và trùng id', () => {
    // beats: develop, teach, rest, boss, twist, twist
    const bad = [chapter1[1], chapter1[0], chapter1[3], chapter1[4], chapter1[2], chapter1[2]];
    const p = problems(bad);
    expect(p).toContain('chương 1: ticket đầu phải là teach');
    expect(p).toContain('chương 1: ticket cuối phải là boss');
    expect(p).toContain('chương 1: ngay trước boss phải là rest');
    expect(p).toContain('ch1-03: trùng id');
  });

  it('requires/grants phải có trong skills.yml', () => {
    expect(problems(swap('ch1-02', { grants: ['wher'] }))).toContain('ch1-02: kỹ năng "wher" không có trong skills.yml');
  });

  it('mỗi kỹ năng được dạy đúng 1 lần, đúng chương', () => {
    expect(problems(swap('ch1-04', { grants: ['where'] }))).toContain('kỹ năng "where": được dạy 2 lần, cần đúng 1');
    expect(problems(swap('ch1-02', { grants: [] }))).toContain('kỹ năng "where": được dạy 0 lần, cần đúng 1');
    expect(problems(swap('ch1-04', { grants: ['aggregate'] }))).toContain('ch1-04: dạy "aggregate" nhưng skills.yml ghi chương 2');
  });

  it('outcome chỉ dùng kỹ năng của chương này hoặc trước', () => {
    const late = parseChapters(`
- chapter: 1
  title: { vi: "a", en: "a" }
  outcomes:
    - { vi: "x", en: "x", skills: [aggregate, nope] }
`);
    const p = problems(chapter1, skills, late);
    expect(p).toContain('chương 1: outcome dùng kỹ năng "aggregate" của chương 2');
    expect(p).toContain('chương 1: outcome dùng kỹ năng "nope" không có trong skills.yml');
  });

  it('mỗi kỹ năng có thẻ đủ vi/en; mỗi chương có ticket phải có trong chapters.yml', () => {
    const noCard = parseSkills(`${card('select', 1)}${card('where', 1)}${card('order_by', 1)}\n- id: limit\n  chapter: 1\n  label: { vi: "a", en: "b" }`);
    expect(problems(chapter1, noCard)).toContain('kỹ năng "limit": thiếu nhãn hoặc thẻ (label, syntax, when, trap đủ vi/en)');
    expect(problems(chapter1, skills, [])).toContain('chương 1: thiếu trong chapters.yml');
  });

  it('boss phải kiểm tra kỹ năng của ticket twist', () => {
    expect(problems(swap('ch1-05', { requires: ['where'] })))
      .toContain('ch1-05: boss phải kiểm tra kỹ năng twist "order_by" (thêm vào requires)');
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL — không resolve được `../src/progress`.

- [ ] **Step 4: Viết `src/progress.ts`**

```ts
import { parse as parseYaml } from 'yaml';
import chaptersSource from '../content/chapters.yml?raw';
import skillsSource from '../content/skills.yml?raw';
import type { Lang, Ticket } from './tickets';

export interface Bilingual { vi: string; en: string }
/** A skill and its card (syntax/when/trap, shown in the handbook). */
export interface Skill { id: string; chapter: number; label: Bilingual; syntax: string; when: Bilingual; trap: Bilingual }
/** "After this chapter you can…"; ticked once every skill in `skills` is learned. */
export interface Outcome extends Bilingual { skills: string[] }
export interface Chapter { chapter: number; title: Bilingual; outcomes: Outcome[] }

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
const bilingual = (v: unknown): Bilingual => {
  const o = (v ?? {}) as Record<string, unknown>;
  return { vi: str(o.vi), en: str(o.en) };
};
const list = (source: string, origin: string): Record<string, unknown>[] => {
  const data = parseYaml(source) as unknown;
  if (!Array.isArray(data) || data.some((x) => !x || typeof x !== 'object')) throw new Error(`${origin}: cần một danh sách`);
  return data as Record<string, unknown>[];
};

/** Throws on a broken structure. Empty card fields are reported by contentProblems instead. */
export function parseSkills(source: string, origin = 'skills.yml'): Skill[] {
  const seen = new Set<string>();
  return list(source, origin).map((s, i) => {
    if (typeof s.id !== 'string' || !s.id) throw new Error(`${origin}: mục ${i} thiếu id`);
    if (seen.has(s.id)) throw new Error(`${origin}: trùng id "${s.id}"`);
    seen.add(s.id);
    if (typeof s.chapter !== 'number') throw new Error(`${origin}: "${s.id}" thiếu chapter`);
    return { id: s.id, chapter: s.chapter, label: bilingual(s.label), syntax: str(s.syntax), when: bilingual(s.when), trap: bilingual(s.trap) };
  });
}

export function parseChapters(source: string, origin = 'chapters.yml'): Chapter[] {
  return list(source, origin).map((c, i) => {
    if (typeof c.chapter !== 'number') throw new Error(`${origin}: mục ${i} thiếu chapter`);
    const outcomes = Array.isArray(c.outcomes) ? (c.outcomes as unknown[]) : [];
    return {
      chapter: c.chapter,
      title: bilingual(c.title),
      outcomes: outcomes.map((o) => ({ ...bilingual(o), skills: strings((o as { skills?: unknown } | null)?.skills) })),
    };
  });
}

export const SKILLS: Skill[] = parseSkills(skillsSource);
export const CHAPTERS: Chapter[] = parseChapters(chaptersSource);

export function chapterTitle(chapter: number, lang: Lang): string {
  return CHAPTERS.find((c) => c.chapter === chapter)?.title[lang] ?? '';
}

/** Tables that appear in the schema sidebar from this chapter on (spec §4). The DB always has all of them. */
export const CHAPTER_TABLES: Record<number, string[]> = {
  1: ['ports', 'carriers', 'employees', 'customers', 'shipments'],
  2: ['containers'],
  3: [],
  4: ['shipment_events', 'trucking_orders', 'cfs_receipts', 'customs_declarations', 'hs_codes', 'duties_taxes'],
  5: ['charges', 'invoices', 'payments', 'vendor_bills', 'exchange_rates', 'rate_contracts', 'quotations'],
  6: ['master_bills', 'house_bills', 'incoterms', 'free_time_terms', 'container_events'],
  7: ['claims'],
};

export function tablesUnlocked(chapter: number): string[] {
  return Object.entries(CHAPTER_TABLES)
    .filter(([c]) => Number(c) <= chapter)
    .flatMap(([, tables]) => tables);
}

export function nextTicket(tickets: Ticket[], completed: Set<string>): Ticket | undefined {
  return tickets.find((t) => !completed.has(t.id));
}

export function visibleTickets(tickets: Ticket[], completed: Set<string>): Ticket[] {
  const next = nextTicket(tickets, completed);
  return tickets.filter((t) => completed.has(t.id) || t === next);
}

export function currentChapter(tickets: Ticket[], completed: Set<string>): number {
  return nextTicket(tickets, completed)?.chapter ?? Math.max(1, ...tickets.map((t) => t.chapter));
}

export function xpFor(ticket: Ticket, hintsUsed: number): number {
  return Math.round(ticket.difficulty * 100 * (1 - 0.25 * Math.min(hintsUsed, 3)));
}

/**
 * Soft-lock, pacing and skill-map checks (level-design skill, spec §5). `tickets` must be sorted by byOrder.
 * Skills/outcomes are only required to be granted for chapters that already have tickets,
 * so content can be written chapter by chapter.
 */
export function contentProblems(tickets: Ticket[], skills: Skill[] = SKILLS, chapters: Chapter[] = CHAPTERS): string[] {
  const problems: string[] = [];
  const skillById = new Map(skills.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const granted = new Set<string>();
  const grantCount = new Map<string, number>();
  for (const t of tickets) {
    if (seen.has(t.id)) problems.push(`${t.id}: trùng id`);
    seen.add(t.id);
    for (const skill of [...t.requires, ...t.grants]) {
      if (!skillById.has(skill)) problems.push(`${t.id}: kỹ năng "${skill}" không có trong skills.yml`);
    }
    for (const skill of t.requires) {
      if (!granted.has(skill)) problems.push(`${t.id}: cần kỹ năng "${skill}" nhưng chưa ticket nào trước đó dạy`);
    }
    const open = tablesUnlocked(t.chapter);
    for (const table of t.tables) {
      if (!open.includes(table)) problems.push(`${t.id}: dùng bảng "${table}" chưa mở ở chương ${t.chapter}`);
    }
    for (const skill of t.grants) {
      granted.add(skill);
      grantCount.set(skill, (grantCount.get(skill) ?? 0) + 1);
      const k = skillById.get(skill);
      if (k && k.chapter !== t.chapter) problems.push(`${t.id}: dạy "${skill}" nhưng skills.yml ghi chương ${k.chapter}`);
    }
  }

  const ticketChapters = new Set(tickets.map((t) => t.chapter));
  for (const k of skills) {
    if (!k.syntax || !k.when.vi || !k.when.en || !k.trap.vi || !k.trap.en || !k.label.vi || !k.label.en) {
      problems.push(`kỹ năng "${k.id}": thiếu nhãn hoặc thẻ (label, syntax, when, trap đủ vi/en)`);
    }
    const n = grantCount.get(k.id) ?? 0;
    if (ticketChapters.has(k.chapter) && n !== 1) problems.push(`kỹ năng "${k.id}": được dạy ${n} lần, cần đúng 1`);
  }

  for (const c of chapters) {
    if (!c.title.vi || !c.title.en) problems.push(`chương ${c.chapter}: thiếu tiêu đề vi/en`);
    for (const o of c.outcomes) {
      if (!o.vi || !o.en) problems.push(`chương ${c.chapter}: outcome thiếu vi/en`);
      for (const skill of o.skills) {
        const k = skillById.get(skill);
        if (!k) problems.push(`chương ${c.chapter}: outcome dùng kỹ năng "${skill}" không có trong skills.yml`);
        else if (k.chapter > c.chapter) problems.push(`chương ${c.chapter}: outcome dùng kỹ năng "${skill}" của chương ${k.chapter}`);
      }
    }
  }

  for (const chapter of ticketChapters) {
    const inChapter = tickets.filter((t) => t.chapter === chapter);
    const beats = inChapter.map((t) => t.beat);
    if (!chapters.some((c) => c.chapter === chapter)) problems.push(`chương ${chapter}: thiếu trong chapters.yml`);
    if (beats[0] !== 'teach') problems.push(`chương ${chapter}: ticket đầu phải là teach`);
    if (beats[beats.length - 1] !== 'boss') problems.push(`chương ${chapter}: ticket cuối phải là boss`);
    if (beats[beats.length - 2] !== 'rest') problems.push(`chương ${chapter}: ngay trước boss phải là rest`);
    if (beats.filter((b) => b === 'boss').length !== 1) problems.push(`chương ${chapter}: cần đúng một boss`);
    const boss = inChapter.find((t) => t.beat === 'boss');
    for (const twist of inChapter.filter((t) => t.beat === 'twist')) {
      for (const skill of twist.grants) {
        if (boss && !boss.requires.includes(skill)) problems.push(`${boss.id}: boss phải kiểm tra kỹ năng twist "${skill}" (thêm vào requires)`);
      }
    }
  }
  return problems;
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/progress.test.ts && npx tsc --noEmit`
Expected: 16 test PASS; `tsc` không lỗi.

- [ ] **Step 6: Commit**

```bash
git add content/skills.yml content/chapters.yml src/progress.ts tests/progress.test.ts
git commit -m "feat: progression, skills and chapters content, content checks"
```

---

### Task 6: Lưu tiến độ có version

Save vẫn là **v1** (spec §8). Save v2 (`review`, `practice`, `sandboxDraft`, `bossStep`, `MIGRATIONS[1]`, `tests/fixtures/save-v2.json`) thuộc Plan 1c. Task này chuẩn bị sẵn cho lần nâng đó:
- Lỗi có kiểu, không kèm chữ: `NewerSaveError(version)`, `InvalidSaveError`, và `warning: { kind: 'corrupt' | 'newer'; version? }`. UI dịch.
- `parseSave(raw, known)` nhận cả ticket id lẫn skill id hiện có (skill id dùng từ v2 cho `review`); id không còn tồn tại bị bỏ.
- Trước khi migrate, bản gốc được giữ ở key `cargo-query-save.v<old>` (1 bản mỗi version cũ), để bản build cũ sau khi rollback vẫn đọc được. Save hỏng hoặc mới hơn được chép sang `cargo-query-save.bak`.
- Key chính theo spec §8: `cargo-query-save`.
- `parseSave`/`loadSave` nhận thêm `migrations` và `version` (mặc định `MIGRATIONS`, `SAVE_VERSION`) để test được đường migrate ngay khi `SAVE_VERSION` còn là 1.

**Files:**
- Create: `src/save.ts`, `tests/fixtures/save-v1.json`
- Test: `tests/save.test.ts`

**Interfaces:**
- Produces:
  - `SAVE_VERSION = 1`, `SAVE_KEY = 'cargo-query-save'`, `oldSaveKey(version: number): string` → `'cargo-query-save.v<version>'`
  - `interface Save { version: number; completed: string[]; xp: number; hintsUsed: Record<string, number>; drafts: Record<string, string> }` — key của `drafts` là `"<ticketId>#<stepIndex>"`
  - `interface Known { ticketIds: ReadonlySet<string>; skills: ReadonlySet<string> }` — caller dựng từ `loadTickets()` (Task 7) và `SKILLS` (Task 5)
  - `type KV = Pick<Storage, 'getItem' | 'setItem'>`
  - `class NewerSaveError extends Error { readonly version: number }`, `class InvalidSaveError extends Error` — `message` rỗng
  - `interface SaveWarning { kind: 'corrupt' | 'newer'; version?: number }`
  - `type Migration = (data: Record<string, unknown>, known: Known) => Record<string, unknown>`, `MIGRATIONS: Record<number, Migration>` (key = version cũ)
  - `emptySave(): Save`, `serializeSave(s: Save): string`
  - `parseSave(raw: string, known: Known, migrations?: Record<number, Migration>, version?: number): Save` — throw `InvalidSaveError` / `NewerSaveError`
  - `loadSave(storage: KV | undefined, known: Known, migrations?: Record<number, Migration>, version?: number): { save: Save; warning?: SaveWarning }` — không bao giờ throw
  - `writeSave(storage: KV | undefined, save: Save): boolean`

- [ ] **Step 1: Tạo fixture `tests/fixtures/save-v1.json`**

Đây là mẫu save v1 thật. **Không bao giờ sửa file này**; khi lên v2 thì thêm `save-v2.json` và test migration đọc cả hai.

```json
{
  "version": 1,
  "completed": ["ch1-01", "ch1-02"],
  "xp": 350,
  "hintsUsed": { "ch1-02": 1 },
  "drafts": { "ch1-03#0": "SELECT ref FROM shipments" }
}
```

- [ ] **Step 2: Viết test**

`tests/save.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import v1 from './fixtures/save-v1.json?raw';
import {
  emptySave, InvalidSaveError, loadSave, NewerSaveError, oldSaveKey, parseSave, SAVE_KEY, serializeSave, writeSave,
  type Known, type KV, type Migration,
} from '../src/save';

const known: Known = { ticketIds: new Set(['ch1-01', 'ch1-02', 'ch1-03']), skills: new Set(['select', 'where']) };

function memoryStorage(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('parseSave', () => {
  it('round-trip', () => {
    const s = { ...emptySave(), completed: ['ch1-01'], xp: 100, hintsUsed: { 'ch1-01': 2 }, drafts: { 'ch1-02#0': 'SELECT 1' } };
    expect(parseSave(serializeSave(s), known)).toEqual(s);
  });

  it('đọc được save mẫu v1', () => {
    expect(parseSave(v1, known)).toEqual({
      version: 1, completed: ['ch1-01', 'ch1-02'], xp: 350, hintsUsed: { 'ch1-02': 1 }, drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' },
    });
  });

  it('bỏ ticket không còn tồn tại và giá trị sai kiểu', () => {
    const raw = JSON.stringify({ version: 1, completed: ['ch1-01', 'gone', 7], xp: -5, hintsUsed: { gone: 1, 'ch1-01': 'x' }, drafts: { 'gone#0': 'x' } });
    expect(parseSave(raw, known)).toEqual({ version: 1, completed: ['ch1-01'], xp: 0, hintsUsed: {}, drafts: {} });
  });

  it('save mới hơn → NewerSaveError mang version, không kèm chữ', () => {
    let err: unknown;
    try {
      parseSave(JSON.stringify({ version: 99 }), known);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(NewerSaveError);
    expect((err as NewerSaveError).version).toBe(99);
    expect((err as Error).message).toBe('');
  });

  it('JSON hỏng, không phải object, version sai → InvalidSaveError', () => {
    for (const raw of ['{"version": 1, "compl', 'null', '[]', '"x"', '{"version": 0}', '{"version": "abc"}']) {
      expect(() => parseSave(raw, known), raw).toThrow(InvalidSaveError);
    }
  });

  it('migration chạy tuần tự tới version đích; thiếu migration → InvalidSaveError', () => {
    const migrations: Record<number, Migration> = { 1: (d) => ({ ...d, xp: Number(d.xp) + 1 }) };
    expect(parseSave(v1, known, migrations, 2)).toMatchObject({ version: 2, xp: 351, completed: ['ch1-01', 'ch1-02'] });
    expect(() => parseSave(v1, known, {}, 2)).toThrow(InvalidSaveError);
  });
});

describe('loadSave', () => {
  it('không có save → save rỗng, không cảnh báo', () => {
    expect(loadSave(memoryStorage(), known)).toEqual({ save: emptySave() });
    expect(loadSave(undefined, known)).toEqual({ save: emptySave() });
  });

  it('storage chặn đọc → save rỗng, không throw', () => {
    const blocked: KV = { getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} };
    expect(loadSave(blocked, known)).toEqual({ save: emptySave() });
  });

  it('save hỏng → bắt đầu mới, giữ bản .bak, cảnh báo corrupt', () => {
    const store = memoryStorage({ [SAVE_KEY]: '{"version": 1, "compl' });
    expect(loadSave(store, known)).toEqual({ save: emptySave(), warning: { kind: 'corrupt' } });
    expect(store.data[`${SAVE_KEY}.bak`]).toBe('{"version": 1, "compl');
  });

  it('save mới hơn → cảnh báo newer kèm version, giữ bản .bak', () => {
    const raw = JSON.stringify({ version: 3, completed: [] });
    const store = memoryStorage({ [SAVE_KEY]: raw });
    expect(loadSave(store, known)).toEqual({ save: emptySave(), warning: { kind: 'newer', version: 3 } });
    expect(store.data[`${SAVE_KEY}.bak`]).toBe(raw);
  });

  it('save cũ hơn → giữ nguyên bản cũ ở cargo-query-save.v<old> trước khi migrate', () => {
    const store = memoryStorage({ [SAVE_KEY]: v1 });
    const r = loadSave(store, known, { 1: (d) => d }, 2);
    expect(oldSaveKey(1)).toBe('cargo-query-save.v1');
    expect(store.data['cargo-query-save.v1']).toBe(v1);
    expect(r.save).toMatchObject({ version: 2, completed: ['ch1-01', 'ch1-02'] });
    expect(r.warning).toBeUndefined();
  });

  it('save đúng version hiện tại → không tạo bản .v<old>', () => {
    const store = memoryStorage({ [SAVE_KEY]: v1 });
    loadSave(store, known);
    expect(Object.keys(store.data)).toEqual([SAVE_KEY]);
  });
});

describe('writeSave', () => {
  it('trả false khi storage lỗi hoặc không có', () => {
    const broken: KV = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(writeSave(broken, emptySave())).toBe(false);
    expect(writeSave(undefined, emptySave())).toBe(false);
    expect(writeSave(memoryStorage(), emptySave())).toBe(true);
  });
});
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/save.test.ts`
Expected: FAIL — không resolve được `../src/save`.

- [ ] **Step 4: Viết `src/save.ts`**

```ts
export const SAVE_VERSION = 1;
export const SAVE_KEY = 'cargo-query-save';

export interface Save {
  version: number;
  completed: string[];
  xp: number;
  hintsUsed: Record<string, number>;
  /** Key: "<ticketId>#<stepIndex>". */
  drafts: Record<string, string>;
}

/** Ids that exist in the current content; saved ids not in here are dropped. `skills` is used from v2 (review). */
export interface Known { ticketIds: ReadonlySet<string>; skills: ReadonlySet<string> }
export type KV = Pick<Storage, 'getItem' | 'setItem'>;

// Errors carry no user-facing text: the UI translates them by class / warning.kind.
export class NewerSaveError extends Error {
  name = 'NewerSaveError';
  constructor(readonly version: number) {
    super();
  }
}
export class InvalidSaveError extends Error {
  name = 'InvalidSaveError';
}
export interface SaveWarning { kind: 'corrupt' | 'newer'; version?: number }

export type Migration = (data: Record<string, unknown>, known: Known) => Record<string, unknown>;
/** Key = version migrated FROM. Keep every migration forever; deleting one strands old saves. */
export const MIGRATIONS: Record<number, Migration> = {};

export const emptySave = (): Save => ({ version: SAVE_VERSION, completed: [], xp: 0, hintsUsed: {}, drafts: {} });
export const serializeSave = (s: Save): string => JSON.stringify(s);

/** An old save is kept here (one per old version) before migrating, so a rolled-back build can still read it. */
export const oldSaveKey = (version: number): string => `${SAVE_KEY}.v${version}`;

function readJson(raw: string): Record<string, unknown> {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new InvalidSaveError();
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new InvalidSaveError();
  return data as Record<string, unknown>;
}

function versionOf(data: Record<string, unknown>): number {
  const v = Number(data.version ?? 1);
  if (!Number.isInteger(v) || v < 1) throw new InvalidSaveError();
  return v;
}

const ticketOf = (key: string) => key.split('#')[0];

function pickRecord<T>(v: unknown, ok: (x: unknown) => x is T, ticketIds: ReadonlySet<string>): Record<string, T> {
  const out: Record<string, T> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) if (ticketIds.has(ticketOf(k)) && ok(x)) out[k] = x;
  }
  return out;
}

/**
 * Throws InvalidSaveError (not JSON, bad version, missing migration) or NewerSaveError.
 * `migrations`/`version` let tests exercise the migration path while SAVE_VERSION is 1.
 */
export function parseSave(raw: string, known: Known, migrations = MIGRATIONS, version = SAVE_VERSION): Save {
  let d = readJson(raw);
  let v = versionOf(d);
  if (v > version) throw new NewerSaveError(v);
  while (v < version) {
    const migrate = migrations[v];
    if (!migrate) throw new InvalidSaveError();
    v++;
    d = { ...migrate(d, known), version: v };
  }
  const completed = Array.isArray(d.completed)
    ? d.completed.filter((x): x is string => typeof x === 'string' && known.ticketIds.has(x))
    : [];
  return {
    version,
    completed: [...new Set(completed)],
    xp: typeof d.xp === 'number' && Number.isFinite(d.xp) && d.xp >= 0 ? d.xp : 0,
    hintsUsed: pickRecord(d.hintsUsed, (x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0, known.ticketIds),
    drafts: pickRecord(d.drafts, (x): x is string => typeof x === 'string', known.ticketIds),
  };
}

function keep(storage: KV | undefined, key: string, raw: string): void {
  try {
    storage?.setItem(key, raw);
  } catch {
    /* storage unusable: nothing more we can keep */
  }
}

/**
 * Never throws. Unreadable or newer save → empty save + warning, raw copy kept at SAVE_KEY + '.bak'.
 * Older save → raw copy kept at oldSaveKey(old) before migrating.
 */
export function loadSave(
  storage: KV | undefined,
  known: Known,
  migrations = MIGRATIONS,
  version = SAVE_VERSION,
): { save: Save; warning?: SaveWarning } {
  let raw: string | null;
  try {
    raw = storage?.getItem(SAVE_KEY) ?? null;
  } catch {
    return { save: emptySave() }; // storage blocked: writeSave returns false and the UI says so
  }
  if (!raw) return { save: emptySave() };
  try {
    const old = versionOf(readJson(raw));
    if (old < version) keep(storage, oldSaveKey(old), raw);
    return { save: parseSave(raw, known, migrations, version) };
  } catch (e) {
    keep(storage, `${SAVE_KEY}.bak`, raw);
    const warning: SaveWarning = e instanceof NewerSaveError ? { kind: 'newer', version: e.version } : { kind: 'corrupt' };
    return { save: emptySave(), warning };
  }
}

export function writeSave(storage: KV | undefined, save: Save): boolean {
  try {
    if (!storage) return false;
    storage.setItem(SAVE_KEY, serializeSave(save));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/save.test.ts && npx tsc --noEmit`
Expected: 13 test PASS; `tsc` không lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/save.ts tests/save.test.ts tests/fixtures/save-v1.json
git commit -m "feat: versioned progress save with typed errors and pre-migration backup"
```

---

### Task 7: Nạp nội dung, content lint + ticket chương 1

Ticket viết theo định dạng của Task 4: khối `# EN` ở cuối file với `title_en`/`conclusion_en` (D1), mục `## Task`, `columns:` và `starter:` (D4). `content/skills.yml` (thẻ kỹ năng `label`/`syntax`/`when`/`trap` của 11 kỹ năng chương 1–3) và `content/chapters.yml` (tiêu đề và outcomes chương) **đã được tạo ở Task 5 Step 1**; task này không tạo lại. Test nội dung gọi `contentProblems(tickets)` với hai file đó, nên ticket nào grant/require kỹ năng không có thẻ, dạy sai chương, hoặc boss không kiểm tra kỹ năng twist (D4) đều làm test đỏ.

Content lint (spec §3, amendments B6) nằm trong `tests/content.test.ts`, không thêm công cụ:
- mọi ticket có khối `# EN` (bản phát hành: 0 ticket thiếu EN);
- code span `` `…` `` ở VI và EN giống hệt nhau, tính trên tiêu đề, thân bài, `## Task`, hints, đề từng bước và câu kết luận;
- EN không còn chữ tiếng Việt có dấu (ngoài code span);
- bảng dùng trong Solution phải nằm trong `tables:`. Dùng regex `FROM|JOIN <tên>`, đủ cho Solution không có CTE. `tablesInQuery` của Plan 1b Task 6 (dùng parser) chưa có ở thời điểm này;
- mỗi bước có `columns`, và số nhãn bằng số cột Solution trả về;
- như cũ: không dùng ngày hệ thống, ticket `ordered` có `ORDER BY`, Solution chạy được và có dữ liệu.

Nhãn `columns` là chuỗi trung tính ngôn ngữ (parser Task 4 chỉ nhận chuỗi): tên cột thật (`ref`, `eta`) hoặc tên dạng định danh do tác giả đặt cho cột tính toán (`shipment_count`, `total_teu`). Không dùng tên hàm (`count`, `sum`, `round`) vì lộ đáp án.

`ch1-01`: `starter: SELECT * FROM ports` (editor nạp sẵn khi draft rỗng); gợi ý 1 chỉ tới tab **Cột** ở panel dưới (schema không nằm bên phải). `ch1-05`: `requires` thêm `limit` để thỏa luật twist → boss của Task 5 (`ch1-03` grant `order_by`, `limit`). D4 chỉ đòi bước 3 cho `ch2-05`/`ch3-05`, nên Solution `ch1-05` giữ nguyên.

Kết quả Solution trên seed (đã chạy bằng PGlite 0.5.16 với `src/db/schema.sql` + `src/db/seed.sql`): `ch1-01` 24 dòng × 3 cột, `ch1-02` 3 × 3, `ch1-03` 10 × 2, `ch1-04` 6 × 2, `ch1-05` bước 1 52 × 3, bước 2 22 × 3.

**Files:**
- Create: `src/content.ts`, `content/TEMPLATE.md`
- Create: `content/tickets/ch1/ch1-01.md` … `ch1-05.md`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: `parseTicket`, `textOf`, `byOrder`, `type Ticket`, `type TicketText` (Task 4); `contentProblems`, `CHAPTER_TABLES` (Task 5); `content/skills.yml`, `content/chapters.yml` (Task 5); `runner` (`tests/helpers.ts`)
- Produces:
  - `loadTickets(): Ticket[]` — đã sắp theo `byOrder`
  - `content/TEMPLATE.md` — mẫu ticket hợp lệ, nằm ngoài `content/tickets/` nên game không nạp

- [ ] **Step 1: Viết test nội dung**

`tests/content.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import template from '../content/TEMPLATE.md?raw';
import { loadTickets } from '../src/content';
import { CHAPTER_TABLES, contentProblems } from '../src/progress';
import { parseTicket, textOf, type TicketText } from '../src/tickets';
import { runner } from './helpers';

const tickets = loadTickets();
const steps = tickets.flatMap((t) => t.steps.map((s, i) => ({
  name: `${t.id}#${i}`, ordered: t.ordered, tables: t.tables, sql: s.solution, columns: s.columns,
})));

const ALL_TABLES = Object.values(CHAPTER_TABLES).flat();
const VI_DIACRITIC = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
const codeSpans = (s: string): string[] => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]).sort();
const allText = (x: TicketText): string => [
  x.title, x.body, x.task, ...x.hints, ...x.steps.flatMap((s) => [s.title, s.prompt]),
  ...(x.conclusion ? [x.conclusion.question, ...x.conclusion.options] : []),
].join('\n');
// ponytail: regex over FROM/JOIN is enough for content Solutions (no CTE, no quoted names).
// Swap for tablesInQuery (Plan 1b Task 6, libpg-query) if a Solution ever needs a CTE or subquery in FROM.
const tablesIn = (sql: string): string[] =>
  [...new Set([...sql.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))]
    .filter((x) => ALL_TABLES.includes(x));

describe('nội dung ticket', () => {
  it('có ticket', () => {
    expect(tickets.length).toBeGreaterThan(0);
  });

  it('soft-lock, nhịp chương, kỹ năng và chương hợp lệ', () => {
    expect(contentProblems(tickets)).toEqual([]);
  });

  it('content/TEMPLATE.md là ticket hợp lệ', () => {
    expect(parseTicket(template, 'content/TEMPLATE.md').en).toBeDefined();
  });
});

describe('song ngữ', () => {
  it.each(tickets)('$id: có khối # EN', (t) => {
    expect(t.en).toBeDefined();
  });

  it.each(tickets)('$id: EN giữ nguyên mọi `code span` của VI', (t) => {
    expect(codeSpans(allText(textOf(t, 'en')))).toEqual(codeSpans(allText(textOf(t, 'vi'))));
  });

  it.each(tickets)('$id: EN không còn chữ tiếng Việt có dấu (ngoài code span)', (t) => {
    expect(allText(textOf(t, 'en')).replace(/`[^`]+`/g, '')).not.toMatch(VI_DIACRITIC);
  });
});

describe('Solution', () => {
  it.each(steps)('$name: không dùng ngày hệ thống', ({ sql }) => {
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
  });

  it.each(steps.filter((s) => s.ordered))('$name: ticket ordered phải có ORDER BY', ({ sql }) => {
    expect(sql).toMatch(/order\s+by/i);
  });

  it.each(steps)('$name: bảng dùng trong Solution phải khai trong tables', ({ sql, tables }) => {
    expect(tablesIn(sql).filter((x) => !tables.includes(x))).toEqual([]);
  });

  it.each(steps)('$name: Solution chạy được, có dữ liệu, số nhãn columns bằng số cột', async ({ sql, columns }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
    expect(columns?.length).toBe(r.columns.length);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/content.test.ts`
Expected: FAIL — không resolve được `../content/TEMPLATE.md?raw` và `../src/content`.

- [ ] **Step 3: Viết `src/content.ts`**

```ts
import { byOrder, parseTicket, type Ticket } from './tickets';

const files = import.meta.glob<string>('../content/tickets/**/*.md', { query: '?raw', import: 'default', eager: true });

export function loadTickets(): Ticket[] {
  return Object.entries(files)
    .map(([path, source]) => parseTicket(source, path))
    .sort(byOrder);
}
```

- [ ] **Step 4: Tạo `content/TEMPLATE.md`**

````markdown
---
# Mẫu ticket. Copy vào content/tickets/chN/chN-0M.md rồi sửa. File này nằm ngoài content/tickets/ nên game không nạp.
# Kỹ năng trong requires/grants lấy id từ content/skills.yml. Bảng trong tables phải mở ở chương này (CHAPTER_TABLES).
# Có thứ tự/top-N: đặt ordered: true và nêu tiêu chí phá hòa đầy đủ trong đề.
# Ngày "hôm nay" là 2026-10-31; Solution chỉ dùng ngày cố định.
# Boss: thay "## Solution" bằng "## Step N: <tiêu đề>" (mỗi bước một khối sql), columns là một danh sách cho mỗi bước,
# thêm conclusion { question, options, answer } và conclusion_en { question, options }.
id: ch0-01
chapter: 0
title: Tiêu đề tiếng Việt
title_en: English title
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
columns: [code, name]
---
Bối cảnh: lời nhắn của phòng ban, 1–2 câu.

## Task
Yêu cầu cụ thể: nêu tên cột cần trả về, ví dụ `code`, `name`, và tiêu chí phá hòa nếu có thứ tự.

## Hints
1. Hướng đi.
2. Bảng và cột cần dùng.
3. Khung query, ví dụ `SELECT code, name FROM ports WHERE ...`

## Solution
```sql
SELECT code, name FROM ports WHERE region = 'Europe'
```

# EN
Context: the department's message, 1-2 sentences. Keep every code span exactly as in the VI part.

## Task
The concrete request: name the columns to return, for example `code`, `name`, plus the tie-break if order matters.

## Hints
1. The direction to take.
2. The tables and columns to use.
3. The query skeleton, for example `SELECT code, name FROM ports WHERE ...`
````

- [ ] **Step 5: Tạo 5 ticket chương 1**

`content/tickets/ch1/ch1-01.md`:
````markdown
---
id: ch1-01
chapter: 1
title: Danh sách cảng và sân bay
title_en: Ports and airports
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: teach
requires: []
grants: [select]
tables: [ports]
columns: [code, name, country]
starter: SELECT * FROM ports
---
Chào bạn, chào mừng đến Cargo Query Logistics!

Việc đầu tiên: mình cần danh sách tất cả cảng biển và sân bay công ty đang khai thác.

## Task
Lấy 3 cột: mã (`code`), tên (`name`) và quốc gia (`country`) của mọi dòng trong bảng `ports`.

## Hints
1. Mọi thông tin cảng nằm trong một bảng. Mở tab Cột ở panel bên dưới để xem các bảng và cột của chúng.
2. Editor đã có sẵn `SELECT * FROM ports`, trong đó `*` nghĩa là mọi cột. Thay `*` bằng tên 3 cột, cách nhau bằng dấu phẩy.
3. `SELECT ..., ..., ... FROM ports`

## Solution
```sql
SELECT code, name, country FROM ports
```

# EN
Hi, and welcome to Cargo Query Logistics!

Your first job: I need a list of every seaport and airport the company works with.

## Task
Return 3 columns: the code (`code`), name (`name`) and country (`country`) of every row in the `ports` table.

## Hints
1. All port data sits in one table. Open the Columns tab in the bottom panel to see the tables and their columns.
2. The editor already holds `SELECT * FROM ports`, where `*` means every column. Replace `*` with the 3 column names, separated by commas.
3. `SELECT ..., ..., ... FROM ports`
````

`content/tickets/ch1/ch1-02.md`:
````markdown
---
id: ch1-02
chapter: 1
title: Cảng biển châu Âu
title_en: European seaports
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
columns: [code, name, country]
---
Tuần sau team Ops họp về tuyến châu Âu.

## Task
Lọc các cảng biển (không lấy sân bay) thuộc khu vực `Europe`: mã, tên, quốc gia.

## Hints
1. Bảng `ports` có cột `region` (khu vực) và `kind` (`SEAPORT` hoặc `AIRPORT`).
2. Hai điều kiện cùng lúc thì nối bằng `AND`; giá trị chữ đặt trong nháy đơn, ví dụ `'Europe'`.
3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`

## Solution
```sql
SELECT code, name, country FROM ports WHERE region = 'Europe' AND kind = 'SEAPORT'
```

# EN
Ops has a meeting about the European lanes next week.

## Task
Filter the seaports (no airports) in the `Europe` region: code, name, country.

## Hints
1. The `ports` table has a `region` column and a `kind` column (`SEAPORT` or `AIRPORT`).
2. Join two conditions with `AND`; text values go in single quotes, for example `'Europe'`.
3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`
````

`content/tickets/ch1/ch1-03.md`:
````markdown
---
id: ch1-03
chapter: 1
title: Lô hàng nặng nhất tháng 10
title_en: Heaviest shipments of October
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: twist
requires: [select, where]
grants: [order_by, limit]
tables: [shipments]
ordered: true
columns: [ref, gross_weight_kg]
---
Khách đang hỏi về năng lực xử lý hàng nặng của mình.

## Task
Gửi mình 10 lô xuất khẩu (`EXPORT`) đường biển (`SEA`) nặng nhất, có ngày booking trong tháng 10/2026: mã lô (`ref`) và trọng lượng (`gross_weight_kg`), nặng nhất lên đầu. Nếu bằng cân thì xếp theo `ref` tăng dần.

## Hints
1. Lọc bằng `direction`, `mode` và khoảng `booking_date`; sắp xếp bằng `ORDER BY`, lấy 10 dòng bằng `LIMIT`.
2. Khoảng ngày: `booking_date >= '2026-10-01' AND booking_date < '2026-11-01'`. Giảm dần dùng `DESC`.
3. `SELECT ref, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`

## Solution
```sql
SELECT ref, gross_weight_kg
FROM shipments
WHERE direction = 'EXPORT' AND mode = 'SEA'
  AND booking_date >= '2026-10-01' AND booking_date < '2026-11-01'
ORDER BY gross_weight_kg DESC, ref
LIMIT 10
```

# EN
A customer is asking how well we handle heavy cargo.

## Task
Send me the 10 heaviest sea (`SEA`) export (`EXPORT`) shipments booked in October 2026: shipment ref (`ref`) and weight (`gross_weight_kg`), heaviest first. If two weigh the same, order them by `ref` ascending.

## Hints
1. Filter on `direction`, `mode` and a `booking_date` range; sort with `ORDER BY` and keep 10 rows with `LIMIT`.
2. Date range: `booking_date >= '2026-10-01' AND booking_date < '2026-11-01'`. Descending order uses `DESC`.
3. `SELECT ref, gross_weight_kg FROM shipments WHERE ... ORDER BY gross_weight_kg DESC, ref LIMIT 10`
````

`content/tickets/ch1/ch1-04.md`:
````markdown
---
id: ch1-04
chapter: 1
title: Nhân sự phòng Hải quan
title_en: Customs team
from: { name: Hoàng Ngọc, dept: Customs }
difficulty: 1
beat: rest
requires: [select, where]
grants: []
tables: [employees]
columns: [full_name, title]
---
Phòng Hải quan vừa cập nhật sơ đồ tổ chức.

## Task
Cho mình danh sách nhân viên phòng `Customs`: họ tên (`full_name`) và chức danh (`title`).

## Hints
1. Thông tin nhân viên ở bảng `employees`, phòng ban ở cột `dept`.
2. Giá trị phòng ban là `'Customs'`.
3. `SELECT full_name, title FROM employees WHERE dept = ...`

## Solution
```sql
SELECT full_name, title FROM employees WHERE dept = 'Customs'
```

# EN
Customs has just updated its org chart.

## Task
Give me the list of `Customs` staff: full name (`full_name`) and job title (`title`).

## Hints
1. Staff data is in the `employees` table; the department is in the `dept` column.
2. The department value is `'Customs'`.
3. `SELECT full_name, title FROM employees WHERE dept = ...`
````

`content/tickets/ch1/ch1-05.md`:
````markdown
---
id: ch1-05
chapter: 1
title: Lô hàng đi Rotterdam
title_en: Shipments to Rotterdam
from: { name: Trần An, dept: Management }
difficulty: 2
beat: boss
requires: [select, where, order_by, limit]
grants: []
tables: [shipments]
ordered: true
columns: [[ref, etd, eta], [ref, etd, eta]]
conclusion:
  question: Để chỉ lấy các lô đang trên đường, bạn đã lọc theo cột nào?
  options: [status, eta, booking_date]
  answer: 0
conclusion_en:
  question: To keep only the shipments still on their way, which column did you filter on?
  options: [status, eta, booking_date]
---
Khách lớn ở châu Âu đang hỏi tiến độ. Mình cần nắm các lô đang trên biển tới Rotterdam (mã cảng `NLRTM`).

## Step 1: Các lô đang trên đường
Liệt kê các lô có cảng đích `NLRTM` và trạng thái `IN_TRANSIT`: `ref`, `etd`, `eta`. Sắp xếp theo `eta` rồi `ref` tăng dần.
```sql
SELECT ref, etd, eta
FROM shipments
WHERE pod = 'NLRTM' AND status = 'IN_TRANSIT'
ORDER BY eta, ref
```

## Step 2: Lô sắp cập cảng
Từ danh sách trên, chỉ giữ các lô có `eta` trước ngày 15/11/2026, cùng cột, cùng thứ tự.
```sql
SELECT ref, etd, eta
FROM shipments
WHERE pod = 'NLRTM' AND status = 'IN_TRANSIT' AND eta < '2026-11-15'
ORDER BY eta, ref
```

## Hints
1. Cảng đích là cột `pod`, trạng thái là cột `status`.
2. Bước 2 chỉ cần thêm một điều kiện `eta < '2026-11-15'`.
3. `SELECT ref, etd, eta FROM shipments WHERE pod = ... AND status = ... ORDER BY eta, ref`

# EN
A major European customer wants an update. I need to know which shipments are at sea on their way to Rotterdam (port code `NLRTM`).

## Step 1: Shipments in transit
List the shipments with destination port `NLRTM` and status `IN_TRANSIT`: `ref`, `etd`, `eta`. Order by `eta`, then `ref` ascending.

## Step 2: Arriving soon
From that list, keep only the shipments with an `eta` before 15 November 2026, with the same columns and the same order.

## Hints
1. The destination port is the `pod` column; the status is the `status` column.
2. Step 2 only needs one more condition: `eta < '2026-11-15'`.
3. `SELECT ref, etd, eta FROM shipments WHERE pod = ... AND status = ... ORDER BY eta, ref`
````

- [ ] **Step 6: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/content.test.ts && npx tsc --noEmit`
Expected: 39 test PASS (5 ticket, 6 bước); `tsc` không lỗi. Nếu `contentProblems` báo lỗi, sửa frontmatter ticket, **không** sửa `progress.ts` hay `skills.yml`.

- [ ] **Step 7: Commit**

```bash
git add src/content.ts content/TEMPLATE.md content/tickets/ch1 tests/content.test.ts
git commit -m "feat: content loader, content lint and bilingual chapter 1 tickets"
```

---

### Task 8: Ticket chương 2

Theo D4:
- `ch2-01` dạy cả `AVG` và `ROUND` (Solution thêm cột trọng lượng trung bình; gợi ý 1 nói rõ máy chấm so số sau khi làm tròn 2 chữ số, nên thiếu `ROUND` vẫn đúng). Nhờ vậy bước 2 của boss không giới thiệu hàm mới.
- Boss `ch2-05` có bước 3 dùng `HAVING` (kỹ năng twist của `ch2-03`), và `requires` thêm `having`.

Kết quả Solution trên seed: `ch2-01` 1 dòng × 3 cột (9694 lô, 156524646.12 kg, trung bình 16146.55), `ch2-02` 4 × 3, `ch2-03` 7 × 2, `ch2-04` 1 × 1 (392), `ch2-05` bước 1 4 × 3, bước 2 2 × 2, bước 3 3 × 2 (`40GP`, `40HC`, `40RF`; `20GP` có 5120 TEU bị loại).

**Files:**
- Create: `content/tickets/ch2/ch2-01.md` … `ch2-05.md`
- Test: `tests/content.test.ts` (Task 7, tự nạp file mới)

**Interfaces:**
- Consumes: định dạng ticket (Task 4); `content/skills.yml`, `content/chapters.yml`, `contentProblems` (Task 5); `tests/content.test.ts` (Task 7)
- Produces: 5 ticket chương 2 (`aggregate`, `group_by`, `having`)

- [ ] **Step 1: Tạo 5 ticket**

`content/tickets/ch2/ch2-01.md`:
````markdown
---
id: ch2-01
chapter: 2
title: Tổng kết sản lượng 2025
title_en: 2025 volume summary
from: { name: Nguyễn Quang, dept: Finance }
difficulty: 1
beat: teach
requires: [select, where]
grants: [aggregate]
tables: [shipments]
columns: [shipment_count, total_weight_kg, avg_weight_kg]
---
Kế toán cần số liệu tổng kết năm 2025.

## Task
Với các lô có ngày booking trong năm 2025, không tính lô đã hủy (`CANCELLED`): tổng số lô, tổng trọng lượng (kg) và trọng lượng trung bình mỗi lô, làm tròn 2 chữ số thập phân. Trả về một dòng, ba cột.

## Hints
1. Hàm gộp biến nhiều dòng thành một con số: `COUNT(*)` đếm dòng, `SUM(x)` cộng tổng, `AVG(x)` tính trung bình, `ROUND(x, 2)` làm tròn 2 chữ số. Máy chấm so số sau khi làm tròn 2 chữ số, nên thiếu `ROUND` vẫn được tính đúng.
2. Loại lô hủy bằng `status <> 'CANCELLED'`; năm 2025 là `booking_date >= '2025-01-01' AND booking_date < '2026-01-01'`.
3. `SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2) FROM shipments WHERE ...`

## Solution
```sql
SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
  AND status <> 'CANCELLED'
```

# EN
Accounting needs the year-end figures for 2025.

## Task
For shipments booked in 2025, leaving out cancelled ones (`CANCELLED`): the number of shipments, the total weight (kg) and the average weight per shipment, rounded to 2 decimal places. Return one row with three columns.

## Hints
1. Aggregate functions turn many rows into one number: `COUNT(*)` counts rows, `SUM(x)` adds up, `AVG(x)` averages, `ROUND(x, 2)` rounds to 2 decimals. The grader compares numbers after rounding them to 2 decimals, so an answer without `ROUND` still counts as correct.
2. Leave out cancelled shipments with `status <> 'CANCELLED'`; the year 2025 is `booking_date >= '2025-01-01' AND booking_date < '2026-01-01'`.
3. `SELECT COUNT(*), SUM(gross_weight_kg), ROUND(AVG(gross_weight_kg), 2) FROM shipments WHERE ...`
````

`content/tickets/ch2/ch2-02.md`:
````markdown
---
id: ch2-02
chapter: 2
title: Cơ cấu sản lượng theo phương thức
title_en: Volume mix by mode
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: develop
requires: [aggregate]
grants: [group_by]
tables: [shipments]
columns: [mode, direction, shipment_count]
---
Mình đang làm slide cơ cấu sản lượng năm 2025 cho buổi họp Sales.

## Task
Đếm số lô booking trong năm 2025 (không tính lô hủy) theo từng phương thức (`mode`) và chiều (`direction`). Mỗi tổ hợp mode – direction là một dòng: `mode`, `direction`, số lô.

## Hints
1. `GROUP BY` gom các dòng có cùng giá trị thành một nhóm, hàm gộp tính trên từng nhóm.
2. Gom theo hai cột: `GROUP BY mode, direction`.
3. `SELECT mode, direction, COUNT(*) FROM shipments WHERE ... GROUP BY mode, direction`

## Solution
```sql
SELECT mode, direction, COUNT(*)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
  AND status <> 'CANCELLED'
GROUP BY mode, direction
```

# EN
I am putting together slides on our 2025 volume mix for the Sales meeting.

## Task
Count the shipments booked in 2025 (leaving out cancelled ones) by mode (`mode`) and direction (`direction`). One row per mode – direction pair: `mode`, `direction`, number of shipments.

## Hints
1. `GROUP BY` puts rows with the same values into one group, and the aggregate is computed for each group.
2. Group by two columns: `GROUP BY mode, direction`.
3. `SELECT mode, direction, COUNT(*) FROM shipments WHERE ... GROUP BY mode, direction`
````

`content/tickets/ch2/ch2-03.md`:
````markdown
---
id: ch2-03
chapter: 2
title: Khách hàng chủ lực
title_en: Key accounts
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: twist
requires: [group_by]
grants: [having]
tables: [shipments]
columns: [customer_id, shipment_count]
---
Ban giám đốc muốn biết nhóm khách hàng chủ lực.

## Task
Liệt kê `customer_id` và số lô của những khách có hơn 150 lô booking trong năm 2025 (tính cả lô hủy).

## Hints
1. `WHERE` lọc từng dòng trước khi gom nhóm; muốn lọc theo kết quả sau khi gom thì cần mệnh đề khác.
2. Dùng `HAVING COUNT(*) > 150` đặt sau `GROUP BY`.
3. `SELECT customer_id, COUNT(*) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`

## Solution
```sql
SELECT customer_id, COUNT(*)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
GROUP BY customer_id
HAVING COUNT(*) > 150
```

# EN
The board wants to know who our key accounts are.

## Task
List the `customer_id` and the number of shipments of every customer with more than 150 shipments booked in 2025 (cancelled ones included).

## Hints
1. `WHERE` filters single rows before grouping; to filter on a result computed after grouping you need a different clause.
2. Use `HAVING COUNT(*) > 150`, placed after `GROUP BY`.
3. `SELECT customer_id, COUNT(*) FROM shipments WHERE ... GROUP BY customer_id HAVING ...`
````

`content/tickets/ch2/ch2-04.md`:
````markdown
---
id: ch2-04
chapter: 2
title: Bao nhiêu lô đang trên đường?
title_en: How many shipments are on the way?
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: rest
requires: [aggregate]
grants: []
tables: [shipments]
columns: [shipment_count]
---
Câu nhanh thôi, mình đang cần gấp.

## Task
Hiện có bao nhiêu lô đang ở trạng thái `IN_TRANSIT`?

## Hints
1. Đếm số dòng sau khi lọc.
2. `COUNT(*)` kết hợp `WHERE status = ...`.
3. `SELECT COUNT(*) FROM shipments WHERE status = ...`

## Solution
```sql
SELECT COUNT(*) FROM shipments WHERE status = 'IN_TRANSIT'
```

# EN
Quick one, I need it right away.

## Task
How many shipments are currently in status `IN_TRANSIT`?

## Hints
1. Count the rows that are left after filtering.
2. `COUNT(*)` together with `WHERE status = ...`.
3. `SELECT COUNT(*) FROM shipments WHERE status = ...`
````

`content/tickets/ch2/ch2-05.md`:
````markdown
---
id: ch2-05
chapter: 2
title: Báo cáo container và trọng lượng
title_en: Container and weight report
from: { name: Trần An, dept: Management }
difficulty: 3
beat: boss
requires: [aggregate, group_by, having]
grants: []
tables: [containers, shipments]
columns: [[container_type, container_count, total_teu], [mode, avg_weight_kg], [container_type, total_teu]]
conclusion:
  question: Muốn lọc theo kết quả COUNT(*) sau khi đã gom nhóm, bạn dùng mệnh đề nào?
  options: [WHERE, HAVING, ORDER BY]
  answer: 1
conclusion_en:
  question: To filter on the result of COUNT(*) after grouping, which clause do you use?
  options: [WHERE, HAVING, ORDER BY]
---
Mình chuẩn bị họp với các hãng tàu, cần ba con số.

## Step 1: Container theo loại
Với mỗi loại container (`container_type`): số container và tổng TEU.
```sql
SELECT container_type, COUNT(*), SUM(teu)
FROM containers
GROUP BY container_type
```

## Step 2: Trọng lượng trung bình
Trọng lượng trung bình mỗi lô theo `mode`, chỉ tính các lô booking năm 2025 và không bị hủy, làm tròn 2 chữ số thập phân.
```sql
SELECT mode, ROUND(AVG(gross_weight_kg), 2)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
  AND status <> 'CANCELLED'
GROUP BY mode
```

## Step 3: Loại container chủ lực
Từ bảng ở bước 1, chỉ giữ các loại container có tổng TEU lớn hơn 10000: `container_type` và tổng TEU.
```sql
SELECT container_type, SUM(teu)
FROM containers
GROUP BY container_type
HAVING SUM(teu) > 10000
```

## Hints
1. Bảng `containers` có `container_type` và `teu`; trọng lượng lô ở `shipments.gross_weight_kg`.
2. Trung bình dùng `AVG`, làm tròn dùng `ROUND(..., 2)`. Bước 3 lọc theo tổng sau khi gom nhóm, nên điều kiện nằm ở `HAVING`, không phải `WHERE`.
3. `SELECT container_type, COUNT(*), SUM(...) FROM containers GROUP BY ...`

# EN
I am meeting the carriers soon and need three figures.

## Step 1: Containers by type
For each container type (`container_type`): the number of containers and the total TEU.

## Step 2: Average weight
The average weight per shipment by `mode`, counting only shipments booked in 2025 that were not cancelled, rounded to 2 decimal places.

## Step 3: Main container types
From the step 1 table, keep only the container types with a total TEU above 10000: `container_type` and total TEU.

## Hints
1. The `containers` table has `container_type` and `teu`; the shipment weight is in `shipments.gross_weight_kg`.
2. Averages use `AVG`, rounding uses `ROUND(..., 2)`. Step 3 filters on a total computed after grouping, so the condition goes in `HAVING`, not `WHERE`.
3. `SELECT container_type, COUNT(*), SUM(...) FROM containers GROUP BY ...`
````

- [ ] **Step 2: Chạy test nội dung, xác nhận PASS**

Run: `npx vitest run tests/content.test.ts && npx tsc --noEmit`
Expected: 75 test PASS (10 ticket, 13 bước); `tsc` không lỗi.

- [ ] **Step 3: Commit**

```bash
git add content/tickets/ch2
git commit -m "feat: bilingual chapter 2 tickets (aggregates, GROUP BY, HAVING)"
```

---

### Task 9: Ticket chương 3

Theo D4, boss `ch3-05` có bước 3 dùng `LEFT JOIN … WHERE s.id IS NULL` (kỹ năng twist `left_join`, `anti_join` của `ch3-03`), và `requires` thêm hai kỹ năng đó. Bước 3 dựa vào móc câu chuyện của seed: khách 171–190 ngừng book từ 2026-03-01 (`tests/seed.test.ts` đã khẳng định), nên kết quả đúng 20 dòng, sắp theo `customers.id`.

Kết quả Solution trên seed: `ch3-01` 10 dòng × 3 cột, `ch3-02` 6 × 2, `ch3-03` 20 × 2, `ch3-04` 12 × 2, `ch3-05` bước 1 5 × 2, bước 2 5 × 3, bước 3 20 × 3 (khách 171–190).

**Files:**
- Create: `content/tickets/ch3/ch3-01.md` … `ch3-05.md`
- Test: `tests/content.test.ts` (Task 7)

**Interfaces:**
- Consumes: định dạng ticket (Task 4); `content/skills.yml`, `content/chapters.yml`, `contentProblems` (Task 5); `tests/content.test.ts` (Task 7)
- Produces: 5 ticket chương 3 (`join`, `multi_join`, `left_join`, `anti_join`); tổng cộng 15 ticket, 20 bước

- [ ] **Step 1: Tạo 5 ticket**

`content/tickets/ch3/ch3-01.md`:
````markdown
---
id: ch3-01
chapter: 3
title: Booking mới nhất kèm tên khách
title_en: Latest bookings with customer names
from: { name: Võ Thu, dept: CS }
difficulty: 2
beat: teach
requires: [select, order_by, limit]
grants: [join]
tables: [shipments, customers]
ordered: true
columns: [ref, booking_date, customer_name]
---
CSKH cần xem nhanh các booking mới nhất.

## Task
Lấy 10 lô có ngày booking gần nhất kèm tên khách hàng: `ref`, `booking_date`, tên khách. Ngày mới nhất lên đầu; cùng ngày thì `ref` giảm dần.

## Hints
1. Tên khách nằm ở bảng `customers`; cột `shipments.customer_id` trỏ tới `customers.id`.
2. `FROM shipments s JOIN customers c ON c.id = s.customer_id`
3. `SELECT s.ref, s.booking_date, c.name FROM shipments s JOIN customers c ON ... ORDER BY s.booking_date DESC, s.ref DESC LIMIT 10`

## Solution
```sql
SELECT s.ref, s.booking_date, c.name
FROM shipments s
JOIN customers c ON c.id = s.customer_id
ORDER BY s.booking_date DESC, s.ref DESC
LIMIT 10
```

# EN
Customer service wants a quick look at the latest bookings.

## Task
Get the 10 most recently booked shipments with the customer name: `ref`, `booking_date`, customer name. Newest date first; on the same date, `ref` descending.

## Hints
1. Customer names are in the `customers` table; the `shipments.customer_id` column points to `customers.id`.
2. `FROM shipments s JOIN customers c ON c.id = s.customer_id`
3. `SELECT s.ref, s.booking_date, c.name FROM shipments s JOIN customers c ON ... ORDER BY s.booking_date DESC, s.ref DESC LIMIT 10`
````

`content/tickets/ch3/ch3-02.md`:
````markdown
---
id: ch3-02
chapter: 3
title: TEU theo hãng tàu quý 3
title_en: Q3 TEU by carrier
from: { name: Lê Bình, dept: Sales }
difficulty: 3
beat: develop
requires: [join, group_by]
grants: [multi_join]
tables: [containers, shipments, carriers]
columns: [carrier_name, total_teu]
---
Chuẩn bị đàm phán giá năm sau với các hãng tàu.

## Task
Cho mình tổng TEU theo từng hãng tàu (tên hãng) của các lô có ETD trong quý 3/2026, không tính lô hủy.

## Hints
1. TEU ở `containers`, ETD và trạng thái ở `shipments`, tên hãng ở `carriers`.
2. Nối chuỗi containers → shipments (`shipment_id`) → carriers (`carrier_id`). Quý 3: `etd >= '2026-07-01' AND etd < '2026-10-01'`.
3. `SELECT ca.name, SUM(ct.teu) FROM containers ct JOIN shipments s ON ... JOIN carriers ca ON ... WHERE ... GROUP BY ca.name`

## Solution
```sql
SELECT ca.name, SUM(ct.teu)
FROM containers ct
JOIN shipments s ON s.id = ct.shipment_id
JOIN carriers ca ON ca.id = s.carrier_id
WHERE s.etd >= '2026-07-01' AND s.etd < '2026-10-01'
  AND s.status <> 'CANCELLED'
GROUP BY ca.name
```

# EN
We are getting ready to negotiate next year's rates with the carriers.

## Task
Give me the total TEU per carrier (carrier name) for shipments with an ETD in Q3 2026, leaving out cancelled ones.

## Hints
1. TEU is in `containers`, ETD and status are in `shipments`, carrier names are in `carriers`.
2. Chain containers → shipments (`shipment_id`) → carriers (`carrier_id`). Q3: `etd >= '2026-07-01' AND etd < '2026-10-01'`.
3. `SELECT ca.name, SUM(ct.teu) FROM containers ct JOIN shipments s ON ... JOIN carriers ca ON ... WHERE ... GROUP BY ca.name`
````

`content/tickets/ch3/ch3-03.md`:
````markdown
---
id: ch3-03
chapter: 3
title: Khách lâu không gửi hàng
title_en: Customers who went quiet
from: { name: Võ Thu, dept: CS }
difficulty: 3
beat: twist
requires: [join]
grants: [left_join, anti_join]
tables: [customers, shipments]
columns: [id, name]
---
Một số khách lâu rồi không gửi hàng, CSKH muốn gọi hỏi thăm.

## Task
Liệt kê các khách hàng (`id`, `name`) không có lô nào booking từ ngày 01/03/2026 trở đi.

## Hints
1. `JOIN` thường bỏ mất khách không có lô; `LEFT JOIN` giữ lại mọi khách.
2. Đặt điều kiện ngày vào `ON` của `LEFT JOIN`, rồi giữ những dòng không ghép được: `WHERE s.id IS NULL`.
3. `SELECT c.id, c.name FROM customers c LEFT JOIN shipments s ON s.customer_id = c.id AND ... WHERE s.id IS NULL`

## Solution
```sql
SELECT c.id, c.name
FROM customers c
LEFT JOIN shipments s ON s.customer_id = c.id AND s.booking_date >= '2026-03-01'
WHERE s.id IS NULL
```

# EN
Some customers have not shipped anything in a while, and customer service wants to call them.

## Task
List the customers (`id`, `name`) with no shipment booked on or after 1 March 2026.

## Hints
1. A plain `JOIN` drops customers that have no shipments; `LEFT JOIN` keeps every customer.
2. Put the date condition in the `ON` of the `LEFT JOIN`, then keep the rows that found no match: `WHERE s.id IS NULL`.
3. `SELECT c.id, c.name FROM customers c LEFT JOIN shipments s ON s.customer_id = c.id AND ... WHERE s.id IS NULL`
````

`content/tickets/ch3/ch3-04.md`:
````markdown
---
id: ch3-04
chapter: 3
title: Danh mục khách của từng sales
title_en: Customer portfolio per sales rep
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: rest
requires: [join, group_by]
grants: []
tables: [employees, customers]
columns: [full_name, customer_count]
---
Mình cần cân lại danh mục khách cho team Sales.

## Task
Mỗi nhân viên đang phụ trách ít nhất một khách thì phụ trách bao nhiêu khách hàng? Trả về họ tên nhân viên và số khách; không cần liệt kê nhân viên không có khách nào.

## Hints
1. `customers.sales_rep_id` trỏ tới `employees.id`.
2. Nối hai bảng rồi `GROUP BY` theo nhân viên.
3. `SELECT e.full_name, COUNT(c.id) FROM employees e JOIN customers c ON ... GROUP BY e.id, e.full_name`

## Solution
```sql
SELECT e.full_name, COUNT(c.id)
FROM employees e
JOIN customers c ON c.sales_rep_id = e.id
GROUP BY e.id, e.full_name
```

# EN
I need to rebalance the customer portfolios across the Sales team.

## Task
For each employee who looks after at least one customer, how many customers do they look after? Return the employee's full name and the number of customers; employees without any customer can be left out.

## Hints
1. `customers.sales_rep_id` points to `employees.id`.
2. Join the two tables, then `GROUP BY` the employee.
3. `SELECT e.full_name, COUNT(c.id) FROM employees e JOIN customers c ON ... GROUP BY e.id, e.full_name`
````

`content/tickets/ch3/ch3-05.md`:
````markdown
---
id: ch3-05
chapter: 3
title: Khách hàng lớn nhất 2025
title_en: Biggest customers of 2025
from: { name: Trần An, dept: Management }
difficulty: 3
beat: boss
requires: [multi_join, group_by, order_by, limit, left_join, anti_join]
grants: []
tables: [customers, shipments, containers, employees]
ordered: true
columns: [[customer_name, total_teu], [customer_name, sales_rep, total_teu], [customer_id, customer_name, sales_rep]]
conclusion:
  question: Ở ticket "Khách lâu không gửi hàng", LEFT JOIN ... WHERE s.id IS NULL dùng để làm gì?
  options:
    - Tìm các dòng bên trái không có dòng khớp bên phải
    - Loại bỏ giá trị NULL khỏi kết quả
    - Gộp hai bảng thành một bảng mới
  answer: 0
conclusion_en:
  question: In the "Customers who went quiet" ticket, what does LEFT JOIN ... WHERE s.id IS NULL do?
  options:
    - Find the left-hand rows that have no matching row on the right
    - Remove NULL values from the result
    - Merge two tables into a new table
---
Cuối năm mình gặp riêng các khách lớn nhất cùng sales phụ trách, và nhờ sales gọi lại những khách đã ngừng gửi hàng. Chuẩn bị giúp mình các danh sách.

## Step 1: Top 5 khách theo TEU
5 khách có tổng TEU lớn nhất, tính các lô booking năm 2025 và không bị hủy: tên khách và tổng TEU, lớn nhất lên đầu; bằng nhau thì xếp theo tên khách.
```sql
SELECT c.name, SUM(ct.teu) AS teu
FROM customers c
JOIN shipments s ON s.customer_id = c.id
JOIN containers ct ON ct.shipment_id = s.id
WHERE s.booking_date >= '2025-01-01' AND s.booking_date < '2026-01-01'
  AND s.status <> 'CANCELLED'
GROUP BY c.id, c.name
ORDER BY teu DESC, c.name
LIMIT 5
```

## Step 2: Kèm sales phụ trách
Như bước 1 nhưng thêm họ tên sales phụ trách khách (theo `customers.sales_rep_id`) vào giữa: tên khách, tên sales, tổng TEU.
```sql
SELECT c.name, e.full_name, SUM(ct.teu) AS teu
FROM customers c
JOIN shipments s ON s.customer_id = c.id
JOIN containers ct ON ct.shipment_id = s.id
JOIN employees e ON e.id = c.sales_rep_id
WHERE s.booking_date >= '2025-01-01' AND s.booking_date < '2026-01-01'
  AND s.status <> 'CANCELLED'
GROUP BY c.id, c.name, e.full_name
ORDER BY teu DESC, c.name
LIMIT 5
```

## Step 3: Khách đã ngừng gửi hàng
Các khách không có lô nào booking từ ngày 01/03/2026 trở đi, kèm sales phụ trách: `customers.id`, tên khách, tên sales. Sắp xếp theo `customers.id` tăng dần.
```sql
SELECT c.id, c.name, e.full_name
FROM customers c
JOIN employees e ON e.id = c.sales_rep_id
LEFT JOIN shipments s ON s.customer_id = c.id AND s.booking_date >= '2026-03-01'
WHERE s.id IS NULL
ORDER BY c.id
```

## Hints
1. Nối customers → shipments → containers rồi gom theo khách; bước 3 cần thêm `employees` và một `LEFT JOIN` tới `shipments`.
2. Sắp xếp `ORDER BY teu DESC, c.name` rồi `LIMIT 5`; bước 2 nối thêm `employees`. Bước 3 đặt điều kiện ngày trong `ON` rồi giữ `WHERE s.id IS NULL`.
3. `SELECT c.name, SUM(ct.teu) AS teu FROM customers c JOIN shipments s ON ... JOIN containers ct ON ... WHERE ... GROUP BY c.id, c.name ORDER BY teu DESC, c.name LIMIT 5`

# EN
At year end I meet our biggest customers in person with their sales reps, and I want the reps to call back the customers who stopped shipping. Please prepare the lists for me.

## Step 1: Top 5 customers by TEU
The 5 customers with the highest total TEU, counting shipments booked in 2025 that were not cancelled: customer name and total TEU, largest first; on a tie, order by customer name.

## Step 2: With the sales rep
Same as step 1, but add the full name of the customer's sales rep (from `customers.sales_rep_id`) in the middle: customer name, sales rep name, total TEU.

## Step 3: Customers who stopped shipping
The customers with no shipment booked on or after 1 March 2026, with their sales rep: `customers.id`, customer name, sales rep name. Order by `customers.id` ascending.

## Hints
1. Join customers → shipments → containers, then group by customer; step 3 also needs `employees` and a `LEFT JOIN` to `shipments`.
2. Sort with `ORDER BY teu DESC, c.name`, then `LIMIT 5`; step 2 also joins `employees`. Step 3 puts the date condition in `ON`, then keeps `WHERE s.id IS NULL`.
3. `SELECT c.name, SUM(ct.teu) AS teu FROM customers c JOIN shipments s ON ... JOIN containers ct ON ... WHERE ... GROUP BY c.id, c.name ORDER BY teu DESC, c.name LIMIT 5`
````

- [ ] **Step 2: Chạy toàn bộ test**

Run: `npm test && npx tsc --noEmit`
Expected: tất cả PASS, trong đó `tests/content.test.ts` 115 test (15 ticket, 20 bước); `tsc` không lỗi.

- [ ] **Step 3: Commit**

```bash
git add content/tickets/ch3
git commit -m "feat: bilingual chapter 3 tickets (JOIN, LEFT JOIN, anti-join)"
```

---

### Task 10: Giao diện (tách file, i18n VI/EN, editor, onboarding)

Viết thẳng theo cấu trúc tách (amendments C1): `src/state.ts` giữ trạng thái và selector (không DOM); mỗi vùng màn hình có một module `src/ui/*`; `main.ts` chỉ tạo `DbClient`, nối callback và gắn sự kiện. Quy tắc render:
- `rerender()` (đổi ngôn ngữ, gợi ý, chạy query, đóng ticket) gọi `renderTopbar` + `renderInbox` + `renderBrief` + `work.relabel()`. **Không bao giờ** tạo lại editor.
- `work.setTicket(t, step)` chỉ tạo lại editor khi `ticketId#step` đổi. Con trỏ, vùng chọn và undo được giữ khi bấm Gợi ý, chạy query hay đổi ngôn ngữ.
- Panel dưới chỉ vẽ lại khi cần (`panel.show`/`panel.refresh`): sau Chạy/Nộp, khi đổi ngôn ngữ, khi mở bảng mới.

Các quyết định áp dụng trong task này:
- Nộp đúng thì **ở lại ticket**, hiện thẻ Recap có nút "Ticket tiếp theo →" (C2).
- Tablist theo ARIA, nút tạo một lần, roving tabindex (C3).
- Tab Kết quả đọc `app.lastRun`, có dải "SQL đã thay đổi" (C4).
- Shape card "Kết quả mong đợi" (C6) và tab mặc định (C7).
- Tương phản (C5); app shell + splitter (C8); 3 phím tắt (C9); onboarding + Chạy xếp hàng khi DB chưa sẵn sàng (C10).
- Lỗi biết dạy (C13); editor nâng cấp (C14); lịch sử query (C15); Format SQL (D5).
- i18n (B1–B4) và tiến độ tải theo byte (F4). Khi chunk lười 404 thì hiện thông báo tải lại trang (F8).

Plan 1b đăng ký tab qua `registerTab()` của `src/ui/tabs.ts`. Plan 1c sửa `work.ts`, `brief.ts`, `main.ts` ở các điểm neo có tên rõ ràng: `app.save.drafts[draftKey()]`, `if (!r.ok) {`, `app.save.hintsUsed[tk.id] ?? 0`, `function selectTicket`, `function complete`, `app.stepIndex++`, `const work = mountWork(`. Giữ nguyên các dòng này khi làm task.

**Files:**
- Modify: `package.json` (thêm `@codemirror/lint`, `sql-formatter`), `src/db/client.ts`, `src/db/worker.ts`, `tests/client.test.ts`
- Modify (thay toàn bộ trang smoke của Task 2): `index.html`, `src/main.ts`
- Create: `src/storage.ts`, `src/i18n/index.ts`, `src/i18n/vi.ts`, `src/i18n/en.ts`, `src/history.ts`, `src/shape.ts`, `src/db/loadProgress.ts`, `src/state.ts`, `src/style.css`
- Create: `src/ui/dom.ts`, `src/ui/resultTable.ts`, `src/ui/sqlErrors.ts`, `src/ui/feedback.ts`, `src/ui/editor.ts`, `src/ui/coach.ts`, `src/ui/tabs.ts`, `src/ui/splitter.ts`, `src/ui/topbar.ts`, `src/ui/inbox.ts`, `src/ui/brief.ts`, `src/ui/work.ts`
- Test: `tests/i18n.test.ts`, `tests/history.test.ts`, `tests/shape.test.ts`, `tests/sqlErrors.test.ts`, `tests/loadProgress.test.ts`

**Interfaces:**
- Consumes:
  - Task 1–3 (đã có code): `QueryResult`, `SqlErrorInfo`, `SqlError`, `sqlErrorInfo` (`src/db/run.ts`); `DbClient`, `DbStatus`, `QueryTimeoutError(timeoutMs)`, `DbRestartError`, `DbFailedError(detail)` (`src/db/client.ts`); `grade`, `errorMessage`, `GradeResult` (`src/grader.ts`).
  - Task 4: `Ticket`, `TicketText`, `Beat`, `Lang`, `textOf`.
  - Task 5: `SKILLS`, `chapterTitle`, `currentChapter`, `nextTicket`, `visibleTickets`, `tablesUnlocked`, `xpFor`, `contentProblems`.
  - Task 6: `Save`, `KV`, `Known`, `emptySave`, `loadSave`, `parseSave`, `writeSave`, `serializeSave`, `NewerSaveError`, `InvalidSaveError`.
  - Task 7: `loadTickets`.
  - `runner` (`tests/helpers.ts`).
- Produces:
  - `src/storage.ts`: `localStore(): KV | undefined`, `readJson<T>(key, storage?): T | undefined`, `writeJson(key, value, storage?): boolean` — mọi lỗi storage bị nuốt
  - `src/i18n/index.ts`: `type Lang` (re-export từ `tickets.ts`), `type Key = keyof typeof vi`, `type Params = Record<string, string | number>`, `type Msg = string | ((p: Params) => string)`, `PREFS_KEY = 'cargo-query/prefs'`, `getLang(): Lang`, `locale(): string`, `t(key: Key, p?: Params): string`, `setLang(l: Lang): void`, `applyStatic(root?: ParentNode): void`
  - `src/i18n/vi.ts`: `export const vi = { … } satisfies Record<string, Msg>` (nguồn khóa); `src/i18n/en.ts`: `export const en: Record<Key, Msg> = { … }`. Tiền tố khóa của Plan 1: `app area top db inbox beat brief shape recap coach work hist tab cols res grade err sqlerr save`. Plan 1 chỉ khai `tab.result`, `tab.columns`, `tab.list`, `tab.new`; các khóa `tab.*` còn lại do Plan 1b thêm.
  - `src/history.ts`: `HistoryEntry { sql; at; ok; rows? }`, `History = Record<string, HistoryEntry[]>`, `HISTORY_KEY = 'cargo-query/history'`, `HISTORY_MAX = 15`, `HISTORY_SQL_MAX = 2000`, `pushHistory(h, key, e): History`, `loadHistory(storage): History`, `writeHistory(storage, h): void`
  - `src/shape.ts`: `type Kind = 'text' | 'number' | 'date' | 'bool'`, `kindOf(oid): Kind`, `interface Shape { kinds: Kind[]; rows: number }`, `shapeOf(r: QueryResult): Shape`, `compareShape(expected, actual): { columns; kinds; rows }`
  - `src/db/loadProgress.ts`: `interface LoadProgress { loaded: number; total?: number }`, `countingFetch(base: typeof fetch, report): typeof fetch`
  - `src/db/client.ts` (sửa): worker gửi thêm `{ type: 'progress'; loaded; total? }`; `DbClient.onProgress?: (p: LoadProgress) => void`
  - `src/state.ts`:
    - `interface LastRun { key: string; sql: string; offset: number; result?: QueryResult; error?: unknown; mark?: unknown[] }`, `interface Notice { key: Key; params?: Params; reload?: boolean }`, `interface Column { name; type }`
    - `app = { tickets, save, selectedId, stepIndex, dbStatus, loadProgress, columns, lastRun, conclusionFor, justCompleted, notice, run }`
    - `actions = { rerender, selectTicket(id), complete(ticket), retryDb }` — `main.ts` gán cài đặt thật
    - selector: `done()`, `selected()`, `draftKey()`, `stepKey(ticket, stepIndex)`, `unlockedTables()`
    - `persist(now?)`, `editorSchema(): SQLNamespace`, `expectedShape(solution): Promise<Shape>` (cache theo SQL Solution)
  - `src/ui/dom.ts`: `h()`, `nodes(...children)`, `richText(text)`, `byId(id)`
  - `src/ui/resultTable.ts`: `MAX_ROWS = 500`, `formatCell(v, type?)`, `renderResult(r: QueryResult, mark?: unknown[]): HTMLElement`
  - `src/ui/sqlErrors.ts`: `explainError(e: SqlErrorInfo): Key | undefined` — hàm thuần, chỉ `import type`
  - `src/ui/feedback.ts`: `gradeMessage(r)`, `errorText(e: unknown): string` (dịch mọi lớp lỗi không kèm chữ), `errorView(e: unknown): HTMLElement`
  - `src/ui/editor.ts`:
    - `interface Editor { getValue; runTarget(): { sql; offset }; setValue; setSchema(ns); setLabel; showError(e, offset); clearError; format(): Promise<boolean>; focus; destroy }`
    - `createEditor(parent, opts: { doc; schema: SQLNamespace; label; onChange; onRun; onSubmit; onSelection })`
  - `src/ui/coach.ts`: `COACH_KEY = 'cargo-query/coach-done'`, `type CoachSpot = 'brief' | 'panel' | 'recap' | 'hints'`, `coach(spot): HTMLElement | null`
  - `src/ui/tabs.ts`:
    - `type TabGroup = 'output' | 'query' | 'schema'`
    - `interface TabSpec { id: string; label: Key; group: TabGroup; order: number; newAt?: string; render(host: HTMLElement): void | Promise<void> }`
    - `registerTab(spec)` (gọi trước `createPanel`), `interface Panel { show(id); refresh(); readonly active }`, `createPanel(host): Panel`
    - `registerCoreTabs(editorSql: () => string)` — `result` (output, 10), `columns` (schema, 20)
  - `src/ui/splitter.ts`: `LAYOUT_KEY = 'cargo-query/layout'`, `initLayout(shell, { col, row })`
  - `src/ui/topbar.ts`: `renderTopbar(): void`; `src/ui/inbox.ts`: `renderInbox(): void`
  - `src/ui/brief.ts`: `renderBrief(host: HTMLElement, tk: Ticket, stepIndex: number): void` — vẽ đúng ticket được truyền vào (Plan 1c dùng cho bài luyện tập)
  - `src/ui/work.ts`:
    - `interface WorkDeps { db; panel; onSolved(t); onStepSolved(); onConclusion(t); onRun() }`
    - `interface WorkArea { setTicket(t, stepIndex, force?); relabel(); setSchema(ns); currentSql(); focus() }`, `mountWork(host, deps): WorkArea`
  - `index.html`: các id `chapter`, `xp`, `inbox-btn`, `db-status`, `export-btn`, `import-input`, `map`, `notice`, `shell`, `ticket`, `split-col`, `work`, `split-row`, `panel`, `inbox-dialog`, `inbox-list`, `brief-title` (do `brief.ts` tạo); nút ngôn ngữ `[data-lang="vi"|"en"]`
  - localStorage (đều bọc try/catch, không thuộc Save): `cargo-query/prefs` `{ lang }`, `cargo-query/layout` `{ col, row }`, `cargo-query/coach-done` `true`, `cargo-query/history`

Logic thuần có unit test ở Step 2–5. Phần DOM kiểm thủ công ở Step 10: Vitest chạy Node, không có DOM, và không thêm jsdom.

- [ ] **Step 1: Cài dependency mới (pin exact)**

Run: `npm install --save-exact @codemirror/lint@6.9.8 sql-formatter@15.9.0`
Expected: `package.json` có `"@codemirror/lint": "6.9.8"` và `"sql-formatter": "15.9.0"`. `@codemirror/lint` vốn đã có trong cây (qua `codemirror`); giờ thành dependency trực tiếp vì `editor.ts` import `setDiagnostics`. `sql-formatter` chỉ được tải lười khi bấm Định dạng. Kiểm API khi cài: `node -e "const s=require('sql-formatter');console.log(typeof s.formatDialect, typeof s.postgresql)"` phải in `function object`.

- [ ] **Step 2: Viết test cho phần logic thuần**

`tests/i18n.test.ts` gồm hai kiểm tra B5. Đây là bản duy nhất của test này; Plan 1b/1c chỉ thêm khóa và chạy lại nó:
```ts
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { vi } from '../src/i18n/vi';

/** Keys whose EN text is intentionally the same as VI (SQL keywords, product names). */
const SAME_OK = new Set<string>(['tab.explain', 'top.xp', 'beat.boss']);
const placeholders = (s: string): string => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join();

describe('từ điển i18n', () => {
  it('placeholder {x} của VI và EN khớp nhau (với thông điệp dạng chuỗi)', () => {
    const bad = Object.entries(vi).flatMap(([k, v]) => {
      const e = en[k as keyof typeof en];
      return typeof v === 'string' && typeof e === 'string' && placeholders(v) !== placeholders(e) ? [k] : [];
    });
    expect(bad).toEqual([]);
  });

  it('EN không trùng y hệt VI, trừ SAME_OK', () => {
    const same = Object.entries(vi)
      .filter(([k, v]) => typeof v === 'string' && en[k as keyof typeof en] === v && !SAME_OK.has(k))
      .map(([k]) => k);
    expect(same).toEqual([]);
  });

  it('thông điệp EN dạng hàm xử lý số ít / số nhiều', () => {
    const rows = en['res.rows'] as (p: Record<string, number>) => string;
    expect(rows({ n: 1 })).toBe('Result: 1 row');
    expect(rows({ n: 1234 })).toBe('Result: 1,234 rows');
  });

  it('nhãn EN của tab Cột là "Columns" (gợi ý EN của ch1-01 nhắc đúng chữ này)', () => {
    expect(en['tab.columns']).toBe('Columns');
  });
});
```

`tests/history.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { HISTORY_KEY, HISTORY_MAX, loadHistory, pushHistory, type History } from '../src/history';

const entry = (sql: string) => ({ sql, at: 1, ok: true, rows: 1 });

describe('lịch sử query', () => {
  it('mới nhất ở đầu, bỏ qua khi trùng mục mới nhất', () => {
    let h: History = {};
    h = pushHistory(h, 'ch1-01', entry('SELECT 1'));
    h = pushHistory(h, 'ch1-01', entry('SELECT 2'));
    h = pushHistory(h, 'ch1-01', entry('SELECT 2'));
    expect(h['ch1-01'].map((e) => e.sql)).toEqual(['SELECT 2', 'SELECT 1']);
  });

  it(`giữ tối đa ${HISTORY_MAX} mục mỗi ticket, bỏ SQL quá dài`, () => {
    let h: History = {};
    for (let i = 0; i < 20; i++) h = pushHistory(h, 'ch1-01', entry(`SELECT ${i}`));
    expect(h['ch1-01']).toHaveLength(HISTORY_MAX);
    expect(h['ch1-01'][0].sql).toBe('SELECT 19');
    expect(pushHistory(h, 'ch1-01', entry('x'.repeat(2001)))).toBe(h);
  });

  it('JSON hỏng hoặc storage lỗi → {}', () => {
    const blocked = () => {
      throw new Error('blocked');
    };
    expect(loadHistory({ getItem: () => '{oops', setItem: () => {} })).toEqual({});
    expect(loadHistory({ getItem: blocked, setItem: () => {} })).toEqual({});
    expect(loadHistory(undefined)).toEqual({});
    expect(loadHistory({ getItem: (k) => (k === HISTORY_KEY ? '{"a":[]}' : null), setItem: () => {} })).toEqual({ a: [] });
  });
});
```

`tests/shape.test.ts` (dùng PGlite thật để lấy OID):
```ts
import { describe, expect, it } from 'vitest';
import { compareShape, shapeOf, type Shape } from '../src/shape';
import { runner } from './helpers';

describe('shape card', () => {
  it('loại cột lấy từ OID thật: int và numeric đều là số; không giữ tên cột', async () => {
    const run = await runner();
    const r = await run("SELECT code, count(*), round(avg(length(name)), 2), DATE '2026-10-31', true FROM ports GROUP BY code LIMIT 3");
    const s = shapeOf(r);
    expect(s).toEqual({ kinds: ['text', 'number', 'number', 'date', 'bool'], rows: 3 });
    expect(JSON.stringify(s)).not.toContain('count');
  });

  it('so hình dạng kết quả của người chơi với kết quả mong đợi', () => {
    const exp: Shape = { kinds: ['text', 'number'], rows: 4 };
    expect(compareShape(exp, { kinds: ['text', 'number'], rows: 4 })).toEqual({ columns: true, kinds: true, rows: true });
    expect(compareShape(exp, { kinds: ['text', 'text'], rows: 3 })).toEqual({ columns: true, kinds: false, rows: false });
    expect(compareShape(exp, { kinds: ['text'], rows: 4 })).toEqual({ columns: false, kinds: false, rows: true });
  });
});
```

`tests/sqlErrors.test.ts` chạy SQL sai thật trên PGlite 0.5.16. SQLSTATE và message trong bảng đã đo bằng spike: `"Europe"` → 42703 có position 39; `SELECT 1; SELECT 2` → 42601 không có position; `'31/10/2026'` → 22008; `'abc'` → 22007.
```ts
import { describe, expect, it } from 'vitest';
import { sqlErrorInfo, type SqlErrorInfo } from '../src/db/run';
import { explainError } from '../src/ui/sqlErrors';
import { runner } from './helpers';

// Real PGlite errors: if a new PGlite build changes a message or SQLSTATE, this fails here, not in front of a player.
const CASES: [string, string][] = [
  [`SELECT code FROM ports WHERE region = "Europe"`, 'sqlerr.doubleQuote'],
  ['SELECT cde FROM ports', 'sqlerr.42703'],
  ['SELECT code FROM portz', 'sqlerr.42P01'],
  ['SELECT code FROM ports WHERE', 'sqlerr.42601'],
  ['SELECT customer_id FROM shipments WHERE count(*) > 1 GROUP BY customer_id', 'sqlerr.aggWhere'],
  ['SELECT customer_id, ref FROM shipments GROUP BY customer_id', 'sqlerr.42803'],
  ['SELECT id FROM shipments s JOIN customers c ON c.id = s.customer_id', 'sqlerr.42702'],
  ['SELECT x.ref FROM shipments s', 'sqlerr.missingFrom'],
  [`SELECT ref FROM shipments WHERE eta = '31/10/2026'`, 'sqlerr.date'],
  [`SELECT ref FROM shipments WHERE eta = 'abc'`, 'sqlerr.date'],
  ['SELECT ref FROM shipments WHERE eta = 5', 'sqlerr.42883'],
  ['SELECT 1; SELECT 2', 'sqlerr.multi'],
  ['SELECT 1/0', 'sqlerr.22012'],
];

async function errorOf(sql: string): Promise<SqlErrorInfo> {
  const run = await runner();
  try {
    await run(sql);
  } catch (e) {
    return sqlErrorInfo(e)!;
  }
  throw new Error(`no error: ${sql}`);
}

describe('lỗi biết dạy', () => {
  it.each(CASES)('%s → %s', async (sql, key) => {
    expect(explainError(await errorOf(sql))).toBe(key);
  });

  it('có position để gạch chân (trừ lỗi nhiều câu lệnh)', async () => {
    expect((await errorOf('SELECT cde FROM ports')).position).toBe(8);
    expect((await errorOf('SELECT 1; SELECT 2')).position).toBeUndefined();
  });

  it('lỗi lạ thì không có giải thích', () => {
    expect(explainError({ message: 'something else', code: '99999' })).toBeUndefined();
  });
});
```

`tests/loadProgress.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { countingFetch, type LoadProgress } from '../src/db/loadProgress';

const body = (n: number, headers: Record<string, string> = {}) => new Response(new Uint8Array(n), { headers });

describe('tiến độ tải PGlite theo byte', () => {
  it('đếm byte của .wasm/.data; total = tổng Content-Length khi không nén; giữ Content-Type', async () => {
    const seen: LoadProgress[] = [];
    const f = countingFetch(async () => body(10, { 'content-length': '10', 'content-type': 'application/wasm' }), (p) => seen.push(p));
    const res = await f('https://x/assets/pglite-abc.wasm');
    expect(res.headers.get('content-type')).toBe('application/wasm');
    expect((await res.arrayBuffer()).byteLength).toBe(10);
    expect(seen.at(-1)).toEqual({ loaded: 10, total: 10 });
  });

  it('có Content-Encoding thì total không rõ (Content-Length là số byte nén)', async () => {
    const seen: LoadProgress[] = [];
    const f = countingFetch(async () => body(30, { 'content-length': '12', 'content-encoding': 'gzip' }), (p) => seen.push(p));
    const res = await f(new URL('https://x/pglite.data'));
    expect(res.headers.get('content-encoding')).toBeNull();
    await res.arrayBuffer();
    expect(seen.at(-1)).toEqual({ loaded: 30, total: undefined });
  });

  it('file khác đi thẳng, không đếm', async () => {
    const seen: LoadProgress[] = [];
    const original = body(5);
    const f = countingFetch(async () => original, (p) => seen.push(p));
    expect(await f('https://x/index.js')).toBe(original);
    expect(seen).toEqual([]);
  });
});
```

Thêm vào cuối `describe('DbClient', …)` trong `tests/client.test.ts` (trước dấu `});` cuối file):
```ts
  it('tiến độ tải từ worker đi tới onProgress, không đổi trạng thái', () => {
    const { db, statuses } = client();
    const seen: unknown[] = [];
    db.onProgress = (p) => seen.push(p);
    last().send({ type: 'progress', loaded: 2_100_000, total: 5_400_000 });
    expect(seen).toEqual([{ loaded: 2_100_000, total: 5_400_000 }]);
    expect(statuses).toEqual(['loading']);
  });
```

- [ ] **Step 3: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/i18n.test.ts tests/history.test.ts tests/shape.test.ts tests/sqlErrors.test.ts tests/loadProgress.test.ts tests/client.test.ts`
Expected: FAIL — 5 file mới không resolve được module (`../src/i18n/en`, `../src/history`, `../src/shape`, `../src/ui/sqlErrors`, `../src/db/loadProgress`); `client.test.ts` có 1 test đỏ (`onProgress` không được gọi).

- [ ] **Step 4: Viết module thuần: storage, i18n, lịch sử, shape, tiến độ tải, lỗi biết dạy**

`src/storage.ts` gom try/catch quanh localStorage cho mọi key tiện ích:
```ts
import type { KV } from './save';

/** window.localStorage, or undefined when blocked (private mode, sandboxed iframe) or outside a browser. */
export function localStore(): KV | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Device preferences (not progress): undefined when missing, unreadable or not JSON. */
export function readJson<T>(key: string, storage: KV | undefined = localStore()): T | undefined {
  try {
    const raw = storage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeJson(key: string, value: unknown, storage: KV | undefined = localStore()): boolean {
  try {
    if (!storage) return false;
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
```

`src/i18n/index.ts`. Ngôn ngữ đọc đồng bộ từ `cargo-query/prefs`; chưa có thì lấy theo `navigator.language` (`vi*` → VI, còn lại EN). `t()` định dạng số theo locale của ngôn ngữ đang dùng. Thông điệp dạng hàm nhận params thô, dùng cho số nhiều EN:
```ts
import { readJson, writeJson } from '../storage';
import type { Lang } from '../tickets';
import { en } from './en';
import { vi } from './vi';

export type { Lang };
export type Params = Record<string, string | number>;
/** A function message gets the raw params (EN plurals); a string message gets {x} replaced, numbers in the UI locale. */
export type Msg = string | ((p: Params) => string);
export type Key = keyof typeof vi;

/** Device preference, not progress: never part of Save. */
export const PREFS_KEY = 'cargo-query/prefs';

const DICT: Record<Lang, Record<Key, Msg>> = { vi, en };

function initialLang(): Lang {
  const saved = readJson<{ lang?: unknown }>(PREFS_KEY)?.lang;
  if (saved === 'vi' || saved === 'en') return saved;
  const nav = typeof navigator === 'undefined' ? '' : navigator.language;
  return nav.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

let lang: Lang | undefined;
export const getLang = (): Lang => (lang ??= initialLang());
export const locale = (): string => (getLang() === 'vi' ? 'vi-VN' : 'en-US');

export function t(key: Key, p: Params = {}): string {
  const msg = DICT[getLang()][key];
  if (typeof msg === 'function') return msg(p);
  return msg.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = p[name];
    return v === undefined ? m : typeof v === 'number' ? v.toLocaleString(locale()) : v;
  });
}

/** Static markup: [data-i18n] → textContent, [data-i18n-aria] → aria-label. */
export function applyStatic(root: ParentNode = document): void {
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n]')) el.textContent = t(el.dataset.i18n as Key);
  for (const el of root.querySelectorAll<HTMLElement>('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria as Key));
  document.documentElement.lang = getLang();
}

export function setLang(l: Lang): void {
  lang = l;
  writeJson(PREFS_KEY, { ...readJson<object>(PREFS_KEY), lang: l });
  applyStatic();
}
```

`src/i18n/vi.ts` (nguồn khóa; VI là bản gốc):
```ts
import type { Msg } from './index';

/** Source of keys (VI is the original). Plan 1b/1c add keys here and in en.ts in the same task. */
export const vi = {
  'app.close': 'Đóng',
  'app.dismiss': 'Ẩn thông báo',
  'app.reload': 'Tải lại trang',
  'app.newVersion': 'Có phiên bản mới của game. Tải lại trang để tiếp tục (tiến độ đã được lưu).',
  'area.ticket': 'Đề bài',
  'area.work': 'Trình soạn SQL',
  'area.panel': 'Kết quả và trực quan hóa',
  'area.splitCol': 'Độ rộng cột đề bài',
  'area.splitRow': 'Chiều cao panel kết quả',
  'top.inbox': 'Hộp thư',
  'top.inboxNew': 'Hộp thư ({n} mới)',
  'top.chapter': 'Chương {n}: {title}',
  'top.xp': '★ {n} XP',
  'top.lang': 'Ngôn ngữ',
  'top.map': 'Bản đồ tuyến',
  'top.export': 'Xuất tiến độ',
  'top.import': 'Nhập tiến độ',
  'db.loading': 'Đang khởi tạo database…',
  'db.loadingBytes': 'Đang tải database {loaded}/{total} MB',
  'db.loadingMb': 'Đang tải database {loaded} MB',
  'db.ready': 'Database sẵn sàng',
  'db.retry': 'Thử lại database',
  'inbox.empty': 'Bạn đã xong mọi ticket hiện có.',
  'inbox.done': 'Đã xong',
  'beat.teach': 'Bài mới',
  'beat.develop': 'Luyện',
  'beat.twist': 'Biến tấu',
  'beat.rest': 'Nghỉ nhẹ',
  'beat.boss': 'Boss',
  'brief.chapter': 'Chương {n}',
  'brief.untranslated': 'Chưa có bản tiếng Anh',
  'brief.task': 'Yêu cầu',
  'brief.step': 'Bước {i}/{n}: {title}',
  'brief.hint': 'Gợi ý {i}/{n} (−{cost} XP)',
  'brief.conclusion': 'Kết luận',
  'brief.conclude': 'Chốt kết luận',
  'brief.pickOne': 'Chọn một đáp án.',
  'brief.wrongConclusion': 'Chưa đúng. Xem lại kết quả các bước rồi chọn lại.',
  'shape.title': 'Kết quả mong đợi',
  'shape.cols': '{n} cột',
  'shape.rows': '{n} dòng',
  'shape.ordered': 'có thứ tự (xem tiêu chí trong yêu cầu)',
  'shape.unordered': 'không cần thứ tự',
  'shape.text': 'chữ',
  'shape.number': 'số',
  'shape.date': 'ngày',
  'shape.bool': 'đúng/sai',
  'shape.yours': 'Của bạn: {cols} cột {colsOk} · {rows} dòng {rowsOk}',
  'recap.title': 'Bạn vừa học được',
  'recap.xp': '+{n} XP · đã dùng {hints} gợi ý',
  'recap.learned': 'Kỹ năng mới',
  'recap.review': 'Ôn lại',
  'recap.yours': 'SQL của bạn',
  'recap.reference': 'Cách tham khảo',
  'recap.next': 'Ticket tiếp theo →',
  'recap.allDone': 'Bạn đã hoàn thành mọi ticket hiện có!',
  'coach.brief': 'Đây là yêu cầu từ đồng nghiệp. Đọc xong, bấm Chạy (Ctrl+Enter) để thử query có sẵn.',
  'coach.panel': 'Kết quả hiện ở đây. Tab Cột liệt kê các bảng bạn được dùng. Khi kết quả khớp thẻ "Kết quả mong đợi", bấm Nộp.',
  'coach.recap': 'Mỗi ticket xong mở một kỹ năng và cho bạn xem cách viết tham khảo. Bấm "Ticket tiếp theo" để đi tiếp.',
  'coach.hints': 'Bí thì bấm Gợi ý. Mỗi gợi ý trừ 25% XP của ticket.',
  'coach.ok': 'Hiểu rồi',
  'coach.skip': 'Bỏ qua hướng dẫn',
  'work.editorLabel': 'Trình soạn SQL',
  'work.run': '▶ Chạy (Ctrl+Enter)',
  'work.runSel': '▶ Chạy vùng chọn',
  'work.waitingDb': 'Đang chờ database…',
  'work.format': 'Định dạng (Shift+Alt+F)',
  'work.submit': 'Nộp (Ctrl+Shift+Enter)',
  'work.queued': 'Database đang khởi động. Query sẽ chạy ngay khi sẵn sàng.',
  'work.runFailed': 'Query lỗi, xem chi tiết ở tab Kết quả.',
  'work.formatFailed': 'Không định dạng được: SQL đang có lỗi cú pháp.',
  'work.correct': 'Đúng rồi!',
  'work.stepDone': 'Bước {i} xong. Sang bước tiếp theo.',
  'work.conclusionNext': 'Các bước đều đúng. Chốt kết luận ở khung đề bài.',
  'work.contentBug': 'Lỗi nội dung ticket, hãy báo người soạn: {msg}',
  'hist.title': 'Lịch sử ({n})',
  'hist.rows': '{n} dòng',
  'tab.list': 'Kết quả và trực quan hóa',
  'tab.result': 'Kết quả',
  'tab.columns': 'Cột',
  'tab.new': 'mới',
  'cols.loading': 'Đang tải schema…',
  'res.runFirst': 'Chạy query (Ctrl+Enter) để xem kết quả.',
  'res.stale': 'SQL đã thay đổi — Ctrl+Enter để cập nhật.',
  'res.noTable': 'Câu lệnh đã chạy và được hoàn tác (ROLLBACK). Dữ liệu không đổi, không có kết quả dạng bảng.',
  'res.empty': 'Query chạy được nhưng ra 0 dòng — kiểm tra điều kiện WHERE / JOIN.',
  'res.rows': 'Kết quả: {n} dòng',
  'res.shown': 'Kết quả: {n} dòng (hiển thị {max} dòng đầu)',
  'res.tooBig': 'Kết quả quá lớn: chỉ nhận {n} dòng đầu. Thêm điều kiện lọc hoặc LIMIT.',
  'res.mismatch': 'không khớp',
  'grade.columns': 'Kết quả cần {expected} cột, query của bạn trả về {actual} cột.',
  'grade.order': 'Dữ liệu đúng nhưng thứ tự dòng chưa đúng yêu cầu.',
  'grade.wrongValues': '{n} dòng có giá trị chưa đúng.',
  'grade.missing': 'Thiếu {n} dòng.',
  'grade.extra': 'Thừa {n} dòng.',
  'grade.sample': 'Ví dụ một dòng của bạn không khớp: {row}',
  'err.timeout': 'Query chạy quá {s} giây nên đã bị dừng; database đang nạp lại. Hay gặp nhất: JOIN thiếu ON làm nhân chéo hai bảng.',
  'err.restart': 'Database vừa khởi động lại nên query bị hủy. Chạy lại.',
  'err.dbFailed': 'Không khởi tạo được database.',
  'err.unknown': 'Lỗi không rõ.',
  'sqlerr.42703': 'Cột không tồn tại. Kiểm tra tên cột ở tab Cột. Chuỗi viết trong nháy đơn: \'Europe\'.',
  'sqlerr.42P01': 'Bảng không tồn tại hoặc chưa mở ở chương này. Xem tab Cột.',
  'sqlerr.42803': 'Cột trong SELECT phải nằm trong GROUP BY hoặc trong một hàm gộp (COUNT, SUM…).',
  'sqlerr.42702': 'Hai bảng cùng có cột này. Ghi rõ bảng bằng alias, ví dụ s.id hoặc c.id.',
  'sqlerr.42601': 'Lỗi cú pháp gần chỗ gạch đỏ. Thứ tự viết: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.',
  'sqlerr.42883': 'Đang so sánh hai kiểu khác nhau (ví dụ ngày với số). Viết ngày dạng \'2026-10-01\'.',
  'sqlerr.date': 'Ngày viết dạng năm-tháng-ngày trong nháy đơn: \'2026-10-01\'.',
  'sqlerr.22012': 'Chia cho 0. Dùng NULLIF(x, 0) ở mẫu số.',
  'sqlerr.doubleQuote': 'Nháy kép "…" là tên cột. Giá trị chữ dùng nháy đơn: \'Europe\'.',
  'sqlerr.aggWhere': 'WHERE lọc từng dòng trước khi gom nhóm. Điều kiện trên COUNT/SUM đặt ở HAVING.',
  'sqlerr.missingFrom': 'Alias này chưa được khai báo ở FROM hoặc JOIN.',
  'sqlerr.multi': 'Mỗi lần chỉ chạy được một câu lệnh. Xóa câu thừa, hoặc bôi đen câu muốn chạy rồi bấm Chạy.',
  'save.corrupt': 'Không đọc được tiến độ đã lưu nên bắt đầu lại. Bản cũ được giữ ở khóa "cargo-query-save.bak".',
  'save.newerLoaded': 'Tiến độ đã lưu đến từ phiên bản game mới hơn (v{v}) nên chưa dùng được. Bản đó được giữ ở khóa "cargo-query-save.bak".',
  'save.newer': 'File tiến độ đến từ phiên bản game mới hơn (v{v}).',
  'save.invalid': 'File không phải tiến độ Cargo Query hợp lệ.',
  'save.imported': 'Đã nhập tiến độ.',
  'save.importFailed': 'Không nhập được tiến độ: {reason}',
  'save.writeFailed': 'Không lưu được tiến độ trên trình duyệt này. Hãy dùng "Xuất tiến độ" để giữ lại.',
} satisfies Record<string, Msg>;
```

`src/i18n/en.ts` (`Record<Key, Msg>`, nên thiếu hay thừa khóa thì `tsc` báo lỗi):
```ts
import type { Key, Msg, Params } from './index';

const num = (v: Params[string] | undefined): string => Number(v).toLocaleString('en-US');
/** "1 row" / "2 rows": EN plurals are the reason Msg can be a function. */
const count = (one: string, many: string) => (p: Params): string => `${num(p.n)} ${p.n === 1 ? one : many}`;

export const en: Record<Key, Msg> = {
  'app.close': 'Close',
  'app.dismiss': 'Dismiss',
  'app.reload': 'Reload page',
  'app.newVersion': 'A new version of the game is available. Reload the page to continue (your progress is saved).',
  'area.ticket': 'Ticket brief',
  'area.work': 'SQL editor',
  'area.panel': 'Results and visualizations',
  'area.splitCol': 'Brief column width',
  'area.splitRow': 'Result panel height',
  'top.inbox': 'Inbox',
  'top.inboxNew': 'Inbox ({n} new)',
  'top.chapter': 'Chapter {n}: {title}',
  'top.xp': '★ {n} XP',
  'top.lang': 'Language',
  'top.map': 'Route map',
  'top.export': 'Export progress',
  'top.import': 'Import progress',
  'db.loading': 'Starting the database…',
  'db.loadingBytes': 'Downloading the database {loaded}/{total} MB',
  'db.loadingMb': 'Downloading the database {loaded} MB',
  'db.ready': 'Database ready',
  'db.retry': 'Retry database',
  'inbox.empty': 'You have finished every ticket available.',
  'inbox.done': 'Done',
  'beat.teach': 'New skill',
  'beat.develop': 'Practice',
  'beat.twist': 'Twist',
  'beat.rest': 'Breather',
  'beat.boss': 'Boss',
  'brief.chapter': 'Chapter {n}',
  'brief.untranslated': 'Not translated to English yet',
  'brief.task': 'Task',
  'brief.step': 'Step {i}/{n}: {title}',
  'brief.hint': 'Hint {i}/{n} (−{cost} XP)',
  'brief.conclusion': 'Conclusion',
  'brief.conclude': 'Submit conclusion',
  'brief.pickOne': 'Pick an answer.',
  'brief.wrongConclusion': 'Not quite. Look at the results of each step again, then choose.',
  'shape.title': 'Expected result',
  'shape.cols': count('column', 'columns'),
  'shape.rows': count('row', 'rows'),
  'shape.ordered': 'ordered (see the criteria in the task)',
  'shape.unordered': 'any order',
  'shape.text': 'text',
  'shape.number': 'number',
  'shape.date': 'date',
  'shape.bool': 'true/false',
  'shape.yours': 'Yours: {cols} columns {colsOk} · {rows} rows {rowsOk}',
  'recap.title': 'What you just learned',
  'recap.xp': '+{n} XP · {hints} hints used',
  'recap.learned': 'New skill',
  'recap.review': 'Review',
  'recap.yours': 'Your SQL',
  'recap.reference': 'Reference answer',
  'recap.next': 'Next ticket →',
  'recap.allDone': 'You have finished every ticket available!',
  'coach.brief': 'This is a request from a colleague. Read it, then press Run (Ctrl+Enter) to try the starter query.',
  'coach.panel': 'Results show up here. The Columns tab lists the tables you may use. When your result matches the "Expected result" card, press Submit.',
  'coach.recap': 'Each solved ticket unlocks a skill and shows a reference answer. Press "Next ticket" to move on.',
  'coach.hints': 'Stuck? Press Hint. Each hint costs 25% of the ticket XP.',
  'coach.ok': 'Got it',
  'coach.skip': 'Skip the tour',
  'work.editorLabel': 'SQL editor',
  'work.run': '▶ Run (Ctrl+Enter)',
  'work.runSel': '▶ Run selection',
  'work.waitingDb': 'Waiting for the database…',
  'work.format': 'Format (Shift+Alt+F)',
  'work.submit': 'Submit (Ctrl+Shift+Enter)',
  'work.queued': 'The database is starting. Your query runs as soon as it is ready.',
  'work.runFailed': 'The query failed; see the Result tab.',
  'work.formatFailed': 'Could not format: the SQL has a syntax error.',
  'work.correct': 'Correct!',
  'work.stepDone': 'Step {i} done. On to the next step.',
  'work.conclusionNext': 'All steps are correct. Submit your conclusion in the brief.',
  'work.contentBug': 'Ticket content error, please report it to the author: {msg}',
  'hist.title': 'History ({n})',
  'hist.rows': count('row', 'rows'),
  'tab.list': 'Results and visualizations',
  'tab.result': 'Result',
  'tab.columns': 'Columns',
  'tab.new': 'new',
  'cols.loading': 'Loading the schema…',
  'res.runFirst': 'Run a query (Ctrl+Enter) to see the result.',
  'res.stale': 'The SQL has changed — press Ctrl+Enter to update.',
  'res.noTable': 'The statement ran and was rolled back (ROLLBACK). No data changed and there is no table to show.',
  'res.empty': 'The query ran but returned 0 rows — check your WHERE / JOIN conditions.',
  'res.rows': (p) => `Result: ${count('row', 'rows')(p)}`,
  'res.shown': (p) => `Result: ${num(p.n)} rows (showing the first ${num(p.max)})`,
  'res.tooBig': (p) => `Result too large: only the first ${num(p.n)} rows were kept. Add a filter or a LIMIT.`,
  'res.mismatch': 'no match',
  'grade.columns': (p) => `The result needs ${count('column', 'columns')({ n: p.expected })}; your query returns ${num(p.actual)}.`,
  'grade.order': 'The data is right but the row order is not what the task asks for.',
  'grade.wrongValues': (p) => `${count('row has', 'rows have')(p)} wrong values.`,
  'grade.missing': (p) => `${count('row', 'rows')(p)} missing.`,
  'grade.extra': (p) => `${count('row', 'rows')(p)} too many.`,
  'grade.sample': 'One of your rows that does not match: {row}',
  'err.timeout': 'The query ran longer than {s} seconds and was stopped; the database is reloading. Most common cause: a JOIN without ON that multiplies two tables.',
  'err.restart': 'The database restarted, so the query was cancelled. Run it again.',
  'err.dbFailed': 'The database could not start.',
  'err.unknown': 'Unknown error.',
  'sqlerr.42703': 'That column does not exist. Check the name in the Columns tab. Text values go in single quotes: \'Europe\'.',
  'sqlerr.42P01': 'That table does not exist or is not unlocked in this chapter. See the Columns tab.',
  'sqlerr.42803': 'Every column in SELECT must be in GROUP BY or inside an aggregate function (COUNT, SUM…).',
  'sqlerr.42702': 'Two tables have a column with this name. Say which one with an alias, e.g. s.id or c.id.',
  'sqlerr.42601': 'Syntax error near the red underline. Clause order: SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT.',
  'sqlerr.42883': 'You are comparing two different types (e.g. a date with a number). Write dates as \'2026-10-01\'.',
  'sqlerr.date': 'Write dates as year-month-day in single quotes: \'2026-10-01\'.',
  'sqlerr.22012': 'Division by zero. Use NULLIF(x, 0) in the denominator.',
  'sqlerr.doubleQuote': 'Double quotes "…" name a column. Text values use single quotes: \'Europe\'.',
  'sqlerr.aggWhere': 'WHERE filters single rows before grouping. Conditions on COUNT/SUM go in HAVING.',
  'sqlerr.missingFrom': 'This alias is not declared in FROM or JOIN.',
  'sqlerr.multi': 'Only one statement can run at a time. Delete the extra one, or select the statement you want and press Run.',
  'save.corrupt': 'Your saved progress could not be read, so the game starts over. The old copy is kept under the key "cargo-query-save.bak".',
  'save.newerLoaded': 'Your saved progress comes from a newer version of the game (v{v}) and cannot be used yet. It is kept under the key "cargo-query-save.bak".',
  'save.newer': 'This progress file comes from a newer version of the game (v{v}).',
  'save.invalid': 'This file is not a valid Cargo Query progress file.',
  'save.imported': 'Progress imported.',
  'save.importFailed': 'Could not import progress: {reason}',
  'save.writeFailed': 'Progress cannot be saved in this browser. Use "Export progress" to keep it.',
};
```

`src/history.ts`:
```ts
import type { KV } from './save';
import { readJson, writeJson } from './storage';

export interface HistoryEntry { sql: string; at: number; ok: boolean; rows?: number }
/** Key: ticket id (Sandbox keeps no history). Not part of Save: losing it costs nothing. */
export type History = Record<string, HistoryEntry[]>;

export const HISTORY_KEY = 'cargo-query/history';
export const HISTORY_MAX = 15;
export const HISTORY_SQL_MAX = 2000;

/** Newest first. Skips SQL longer than HISTORY_SQL_MAX and a repeat of the newest entry. */
export function pushHistory(h: History, key: string, e: HistoryEntry): History {
  const list = h[key] ?? [];
  if (e.sql.length > HISTORY_SQL_MAX || list[0]?.sql === e.sql) return h;
  return { ...h, [key]: [e, ...list].slice(0, HISTORY_MAX) };
}

export function loadHistory(storage: KV | undefined): History {
  const h = readJson<unknown>(HISTORY_KEY, storage);
  return h && typeof h === 'object' && !Array.isArray(h) ? (h as History) : {};
}

export function writeHistory(storage: KV | undefined, h: History): void {
  writeJson(HISTORY_KEY, h, storage);
}
```

`src/shape.ts`:
```ts
import type { QueryResult } from './db/run';

/** What the shape card shows per column. int and numeric are both 'number' so the card never hints at AVG. */
export type Kind = 'text' | 'number' | 'date' | 'bool';

const NUMBER = new Set([20, 21, 23, 26, 700, 701, 790, 1700]); // int8 int2 int4 oid float4 float8 money numeric
const DATE = new Set([1082, 1083, 1114, 1184, 1266]); // date time timestamp timestamptz timetz

export function kindOf(oid: number): Kind {
  if (oid === 16) return 'bool';
  if (NUMBER.has(oid)) return 'number';
  if (DATE.has(oid)) return 'date';
  return 'text';
}

/** Never carries column names or values: the Solution's names would give the answer away. */
export interface Shape { kinds: Kind[]; rows: number }

export const shapeOf = (r: QueryResult): Shape => ({ kinds: r.types.map(kindOf), rows: r.rows.length });

export function compareShape(expected: Shape, actual: Shape): { columns: boolean; kinds: boolean; rows: boolean } {
  const columns = expected.kinds.length === actual.kinds.length;
  return { columns, kinds: columns && expected.kinds.every((k, i) => k === actual.kinds[i]), rows: expected.rows === actual.rows };
}
```

`src/db/loadProgress.ts`. PGlite tải `.wasm`/`.data` bằng `fetch` toàn cục bên trong worker, nên chỉ cần bọc `fetch` để đếm byte. Hàm này không đổi cách PGlite nạp file:
```ts
/** Bytes of PGlite's .wasm/.data received so far. `total` only when every response so far had an uncompressed Content-Length. */
export interface LoadProgress { loaded: number; total?: number }

const ASSET_RE = /\.(wasm|data)(\?|$)/;

/**
 * Wraps fetch so PGlite's asset downloads report progress. Counts decoded bytes; with gzip/brotli
 * Content-Length is the compressed size, so `total` becomes unknown rather than wrong.
 * Fails open: anything unexpected returns the original response.
 */
export function countingFetch(base: typeof fetch, report: (p: LoadProgress) => void): typeof fetch {
  let loaded = 0;
  let total: number | undefined = 0;
  return async (input, init) => {
    const res = await base(input, init);
    try {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (!ASSET_RE.test(url) || !res.ok || !res.body) return res;
      const length = Number(res.headers.get('content-length'));
      total = total !== undefined && length > 0 && !res.headers.get('content-encoding') ? total + length : undefined;
      const headers = new Headers(res.headers);
      headers.delete('content-length');
      headers.delete('content-encoding'); // the body below is already decoded
      const counter = new TransformStream<Uint8Array, Uint8Array>({
        transform(chunk, controller) {
          loaded += chunk.byteLength;
          report({ loaded, total });
          controller.enqueue(chunk);
        },
      });
      return new Response(res.body.pipeThrough(counter), { status: res.status, statusText: res.statusText, headers });
    } catch {
      return res;
    }
  };
}
```

`src/ui/sqlErrors.ts`. Thứ tự tra: regex trên message cho các ca mà SQLSTATE không phân biệt được (nháy kép quanh giá trị, aggregate trong WHERE, alias chưa khai, nhiều câu lệnh), sau đó tra theo SQLSTATE. File chỉ `import type`, nên chạy được trong Node:
```ts
import type { SqlErrorInfo } from '../db/run';
import type { Key } from '../i18n';

// Cases SQLSTATE alone cannot tell apart; checked first, on Postgres' English message.
const BY_MESSAGE: [RegExp, Key][] = [
  // Unquoted names are folded to lower case, so a name with capitals or spaces was written in "double quotes".
  [/^column "[^"]*[A-Z\s][^"]*" does not exist/, 'sqlerr.doubleQuote'],
  [/^aggregate functions are not allowed in WHERE/, 'sqlerr.aggWhere'],
  [/^missing FROM-clause entry/, 'sqlerr.missingFrom'],
  [/^cannot insert multiple commands/, 'sqlerr.multi'],
];

const BY_CODE: Record<string, Key> = {
  '42703': 'sqlerr.42703',
  '42P01': 'sqlerr.42P01',
  '42803': 'sqlerr.42803',
  '42702': 'sqlerr.42702',
  '42601': 'sqlerr.42601',
  '42883': 'sqlerr.42883',
  '22007': 'sqlerr.date',
  '22008': 'sqlerr.date',
  '22012': 'sqlerr.22012',
};

/** Teaching note shown under Postgres' own message (which is always shown unchanged). */
export function explainError(e: SqlErrorInfo): Key | undefined {
  for (const [re, key] of BY_MESSAGE) if (re.test(e.message)) return key;
  return e.code ? BY_CODE[e.code] : undefined;
}
```

Sửa `src/db/client.ts` (BE đã commit ở Task 2), bốn chỗ:
1. Dòng import đầu file thành:
```ts
import type { LoadProgress } from './loadProgress';
import { SqlError, type QueryResult, type SqlErrorInfo } from './run';
```
2. Trong `type WorkerMessage`, ngay sau dòng `| { type: 'initError'; message: string }` thêm:
```ts
  | ({ type: 'progress' } & LoadProgress)
```
3. Trong `class DbClient`, ngay sau dòng `timings?: DbTimings;` thêm:
```ts
  /** PGlite asset download progress while booting (bytes). */
  onProgress?: (p: LoadProgress) => void;
```
4. Trong `receive()`, giữa nhánh `else if (m.type === 'initError') { … }` và nhánh `else {` cuối thêm:
```ts
    } else if (m.type === 'progress') {
      this.onProgress?.({ loaded: m.loaded, total: m.total });
```

Sửa `src/db/worker.ts`: thêm `import { countingFetch } from './loadProgress';` sau dòng `import { initDb } from './init';`. Ngay trước dòng `const ready = (async () => {` thêm:
```ts
// PGlite fetches its .wasm/.data with the global fetch; count the bytes for the loading status.
globalThis.fetch = countingFetch(fetch.bind(globalThis), (p) => postMessage({ type: 'progress', ...p }));
```

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/i18n.test.ts tests/history.test.ts tests/shape.test.ts tests/sqlErrors.test.ts tests/loadProgress.test.ts tests/client.test.ts && npx tsc --noEmit`
Expected: 36 test PASS (i18n 4, history 3, shape 2, sqlErrors 15, loadProgress 3, client 9); `tsc` không lỗi.

- [ ] **Step 6: Viết `src/state.ts` và các helper giao diện**

`src/state.ts` không có DOM. `actions` để UI gọi ngược về `main.ts` mà không import `main`:
```ts
import type { SQLNamespace } from '@codemirror/lang-sql';
import type { DbStatus } from './db/client';
import type { LoadProgress } from './db/loadProgress';
import type { QueryResult } from './db/run';
import type { Key, Params } from './i18n';
import { currentChapter, tablesUnlocked } from './progress';
import { emptySave, writeSave } from './save';
import { shapeOf, type Shape } from './shape';
import { localStore } from './storage';
import type { Ticket } from './tickets';

export interface LastRun {
  /** stepKey of the ticket step it was run for ('' outside a ticket); the shape card compares only matching runs. */
  key: string;
  sql: string;
  /** Where `sql` starts in the editor (run selection), to place the error underline. */
  offset: number;
  result?: QueryResult;
  /** The thrown error, kept raw so it is translated when drawn (SqlError, QueryTimeoutError…). */
  error?: unknown;
  /** Row of `result` the grader reported as not matching (highlighted in the Result tab). */
  mark?: unknown[];
}

/** A banner under the top bar. Stored as a key so a language switch re-translates it. */
export interface Notice { key: Key; params?: Params; reload?: boolean }

export interface Column { name: string; type: string }

export const app = {
  tickets: [] as Ticket[],
  save: emptySave(),
  selectedId: '',
  stepIndex: 0,
  dbStatus: 'loading' as DbStatus,
  loadProgress: undefined as LoadProgress | undefined,
  columns: {} as Record<string, Column[]>,
  lastRun: undefined as LastRun | undefined,
  /** Boss whose steps are all solved and whose conclusion is open. Not saved: a reload repeats the last step. */
  conclusionFor: '',
  /** Ticket closed just now: its Recap heading takes focus once. */
  justCompleted: '',
  notice: undefined as Notice | undefined,
  /** Runs one statement in the sandbox; main.ts points it at DbClient.run. */
  run: (_sql: string): Promise<QueryResult> => Promise.reject(new Error('DB not started')),
};

/** Implemented in main.ts; UI modules call these instead of importing main. */
export const actions = {
  rerender(): void {},
  selectTicket(_id: string): void {},
  complete(_ticket: Ticket): void {},
  retryDb(): void {},
};

export const done = (): Set<string> => new Set(app.save.completed);
export const selected = (): Ticket => app.tickets.find((x) => x.id === app.selectedId)!;
export const draftKey = (): string => `${app.selectedId}#${app.stepIndex}`;
export const stepKey = (ticket: Ticket, stepIndex: number): string => `${ticket.id}#${stepIndex}`;
export const unlockedTables = (): string[] => tablesUnlocked(currentChapter(app.tickets, done()));

let persistTimer: ReturnType<typeof setTimeout> | undefined;
export function persist(now = false): void {
  clearTimeout(persistTimer);
  const write = () => {
    if (writeSave(localStore(), app.save)) return;
    app.notice = { key: 'save.writeFailed' };
    actions.rerender();
  };
  if (now) write();
  else persistTimer = setTimeout(write, 500);
}

/** Autocomplete: only unlocked tables (spec §4), with column types as detail. */
export function editorSchema(): SQLNamespace {
  const out: Record<string, SQLNamespace> = {};
  for (const table of unlockedTables()) {
    const cols = app.columns[table];
    if (cols) {
      out[table] = {
        self: { label: table, type: 'type', detail: 'table' },
        children: cols.map((c) => ({ label: c.name, type: 'property', detail: c.type })),
      };
    }
  }
  return out;
}

// Keyed by Solution SQL, not ticket id: Plan 1c variants reuse ids with different SQL.
const shapes = new Map<string, Promise<Shape>>();
export function expectedShape(solution: string): Promise<Shape> {
  let p = shapes.get(solution);
  if (!p) {
    p = app.run(solution).then(shapeOf);
    shapes.set(solution, p);
    p.catch(() => shapes.delete(solution)); // timeout/restart: try again on the next render
  }
  return p;
}
```

`src/ui/dom.ts`:
```ts
type Child = Node | string | null | undefined | false;
type Attr = string | boolean | ((e: Event) => void);

/** Tiny element builder. Text always goes through append(), never innerHTML. */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, Attr> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (typeof v === 'function') el.addEventListener(k.replace(/^on/, ''), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false) el.setAttribute(k, v);
  }
  el.append(...nodes(...children));
  return el;
}

/** Drops null/undefined/false so conditional children can be written inline. */
export const nodes = (...children: Child[]): (Node | string)[] =>
  children.filter((c): c is Node | string => c !== null && c !== undefined && c !== false);

/** Ticket text: blank line = new paragraph, `backticks` = inline code. Nothing else is interpreted. */
export function richText(text: string): HTMLElement {
  const wrap = h('div', { class: 'rich' });
  for (const para of text.trim().split(/\n\s*\n/)) {
    const p = h('p');
    for (const part of para.split(/(`[^`]+`)/)) {
      if (part.length > 1 && part.startsWith('`') && part.endsWith('`')) p.append(h('code', {}, part.slice(1, -1)));
      else p.append(part.replace(/\s*\n\s*/g, ' '));
    }
    wrap.append(p);
  }
  return wrap;
}

export const byId = (id: string): HTMLElement => document.getElementById(id)!;
```

`src/ui/resultTable.ts`. Trong caption có số dòng; `truncated` (trần `MAX_ROWS_WORKER`) hiện thành "Kết quả quá lớn". Câu lệnh không trả về bảng (ví dụ UPDATE) thì báo đã ROLLBACK. Dòng mà grader báo không khớp có nhãn chữ, không chỉ đổi màu:
```ts
import type { QueryResult } from '../db/run';
import { t } from '../i18n';
import { h } from './dom';

export const MAX_ROWS = 500;
const DATE_OID = 1082;

/** `type` omitted (e.g. grader samples): a Date at UTC midnight is shown as a plain date. */
export function formatCell(v: unknown, type?: number): string {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Date) {
    const midnight = v.getUTCHours() === 0 && v.getUTCMinutes() === 0 && v.getUTCSeconds() === 0;
    return type === DATE_OID || (type === undefined && midnight) ? v.toISOString().slice(0, 10) : v.toLocaleString('sv-SE');
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

/** Values are shown raw (never translated or locale-formatted). `mark` = row to flag as not matching. */
export function renderResult(r: QueryResult, mark?: unknown[]): HTMLElement {
  if (r.columns.length === 0) return h('p', { class: 'muted' }, t('res.noTable'));
  const shown = r.rows.slice(0, MAX_ROWS);
  const caption = r.truncated
    ? t('res.tooBig', { n: r.rows.length })
    : r.rows.length > MAX_ROWS
      ? t('res.shown', { n: r.rows.length, max: MAX_ROWS })
      : t('res.rows', { n: r.rows.length });
  const cell = (row: unknown[], v: unknown, i: number) =>
    h('td', { class: v === null ? 'null' : '' },
      i === 0 && row === mark ? h('span', { class: 'tag' }, t('res.mismatch')) : null,
      formatCell(v, r.types[i]));
  const body = shown.map((row) => h('tr', { class: row === mark ? 'mismatch' : '' }, ...row.map((v, i) => cell(row, v, i))));
  return h('div', { class: 'result' },
    r.rows.length === 0 ? h('p', { class: 'muted' }, t('res.empty')) : null,
    h('div', { class: 'table-wrap' },
      h('table', {},
        h('caption', {}, caption),
        h('thead', {}, h('tr', {}, ...r.columns.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, ...body))));
}
```

`src/ui/feedback.ts`. Mọi lớp lỗi không kèm chữ (`QueryTimeoutError`, `DbRestartError`, `DbFailedError`, `NewerSaveError`, `InvalidSaveError`) được dịch ở một chỗ duy nhất là `errorText`. Lỗi Postgres giữ nguyên message gốc, sau đó là HINT, cuối cùng là giải thích theo ngôn ngữ đang chọn:
```ts
import { DbFailedError, DbRestartError, QueryTimeoutError } from '../db/client';
import { sqlErrorInfo } from '../db/run';
import { errorMessage, type GradeResult } from '../grader';
import { t } from '../i18n';
import { InvalidSaveError, NewerSaveError } from '../save';
import { h } from './dom';
import { formatCell } from './resultTable';
import { explainError } from './sqlErrors';

export function gradeMessage(r: Exclude<GradeResult, { ok: true }>): string {
  switch (r.reason) {
    case 'error':
      return r.message;
    case 'columns':
      return t('grade.columns', { expected: r.expected, actual: r.actual });
    case 'order':
      return t('grade.order');
    case 'rows': {
      const parts: string[] = [];
      if (r.missing === r.extra) parts.push(t('grade.wrongValues', { n: r.missing }));
      else {
        if (r.missing) parts.push(t('grade.missing', { n: r.missing }));
        if (r.extra) parts.push(t('grade.extra', { n: r.extra }));
      }
      if (r.sample) parts.push(t('grade.sample', { row: r.sample.map((v) => formatCell(v)).join(' | ') }));
      return parts.join(' ');
    }
  }
}

/** Every error class carries no text of its own; this is the one place that turns them into words. */
export function errorText(e: unknown): string {
  if (e instanceof QueryTimeoutError) return t('err.timeout', { s: e.timeoutMs / 1000 });
  if (e instanceof DbRestartError) return t('err.restart');
  if (e instanceof DbFailedError) return `${t('err.dbFailed')}\n${e.detail}`;
  if (e instanceof NewerSaveError) return t('save.newer', { v: e.version });
  if (e instanceof InvalidSaveError) return t('save.invalid');
  return errorMessage(e) || t('err.unknown');
}

/** Postgres' message unchanged (a real skill to read), then its HINT, then a teaching note in the UI language. */
export function errorView(e: unknown): HTMLElement {
  const info = sqlErrorInfo(e);
  if (!info) return h('pre', { class: 'error' }, errorText(e));
  const note = explainError(info);
  return h('div', { class: 'sql-error' },
    h('pre', { class: 'error' }, info.message),
    info.hint ? h('p', { class: 'muted' }, `HINT: ${info.hint}`) : null,
    note ? h('p', { class: 'explain' }, t(note)) : null);
}
```

`src/ui/editor.ts`, gồm:
- `Compartment` cho schema (autocomplete có kiểu cột) và cho `aria-label`, để đổi ngôn ngữ mà không remount editor.
- Chạy vùng chọn, trả về `offset`.
- Gạch lỗi bằng `setDiagnostics` theo `position` của Postgres.
- 3 phím tắt: `Mod-Enter` Chạy, `Mod-Shift-Enter` Nộp, `Shift-Alt-F` Định dạng (`sql-formatter` tải lười).
- Không thêm `indentWithTab`, nên Tab vẫn thoát được khỏi editor.
```ts
import { PostgreSQL, sql, type SQLNamespace } from '@codemirror/lang-sql';
import { setDiagnostics } from '@codemirror/lint';
import { Compartment, Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { basicSetup, EditorView } from 'codemirror';
import type { SqlErrorInfo } from '../db/run';

export interface Editor {
  getValue(): string;
  /** The selection when it is not empty, else the whole document; `offset` = where `sql` starts in the document. */
  runTarget(): { sql: string; offset: number };
  /** Replaces the document in one undoable transaction (history, format). */
  setValue(sql: string): void;
  setSchema(ns: SQLNamespace): void;
  setLabel(label: string): void;
  /** Underlines Postgres' 1-based character `position`, shifted by `offset` for a selection run. */
  showError(e: SqlErrorInfo, offset: number): void;
  clearError(): void;
  /** false when sql-formatter cannot parse the SQL (or its chunk failed to load). */
  format(): Promise<boolean>;
  focus(): void;
  destroy(): void;
}

export interface EditorOptions {
  doc: string;
  schema: SQLNamespace;
  label: string;
  onChange(v: string): void;
  onRun(): void;
  onSubmit(): void;
  onSelection(nonEmpty: boolean): void;
}

const language = (schema: SQLNamespace) => sql({ dialect: PostgreSQL, schema, upperCaseKeywords: true });
const ariaLabel = (label: string) => EditorView.contentAttributes.of({ 'aria-label': label });

export function createEditor(parent: HTMLElement, opts: EditorOptions): Editor {
  const schemaConf = new Compartment();
  const labelConf = new Compartment();
  const view = new EditorView({
    parent,
    doc: opts.doc,
    extensions: [
      Prec.highest(keymap.of([
        { key: 'Mod-Enter', run: () => (opts.onRun(), true) },
        { key: 'Mod-Shift-Enter', run: () => (opts.onSubmit(), true) },
        { key: 'Shift-Alt-f', run: () => (void api.format(), true) },
      ])),
      basicSetup, // no indentWithTab: Tab must still leave the editor
      schemaConf.of(language(opts.schema)),
      labelConf.of(ariaLabel(opts.label)),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) opts.onChange(u.state.doc.toString());
        if (u.selectionSet) opts.onSelection(!u.state.selection.main.empty);
      }),
    ],
  });

  const api: Editor = {
    getValue: () => view.state.doc.toString(),
    runTarget() {
      const s = view.state.selection.main;
      return s.empty ? { sql: view.state.doc.toString(), offset: 0 } : { sql: view.state.sliceDoc(s.from, s.to), offset: s.from };
    },
    setValue(value) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
    },
    setSchema(ns) {
      view.dispatch({ effects: schemaConf.reconfigure(language(ns)) });
    },
    setLabel(label) {
      view.dispatch({ effects: labelConf.reconfigure(ariaLabel(label)) });
    },
    showError(e, offset) {
      if (!e.position) return; // e.g. "cannot insert multiple commands" has no position
      const doc = view.state.doc;
      const from = Math.min(offset + e.position - 1, doc.length);
      const word = /^[\w."]+/.exec(doc.sliceString(from, from + 64))?.[0].length ?? 0;
      const to = Math.min(from + Math.max(word, 1), doc.length);
      view.dispatch(setDiagnostics(view.state, [{ from, to, severity: 'error', message: e.hint ? `${e.message}\n${e.hint}` : e.message }]));
    },
    clearError() {
      view.dispatch(setDiagnostics(view.state, []));
    },
    async format() {
      try {
        const { formatDialect, postgresql } = await import('sql-formatter'); // lazy chunk (D5)
        api.setValue(formatDialect(view.state.doc.toString(), { dialect: postgresql, keywordCase: 'upper' }));
        return true;
      } catch {
        return false;
      }
    },
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
  return api;
}
```

`src/ui/coach.ts`. Có 4 coach mark nằm ngay trong vùng của chúng, chỉ ở 2 ticket đầu:
1. Khung đề `ch1-01`, trước lần Chạy đầu.
2. Tab Kết quả, sau lần Chạy đầu.
3. Recap của `ch1-01`.
4. Ngay trên nút Gợi ý ở `ch1-02`.

Bước nào đang hiện được suy ra từ tiến độ; chỉ "Bỏ qua hướng dẫn" được lưu, ở key `cargo-query/coach-done`:
```ts
import { t, type Key } from '../i18n';
import { app, done } from '../state';
import { readJson, writeJson } from '../storage';
import { h } from './dom';

export const COACH_KEY = 'cargo-query/coach-done';
export type CoachSpot = 'brief' | 'panel' | 'recap' | 'hints';

const TEXT: Record<CoachSpot, Key> = { brief: 'coach.brief', panel: 'coach.panel', recap: 'coach.recap', hints: 'coach.hints' };
const dismissed = new Set<CoachSpot>();

/** Onboarding (first two tickets only), derived from progress so nothing is stored but "done". */
function spotNow(): CoachSpot | undefined {
  if (readJson<boolean>(COACH_KEY)) return undefined;
  const [first, second] = app.tickets;
  if (first && app.selectedId === first.id) return done().has(first.id) ? 'recap' : app.lastRun ? 'panel' : 'brief';
  if (second && app.selectedId === second.id && !done().has(second.id)) return 'hints';
  return undefined;
}

/** A coach mark placed inside its region (no floating popover), or null. */
export function coach(spot: CoachSpot): HTMLElement | null {
  if (spotNow() !== spot || dismissed.has(spot)) return null;
  const close = (e: Event) => (e.currentTarget as HTMLElement).closest('.coach')?.remove();
  return h('aside', { class: 'coach', role: 'note' },
    h('p', {}, t(TEXT[spot])),
    h('button', { type: 'button', onclick: (e) => { dismissed.add(spot); close(e); } }, t('coach.ok')),
    h('button', { type: 'button', onclick: (e) => { writeJson(COACH_KEY, true); close(e); } }, t('coach.skip')));
}
```

`src/ui/tabs.ts`:
- Tablist ARIA: nút tạo một lần, roving tabindex, ←/→/Home/End chuyển focus, Enter/Space mở tab (kích hoạt thủ công, để tab tốn công như EXPLAIN không chạy khi chỉ lướt qua).
- Vạch ngăn nhóm `output | query | schema` (class `group-start`); nhãn "mới" khi `newAt === app.selectedId`.
- Tab Kết quả đọc `app.lastRun` và vẽ dải "SQL đã thay đổi" ngay trong tab. Plan 1b tự vẽ dải này trong mỗi tab của nó, nên không vẽ ở mức panel.
```ts
import { t, type Key } from '../i18n';
import { app, unlockedTables } from '../state';
import { coach } from './coach';
import { h } from './dom';
import { errorText, errorView } from './feedback';
import { renderResult } from './resultTable';

export type TabGroup = 'output' | 'query' | 'schema';
export interface TabSpec {
  id: string;
  label: Key;
  group: TabGroup;
  /** Position inside the group. */
  order: number;
  /** Ticket id where this tab gets a "new" badge (e.g. 'ch3-01' for EXPLAIN). */
  newAt?: string;
  render(host: HTMLElement): void | Promise<void>;
}

export interface Panel {
  show(id: string): void;
  /** Re-labels the tabs and re-renders the open one (language switch, new tables). */
  refresh(): void;
  readonly active: string;
}

const GROUPS: TabGroup[] = ['output', 'query', 'schema'];
const specs: TabSpec[] = [];

/** Plan 1b registers its tabs here. Must run before createPanel. */
export function registerTab(spec: TabSpec): void {
  specs.push(spec);
}

/** ARIA tablist: buttons built once, roving tabindex, ←/→/Home/End move focus, Enter/Space opens (manual activation). */
export function createPanel(host: HTMLElement): Panel {
  const tabs = [...specs].sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order);
  const body = h('div', { class: 'tab-body', role: 'tabpanel', id: 'tabpanel', tabindex: '0' });
  const buttons = tabs.map((tab, i) =>
    h('button', {
      type: 'button',
      role: 'tab',
      id: `tab-${tab.id}`,
      'aria-controls': 'tabpanel',
      class: i > 0 && tab.group !== tabs[i - 1].group ? 'group-start' : '',
      onclick: () => show(tab.id),
    }));
  const bar = h('div', { class: 'tabs', role: 'tablist', 'data-i18n-aria': 'tab.list', 'aria-label': t('tab.list') }, ...buttons);
  host.replaceChildren(bar, body);
  let active = tabs.some((x) => x.id === 'columns') ? 'columns' : tabs[0].id;

  bar.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const n = buttons.length;
    const j = ({ ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 } as Record<string, number>)[e.key];
    if (j === undefined) return;
    e.preventDefault();
    buttons[j].focus();
  });

  function label(): void {
    tabs.forEach((tab, i) => {
      const on = tab.id === active;
      const b = buttons[i];
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('on', on);
      b.replaceChildren(t(tab.label), tab.newAt === app.selectedId ? h('span', { class: 'new' }, t('tab.new')) : '');
    });
  }

  function show(id: string): void {
    active = tabs.some((x) => x.id === id) ? id : tabs[0].id;
    label();
    body.setAttribute('aria-labelledby', `tab-${active}`);
    // A fresh host per render: a slow async render of a tab left behind writes into a detached node.
    const target = h('div');
    body.replaceChildren(target);
    const tab = tabs.find((x) => x.id === active)!;
    void Promise.resolve()
      .then(() => tab.render(target))
      .catch((e: unknown) => target.replaceChildren(h('pre', { class: 'error' }, errorText(e))));
  }

  show(active);
  return {
    show,
    refresh: () => show(active),
    get active() {
      return active;
    },
  };
}

function schemaList(): HTMLElement {
  const tables = unlockedTables().filter((x) => app.columns[x]);
  if (tables.length === 0) return h('p', { class: 'muted' }, t('cols.loading'));
  return h('div', { class: 'schema-list' }, ...tables.map((table) =>
    h('div', {},
      h('h3', {}, table),
      h('ul', {}, ...app.columns[table].map((c) => h('li', {}, h('code', {}, c.name), ' ', h('span', { class: 'muted' }, c.type)))))));
}

/** Plan 1 tabs. `editorSql` = what Ctrl+Enter would run now, to flag a stale result. */
export function registerCoreTabs(editorSql: () => string): void {
  registerTab({
    id: 'result',
    label: 'tab.result',
    group: 'output',
    order: 10,
    render(host) {
      const run = app.lastRun;
      host.append(coach('panel') ?? '');
      if (!run) {
        host.append(h('p', { class: 'muted' }, t('res.runFirst')));
        return;
      }
      if (editorSql().trim() !== run.sql.trim()) host.append(h('p', { class: 'stale', role: 'note' }, t('res.stale')));
      host.append(run.error !== undefined ? errorView(run.error) : renderResult(run.result!, run.mark));
    },
  });
  registerTab({ id: 'columns', label: 'tab.columns', group: 'schema', order: 20, render: (host) => void host.append(schemaList()) });
}
```

`src/ui/splitter.ts` (C8):
```ts
import { readJson, writeJson } from '../storage';

export const LAYOUT_KEY = 'cargo-query/layout';
/** Percent: ticket column width, bottom panel height. */
interface Layout { col: number; row: number }
type Part = keyof Layout;

const DEFAULT: Layout = { col: 40, row: 40 };
const LIMITS: Record<Part, [number, number]> = { col: [25, 60], row: [20, 70] };
const clamp = (part: Part, v: number) => Math.min(LIMITS[part][1], Math.max(LIMITS[part][0], Math.round(v)));

/**
 * Two keyboard-operable separators for the ≥ 1024×700 app shell. CSS reads --col/--row from `shell`.
 * ←/→ (column) and ↑/↓ (panel) move 5%, Home/End jump to the limits, double-click resets.
 */
export function initLayout(shell: HTMLElement, handles: Record<Part, HTMLElement>): void {
  const saved = readJson<Partial<Layout>>(LAYOUT_KEY) ?? {};
  const layout: Layout = { col: clamp('col', saved.col ?? DEFAULT.col), row: clamp('row', saved.row ?? DEFAULT.row) };

  const set = (part: Part, v: number, save = true) => {
    layout[part] = clamp(part, v);
    shell.style.setProperty(`--${part}`, `${layout[part]}%`);
    handles[part].setAttribute('aria-valuenow', String(layout[part]));
    if (save) writeJson(LAYOUT_KEY, layout);
  };

  for (const part of ['col', 'row'] as const) {
    const el = handles[part];
    el.setAttribute('role', 'separator');
    el.setAttribute('aria-orientation', part === 'col' ? 'vertical' : 'horizontal');
    el.setAttribute('aria-valuemin', String(LIMITS[part][0]));
    el.setAttribute('aria-valuemax', String(LIMITS[part][1]));
    el.tabIndex = 0;
    el.addEventListener('keydown', (e) => {
      const keys: Record<string, number> = part === 'col'
        ? { ArrowLeft: layout.col - 5, ArrowRight: layout.col + 5, Home: LIMITS.col[0], End: LIMITS.col[1] }
        : { ArrowDown: layout.row - 5, ArrowUp: layout.row + 5, Home: LIMITS.row[0], End: LIMITS.row[1] };
      if (!(e.key in keys)) return;
      e.preventDefault();
      set(part, keys[e.key]);
    });
    el.addEventListener('dblclick', () => set(part, DEFAULT[part]));
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      const move = (ev: PointerEvent) => {
        const r = shell.getBoundingClientRect();
        set(part, part === 'col' ? ((ev.clientX - r.left) / r.width) * 100 : ((r.bottom - ev.clientY) / r.height) * 100, false);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', () => {
        el.removeEventListener('pointermove', move);
        writeJson(LAYOUT_KEY, layout);
      }, { once: true });
    });
    set(part, layout[part], false);
  }
}
```

- [ ] **Step 7: Kiểm kiểu**

Run: `npx tsc --noEmit`
Expected: không lỗi.

- [ ] **Step 8: Viết các vùng màn hình**

`src/ui/topbar.ts`. Trạng thái DB hiện tiến độ tải theo byte: `2.1/5.4 MB` khi biết tổng, ngược lại chỉ hiện số MB đã tải (với gzip, Content-Length là số byte nén nên không dùng làm tổng). Nút ngôn ngữ `VI | EN` có `aria-pressed`. Thông báo hiện dạng banner, lưu theo khóa i18n để đổi ngôn ngữ thì dịch lại:
```ts
import { getLang, t } from '../i18n';
import { chapterTitle, currentChapter } from '../progress';
import { actions, app, done } from '../state';
import { byId, h, nodes } from './dom';

const mb = (bytes: number): number => Math.round(bytes / 1e5) / 10;

function dbStatusView(): Node | string {
  if (app.dbStatus === 'ready') return t('db.ready');
  if (app.dbStatus === 'failed') return h('button', { type: 'button', onclick: () => actions.retryDb() }, t('db.retry'));
  const p = app.loadProgress;
  if (!p) return t('db.loading');
  return p.total && p.total >= p.loaded
    ? t('db.loadingBytes', { loaded: mb(p.loaded), total: mb(p.total) })
    : t('db.loadingMb', { loaded: mb(p.loaded) });
}

function renderNotice(): void {
  const el = byId('notice');
  const n = app.notice;
  el.hidden = !n;
  if (!n) return el.replaceChildren();
  el.replaceChildren(...nodes(
    h('span', {}, t(n.key, n.params)),
    n.reload ? h('button', { type: 'button', onclick: () => location.reload() }, t('app.reload')) : null,
    h('button', { type: 'button', class: 'close', 'aria-label': t('app.dismiss'), onclick: () => { app.notice = undefined; renderNotice(); } }, '×')));
}

export function renderTopbar(): void {
  const ch = currentChapter(app.tickets, done());
  byId('chapter').textContent = t('top.chapter', { n: ch, title: chapterTitle(ch, getLang()) });
  byId('xp').textContent = t('top.xp', { n: app.save.xp });
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) b.setAttribute('aria-pressed', String(b.dataset.lang === getLang()));
  byId('db-status').replaceChildren(dbStatusView());
  renderNotice();
}
```

`src/ui/inbox.ts`:
```ts
import { getLang, t } from '../i18n';
import { visibleTickets } from '../progress';
import { actions, app, done } from '../state';
import { textOf } from '../tickets';
import { byId, h } from './dom';

export function renderInbox(): void {
  const d = done();
  const visible = visibleTickets(app.tickets, d);
  const fresh = visible.filter((x) => !d.has(x.id)).length;
  byId('inbox-btn').textContent = fresh ? t('top.inboxNew', { n: fresh }) : t('top.inbox');
  const lang = getLang();
  byId('inbox-list').replaceChildren(
    fresh ? '' : h('p', { class: 'muted' }, t('inbox.empty')),
    ...[...visible].reverse().map((tk) => {
      const isDone = d.has(tk.id);
      const current = tk.id === app.selectedId;
      return h('button', {
        type: 'button',
        class: `mail${current ? ' active' : ''}${isDone ? ' done' : ''}`,
        'aria-current': current ? 'true' : false,
        onclick: () => actions.selectTicket(tk.id),
      },
        h('span', { class: 'from' }, `${tk.from.name} · ${tk.from.dept}`),
        h('span', { class: 'subject' }, textOf(tk, lang).title),
        h('span', { class: 'meta' }, isDone ? `✓ ${t('inbox.done')}` : `${t('brief.chapter', { n: tk.chapter })} · ${'★'.repeat(tk.difficulty)}`));
    }));
}
```

`src/ui/brief.ts`. Khung trái gồm, từ trên xuống:
1. Header: phòng ban, người gửi, chương, beat bằng chữ, độ khó; nhãn "Chưa có bản tiếng Anh" khi `fallback`.
2. Tin nhắn.
3. Khung "Yêu cầu" (`## Task`).
4. Bước boss.
5. Shape card.
6. Gợi ý: giá XP hiện trên nút.
7. Kết luận: lựa chọn đang chọn được giữ khi re-render.
8. Recap.

Shape card lấy số cột, loại cột và số dòng từ kết quả chạy Solution. Kết quả này được cache theo SQL, và chạy qua hàng đợi `DbClient` nên tự chờ DB sẵn sàng. Nhãn cột lấy từ `columns:`. Card **không bao giờ** hiện tên cột của Solution.
```ts
import { getLang, t, type Key } from '../i18n';
import { nextTicket, SKILLS, xpFor } from '../progress';
import { compareShape, shapeOf, type Kind, type Shape } from '../shape';
import { actions, app, done, expectedShape, persist, stepKey } from '../state';
import { textOf, type Beat, type Ticket, type TicketText } from '../tickets';
import { coach } from './coach';
import { h, nodes, richText } from './dom';

const BEAT: Record<Beat, Key> = { teach: 'beat.teach', develop: 'beat.develop', twist: 'beat.twist', rest: 'beat.rest', boss: 'beat.boss' };
const KIND: Record<Kind, Key> = { text: 'shape.text', number: 'shape.number', date: 'shape.date', bool: 'shape.bool' };

/** Conclusion option picked per ticket: survives re-renders and language switches (not saved). */
const picked = new Map<string, number>();

const mark = (ok: boolean): string => (ok ? '✓' : '✗');

/** "Expected result": column count and kinds, row count, ordering, author labels from `columns:`. Never Solution column names. */
function shapeCard(tk: Ticket, stepIndex: number): HTMLElement {
  const step = tk.steps[stepIndex];
  const labels = step.columns ?? [];
  const card = h('section', { class: 'shape', 'aria-label': t('shape.title') });
  const draw = (exp?: Shape) => {
    const n = exp?.kinds.length ?? labels.length;
    const run = app.lastRun?.key === stepKey(tk, stepIndex) ? app.lastRun.result : undefined;
    const cmp = exp && run ? compareShape(exp, shapeOf(run)) : undefined;
    card.replaceChildren(...nodes(
      h('h3', {}, t('shape.title')),
      h('p', {}, [t('shape.cols', { n }), exp ? t('shape.rows', { n: exp.rows }) : '…', t(tk.ordered ? 'shape.ordered' : 'shape.unordered')].join(' · ')),
      h('ul', { class: 'shape-cols' }, ...Array.from({ length: n }, (_, i) =>
        h('li', {}, labels[i] ? h('code', {}, labels[i]) : null, exp ? ` ${t(KIND[exp.kinds[i]])}` : null))),
      cmp && run
        ? h('p', { class: cmp.columns && cmp.kinds && cmp.rows ? 'good' : 'warn' },
          t('shape.yours', { cols: run.columns.length, colsOk: mark(cmp.columns && cmp.kinds), rows: run.rows.length, rowsOk: mark(cmp.rows) }))
        : null));
  };
  draw();
  expectedShape(step.solution).then(draw, () => draw());
  return card;
}

function hints(tk: Ticket, x: TicketText, isDone: boolean): HTMLElement {
  const shown = app.save.hintsUsed[tk.id] ?? 0;
  const btn = h('button', {
    type: 'button',
    onclick: () => {
      app.save.hintsUsed[tk.id] = shown + 1;
      persist();
      actions.rerender();
    },
  }, t('brief.hint', { i: shown + 1, n: x.hints.length, cost: xpFor(tk, shown) - xpFor(tk, shown + 1) }));
  return h('section', { class: 'hints' },
    shown ? h('ol', {}, ...x.hints.slice(0, shown).map((s) => h('li', {}, richText(s)))) : null,
    isDone || shown >= x.hints.length ? null : btn);
}

function conclusion(tk: Ticket, x: TicketText): HTMLElement {
  const c = x.conclusion!;
  const msg = h('p', { role: 'status', class: 'feedback bad' });
  const form = h('form', { class: 'conclusion' },
    h('h3', {}, t('brief.conclusion')),
    h('p', {}, c.question),
    ...c.options.map((o, i) => h('label', {},
      h('input', { type: 'radio', name: 'conclusion', value: String(i), checked: picked.get(tk.id) === i, onchange: () => picked.set(tk.id, i) }),
      ' ', o)),
    h('button', { class: 'primary', type: 'submit' }, t('brief.conclude')),
    msg);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = picked.get(tk.id);
    if (v === undefined) msg.textContent = t('brief.pickOne');
    else if (v === tk.conclusion!.answer) actions.complete(tk);
    else msg.textContent = t('brief.wrongConclusion');
  });
  return form;
}

/** On a closed ticket: skills learned (or reviewed), your SQL next to the reference, XP, "Next ticket". */
function recap(tk: Ticket, x: TicketText): HTMLElement {
  const lang = getLang();
  const ids = tk.grants.length ? tk.grants : tk.requires;
  const skills = SKILLS.filter((s) => ids.includes(s.id));
  const next = nextTicket(app.tickets, done());
  const hintsUsed = app.save.hintsUsed[tk.id] ?? 0;
  const heading = h('h3', { tabindex: '-1' }, t('recap.title'));
  if (app.justCompleted === tk.id) {
    app.justCompleted = '';
    queueMicrotask(() => heading.focus());
  }
  return h('section', { class: 'recap' },
    heading,
    coach('recap'),
    h('p', {}, t('recap.xp', { n: xpFor(tk, hintsUsed), hints: hintsUsed })),
    h('h4', {}, t(tk.grants.length ? 'recap.learned' : 'recap.review')),
    h('ul', { class: 'skill-cards' }, ...skills.map((s) =>
      h('li', {}, h('b', {}, s.label[lang]), ' ', h('code', {}, s.syntax), h('p', { class: 'muted' }, s.when[lang])))),
    ...tk.steps.map((s, i) => h('div', { class: 'compare' },
      tk.steps.length > 1 ? h('h4', {}, x.steps[i].title) : null,
      h('figure', {}, h('figcaption', {}, t('recap.yours')), h('pre', { class: 'sql' }, app.save.drafts[stepKey(tk, i)] ?? '')),
      h('figure', {}, h('figcaption', {}, t('recap.reference')), h('pre', { class: 'sql' }, s.solution)))),
    next
      ? h('button', { type: 'button', class: 'primary', onclick: () => actions.selectTicket(next.id) }, t('recap.next'))
      : h('p', {}, t('recap.allDone')));
}

/** Left pane for `tk` (not necessarily the selected ticket: Plan 1c renders practice tickets here). Replaces host's children. */
export function renderBrief(host: HTMLElement, tk: Ticket, stepIndex: number): void {
  const x = textOf(tk, getLang());
  const isDone = done().has(tk.id);
  const boss = tk.steps.length > 1;
  host.replaceChildren(...nodes(
    h('header', {},
      h('h2', { id: 'brief-title', tabindex: '-1' }, x.title),
      h('p', { class: 'meta' },
        h('span', { class: 'dept' }, tk.from.dept),
        ` ${tk.from.name} · ${t('brief.chapter', { n: tk.chapter })} · ${t(BEAT[tk.beat])} · ${'★'.repeat(tk.difficulty)}`,
        isDone ? ` · ✓ ${t('inbox.done')}` : ''),
      x.fallback ? h('p', { class: 'tag' }, t('brief.untranslated')) : null),
    coach('brief'),
    richText(x.body),
    x.task ? h('section', { class: 'task' }, h('h3', {}, t('brief.task')), richText(x.task)) : null,
    boss
      ? h('section', { class: 'step' },
        h('h3', {}, t('brief.step', { i: stepIndex + 1, n: tk.steps.length, title: x.steps[stepIndex].title })),
        richText(x.steps[stepIndex].prompt))
      : null,
    isDone ? null : shapeCard(tk, stepIndex),
    coach('hints'),
    hints(tk, x, isDone),
    app.conclusionFor === tk.id && !isDone && x.conclusion ? conclusion(tk, x) : null,
    isDone ? recap(tk, x) : null,
  ));
}
```

`src/ui/work.ts`. Gồm editor, các nút, phản hồi (`role=status`) và lịch sử `<details>`.
- **Chạy:** chạy vùng chọn hoặc cả editor. Nếu DB chưa sẵn sàng thì query nằm trong hàng đợi của `DbClient` và nút hiện "Đang chờ database…".
- **Nộp:** luôn chấm cả editor. Runner truyền cho `grade()` ghi lần chạy của người chơi vào `app.lastRun`. Nhờ vậy tab Kết quả và shape card hiện đúng query vừa chấm, và timeout/restart vẫn giữ lớp lỗi (BE câu hỏi mở 1: không cần sửa grader).
- **Tab sau khi Nộp sai** (C7): `columns` → giữ tab đang mở; `error`/`rows`/`order` → tab Kết quả.
```ts
import type { SQLNamespace } from '@codemirror/lang-sql';
import type { DbClient } from '../db/client';
import { sqlErrorInfo } from '../db/run';
import { grade, type GradeResult } from '../grader';
import { loadHistory, pushHistory, writeHistory } from '../history';
import { t } from '../i18n';
import { app, done, draftKey, editorSchema, persist, stepKey, type LastRun } from '../state';
import { localStore } from '../storage';
import type { Ticket } from '../tickets';
import { h } from './dom';
import { createEditor, type Editor } from './editor';
import { errorText, errorView, gradeMessage } from './feedback';
import type { Panel } from './tabs';

export interface WorkDeps {
  db: DbClient;
  panel: Panel;
  /** Normal ticket solved. */
  onSolved(t: Ticket): void;
  /** A boss step other than the last one solved. */
  onStepSolved(): void;
  /** Last boss step solved: the conclusion opens. */
  onConclusion(t: Ticket): void;
  /** After every Run/Submit (the brief redraws its shape card). */
  onRun(): void;
}

export interface WorkArea {
  /** Recreates the editor only when ticketId#step changes (or `force`, after importing a save); otherwise keeps cursor, selection and undo. */
  setTicket(t: Ticket, stepIndex: number, force?: boolean): void;
  /** Language switch: labels and the last message only, never the editor. */
  relabel(): void;
  setSchema(ns: SQLNamespace): void;
  /** Exactly what Ctrl+Enter would run now (selection or whole editor), to compare with app.lastRun.sql. */
  currentSql(): string;
  focus(): void;
}

/** After a run, these tabs say nothing about the result, so the Result tab opens instead. */
const SCHEMA_TABS = new Set(['erd', 'columns']);

export function mountWork(host: HTMLElement, deps: WorkDeps): WorkArea {
  let ticket: Ticket | undefined;
  let stepIndex = 0;
  let key = '';
  let editor: Editor | undefined;
  let busy = false;
  let selection = false;
  /** Last message under the editor, as a function so relabel() re-translates it. */
  let message: { kind: 'good' | 'bad'; view: () => Node | string } | undefined;
  let history = loadHistory(localStore());

  const editorHost = h('div', { class: 'editor' });
  const runBtn = h('button', { type: 'button', onclick: () => void run() });
  const formatBtn = h('button', { type: 'button', onclick: () => void format() });
  const submitBtn = h('button', { type: 'button', class: 'primary', onclick: () => void submit() });
  const feedback = h('div', { class: 'feedback', role: 'status' });
  const historyBox = h('details', { class: 'history' });
  host.replaceChildren(editorHost, h('div', { class: 'actions' }, runBtn, formatBtn, submitBtn), feedback, historyBox);

  function say(kind: 'good' | 'bad', view: () => Node | string): void {
    message = { kind, view };
    drawMessage();
  }
  function drawMessage(): void {
    feedback.className = `feedback ${message?.kind ?? ''}`;
    feedback.replaceChildren(message ? message.view() : '');
  }

  function setButtons(): void {
    runBtn.textContent = busy && app.dbStatus === 'loading' ? t('work.waitingDb') : t(selection ? 'work.runSel' : 'work.run');
    formatBtn.textContent = t('work.format');
    submitBtn.textContent = t('work.submit');
    runBtn.disabled = busy;
    submitBtn.disabled = busy;
    submitBtn.hidden = !ticket || done().has(ticket.id);
  }

  function drawHistory(): void {
    const list = ticket ? history[ticket.id] ?? [] : [];
    historyBox.hidden = list.length === 0;
    historyBox.replaceChildren(
      h('summary', {}, t('hist.title', { n: list.length })),
      h('ul', {}, ...list.map((e) => h('li', {},
        h('button', { type: 'button', class: 'hist', onclick: () => { editor?.setValue(e.sql); editor?.focus(); } },
          h('span', { class: e.ok ? 'good' : 'bad' }, e.ok ? '✓' : '✗'),
          ` ${e.sql.replace(/\s+/g, ' ').slice(0, 60)}`,
          e.rows === undefined ? '' : h('span', { class: 'muted' }, ` · ${t('hist.rows', { n: e.rows })}`))))));
  }

  function record(run: LastRun): void {
    if (!ticket) return;
    history = pushHistory(history, ticket.id, { sql: run.sql, at: Date.now(), ok: run.error === undefined, rows: run.result?.rows.length });
    writeHistory(localStore(), history);
    drawHistory();
  }

  function underline(e: unknown, offset: number): void {
    const info = sqlErrorInfo(e);
    if (info) editor?.showError(info, offset);
  }

  async function run(): Promise<void> {
    if (busy || !editor) return;
    const { sql, offset } = editor.runTarget();
    const k = ticket ? stepKey(ticket, stepIndex) : '';
    editor.clearError();
    busy = true;
    setButtons();
    if (app.dbStatus === 'loading') say('good', () => t('work.queued')); // DbClient queues the query until the DB is ready
    try {
      app.lastRun = { key: k, sql, offset, result: await deps.db.run(sql) };
      message = undefined;
    } catch (e) {
      app.lastRun = { key: k, sql, offset, error: e };
      underline(e, offset);
      say('bad', () => t('work.runFailed'));
    } finally {
      busy = false;
      setButtons();
      drawMessage();
    }
    record(app.lastRun);
    const failed = app.lastRun.error !== undefined;
    deps.panel.show(failed || SCHEMA_TABS.has(deps.panel.active) ? 'result' : deps.panel.active);
    deps.onRun();
  }

  async function submit(): Promise<void> {
    if (busy || !editor || !ticket || submitBtn.hidden) return;
    const tk = ticket;
    const i = stepIndex;
    const k = stepKey(tk, i);
    const sql = editor.getValue(); // Submit always grades the whole editor
    editor.clearError();
    busy = true;
    setButtons();
    // The player's run is recorded in lastRun, so the tabs and the shape card show what was graded,
    // and a timeout/restart keeps its error class (grade() itself only keeps Postgres errors).
    const playerRun = async (s: string) => {
      try {
        const result = await deps.db.run(s);
        app.lastRun = { key: k, sql: s, offset: 0, result };
        return result;
      } catch (e) {
        app.lastRun = { key: k, sql: s, offset: 0, error: e };
        throw e;
      }
    };
    let r: GradeResult | undefined;
    try {
      r = await grade((s) => (s === sql ? playerRun(s) : deps.db.run(s)), tk.steps[i].solution, sql, tk.ordered);
    } catch (e) {
      say('bad', () => t('work.contentBug', { msg: errorText(e) })); // the Solution itself failed
    } finally {
      busy = false;
      setButtons();
    }
    if (app.lastRun?.key === k) record(app.lastRun);
    deps.onRun();
    if (!r) return;
    if (!r.ok) {
      const fail = r;
      const err = app.lastRun?.error;
      if (fail.reason === 'error') {
        underline(err, 0);
        say('bad', () => (err !== undefined ? errorView(err) : gradeMessage(fail)));
      } else {
        if (fail.reason === 'rows' && app.lastRun?.result) app.lastRun.mark = fail.sample;
        say('bad', () => gradeMessage(fail));
      }
      if (fail.reason === 'columns') deps.panel.refresh(); // the shape card already shows the column count
      else deps.panel.show('result');
      return;
    }
    if (i < tk.steps.length - 1) {
      deps.onStepSolved(); // setTicket() for the next step clears the message, so say it afterwards
      say('good', () => t('work.stepDone', { i: i + 1 }));
    } else if (tk.conclusion) {
      say('good', () => t('work.conclusionNext'));
      deps.onConclusion(tk);
    } else {
      say('good', () => t('work.correct'));
      deps.onSolved(tk);
    }
  }

  async function format(): Promise<void> {
    if (editor && !(await editor.format())) say('bad', () => t('work.formatFailed'));
  }

  function relabel(): void {
    setButtons();
    drawMessage();
    drawHistory();
    editor?.setLabel(t('work.editorLabel'));
  }

  return {
    setTicket(tk, i, force = false) {
      const sameTicket = ticket?.id === tk.id && !force;
      ticket = tk;
      stepIndex = i;
      if (!editor || draftKey() !== key || force) {
        key = draftKey();
        if (!sameTicket) {
          app.lastRun = undefined;
          deps.panel.show('columns'); // nothing run yet: show the tables first
        }
        message = undefined;
        editor?.destroy();
        editor = createEditor(editorHost, {
          doc: app.save.drafts[draftKey()] ?? tk.starter ?? '',
          schema: editorSchema(),
          label: t('work.editorLabel'),
          onChange: (v) => {
            app.save.drafts[draftKey()] = v;
            persist();
          },
          onRun: () => void run(),
          onSubmit: () => void submit(),
          onSelection: (nonEmpty) => {
            selection = nonEmpty;
            setButtons();
          },
        });
      }
      relabel();
    },
    relabel,
    setSchema: (ns) => editor?.setSchema(ns),
    currentSql: () => editor?.runTarget().sql ?? '',
    focus: () => editor?.focus(),
  };
}
```

`index.html`. Chữ tĩnh mang `data-i18n`/`data-i18n-aria`; `main.ts` gọi `applyStatic()` khi khởi động:
```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cargo Query</title>
  </head>
  <body>
    <header class="topbar">
      <h1>Cargo Query</h1>
      <span id="chapter"></span>
      <span id="xp"></span>
      <button id="inbox-btn" type="button" data-i18n="top.inbox">Hộp thư</button>
      <div class="lang" role="group" data-i18n-aria="top.lang" aria-label="Ngôn ngữ">
        <button type="button" data-lang="vi" aria-pressed="true">VI</button>
        <button type="button" data-lang="en" aria-pressed="false">EN</button>
      </div>
      <button id="export-btn" type="button" data-i18n="top.export">Xuất tiến độ</button>
      <label class="file-btn"><span data-i18n="top.import">Nhập tiến độ</span><input id="import-input" type="file" accept="application/json" hidden /></label>
      <span id="db-status" role="status"></span>
    </header>
    <div id="map" class="map-strip" data-i18n-aria="top.map" aria-label="Bản đồ tuyến" hidden></div>
    <div id="notice" role="status" hidden></div>
    <main id="shell" class="shell">
      <div class="workspace">
        <section id="ticket" data-i18n-aria="area.ticket" aria-label="Đề bài"></section>
        <div id="split-col" class="split split-col" data-i18n-aria="area.splitCol" aria-label="Độ rộng cột đề bài"></div>
        <section id="work" data-i18n-aria="area.work" aria-label="SQL editor"></section>
      </div>
      <div id="split-row" class="split split-row" data-i18n-aria="area.splitRow" aria-label="Chiều cao panel kết quả"></div>
      <section id="panel" class="panel" data-i18n-aria="area.panel" aria-label="Kết quả và trực quan hóa"></section>
    </main>
    <dialog id="inbox-dialog" aria-labelledby="inbox-title">
      <h2 id="inbox-title" data-i18n="top.inbox">Hộp thư</h2>
      <div id="inbox-list"></div>
      <form method="dialog"><button data-i18n="app.close">Đóng</button></form>
    </dialog>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/style.css`. Tương phản theo C5: nút `primary` ở dark mode dùng chữ `#0d1b29` (token `--on-accent`). Không dùng `opacity` để thể hiện ý nghĩa: `.mail.done` dùng nền + dấu ✓, nút disabled dùng màu + viền đứt. App shell `100dvh` chỉ bật khi màn ≥ 1024×700; dưới 600px thì thanh nút sticky:
```css
:root {
  --bg: #f7f7f5; --panel: #ffffff; --text: #1d1d1f; --muted: #66666b; --border: #dcdcd8;
  --accent: #0f6cbd; --accent-soft: #dbeafe; --on-accent: #ffffff; --good: #1a7f37; --bad: #c62828; --warn: #b35c00;
  --code: #efefea; --sea: #e8f1f8; --land: #d9e2ea; --bar: #1f3b57; --disabled: #8a8a90;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161618; --panel: #1f1f22; --text: #ececf0; --muted: #a0a0a8; --border: #34343a;
    --accent: #5aa9ff; --accent-soft: #1d3550; --on-accent: #0d1b29; --good: #4cc26d; --bad: #ff6b6b; --warn: #ffb35a;
    --code: #2a2a30; --sea: #14202b; --land: #2b3742; --bar: #0d1b29; --disabled: #7a7a82;
  }
}
* { box-sizing: border-box; }
body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--text); }
.topbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 8px 16px; background: var(--bar); color: #fff; }
.topbar h1 { font-size: 18px; margin: 0 auto 0 0; }
.topbar button { background: transparent; color: #fff; border-color: #ffffff88; }
.topbar .file-btn { color: #fff; }
.lang { display: inline-flex; }
.lang button { border-radius: 0; padding: 4px 10px; }
.lang button:first-child { border-radius: 6px 0 0 6px; }
.lang button:last-child { border-radius: 0 6px 6px 0; border-left: 0; }
.lang button[aria-pressed='true'] { background: #fff; color: var(--bar); font-weight: 600; }
.map-strip { background: var(--sea); border-bottom: 1px solid var(--border); }
#notice { display: flex; gap: 8px; align-items: center; padding: 8px 16px; background: var(--code); border-bottom: 1px solid var(--border); }
#notice[hidden] { display: none; }
#notice .close { margin-left: auto; }
.shell { padding: 16px 16px 0; }
.workspace { display: grid; grid-template-columns: minmax(0, 2fr) 16px minmax(0, 3fr); }
#ticket { grid-column: 1; }
#work { grid-column: 3; }
.split { display: none; }
@media (max-width: 900px) {
  .workspace { grid-template-columns: minmax(0, 1fr); row-gap: 16px; }
  #ticket, #work { grid-column: 1; }
}
#ticket, #work, .panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px; min-width: 0; }
.panel { margin: 16px 0; }
/* App shell: on a large screen everything fits in one viewport and each region scrolls on its own. */
@media (min-width: 1024px) and (min-height: 700px) {
  body { height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
  .shell { flex: 1; min-height: 0; display: grid; grid-template-rows: minmax(0, 1fr) 12px minmax(0, var(--row, 40%)); padding-bottom: 12px; }
  .workspace { min-height: 0; grid-template-columns: minmax(0, var(--col, 40%)) 12px minmax(0, 1fr); }
  #ticket, #work, .panel { overflow: auto; min-height: 0; }
  .panel { margin: 0; }
  .split { display: block; border-radius: 4px; touch-action: none; }
  .split:hover, .split:focus-visible { background: var(--accent-soft); }
  .split-col { cursor: col-resize; }
  .split-row { cursor: row-resize; }
}
@media (max-width: 599px) {
  .actions { position: sticky; bottom: 0; background: var(--panel); padding: 8px 0; z-index: 1; }
  .tabs { flex-wrap: nowrap; overflow-x: auto; }
}
@media (pointer: coarse) { .editor .cm-content { font-size: 16px; } }
h2 { font-size: 16px; margin: 0 0 8px; }
h3 { font-size: 15px; margin: 12px 0 4px; }
h4 { font-size: 14px; margin: 10px 0 4px; }
.muted, .from, .meta { color: var(--muted); font-size: 13px; }
button { font: inherit; padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--panel); color: inherit; cursor: pointer; }
button.primary { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
button:disabled { color: var(--disabled); border-style: dashed; cursor: default; }
button.primary:disabled { background: var(--code); border-color: var(--disabled); }
.file-btn { cursor: pointer; text-decoration: underline; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.editor { border: 1px solid var(--border); border-radius: 6px; }
.editor .cm-editor { min-height: 160px; background: var(--panel); color: var(--text); }
.editor .cm-editor .cm-gutters { background: var(--code); color: var(--muted); border-color: var(--border); }
.editor .cm-editor .cm-content { caret-color: var(--text); }
code { background: var(--code); padding: 1px 4px; border-radius: 4px; }
pre.sql { background: var(--code); padding: 8px; border-radius: 6px; white-space: pre-wrap; margin: 0; font-size: 13px; }
.feedback.bad, .bad { color: var(--bad); }
.feedback.good, .good { color: var(--good); }
.warn { color: var(--warn); }
.error { color: var(--bad); white-space: pre-wrap; }
.sql-error .explain { border-left: 3px solid var(--accent); padding-left: 8px; }
.dept { display: inline-block; padding: 0 6px; border-radius: 4px; background: var(--accent-soft); color: var(--text); font-weight: 600; }
.tag { display: inline-block; margin-right: 6px; padding: 0 6px; border: 1px solid var(--warn); border-radius: 4px; color: var(--text); font-size: 12px; }
.task, .step, .shape, .recap, .coach { border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; margin: 12px 0; }
.task { border-left: 4px solid var(--accent); }
.shape ul { list-style: none; display: flex; flex-wrap: wrap; gap: 6px; padding: 0; margin: 4px 0; }
.shape li { border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px; font-size: 13px; }
.recap { border-color: var(--good); }
.recap .compare { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 8px; }
.recap figure { margin: 0; }
.skill-cards { padding-left: 18px; }
.coach { background: var(--accent-soft); border-color: var(--accent); }
.coach p { margin: 0 0 6px; }
.coach button { margin-right: 6px; }
.hints ol { padding-left: 20px; }
.history summary { cursor: pointer; color: var(--muted); }
.history ul { list-style: none; padding: 0; margin: 4px 0; }
.history .hist { width: 100%; text-align: left; font-family: ui-monospace, monospace; font-size: 12px; border: 0; padding: 2px 4px; }
.stale { margin: 0 0 8px; padding: 4px 8px; border-left: 3px solid var(--warn); background: var(--code); font-size: 13px; }
.tabs { display: flex; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--border); margin-bottom: 10px; }
.tabs button { border-radius: 6px 6px 0 0; border-bottom: 0; background: var(--code); }
.tabs button.on { background: var(--panel); font-weight: 600; box-shadow: inset 0 2px var(--accent); }
.tabs .group-start { margin-left: 16px; }
.tabs .new { margin-left: 6px; padding: 0 4px; border-radius: 4px; background: var(--accent); color: var(--on-accent); font-size: 11px; }
.table-wrap { overflow: auto; max-height: 420px; border: 1px solid var(--border); border-radius: 6px; }
table { border-collapse: collapse; font-size: 13px; width: 100%; }
caption { text-align: left; color: var(--muted); padding: 4px 8px; }
th, td { padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
th { position: sticky; top: 0; background: var(--panel); }
td.null { color: var(--muted); font-style: italic; }
tr.mismatch td { background: var(--accent-soft); }
.schema-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 8px; }
.schema-list h3 { margin: 0; }
.schema-list ul { list-style: none; padding-left: 8px; margin: 4px 0 8px; font-size: 13px; }
dialog { border: 1px solid var(--border); border-radius: 10px; background: var(--panel); color: var(--text); width: min(520px, calc(100vw - 32px)); }
dialog::backdrop { background: #0006; }
.mail { display: block; width: 100%; text-align: left; padding: 8px; margin-bottom: 6px; }
.mail.active { border-color: var(--accent); box-shadow: inset 3px 0 var(--accent); }
.mail.done { background: var(--code); }
.mail span { display: block; }
.mail .subject { font-weight: 600; }
.conclusion label { display: block; margin: 4px 0; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; scroll-behavior: auto !important; }
}
```

`src/main.ts`. Thứ tự khai báo có chủ đích. `DbClient` gọi `onStatus('loading')` ngay trong constructor, khi `panel`/`work` chưa tồn tại, nên `onDbStatus` chỉ đụng tới topbar cho tới nhánh `ready`. Plan 1b chèn `registerVizTabs(…)` ngay sau `const db = new DbClient(…)`, trước `createPanel`:
```ts
import './style.css';
import { loadTickets } from './content';
import { DbClient, type DbStatus } from './db/client';
import { applyStatic, setLang, type Lang } from './i18n';
import { contentProblems, nextTicket, SKILLS, xpFor } from './progress';
import { loadSave, parseSave, serializeSave, type Known } from './save';
import { actions, app, done, editorSchema, persist, selected, type Column } from './state';
import { localStore } from './storage';
import type { Ticket } from './tickets';
import { renderBrief } from './ui/brief';
import { byId, h } from './ui/dom';
import { errorText } from './ui/feedback';
import { renderInbox } from './ui/inbox';
import { initLayout } from './ui/splitter';
import { createPanel, registerCoreTabs } from './ui/tabs';
import { renderTopbar } from './ui/topbar';
import { mountWork } from './ui/work';

app.tickets = loadTickets();
const problems = contentProblems(app.tickets);
if (problems.length) console.warn('Content problems:', problems);
const known: Known = { ticketIds: new Set(app.tickets.map((x) => x.id)), skills: new Set(SKILLS.map((s) => s.id)) };

const loaded = loadSave(localStore(), known);
app.save = loaded.save;
if (loaded.warning?.kind === 'newer') app.notice = { key: 'save.newerLoaded', params: { v: loaded.warning.version ?? 0 } };
if (loaded.warning?.kind === 'corrupt') app.notice = { key: 'save.corrupt' };

const firstOpen = (): string => (nextTicket(app.tickets, done()) ?? app.tickets[app.tickets.length - 1]).id;
app.selectedId = firstOpen();
applyStatic();

async function loadColumns(): Promise<void> {
  try {
    const r = await db.run(
      "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
    );
    const next: Record<string, Column[]> = {};
    for (const [table, name, type] of r.rows as string[][]) (next[table] ??= []).push({ name, type });
    app.columns = next;
    work.setSchema(editorSchema());
    panel.refresh();
  } catch (e) {
    console.warn('Could not read the schema:', errorText(e));
  }
}

// DbClient reports 'loading' from its constructor, before panel/work exist: this callback touches only
// the top bar, except in the 'ready' branch, which always arrives later (after the worker has booted).
function onDbStatus(s: DbStatus): void {
  app.dbStatus = s;
  if (s !== 'loading') app.loadProgress = undefined;
  renderTopbar();
  if (s === 'ready' && Object.keys(app.columns).length === 0) void loadColumns();
}
const db = new DbClient(onDbStatus);
db.onProgress = (p) => {
  app.loadProgress = p;
  renderTopbar();
};
app.run = (sql) => db.run(sql);

registerCoreTabs(() => work.currentSql());
const panel = createPanel(byId('panel'));
const work = mountWork(byId('work'), {
  db,
  panel,
  onSolved: (t) => complete(t),
  onStepSolved: nextStep,
  onConclusion: (t) => {
    app.conclusionFor = t.id;
    rerender();
  },
  onRun: () => rerender(),
});

/** Language switch and progress changes: redraws text, never remounts the editor. */
function rerender(): void {
  renderTopbar();
  renderInbox();
  renderBrief(byId('ticket'), selected(), app.stepIndex);
  work.relabel();
}

function selectTicket(id: string): void {
  app.selectedId = id;
  app.stepIndex = 0;
  app.conclusionFor = '';
  (byId('inbox-dialog') as HTMLDialogElement).close();
  rerender();
  work.setTicket(selected(), app.stepIndex);
  byId('brief-title').focus();
}

function nextStep(): void {
  app.stepIndex++;
  rerender();
  work.setTicket(selected(), app.stepIndex);
  work.focus(); // the new step's editor replaces the one that had focus
}

/** Correct answer: save at once, stay on the ticket and show the Recap (no auto-jump). */
function complete(t: Ticket): void {
  if (done().has(t.id)) return;
  const gained = xpFor(t, app.save.hintsUsed[t.id] ?? 0);
  app.save.completed.push(t.id);
  app.save.xp += gained;
  persist(true);
  app.conclusionFor = '';
  app.justCompleted = t.id;
  rerender();
  work.setSchema(editorSchema()); // a boss may open the next chapter's tables
  panel.refresh();
}

Object.assign(actions, { rerender, selectTicket, complete, retryDb: () => db.restart() });

byId('inbox-btn').addEventListener('click', () => (byId('inbox-dialog') as HTMLDialogElement).showModal());

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-lang]')) {
  b.addEventListener('click', () => {
    setLang(b.dataset.lang as Lang);
    rerender();
    panel.refresh();
  });
}

byId('export-btn').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([serializeSave(app.save)], { type: 'application/json' }));
  h('a', { href: url, download: 'cargo-query-save.json' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

(byId('import-input') as HTMLInputElement).addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    app.save = parseSave(await file.text(), known);
    persist(true);
    app.notice = { key: 'save.imported' };
    selectTicket(firstOpen());
    work.setTicket(selected(), app.stepIndex, true); // same ticket id: the imported draft still needs a fresh editor
    work.setSchema(editorSchema());
    panel.refresh();
  } catch (err) {
    app.notice = { key: 'save.importFailed', params: { reason: errorText(err) } };
    renderTopbar();
  }
});

// A lazy chunk (sql-formatter; Plan 1b: Mermaid, libpg-query) 404s after a deploy: offer a reload.
window.addEventListener('vite:preloadError', () => {
  app.notice = { key: 'app.newVersion', reload: true };
  renderTopbar();
});

initLayout(byId('shell'), { col: byId('split-col'), row: byId('split-row') });
rerender();
work.setTicket(selected(), app.stepIndex);
```

- [ ] **Step 9: Kiểm kiểu, test và build**

Run: `npx vitest run && npm run build`
Expected: mọi test PASS; `tsc --noEmit` không lỗi; Vite build xong. `dist/assets` có `.wasm`/`.data` của PGlite, `worker-*.js`, và một chunk riêng chứa `sql-formatter` (≈ 69 KB, ≈ 20 KB gzip). Chunk `index-*.js` ≤ 250 KB gzip (đo lúc viết plan: ≈ 202 KB).

- [ ] **Step 10: Kiểm thủ công trên trình duyệt**

Run: `npm run build && npx vite preview`, mở URL in ra (trình duyệt đặt tiếng Việt, hoặc bấm `VI`). Kiểm lần lượt:
1. **Tải trang:** đề `ch1-01` hiện ngay, trước khi DB sẵn sàng. Topbar hiện "Đang tải database x MB" (có dạng `x/y MB` nếu server không nén), rồi "Database sẵn sàng". Console không có lỗi. Editor có sẵn `SELECT * FROM ports` (starter). Tab đang mở là **Cột** với 5 bảng chương 1. Coach mark 1 nằm trong khung đề.
2. **Chạy khi DB chưa sẵn sàng:** tải lại trang, bấm Chạy ngay → nút thành "Đang chờ database…", có dòng "Database đang khởi động…", query tự chạy khi DB sẵn sàng.
3. **Chạy:** Ctrl+Enter → tab Kết quả, caption "Kết quả: 24 dòng". Coach mark 2 xuất hiện. Shape card: "3 cột · 24 dòng · không cần thứ tự", nhãn `code chữ`, `name chữ`, `country chữ`, và "Của bạn: 6 cột ✗ · 24 dòng ✓". Card không có tên cột nào khác ngoài nhãn `columns:`.
4. **Định dạng:** sửa thành `select code, name, country from ports` → Shift+Alt+F → SQL được định dạng, từ khóa viết hoa; Ctrl+Z hoàn tác được. Gõ `select (` → Shift+Alt+F → báo "Không định dạng được…".
5. **Nộp:** Ctrl+Shift+Enter → "Đúng rồi!". Ở lại `ch1-01`, Recap hiện với focus ở heading "Bạn vừa học được": thẻ kỹ năng `SELECT`, "SQL của bạn" cạnh "Cách tham khảo", "+100 XP", coach mark 3. Nút Nộp ẩn. Topbar "★ 100 XP", "Hộp thư (1 mới)".
6. **Đổi ngôn ngữ:** đặt con trỏ giữa editor, bấm `EN` → mọi chữ sang tiếng Anh (`Columns`, `Expected result`, `Next ticket →`), `<html lang="en">`. Editor giữ nguyên nội dung, con trỏ và undo. Bấm `VI` → quay lại. Tải lại trang → ngôn ngữ vẫn giữ (`cargo-query/prefs`).
7. **Ticket tiếp theo:** "Ticket tiếp theo →" → `ch1-02`. Focus ở tiêu đề ticket, tab Cột, editor trống. Coach mark 4 nằm trên nút "Gợi ý 1/3 (−25 XP)". Bấm Gợi ý → gợi ý 1 hiện, nút thành "Gợi ý 2/3 (−25 XP)", editor không mất con trỏ.
8. **Lỗi biết dạy:** gõ `SELECT code FROM ports WHERE region = "Europe"` → Chạy. Tab Kết quả hiện `column "Europe" does not exist` và bên dưới là giải thích nháy kép/nháy đơn. Trong editor, `"Europe"` bị gạch đỏ; rê chuột vào thì thấy message. Thêm dòng thứ hai `SELECT 1`, bôi đen nó → nút thành "▶ Chạy vùng chọn" → Chạy → chỉ câu đó chạy (1 dòng). Bỏ bôi đen, sửa một ký tự → dải "SQL đã thay đổi…" xuất hiện.
9. **Nộp sai:** `SELECT code FROM ports` → Nộp → "Kết quả cần 3 cột…", tab không đổi. `SELECT code, name, country FROM ports` → Nộp → "Thiếu/Thừa…" kèm dòng mẫu; tab Kết quả mở, dòng không khớp có nhãn "không khớp".
10. **Timeout:** `SELECT count(*) FROM shipments a, shipments b` → sau ~5s tab Kết quả báo "Query chạy quá 5 giây… JOIN thiếu ON…", DB nạp lại, query thường chạy lại được. Làm lại bằng Nộp → phản hồi dưới editor là cùng câu timeout, không phải dòng trống.
11. **Rollback:** `UPDATE ports SET name = 'x'` → báo "Câu lệnh đã chạy và được hoàn tác (ROLLBACK)…". Sau đó `SELECT count(*) FROM ports WHERE name = 'x'` → 0.
12. **Lịch sử:** "Lịch sử (n)" liệt kê các query vừa chạy kèm ✓/✗ và số dòng. Bấm một mục → editor thay bằng SQL đó, Ctrl+Z hoàn tác được. Tải lại trang → lịch sử còn.
13. **Boss:** nhập file save đã xong `ch1-01`…`ch1-04` (Xuất tiến độ, sửa `completed` trong file, rồi Nhập) → "Đã nhập tiến độ.", mở `ch1-05`. Bước 1 đúng → "Bước 1 xong…", đề sang Bước 2/2, editor mới (draft `ch1-05#1`). Bước 2 đúng → form Kết luận. Chọn sai → "Chưa đúng…". Bấm EN rồi VI → lựa chọn radio vẫn giữ. Chọn đúng → Recap, chương 2 mở; tab Cột có `containers`, autocomplete gợi ý `containers`.
14. **Tablist bằng bàn phím:** Tab tới thanh tab → ←/→/Home/End chuyển focus, Enter mở tab. Shift+Tab/Tab đi qua mọi nút. Esc đóng Hộp thư.
15. **Bố cục:** màn ≥ 1024×700 → không cuộn trang, mỗi vùng tự cuộn. Kéo hai thanh chia, hoặc focus vào thanh chia và dùng ←/→ (cột) hay ↑/↓ (panel) để đổi ±5%; nhấp đúp để về mặc định. Tải lại trang → kích thước giữ nguyên (`cargo-query/layout`). Thu hẹp < 900px → xếp 1 cột, không cuộn ngang. < 600px → thanh nút Chạy/Nộp dính đáy.
16. **Tương phản/dark mode:** bật dark mode → nút Nộp chữ tối trên nền xanh; ticket đã xong trong Hộp thư đọc rõ (không mờ).
17. **Bỏ qua hướng dẫn:** xóa `cargo-query-save` và `cargo-query/coach-done` trong DevTools → tải lại → bấm "Bỏ qua hướng dẫn" → coach mark biến mất và không hiện lại sau khi tải lại.
18. **Phím tắt trùng trình duyệt:** kiểm Ctrl+Enter, Ctrl+Shift+Enter, Shift+Alt+F trên Chrome và Firefox (Windows), Cmd trên macOS. Không phím nào mở chức năng của trình duyệt.
19. **Phiên bản mới (F8):** `npm run build`, xóa file chunk chứa `formatDialect` trong `dist/assets` (`grep -l formatDialect dist/assets/*.js`, chọn file không phải `index-*`), chạy `npx vite preview`, bấm Định dạng → banner "Có phiên bản mới… Tải lại trang" cùng nút tải lại (dưới editor còn dòng "Không định dạng được…"). Chạy lại `npm run build` sau khi kiểm.
20. **Lưu bị chặn:** chạy `vite preview`, mở trang trong cửa sổ ẩn danh có chặn site data → banner "Không lưu được tiến độ…" sau lần gõ đầu, game vẫn chơi được.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json index.html src tests
git commit -m "feat: game UI split into state/ui modules with VI/EN, shape card, recap and teaching errors"
```

---

### Task 11: CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: tên file, module và key localStorage của Task 1–10 (bảng File Structure ở đầu plan).
- Produces: `CLAUDE.md` ở gốc repo. Plan 1b Task 8 và Plan 1c thêm mục vào file này.

- [ ] **Step 1: Viết `CLAUDE.md`**

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Cargo Query: browser game for learning PostgreSQL as a data analyst at a fictional freight forwarder. Spec: `docs/superpowers/specs/2026-11-16-cargo-query-design.md`. Plans: `docs/superpowers/plans/`. Team decisions: `docs/team/amendments.md` (the user's decisions D1–D6 at the end override everything above them).

## Commands

```bash
npm run dev                                   # Vite dev server
npm test                                      # all tests (Vitest, PGlite runs in Node; seed takes ~2s per DB)
npx vitest run tests/grader.test.ts           # one file
npx vitest run tests/grader.test.ts -t alias  # one test by name
npx tsc --noEmit                              # Vitest does not typecheck: run this after every change
npm run build                                 # typecheck + production build
```

## Architecture

- Everything runs in the browser; no backend (if one is ever added it must be Python).
- `src/db/worker.ts` runs PGlite in a dedicated Web Worker, seeds it via `initDb`, and executes one query at a time through `runSandboxed` (`BEGIN` → query → `ROLLBACK`). PGlite rejects multi-statement input, so players cannot escape the rollback. Results over `MAX_ROWS_WORKER` (50,000) are cut and flagged `truncated`. The worker wraps `fetch` (`countingFetch`) to report asset download bytes.
- `src/db/client.ts` (`DbClient`) queues queries and posts one at a time, so the 5s timeout measures only the running query. `statement_timeout` does not work in PGlite, so a query over 5s terminates the worker and boots a fresh one. Errors are typed and carry no user-facing text (`SqlError` with `position`/`code`/`hint`, `QueryTimeoutError`, `DbRestartError`, `DbFailedError`); the UI translates them by class in `errorText()` (`src/ui/feedback.ts`). Do not switch to `PGliteWorker`: its multi-tab leader election breaks `terminate()`.
- `src/grader.ts` runs the player's SQL and the step's Solution on the same DB and compares by column position, as a row multiset (or sequence when `ordered: true`), with all numbers rounded to 2 decimals. PGlite returns `numeric` as strings and `date` as `Date`.
- Tickets are markdown files in `content/tickets/chN/`, loaded by `src/content.ts` (`import.meta.glob`) and parsed by `src/tickets.ts`. VI text comes first, then a `# EN` block with the same sections (no SQL; SQL and frontmatter exist once). Frontmatter: `title_en`, `conclusion_en` (boss), `columns:` (result labels for the shape card), `starter:`, `variants:`. Optional `## Task` holds the concrete request. Normal tickets have one `## Solution`; boss tickets have `## Step N: …` sections plus a `conclusion`. Use `textOf(ticket, lang)` for any player-facing ticket text. Copy `content/TEMPLATE.md` to start a ticket.
- `content/skills.yml` (skill cards: label/syntax/when/trap) and `content/chapters.yml` (chapter titles and outcomes) are loaded by `src/progress.ts`, which also holds linear progression, XP, which tables each chapter reveals (`CHAPTER_TABLES`) and `contentProblems` (soft-lock, pacing, skill-map and twist→boss checks).
- `src/save.ts` is the versioned progress save under localStorage key `cargo-query-save`. Bump `SAVE_VERSION` with a migration in `MIGRATIONS`; keep old fixtures in `tests/fixtures/` forever. Before migrating, the old save is copied to `cargo-query-save.v<old>`; an unreadable or newer save goes to `cargo-query-save.bak`.
- UI: plain TypeScript DOM via `h()` (`src/ui/dom.ts`), no framework. `src/state.ts` holds app state and selectors (no DOM); `actions` lets UI modules call back into `main.ts`. One module per region: `ui/topbar.ts`, `ui/inbox.ts`, `ui/brief.ts` (left pane: message, task, shape card, hints, conclusion, Recap), `ui/work.ts` (editor, Run/Format/Submit, feedback, history), `ui/tabs.ts` (bottom panel). `main.ts` only wires them together.
- Render rule: `rerender()` redraws text (top bar, inbox, brief, `work.relabel()`) and must never recreate the editor. `work.setTicket()` recreates it only when `ticketId#step` changes.
- Bottom-panel tabs register through `registerTab()` in `src/ui/tabs.ts` (group `output | query | schema`, then `order`) before `createPanel()`. Every tab describes `app.lastRun` (the last run, never the live editor) and shows a "SQL changed" strip when the editor differs.
- i18n: `src/i18n/vi.ts` is the key source; `src/i18n/en.ts` is `Record<Key, Msg>`, so a missing key fails `tsc`. All UI text goes through `t(key)`; static markup uses `data-i18n`/`data-i18n-aria`. EN plurals use function messages. Never translate table/column names, SQL, data values, Postgres error messages, or people's names and departments. `tests/i18n.test.ts` checks placeholders match and EN differs from VI (allow-list `SAME_OK`).
- Teaching errors: `src/ui/sqlErrors.ts` maps SQLSTATE (plus a few message regexes) to an explanation shown under Postgres' unchanged message; `tests/sqlErrors.test.ts` runs the wrong SQL on real PGlite.
- The shape card ("Expected result") shows column count/kinds, row count and the `columns:` labels, never the Solution's column names (they would give the answer away).
- localStorage keys besides the save, all device preferences wrapped in try/catch (`src/storage.ts`) and never part of `Save`: `cargo-query/prefs` (`{ lang }`), `cargo-query/layout` (splitter sizes), `cargo-query/coach-done` (onboarding skipped), `cargo-query/history` (15 queries per ticket).
- Dependencies are pinned exactly: `@electric-sql/pglite` 0.5.16 (seed depends on it), `@codemirror/lint` 6.9.8, `sql-formatter` 15.9.0 (lazy-loaded by Format / Shift+Alt+F).

## Content and seed rules

- `src/db/seed.sql` is deterministic. Each random block starts with its own `setseed()`; append new blocks at the end only. PGlite is pinned to an exact version because `random()` output depends on the Postgres build.
- In-game "today" is 2026-10-31. Solutions use literal dates; `tests/content.test.ts` fails on `CURRENT_DATE`/`now()`.
- Ordered or top-N tickets must state a complete tiebreaker in the prompt.
- Each chapter must go teach → … → rest → boss, `requires`/`tables` must already be granted/unlocked, and every skill a twist ticket grants must be in the boss's `requires` (`contentProblems`).
- Every ticket ships VI + EN (release gate: 0 tickets without `# EN`). Code spans must be identical in VI and EN, EN must contain no Vietnamese diacritics, and `columns:` must have one label per Solution column (`tests/content.test.ts`).
- Story hooks the later chapters rely on are listed at the top of `seed.sql`; do not change them without updating tickets and `tests/seed.test.ts`.
- Project skills live in `.claude/skills/` (`web-games`, `level-design`, `save-systems`).
````

- [ ] **Step 2: Chạy toàn bộ kiểm tra lần cuối**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: tất cả test PASS; `tsc` không lỗi; build xong.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md"
```

---

## Ghi chú chuyển sang Plan 2 (không làm trong plan này)

- `cellKey` coi mọi chuỗi trông như số là số, nên HS code `0901` sẽ bằng `901`. Trước khi có bảng `hs_codes`, đổi sang dựa vào OID trong `QueryResult.types` (chỉ làm tròn khi cột là kiểu số).
- Làm tròn 2 chữ số khiến tỉ lệ 0–1 bị chấm quá dễ: ticket về tỉ lệ phải yêu cầu đơn vị phần trăm.
- `to_char` và `date_trunc` cho kết quả khác kiểu: ticket về thời gian phải nêu rõ dạng đầu ra (ví dụ "tháng dạng `date` ngày đầu tháng").
