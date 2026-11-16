# Cargo Query — Plan 1: Engine + chương 1–3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Web game học SQL chạy hoàn toàn trong trình duyệt: PGlite trong Web Worker, seed dữ liệu forwarder lõi, grader, lưu tiến độ, UI inbox/editor/kết quả, và 15 ticket chương 1–3.

**Architecture:** Vite + TypeScript thuần DOM. Một dedicated Web Worker chạy PGlite, khởi tạo schema + seed tất định, chạy mọi query trong `BEGIN … ROLLBACK`. Grader là hàm thuần so kết quả query người chơi với Solution. Ticket là file markdown nạp bằng `import.meta.glob`. Tiến độ lưu JSON có version trong `localStorage`.

**Tech Stack:** Vite, TypeScript, Vitest, `@electric-sql/pglite` 0.5.16 (Postgres 18.6), CodeMirror 6 (`codemirror`, `@codemirror/lang-sql`), `yaml`.

**Spec:** `docs/superpowers/specs/2026-11-16-cargo-query-design.md`

**Thứ tự bản phát hành:** bản đầu tiên = Plan 1 + Plan 2 (bảng Ops/Hải quan/Tài chính/Pricing + chương 4–5) + Plan 3 (Chứng từ/D&D/Claims + câu chuyện + chương 6–7). Plan 1 chỉ là bước xây đầu, chưa phát hành riêng.

## Global Constraints

- `@electric-sql/pglite` cài **đúng 0.5.16** (`--save-exact`); đổi version có thể đổi dữ liệu seed.
- "Hôm nay" trong game = **2026-10-31**. Solution không dùng `CURRENT_DATE`, `now()`, `current_timestamp`, `localtimestamp`.
- Mỗi khối random trong `seed.sql` bắt đầu bằng `setseed()` riêng; khối mới chỉ thêm vào **cuối** file.
- Ticket có thứ tự / top-N phải nêu tiêu chí phá hòa đầy đủ trong đề.
- Nội dung hiển thị tiếng Việt; tên bảng/cột tiếng Anh.
- Không đưa chuỗi từ nội dung/kết quả vào `innerHTML`; luôn dùng `textContent`/`append`.
- Mọi truy cập `localStorage` bọc try/catch.
- Backend (nếu sau này có) viết bằng Python — không thuộc plan này.
- Vitest không kiểm kiểu: mọi bước "xác nhận PASS" chạy thêm `npx tsc --noEmit` và phải không lỗi.

## File Structure

```
package.json, tsconfig.json, vite.config.ts, .gitignore, index.html, CLAUDE.md
src/
  db/schema.sql        DDL 6 bảng lõi
  db/seed.sql          seed tất định
  db/init.ts           initDb(db): chạy schema + seed
  db/run.ts            runSandboxed(db, sql): BEGIN → query (rowMode array) → ROLLBACK; type QueryResult
  db/worker.ts         Web Worker: PGlite + hàng đợi tuần tự
  db/client.ts         DbClient: gửi query tới worker, timeout 5s → terminate + khởi động lại
  grader.ts            cellKey, compareResults, grade, errorMessage; type GradeResult
  tickets.ts           type Ticket, parseTicket, byOrder
  content.ts           loadTickets() qua import.meta.glob
  progress.ts          CHAPTER_TABLES, tablesUnlocked, nextTicket, visibleTickets, currentChapter, xpFor, contentProblems
  save.ts              Save versioned: parseSave, loadSave, writeSave, serializeSave
  ui/dom.ts            h(), richText()
  ui/resultTable.ts    renderResult, formatCell
  ui/feedback.ts       gradeMessage
  ui/editor.ts         createEditor (CodeMirror)
  main.ts              trạng thái app + render
  style.css
content/tickets/ch1..ch3/*.md
tests/helpers.ts, seed.test.ts, grader.test.ts, tickets.test.ts, progress.test.ts, save.test.ts, content.test.ts
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

### Task 4: Parser ticket

**Files:**
- Create: `src/tickets.ts`
- Test: `tests/tickets.test.ts`

**Interfaces:**
- Produces:
  - `type Beat = 'teach' | 'develop' | 'twist' | 'rest' | 'boss'`
  - `interface Step { title: string; prompt: string; solution: string }`
  - `interface Conclusion { question: string; options: string[]; answer: number }`
  - `interface Ticket { id: string; chapter: number; title: string; from: { name: string; dept: string }; difficulty: number; beat: Beat; requires: string[]; grants: string[]; tables: string[]; ordered: boolean; body: string; hints: string[]; steps: Step[]; conclusion?: Conclusion }` — ticket thường có đúng 1 step (`title: ''`, `prompt: ''`); boss có ≥ 2 step + `conclusion`
  - `parseTicket(source: string, origin: string): Ticket` — throw `Error` có `origin` khi sai định dạng
  - `byOrder(a: Ticket, b: Ticket): number` — sắp theo chương rồi id

- [ ] **Step 1: Viết test**

`tests/tickets.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { parseTicket } from '../src/tickets';

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

describe('parseTicket', () => {
  it('ticket thường', () => {
    const t = parseTicket(NORMAL, 'x.md');
    expect(t).toMatchObject({
      id: 'ch1-02', chapter: 1, title: 'Cảng châu Âu', from: { name: 'Hoàng Khánh', dept: 'Ops' },
      difficulty: 1, beat: 'develop', requires: ['select'], grants: ['where'], tables: ['ports'], ordered: false,
      hints: ['Gợi ý một', 'Gợi ý hai', 'Gợi ý ba'],
    });
    expect(t.body).toBe('Lọc giúp mình các cảng ở `Europe`.\n\nDòng thứ hai.');
    expect(t.steps).toEqual([{ title: '', prompt: '', solution: "SELECT code FROM ports WHERE region = 'Europe'" }]);
    expect(t.conclusion).toBeUndefined();
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
  });

  it('báo lỗi khi thiếu frontmatter, thiếu solution, sai beat, boss thiếu kết luận', () => {
    expect(() => parseTicket('no frontmatter', 'a.md')).toThrow(/a\.md/);
    expect(() => parseTicket(NORMAL.replace(/## Solution[\s\S]*$/, ''), 'b.md')).toThrow(/b\.md/);
    expect(() => parseTicket(NORMAL.replace('beat: develop', 'beat: party'), 'c.md')).toThrow(/beat/);
    expect(() => parseTicket(BOSS.replace(/conclusion:[\s\S]*?answer: 0\n/, ''), 'd.md')).toThrow(/conclusion/);
    expect(() => parseTicket(NORMAL.replace('3. Gợi ý ba\n', ''), 'e.md')).toThrow(/3 hints/);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/tickets.test.ts`
Expected: FAIL — không resolve được `../src/tickets`.

- [ ] **Step 3: Viết `src/tickets.ts`**

```ts
import { parse as parseYaml } from 'yaml';

export type Beat = 'teach' | 'develop' | 'twist' | 'rest' | 'boss';
export interface Step { title: string; prompt: string; solution: string }
export interface Conclusion { question: string; options: string[]; answer: number }
export interface Ticket {
  id: string;
  chapter: number;
  title: string;
  from: { name: string; dept: string };
  difficulty: number;
  beat: Beat;
  requires: string[];
  grants: string[];
  tables: string[];
  ordered: boolean;
  body: string;
  hints: string[];
  /** Normal tickets: exactly one step with empty title/prompt. Boss: 2+ steps. */
  steps: Step[];
  conclusion?: Conclusion;
}

const BEATS: Beat[] = ['teach', 'develop', 'twist', 'rest', 'boss'];
const FM_RE = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const SQL_RE = /```sql\n([\s\S]*?)```/;

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export function parseTicket(source: string, origin: string): Ticket {
  const fail = (msg: string): never => {
    throw new Error(`${origin}: ${msg}`);
  };
  const m = FM_RE.exec(source.replace(/\r\n/g, '\n'));
  if (!m) return fail('thiếu frontmatter ---');
  const fm = (parseYaml(m[1]) ?? {}) as Record<string, unknown>;
  const [body, ...sections] = m[2].split(/^## /m);

  const hints: string[] = [];
  const steps: Step[] = [];
  for (const sec of sections) {
    const nl = sec.indexOf('\n');
    const heading = (nl === -1 ? sec : sec.slice(0, nl)).trim();
    const content = nl === -1 ? '' : sec.slice(nl + 1);
    if (heading === 'Hints') {
      for (const line of content.split('\n')) {
        const h = /^\d+\.\s+(.*)$/.exec(line.trim());
        if (h) hints.push(h[1]);
      }
    } else if (heading === 'Solution' || /^Step \d+:/.test(heading)) {
      const sql = SQL_RE.exec(content) ?? fail(`mục "${heading}" thiếu khối \`\`\`sql`);
      steps.push({
        title: heading === 'Solution' ? '' : heading.replace(/^Step \d+:\s*/, ''),
        prompt: heading === 'Solution' ? '' : content.replace(SQL_RE, '').trim(),
        solution: sql[1].trim(),
      });
    }
  }

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
    body: body.trim(),
    hints,
    steps,
  };

  if (hints.length !== 3) fail('cần đúng 3 hints');
  if (t.beat === 'boss') {
    const c = fm.conclusion as Partial<Conclusion> | undefined;
    if (!c || typeof c.question !== 'string' || !Array.isArray(c.options) || typeof c.answer !== 'number' || c.answer < 0 || c.answer >= c.options.length) {
      fail('boss cần conclusion { question, options, answer } hợp lệ');
    }
    t.conclusion = { question: c!.question!, options: c!.options!.map(String), answer: c!.answer! };
    if (steps.length < 2 || steps.some((s) => s.title === '')) fail('boss cần ≥ 2 mục "## Step N: ..." và không có "## Solution"');
  } else if (steps.length !== 1 || steps[0].title !== '') {
    fail('ticket thường cần đúng một mục "## Solution"');
  }
  return t;
}

export const byOrder = (a: Ticket, b: Ticket): number => a.chapter - b.chapter || a.id.localeCompare(b.id);
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/tickets.test.ts`
Expected: 4 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/tickets.ts tests/tickets.test.ts
git commit -m "feat: markdown ticket parser"
```

---

### Task 5: Tiến trình chơi và kiểm tra nội dung (soft-lock, nhịp chương)

**Files:**
- Create: `src/progress.ts`
- Test: `tests/progress.test.ts`

**Interfaces:**
- Consumes: `Ticket` (Task 4)
- Produces:
  - `CHAPTER_TABLES: Record<number, string[]>`, `CHAPTER_TITLES: Record<number, string>`
  - `tablesUnlocked(chapter: number): string[]`
  - `nextTicket(tickets: Ticket[], completed: Set<string>): Ticket | undefined` — `tickets` đã sắp theo `byOrder`; tiến trình tuyến tính
  - `visibleTickets(tickets: Ticket[], completed: Set<string>): Ticket[]` — đã xong + ticket kế tiếp
  - `currentChapter(tickets: Ticket[], completed: Set<string>): number`
  - `xpFor(ticket: Ticket, hintsUsed: number): number` — `difficulty × 100 × (1 − 0.25 × min(hints, 3))`
  - `contentProblems(tickets: Ticket[]): string[]` — rỗng = hợp lệ

- [ ] **Step 1: Viết test**

`tests/progress.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { contentProblems, currentChapter, nextTicket, tablesUnlocked, visibleTickets, xpFor } from '../src/progress';
import type { Beat, Ticket } from '../src/tickets';

const mk = (id: string, beat: Beat, extra: Partial<Ticket> = {}): Ticket => ({
  id, chapter: Number(id[2]), title: id, from: { name: 'A', dept: 'Ops' }, difficulty: 2, beat,
  requires: [], grants: [], tables: ['ports'], ordered: false, body: '', hints: ['a', 'b', 'c'],
  steps: [{ title: '', prompt: '', solution: 'SELECT 1' }], ...extra,
});

const chapter1 = [
  mk('ch1-01', 'teach', { grants: ['select'] }),
  mk('ch1-02', 'develop', { requires: ['select'], grants: ['where'] }),
  mk('ch1-03', 'twist'),
  mk('ch1-04', 'rest'),
  mk('ch1-05', 'boss', { requires: ['where'] }),
];

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

describe('contentProblems', () => {
  it('chương hợp lệ → không có lỗi', () => {
    expect(contentProblems(chapter1)).toEqual([]);
  });

  it('phát hiện kỹ năng chưa dạy (soft-lock)', () => {
    const bad = chapter1.map((t) => (t.id === 'ch1-02' ? { ...t, requires: ['join'] } : t));
    expect(contentProblems(bad)).toContain('ch1-02: cần kỹ năng "join" nhưng chưa ticket nào trước đó dạy');
  });

  it('phát hiện bảng chưa mở', () => {
    const bad = chapter1.map((t) => (t.id === 'ch1-03' ? { ...t, tables: ['containers'] } : t));
    expect(contentProblems(bad)).toContain('ch1-03: dùng bảng "containers" chưa mở ở chương 1');
  });

  it('phát hiện sai nhịp chương và trùng id', () => {
    // beats: develop, teach, rest, boss, twist, twist
    const bad = [chapter1[1], chapter1[0], chapter1[3], chapter1[4], chapter1[2], chapter1[2]];
    const problems = contentProblems(bad);
    expect(problems).toContain('chương 1: ticket đầu phải là teach');
    expect(problems).toContain('chương 1: ticket cuối phải là boss');
    expect(problems).toContain('chương 1: ngay trước boss phải là rest');
    expect(problems).toContain('ch1-03: trùng id');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/progress.test.ts`
Expected: FAIL — không resolve được `../src/progress`.

- [ ] **Step 3: Viết `src/progress.ts`**

```ts
import type { Ticket } from './tickets';

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

export const CHAPTER_TITLES: Record<number, string> = {
  1: 'Tuần thử việc',
  2: 'Báo cáo sản lượng',
  3: 'Nối dữ liệu',
  4: 'Thời gian & phân loại',
  5: 'Câu hỏi nhiều bước',
  6: 'Xu hướng',
  7: 'Điều tra',
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

/** Soft-lock and pacing checks from the level-design skill. `tickets` must be sorted by byOrder. */
export function contentProblems(tickets: Ticket[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  const granted = new Set<string>();
  for (const t of tickets) {
    if (seen.has(t.id)) problems.push(`${t.id}: trùng id`);
    seen.add(t.id);
    for (const skill of t.requires) {
      if (!granted.has(skill)) problems.push(`${t.id}: cần kỹ năng "${skill}" nhưng chưa ticket nào trước đó dạy`);
    }
    const open = tablesUnlocked(t.chapter);
    for (const table of t.tables) {
      if (!open.includes(table)) problems.push(`${t.id}: dùng bảng "${table}" chưa mở ở chương ${t.chapter}`);
    }
    for (const skill of t.grants) granted.add(skill);
  }
  for (const chapter of new Set(tickets.map((t) => t.chapter))) {
    const beats = tickets.filter((t) => t.chapter === chapter).map((t) => t.beat);
    if (beats[0] !== 'teach') problems.push(`chương ${chapter}: ticket đầu phải là teach`);
    if (beats[beats.length - 1] !== 'boss') problems.push(`chương ${chapter}: ticket cuối phải là boss`);
    if (beats[beats.length - 2] !== 'rest') problems.push(`chương ${chapter}: ngay trước boss phải là rest`);
    if (beats.filter((b) => b === 'boss').length !== 1) problems.push(`chương ${chapter}: cần đúng một boss`);
  }
  return problems;
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/progress.test.ts`
Expected: tất cả PASS.

- [ ] **Step 5: Commit**

```bash
git add src/progress.ts tests/progress.test.ts
git commit -m "feat: linear progression, XP and content soft-lock checks"
```

---

### Task 6: Lưu tiến độ có version

**Files:**
- Create: `src/save.ts`, `tests/fixtures/save-v1.json`
- Test: `tests/save.test.ts`

**Interfaces:**
- Produces:
  - `SAVE_VERSION = 1`, `SAVE_KEY = 'cargo-query/save'`
  - `interface Save { version: number; completed: string[]; xp: number; hintsUsed: Record<string, number>; drafts: Record<string, string> }` — key của `drafts` là `"<ticketId>#<stepIndex>"`
  - `class NewerSaveError extends Error`
  - `emptySave(): Save`
  - `parseSave(raw: string, knownIds: Set<string>): Save` — throw khi JSON hỏng / version sai; `NewerSaveError` khi version mới hơn
  - `serializeSave(s: Save): string`
  - `type KV = Pick<Storage, 'getItem' | 'setItem'>`
  - `loadSave(storage: KV | undefined, knownIds: Set<string>): { save: Save; warning?: string }` — save hỏng/mới hơn được chép sang `SAVE_KEY + '.bak'` trước khi bắt đầu lại
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
import { emptySave, loadSave, NewerSaveError, parseSave, SAVE_KEY, serializeSave, writeSave, type KV } from '../src/save';

const ids = new Set(['ch1-01', 'ch1-02', 'ch1-03']);

function memoryStorage(initial: Record<string, string> = {}): KV & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('save', () => {
  it('round-trip', () => {
    const s = { ...emptySave(), completed: ['ch1-01'], xp: 100, hintsUsed: { 'ch1-01': 2 }, drafts: { 'ch1-02#0': 'SELECT 1' } };
    expect(parseSave(serializeSave(s), ids)).toEqual(s);
  });

  it('đọc được save mẫu v1', () => {
    expect(parseSave(v1, ids)).toEqual({
      version: 1, completed: ['ch1-01', 'ch1-02'], xp: 350, hintsUsed: { 'ch1-02': 1 }, drafts: { 'ch1-03#0': 'SELECT ref FROM shipments' },
    });
  });

  it('bỏ ticket không còn tồn tại và giá trị sai kiểu', () => {
    const raw = JSON.stringify({ version: 1, completed: ['ch1-01', 'gone', 7], xp: -5, hintsUsed: { gone: 1, 'ch1-01': 'x' }, drafts: { 'gone#0': 'x' } });
    expect(parseSave(raw, ids)).toEqual({ version: 1, completed: ['ch1-01'], xp: 0, hintsUsed: {}, drafts: {} });
  });

  it('từ chối save mới hơn', () => {
    expect(() => parseSave(JSON.stringify({ version: 99 }), ids)).toThrow(NewerSaveError);
  });

  it('loadSave: không có save → save rỗng, không cảnh báo', () => {
    expect(loadSave(memoryStorage(), ids)).toEqual({ save: emptySave() });
    expect(loadSave(undefined, ids)).toEqual({ save: emptySave() });
  });

  it('loadSave: save hỏng → bắt đầu mới, giữ bản .bak, có cảnh báo', () => {
    const store = memoryStorage({ [SAVE_KEY]: '{"version": 1, "compl' });
    const r = loadSave(store, ids);
    expect(r.save).toEqual(emptySave());
    expect(r.warning).toBeTruthy();
    expect(store.data[`${SAVE_KEY}.bak`]).toBe('{"version": 1, "compl');
  });

  it('writeSave trả false khi storage lỗi', () => {
    const broken: KV = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
    expect(writeSave(broken, emptySave())).toBe(false);
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
export const SAVE_KEY = 'cargo-query/save';

export interface Save {
  version: number;
  completed: string[];
  xp: number;
  hintsUsed: Record<string, number>;
  /** Key: "<ticketId>#<stepIndex>". */
  drafts: Record<string, string>;
}

export type KV = Pick<Storage, 'getItem' | 'setItem'>;
export class NewerSaveError extends Error {}

type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
/** Index = version migrated FROM. Keep every migration forever; deleting one strands old saves. */
const MIGRATIONS: Record<number, Migration> = {};

export const emptySave = (): Save => ({ version: SAVE_VERSION, completed: [], xp: 0, hintsUsed: {}, drafts: {} });
export const serializeSave = (s: Save): string => JSON.stringify(s);

const ticketOf = (key: string) => key.split('#')[0];

function pickRecord<T>(v: unknown, ok: (x: unknown) => x is T, knownIds: Set<string>): Record<string, T> {
  const out: Record<string, T> = {};
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) if (knownIds.has(ticketOf(k)) && ok(x)) out[k] = x;
  }
  return out;
}

export function parseSave(raw: string, knownIds: Set<string>): Save {
  const data = JSON.parse(raw) as Record<string, unknown>;
  if (!data || typeof data !== 'object') throw new Error('Save không hợp lệ');
  let v = Number(data.version ?? 1);
  if (!Number.isInteger(v) || v < 1) throw new Error('Save không hợp lệ');
  if (v > SAVE_VERSION) throw new NewerSaveError(`Save này từ phiên bản game mới hơn (v${v}).`);
  let d = data;
  while (v < SAVE_VERSION) {
    d = MIGRATIONS[v](d);
    v++;
    d.version = v;
  }
  const completed = Array.isArray(d.completed)
    ? d.completed.filter((x): x is string => typeof x === 'string' && knownIds.has(x))
    : [];
  return {
    version: SAVE_VERSION,
    completed: [...new Set(completed)],
    xp: typeof d.xp === 'number' && Number.isFinite(d.xp) && d.xp >= 0 ? d.xp : 0,
    hintsUsed: pickRecord(d.hintsUsed, (x): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 0, knownIds),
    drafts: pickRecord(d.drafts, (x): x is string => typeof x === 'string', knownIds),
  };
}

export function loadSave(storage: KV | undefined, knownIds: Set<string>): { save: Save; warning?: string } {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(SAVE_KEY) ?? null;
    return { save: raw ? parseSave(raw, knownIds) : emptySave() };
  } catch (e) {
    try {
      if (raw) storage?.setItem(`${SAVE_KEY}.bak`, raw);
    } catch {
      /* storage unusable: nothing more we can keep */
    }
    const warning = e instanceof NewerSaveError ? e.message : 'Không đọc được tiến độ đã lưu.';
    return { save: emptySave(), warning: `${warning} Bắt đầu lại; bản cũ được giữ ở "${SAVE_KEY}.bak".` };
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

Run: `npx vitest run tests/save.test.ts`
Expected: tất cả PASS.

- [ ] **Step 6: Commit**

```bash
git add src/save.ts tests/save.test.ts tests/fixtures/save-v1.json
git commit -m "feat: versioned progress save with backup on failure"
```

---

### Task 7: Nạp nội dung + ticket chương 1

**Files:**
- Create: `src/content.ts`
- Create: `content/tickets/ch1/ch1-01.md` … `ch1-05.md`
- Test: `tests/content.test.ts`

**Interfaces:**
- Consumes: `parseTicket`, `byOrder` (Task 4); `contentProblems` (Task 5); `runner` (tests/helpers.ts)
- Produces: `loadTickets(): Ticket[]` (đã sắp theo `byOrder`)

- [ ] **Step 1: Viết test nội dung**

`tests/content.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { loadTickets } from '../src/content';
import { contentProblems } from '../src/progress';
import { runner } from './helpers';

const tickets = loadTickets();
const steps = tickets.flatMap((t) => t.steps.map((s, i) => ({ name: `${t.id}#${i}`, ordered: t.ordered, sql: s.solution })));

describe('nội dung ticket', () => {
  it('có ticket', () => {
    expect(tickets.length).toBeGreaterThan(0);
  });

  it('soft-lock và nhịp chương hợp lệ', () => {
    expect(contentProblems(tickets)).toEqual([]);
  });

  it.each(steps)('$name: không dùng ngày hệ thống', ({ sql }) => {
    expect(sql).not.toMatch(/current_date|current_timestamp|localtimestamp|now\s*\(/i);
  });

  it.each(steps.filter((s) => s.ordered))('$name: ticket ordered phải có ORDER BY', ({ sql }) => {
    expect(sql).toMatch(/order\s+by/i);
  });

  it.each(steps)('$name: Solution chạy được và có dữ liệu', async ({ sql }) => {
    const run = await runner();
    const r = await run(sql);
    expect(r.rows.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run tests/content.test.ts`
Expected: FAIL — không resolve được `../src/content`.

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

- [ ] **Step 4: Tạo 5 ticket chương 1**

`content/tickets/ch1/ch1-01.md`:
````markdown
---
id: ch1-01
chapter: 1
title: Danh sách cảng và sân bay
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: teach
requires: []
grants: [select]
tables: [ports]
---
Chào bạn, chào mừng đến Cargo Query Logistics!

Việc đầu tiên: gửi mình danh sách tất cả cảng biển và sân bay công ty đang khai thác, gồm 3 cột: mã (`code`), tên (`name`) và quốc gia (`country`).

## Hints
1. Mọi thông tin cảng nằm trong một bảng — xem cột Schema bên phải.
2. Dùng bảng `ports`, các cột `code`, `name`, `country`.
3. `SELECT ..., ..., ... FROM ports`

## Solution
```sql
SELECT code, name, country FROM ports
```
````

`content/tickets/ch1/ch1-02.md`:
````markdown
---
id: ch1-02
chapter: 1
title: Cảng biển châu Âu
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: develop
requires: [select]
grants: [where]
tables: [ports]
---
Tuần sau team Ops họp về tuyến châu Âu.

Lọc giúp mình các cảng biển (không lấy sân bay) thuộc khu vực `Europe`: mã, tên, quốc gia.

## Hints
1. Bảng `ports` có cột `region` (khu vực) và `kind` (`SEAPORT` hoặc `AIRPORT`).
2. Hai điều kiện cùng lúc thì nối bằng `AND`; giá trị chữ đặt trong nháy đơn, ví dụ `'Europe'`.
3. `SELECT code, name, country FROM ports WHERE region = ... AND kind = ...`

## Solution
```sql
SELECT code, name, country FROM ports WHERE region = 'Europe' AND kind = 'SEAPORT'
```
````

`content/tickets/ch1/ch1-03.md`:
````markdown
---
id: ch1-03
chapter: 1
title: Lô hàng nặng nhất tháng 10
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: twist
requires: [select, where]
grants: [order_by, limit]
tables: [shipments]
ordered: true
---
Khách đang hỏi về năng lực xử lý hàng nặng của mình.

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
````

`content/tickets/ch1/ch1-04.md`:
````markdown
---
id: ch1-04
chapter: 1
title: Nhân sự phòng Hải quan
from: { name: Hoàng Ngọc, dept: Customs }
difficulty: 1
beat: rest
requires: [select, where]
grants: []
tables: [employees]
---
Phòng Hải quan vừa cập nhật sơ đồ tổ chức.

Cho mình danh sách nhân viên phòng `Customs`: họ tên (`full_name`) và chức danh (`title`).

## Hints
1. Thông tin nhân viên ở bảng `employees`, phòng ban ở cột `dept`.
2. Giá trị phòng ban là `'Customs'`.
3. `SELECT full_name, title FROM employees WHERE dept = ...`

## Solution
```sql
SELECT full_name, title FROM employees WHERE dept = 'Customs'
```
````

`content/tickets/ch1/ch1-05.md`:
````markdown
---
id: ch1-05
chapter: 1
title: Lô hàng đi Rotterdam
from: { name: Trần An, dept: Management }
difficulty: 2
beat: boss
requires: [select, where, order_by]
grants: []
tables: [shipments]
ordered: true
conclusion:
  question: Để chỉ lấy các lô đang trên đường, bạn đã lọc theo cột nào?
  options: [status, eta, booking_date]
  answer: 0
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
Từ danh sách trên, chỉ giữ các lô có `eta` trước ngày 15/11/2026 — cùng cột, cùng thứ tự.
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
````

- [ ] **Step 5: Chạy test, xác nhận PASS**

Run: `npx vitest run tests/content.test.ts`
Expected: tất cả PASS. Nếu `contentProblems` báo lỗi, sửa frontmatter ticket, **không** sửa `progress.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/content.ts content/tickets/ch1 tests/content.test.ts
git commit -m "feat: content loader and chapter 1 tickets"
```

---

### Task 8: Ticket chương 2

**Files:**
- Create: `content/tickets/ch2/ch2-01.md` … `ch2-05.md`
- Test: `tests/content.test.ts` (đã có — tự động bao gồm file mới)

- [ ] **Step 1: Tạo 5 ticket**

`content/tickets/ch2/ch2-01.md`:
````markdown
---
id: ch2-01
chapter: 2
title: Tổng kết sản lượng 2025
from: { name: Nguyễn Quang, dept: Finance }
difficulty: 1
beat: teach
requires: [select, where]
grants: [aggregate]
tables: [shipments]
---
Kế toán cần số liệu tổng kết năm 2025.

Cho mình tổng số lô và tổng trọng lượng (kg) của các lô có ngày booking trong năm 2025, không tính lô đã hủy (`CANCELLED`). Trả về một dòng, hai cột.

## Hints
1. Hàm gộp `COUNT(*)` đếm số dòng, `SUM(cột)` cộng tổng một cột.
2. Loại lô hủy bằng `status <> 'CANCELLED'`; năm 2025 là `booking_date >= '2025-01-01' AND booking_date < '2026-01-01'`.
3. `SELECT COUNT(*), SUM(gross_weight_kg) FROM shipments WHERE ...`

## Solution
```sql
SELECT COUNT(*), SUM(gross_weight_kg)
FROM shipments
WHERE booking_date >= '2025-01-01' AND booking_date < '2026-01-01'
  AND status <> 'CANCELLED'
```
````

`content/tickets/ch2/ch2-02.md`:
````markdown
---
id: ch2-02
chapter: 2
title: Cơ cấu sản lượng theo phương thức
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: develop
requires: [aggregate]
grants: [group_by]
tables: [shipments]
---
Cho mình cơ cấu sản lượng năm 2025: số lô theo từng phương thức (`mode`) và chiều (`direction`), không tính lô hủy.

Mỗi tổ hợp mode – direction là một dòng: `mode`, `direction`, số lô.

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
````

`content/tickets/ch2/ch2-03.md`:
````markdown
---
id: ch2-03
chapter: 2
title: Khách hàng chủ lực
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: twist
requires: [group_by]
grants: [having]
tables: [shipments]
---
Ban giám đốc muốn biết nhóm khách hàng chủ lực.

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
````

`content/tickets/ch2/ch2-04.md`:
````markdown
---
id: ch2-04
chapter: 2
title: Bao nhiêu lô đang trên đường?
from: { name: Hoàng Khánh, dept: Ops }
difficulty: 1
beat: rest
requires: [aggregate]
grants: []
tables: [shipments]
---
Câu nhanh thôi: hiện có bao nhiêu lô đang ở trạng thái `IN_TRANSIT`?

## Hints
1. Đếm số dòng sau khi lọc.
2. `COUNT(*)` kết hợp `WHERE status = ...`.
3. `SELECT COUNT(*) FROM shipments WHERE status = ...`

## Solution
```sql
SELECT COUNT(*) FROM shipments WHERE status = 'IN_TRANSIT'
```
````

`content/tickets/ch2/ch2-05.md`:
````markdown
---
id: ch2-05
chapter: 2
title: Báo cáo container và trọng lượng
from: { name: Trần An, dept: Management }
difficulty: 3
beat: boss
requires: [aggregate, group_by]
grants: []
tables: [containers, shipments]
conclusion:
  question: Muốn lọc theo kết quả COUNT(*) sau khi đã gom nhóm, bạn dùng mệnh đề nào?
  options: [WHERE, HAVING, ORDER BY]
  answer: 1
---
Mình chuẩn bị họp với các hãng tàu, cần hai con số.

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

## Hints
1. Bảng `containers` có `container_type` và `teu`; trọng lượng lô ở `shipments.gross_weight_kg`.
2. Trung bình dùng `AVG`, làm tròn dùng `ROUND(..., 2)`.
3. `SELECT container_type, COUNT(*), SUM(...) FROM containers GROUP BY ...`
````

- [ ] **Step 2: Chạy test nội dung**

Run: `npx vitest run tests/content.test.ts`
Expected: tất cả PASS (giờ gồm 12 step).

- [ ] **Step 3: Commit**

```bash
git add content/tickets/ch2
git commit -m "feat: chapter 2 tickets (aggregates, GROUP BY, HAVING)"
```

---

### Task 9: Ticket chương 3

**Files:**
- Create: `content/tickets/ch3/ch3-01.md` … `ch3-05.md`
- Test: `tests/content.test.ts` (đã có)

- [ ] **Step 1: Tạo 5 ticket**

`content/tickets/ch3/ch3-01.md`:
````markdown
---
id: ch3-01
chapter: 3
title: Booking mới nhất kèm tên khách
from: { name: Võ Thu, dept: CS }
difficulty: 2
beat: teach
requires: [select, order_by, limit]
grants: [join]
tables: [shipments, customers]
ordered: true
---
CSKH cần xem nhanh các booking mới nhất.

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
````

`content/tickets/ch3/ch3-02.md`:
````markdown
---
id: ch3-02
chapter: 3
title: TEU theo hãng tàu quý 3
from: { name: Lê Bình, dept: Sales }
difficulty: 3
beat: develop
requires: [join, group_by]
grants: [multi_join]
tables: [containers, shipments, carriers]
---
Chuẩn bị đàm phán giá năm sau với các hãng tàu.

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
````

`content/tickets/ch3/ch3-03.md`:
````markdown
---
id: ch3-03
chapter: 3
title: Khách lâu không gửi hàng
from: { name: Võ Thu, dept: CS }
difficulty: 3
beat: twist
requires: [join]
grants: [left_join, anti_join]
tables: [customers, shipments]
---
Một số khách lâu rồi không gửi hàng, CSKH muốn gọi hỏi thăm.

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
````

`content/tickets/ch3/ch3-04.md`:
````markdown
---
id: ch3-04
chapter: 3
title: Danh mục khách của từng sales
from: { name: Lê Bình, dept: Sales }
difficulty: 2
beat: rest
requires: [join, group_by]
grants: []
tables: [employees, customers]
---
Mình cần cân lại danh mục khách cho team Sales.

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
````

`content/tickets/ch3/ch3-05.md`:
````markdown
---
id: ch3-05
chapter: 3
title: Khách hàng lớn nhất 2025
from: { name: Trần An, dept: Management }
difficulty: 3
beat: boss
requires: [multi_join, group_by, order_by, limit]
grants: []
tables: [customers, shipments, containers, employees]
ordered: true
conclusion:
  question: Ở ticket "Khách lâu không gửi hàng", LEFT JOIN ... WHERE s.id IS NULL dùng để làm gì?
  options:
    - Tìm các dòng bên trái không có dòng khớp bên phải
    - Loại bỏ giá trị NULL khỏi kết quả
    - Gộp hai bảng thành một bảng mới
  answer: 0
---
Cuối năm mình gặp riêng các khách lớn nhất cùng sales phụ trách. Chuẩn bị giúp mình danh sách.

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

## Hints
1. Nối customers → shipments → containers rồi gom theo khách.
2. Sắp xếp `ORDER BY teu DESC, c.name` rồi `LIMIT 5`; bước 2 nối thêm `employees`.
3. `SELECT c.name, SUM(ct.teu) AS teu FROM customers c JOIN shipments s ON ... JOIN containers ct ON ... WHERE ... GROUP BY c.id, c.name ORDER BY teu DESC, c.name LIMIT 5`
````

- [ ] **Step 2: Chạy toàn bộ test**

Run: `npm test`
Expected: tất cả PASS (content gồm 18 step).

- [ ] **Step 3: Commit**

```bash
git add content/tickets/ch3
git commit -m "feat: chapter 3 tickets (JOIN, LEFT JOIN, anti-join)"
```

---

### Task 10: Giao diện

**Files:**
- Modify (thay toàn bộ trang smoke của Task 2): `index.html`, `src/main.ts`
- Create: `src/style.css`, `src/ui/dom.ts`, `src/ui/resultTable.ts`, `src/ui/feedback.ts`, `src/ui/editor.ts`

**Interfaces:**
- Consumes: `QueryResult` (Task 1); `DbClient`, `DbStatus` (Task 2); `grade`, `errorMessage`, `GradeResult` (Task 3); `Ticket` (Task 4); toàn bộ `progress.ts` (Task 5); toàn bộ `save.ts` (Task 6); `loadTickets` (Task 7)

Giao diện chạy trong trình duyệt nên kiểm thủ công bằng dev server; logic đã có unit test ở Task 1–9.

- [ ] **Step 1: Viết helper giao diện**

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
  for (const c of children) if (c !== null && c !== undefined && c !== false) el.append(c);
  return el;
}

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
```

`src/ui/resultTable.ts`:
```ts
import type { QueryResult } from '../db/run';
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

export function renderResult(r: QueryResult): HTMLElement {
  if (r.columns.length === 0) return h('p', { class: 'muted' }, 'Câu lệnh chạy xong, không có kết quả dạng bảng.');
  const shown = r.rows.slice(0, MAX_ROWS);
  const count = r.rows.length > MAX_ROWS ? `${r.rows.length} dòng (hiển thị ${MAX_ROWS} dòng đầu)` : `${r.rows.length} dòng`;
  return h('div', { class: 'result' },
    h('p', { class: 'muted' }, count),
    h('div', { class: 'table-wrap' },
      h('table', {},
        h('thead', {}, h('tr', {}, ...r.columns.map((c) => h('th', { scope: 'col' }, c)))),
        h('tbody', {}, ...shown.map((row) =>
          h('tr', {}, ...row.map((v, i) => h('td', { class: v === null ? 'null' : '' }, formatCell(v, r.types[i]))))))));
}
```

`src/ui/feedback.ts`:
```ts
import type { GradeResult } from '../grader';
import { formatCell } from './resultTable';

export function gradeMessage(r: Exclude<GradeResult, { ok: true }>): string {
  switch (r.reason) {
    case 'error':
      return `Lỗi: ${r.message}`;
    case 'columns':
      return `Kết quả cần ${r.expected} cột, query của bạn trả về ${r.actual} cột.`;
    case 'order':
      return 'Dữ liệu đúng nhưng thứ tự dòng chưa đúng yêu cầu.';
    case 'rows': {
      const parts: string[] = [];
      if (r.missing === r.extra) parts.push(`${r.missing} dòng có giá trị chưa đúng.`);
      else {
        if (r.missing) parts.push(`Thiếu ${r.missing} dòng.`);
        if (r.extra) parts.push(`Thừa ${r.extra} dòng.`);
      }
      if (r.sample) parts.push(`Ví dụ một dòng của bạn không khớp: ${r.sample.map((v) => formatCell(v)).join(' | ')}`);
      return parts.join(' ');
    }
  }
}
```

`src/ui/editor.ts`:
```ts
import { PostgreSQL, sql } from '@codemirror/lang-sql';
import { Prec } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { basicSetup, EditorView } from 'codemirror';

export interface Editor {
  getValue(): string;
  destroy(): void;
}

export function createEditor(
  parent: HTMLElement,
  opts: { doc: string; schema: Record<string, string[]>; onChange: (v: string) => void; onRun: () => void },
): Editor {
  const view = new EditorView({
    parent,
    doc: opts.doc,
    extensions: [
      Prec.highest(keymap.of([{ key: 'Mod-Enter', run: () => { opts.onRun(); return true; } }])),
      basicSetup,
      sql({ dialect: PostgreSQL, schema: opts.schema, upperCaseKeywords: true }),
      EditorView.updateListener.of((u) => {
        if (u.docChanged) opts.onChange(u.state.doc.toString());
      }),
      EditorView.contentAttributes.of({ 'aria-label': 'SQL editor' }),
    ],
  });
  return { getValue: () => view.state.doc.toString(), destroy: () => view.destroy() };
}
```

- [ ] **Step 2: Viết `index.html` và `src/style.css`**

`index.html`:
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
      <span id="db-status" role="status"></span>
      <button id="export-btn" type="button">Xuất tiến độ</button>
      <label class="file-btn">Nhập tiến độ<input id="import-input" type="file" accept="application/json" hidden /></label>
    </header>
    <div id="notice" role="status" hidden></div>
    <main class="layout">
      <aside id="inbox" aria-label="Hộp thư ticket"></aside>
      <section id="ticket" aria-label="Ticket"></section>
      <aside id="schema" aria-label="Schema"></aside>
    </main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`src/style.css`:
```css
:root {
  --bg: #f7f7f5; --panel: #ffffff; --text: #1d1d1f; --muted: #66666b; --border: #dcdcd8;
  --accent: #0f6cbd; --good: #1a7f37; --bad: #c62828; --code: #efefea;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #161618; --panel: #1f1f22; --text: #ececf0; --muted: #a0a0a8; --border: #34343a;
    --accent: #5aa9ff; --good: #4cc26d; --bad: #ff6b6b; --code: #2a2a30;
  }
}
* { box-sizing: border-box; }
body { margin: 0; font: 15px/1.5 system-ui, sans-serif; background: var(--bg); color: var(--text); }
.topbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 8px 16px; border-bottom: 1px solid var(--border); background: var(--panel); }
.topbar h1 { font-size: 18px; margin: 0 auto 0 0; }
#notice { padding: 8px 16px; background: var(--code); border-bottom: 1px solid var(--border); }
.layout { display: grid; grid-template-columns: 260px minmax(0, 1fr) 260px; gap: 16px; padding: 16px; }
@media (max-width: 1000px) { .layout { grid-template-columns: minmax(0, 1fr); } }
aside, #ticket { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px; min-width: 0; }
h2 { font-size: 16px; margin: 0 0 8px; }
h3 { font-size: 15px; margin: 12px 0 4px; }
.mail { display: block; width: 100%; text-align: left; padding: 8px; margin-bottom: 6px; border: 1px solid var(--border); border-radius: 6px; background: transparent; color: inherit; cursor: pointer; }
.mail.active { border-color: var(--accent); }
.mail.done { opacity: 0.7; }
.mail span { display: block; }
.mail .subject { font-weight: 600; }
.from, .meta, .muted { color: var(--muted); font-size: 13px; }
button { font: inherit; padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--panel); color: inherit; cursor: pointer; }
button.primary { background: var(--accent); border-color: var(--accent); color: #fff; }
button:disabled { opacity: 0.5; cursor: default; }
.file-btn { cursor: pointer; text-decoration: underline; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; }
.editor { border: 1px solid var(--border); border-radius: 6px; }
.editor .cm-editor { min-height: 140px; background: var(--panel); color: var(--text); }
.editor .cm-editor .cm-gutters { background: var(--code); color: var(--muted); border-color: var(--border); }
.editor .cm-editor .cm-content { caret-color: var(--text); }
code { background: var(--code); padding: 1px 4px; border-radius: 4px; }
.feedback.bad { color: var(--bad); }
.feedback.good { color: var(--good); }
.error { color: var(--bad); white-space: pre-wrap; }
.table-wrap { overflow: auto; max-height: 420px; border: 1px solid var(--border); border-radius: 6px; }
table { border-collapse: collapse; font-size: 13px; width: 100%; }
th, td { padding: 4px 8px; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
th { position: sticky; top: 0; background: var(--panel); }
td.null { color: var(--muted); font-style: italic; }
#schema ul { list-style: none; padding-left: 8px; margin: 4px 0 8px; font-size: 13px; }
.conclusion label { display: block; margin: 4px 0; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
```

- [ ] **Step 3: Viết `src/main.ts`**

```ts
import './style.css';
import { loadTickets } from './content';
import { DbClient, type DbStatus } from './db/client';
import { errorMessage, grade } from './grader';
import { CHAPTER_TITLES, contentProblems, currentChapter, nextTicket, tablesUnlocked, visibleTickets, xpFor } from './progress';
import { loadSave, parseSave, serializeSave, writeSave, type KV, type Save } from './save';
import type { Ticket } from './tickets';
import { h, richText } from './ui/dom';
import { createEditor, type Editor } from './ui/editor';
import { gradeMessage } from './ui/feedback';
import { renderResult } from './ui/resultTable';

const tickets = loadTickets();
const problems = contentProblems(tickets);
if (problems.length) console.warn('Lỗi nội dung ticket:', problems);
const knownIds = new Set(tickets.map((t) => t.id));

function getStorage(): KV | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
const storage = getStorage();
const loaded = loadSave(storage, knownIds);
let save: Save = loaded.save;

const done = () => new Set(save.completed);
const firstOpen = () => (nextTicket(tickets, done()) ?? tickets[tickets.length - 1]).id;

let selectedId = firstOpen();
let stepIndex = 0;
let busy = false;
let dbStatus: DbStatus = 'loading';
let columns: Record<string, { name: string; type: string }[]> = {};
let editor: Editor | undefined;
let persistTimer: number | undefined;

const $ = (id: string) => document.getElementById(id)!;
const selected = (): Ticket => tickets.find((t) => t.id === selectedId)!;
const draftKey = () => `${selectedId}#${stepIndex}`;

function notice(text: string): void {
  const n = $('notice');
  n.textContent = text;
  n.hidden = false;
}

function persist(now = false): void {
  clearTimeout(persistTimer);
  const write = () => {
    if (!writeSave(storage, save)) notice('Không lưu được tiến độ trên trình duyệt này. Hãy dùng "Xuất tiến độ" để giữ lại.');
  };
  if (now) write();
  else persistTimer = window.setTimeout(write, 500);
}

function editorSchema(): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const t of tablesUnlocked(currentChapter(tickets, done()))) {
    if (columns[t]) out[t] = columns[t].map((c) => c.name);
  }
  return out;
}

async function onDbStatus(s: DbStatus, message?: string): Promise<void> {
  dbStatus = s;
  renderTopbar();
  if (s === 'failed') notice(`Không khởi tạo được database: ${message ?? ''}`);
  if (s === 'ready' && Object.keys(columns).length === 0) {
    try {
      const r = await db.run(
        "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position",
      );
      const next: typeof columns = {};
      for (const [table, name, type] of r.rows as string[][]) (next[table] ??= []).push({ name, type });
      columns = next;
      renderSchema();
      renderTicket();
    } catch (e) {
      notice(`Không đọc được schema: ${errorMessage(e)}`);
    }
  }
}

const db = new DbClient((s, m) => void onDbStatus(s, m));

function renderTopbar(): void {
  const ch = currentChapter(tickets, done());
  $('chapter').textContent = `Chương ${ch}: ${CHAPTER_TITLES[ch] ?? ''}`;
  $('xp').textContent = `${save.xp} XP`;
  $('db-status').replaceChildren(
    dbStatus === 'loading'
      ? 'Đang khởi tạo database…'
      : dbStatus === 'ready'
        ? 'Database sẵn sàng'
        : h('button', { type: 'button', onclick: () => db.restart() }, 'Thử lại database'),
  );
}

function renderInbox(): void {
  const d = done();
  $('inbox').replaceChildren(
    h('h2', {}, 'Hộp thư'),
    ...visibleTickets(tickets, d).reverse().map((t) =>
      h('button', {
        type: 'button',
        class: `mail${t.id === selectedId ? ' active' : ''}${d.has(t.id) ? ' done' : ''}`,
        'aria-current': t.id === selectedId ? 'true' : false,
        onclick: () => {
          selectedId = t.id;
          stepIndex = 0;
          renderInbox();
          renderTicket();
        },
      },
        h('span', { class: 'from' }, `${t.from.name} · ${t.from.dept}`),
        h('span', { class: 'subject' }, t.title),
        h('span', { class: 'meta' }, d.has(t.id) ? 'Đã xong' : `Chương ${t.chapter} · ${'★'.repeat(t.difficulty)}`),
      )),
  );
}

function renderSchema(): void {
  const tables = tablesUnlocked(currentChapter(tickets, done())).filter((t) => columns[t]);
  $('schema').replaceChildren(
    h('h2', {}, 'Schema'),
    ...(tables.length === 0
      ? [h('p', { class: 'muted' }, 'Đang tải…')]
      : tables.map((t) =>
          h('details', { open: true },
            h('summary', {}, t),
            h('ul', {}, ...columns[t].map((c) => h('li', {}, h('code', {}, c.name), ' ', h('span', { class: 'muted' }, c.type))))))),
  );
}

function complete(t: Ticket): void {
  if (done().has(t.id)) return;
  const gained = xpFor(t, save.hintsUsed[t.id] ?? 0);
  save.completed.push(t.id);
  save.xp += gained;
  persist(true);
  const next = nextTicket(tickets, done());
  if (next) selectedId = next.id;
  stepIndex = 0;
  notice(`Đã đóng ticket "${t.title}" (+${gained} XP).${next ? ` Ticket mới: "${next.title}".` : ' Bạn đã hoàn thành mọi ticket!'}`);
  renderAll();
}

function renderConclusion(t: Ticket, host: HTMLElement): void {
  const c = t.conclusion!;
  const msg = h('p', { role: 'status', class: 'feedback bad' });
  const form = h('form', { class: 'conclusion' },
    h('h3', {}, 'Kết luận'),
    h('p', {}, c.question),
    ...c.options.map((o, i) => h('label', {}, h('input', { type: 'radio', name: 'conclusion', value: String(i) }), ' ', o)),
    h('button', { class: 'primary', type: 'submit' }, 'Chốt kết luận'),
    msg,
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = (form.elements.namedItem('conclusion') as RadioNodeList).value;
    if (v === '') msg.textContent = 'Chọn một đáp án.';
    else if (Number(v) === c.answer) complete(t);
    else msg.textContent = 'Chưa đúng. Xem lại kết quả các bước rồi chọn lại.';
  });
  host.replaceChildren(form);
}

function renderTicket(): void {
  const t = selected();
  const isDone = done().has(t.id);
  const step = t.steps[stepIndex];
  const hintsShown = save.hintsUsed[t.id] ?? 0;

  editor?.destroy();
  const editorHost = h('div', { class: 'editor' });
  const out = h('div', { class: 'output' });
  const feedback = h('p', { class: 'feedback', role: 'status' });
  const runBtn = h('button', { type: 'button', onclick: () => void run() }, 'Chạy (Ctrl+Enter)');
  const submitBtn = h('button', { type: 'button', class: 'primary', onclick: () => void submit() }, 'Nộp');
  const hintBtn = h('button', {
    type: 'button',
    onclick: () => {
      save.hintsUsed[t.id] = hintsShown + 1;
      persist();
      renderTicket();
    },
  }, `Gợi ý (${hintsShown}/${t.hints.length})`);
  hintBtn.disabled = hintsShown >= t.hints.length;

  const setBusy = (b: boolean) => {
    busy = b;
    runBtn.disabled = b;
    submitBtn.disabled = b;
  };
  const show = (text: string, kind: 'good' | 'bad') => {
    feedback.textContent = text;
    feedback.className = `feedback ${kind}`;
  };

  async function run(): Promise<void> {
    if (busy) return;
    setBusy(true);
    feedback.textContent = '';
    try {
      out.replaceChildren(renderResult(await db.run(editor!.getValue())));
    } catch (e) {
      out.replaceChildren(h('pre', { class: 'error' }, errorMessage(e)));
    } finally {
      setBusy(false);
    }
  }

  async function submit(): Promise<void> {
    if (busy) return;
    setBusy(true);
    try {
      const r = await grade((sql) => db.run(sql), step.solution, editor!.getValue(), t.ordered);
      if (!r.ok) {
        show(gradeMessage(r), 'bad');
        return;
      }
      if (stepIndex < t.steps.length - 1) {
        stepIndex++;
        notice('Đúng rồi! Sang bước tiếp theo.');
        renderTicket();
        return;
      }
      if (t.conclusion) {
        show('Các bước đều đúng. Chốt kết luận bên dưới.', 'good');
        renderConclusion(t, out);
        return;
      }
      complete(t);
    } catch (e) {
      show(`Lỗi nội dung ticket, hãy báo người soạn: ${errorMessage(e)}`, 'bad');
    } finally {
      setBusy(false);
    }
  }

  $('ticket').replaceChildren(
    h('header', {},
      h('h2', {}, t.title),
      h('p', { class: 'muted' }, `Từ: ${t.from.name} (${t.from.dept}) · Chương ${t.chapter}${isDone ? ' · Đã hoàn thành' : ''}`)),
    richText(t.body),
    t.steps.length > 1 ? h('div', { class: 'step' }, h('h3', {}, `Bước ${stepIndex + 1}/${t.steps.length}: ${step.title}`), richText(step.prompt)) : null,
    hintsShown ? h('ol', { class: 'hints' }, ...t.hints.slice(0, hintsShown).map((x) => h('li', {}, richText(x)))) : null,
    editorHost,
    h('div', { class: 'actions' }, runBtn, isDone ? null : submitBtn, isDone ? null : hintBtn),
    feedback,
    out,
  );
  editor = createEditor(editorHost, {
    doc: save.drafts[draftKey()] ?? '',
    schema: editorSchema(),
    onChange: (v) => {
      save.drafts[draftKey()] = v;
      persist();
    },
    onRun: () => void run(),
  });
}

function renderAll(): void {
  renderTopbar();
  renderInbox();
  renderTicket();
  renderSchema();
}

$('export-btn').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([serializeSave(save)], { type: 'application/json' }));
  h('a', { href: url, download: 'cargo-query-save.json' }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

($('import-input') as HTMLInputElement).addEventListener('change', async (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  try {
    save = parseSave(await file.text(), knownIds);
    persist(true);
    selectedId = firstOpen();
    stepIndex = 0;
    renderAll();
    notice('Đã nhập tiến độ.');
  } catch (err) {
    notice(`Không nhập được tiến độ: ${errorMessage(err)}`);
  }
});

if (loaded.warning) notice(loaded.warning);
renderAll();
```

- [ ] **Step 4: Kiểm tra kiểu và build**

Run: `npm run build`
Expected: `tsc --noEmit` không lỗi; Vite build xong, có file `.wasm`/`.data` của PGlite trong `dist/assets`.

- [ ] **Step 5: Kiểm thủ công trên trình duyệt**

Run: `npm run dev` rồi mở URL Vite in ra. Kiểm lần lượt:
1. Trang hiện hộp thư và ticket `ch1-01` ngay; trạng thái "Đang khởi tạo database…" chuyển "Database sẵn sàng" sau vài giây; Schema hiện 5 bảng chương 1.
2. Gõ `SELECT code, name, country FROM ports` → Ctrl+Enter → bảng 24 dòng.
3. Bấm **Nộp** → thông báo "+100 XP", ticket `ch1-02` xuất hiện.
4. Ở `ch1-02` nộp `SELECT code FROM ports` → báo "Kết quả cần 3 cột…".
5. Gõ `SELECT pg_sleep(10)` → Chạy → sau ~5s báo "Query chạy quá 5 giây…", database nạp lại, sau đó query thường chạy được.
6. Gõ `UPDATE ports SET name = 'x'` → Chạy (báo không có kết quả dạng bảng, không lỗi) → rồi `SELECT count(*) FROM ports WHERE name = 'x'` → 0.
7. Bấm Gợi ý → hiện gợi ý 1, nút thành "Gợi ý (1/3)".
8. Tải lại trang → tiến độ, XP, bản nháp query còn nguyên.
9. Xuất tiến độ → xóa `localStorage` trong DevTools → tải lại → Nhập file vừa xuất → tiến độ trở lại.
10. Chơi tới `ch1-05` (boss): bước 1 đúng → sang bước 2 → đúng → hiện câu kết luận; chọn sai báo "Chưa đúng", chọn `status` → đóng ticket, chuyển sang chương 2, Schema có thêm `containers`.
11. Thu hẹp cửa sổ < 1000px → bố cục 1 cột, không cuộn ngang; bật dark mode hệ điều hành → màu đổi theo.

- [ ] **Step 6: Commit**

```bash
git add index.html src/main.ts src/style.css src/ui
git commit -m "feat: game UI"
```

---

### Task 11: CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Viết `CLAUDE.md`**

````markdown
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Cargo Query: browser game for learning PostgreSQL as a data analyst at a fictional freight forwarder. Spec: `docs/superpowers/specs/2026-11-16-cargo-query-design.md`. Plans: `docs/superpowers/plans/`.

## Commands

```bash
npm run dev                                   # Vite dev server
npm test                                      # all tests (Vitest, PGlite runs in Node; seed takes ~2s per DB)
npx vitest run tests/grader.test.ts           # one file
npx vitest run tests/grader.test.ts -t alias  # one test by name
npm run build                                 # typecheck + production build
```

## Architecture

- Everything runs in the browser; no backend (if one is ever added it must be Python).
- `src/db/worker.ts` runs PGlite in a dedicated Web Worker, seeds it via `initDb`, and executes one query at a time through `runSandboxed` (`BEGIN` → query → `ROLLBACK`). PGlite rejects multi-statement input, so players cannot escape the rollback.
- `src/db/client.ts` (`DbClient`) talks to the worker. `statement_timeout` does not work in PGlite, so a query over 5s terminates the worker and boots a fresh one. Do not switch to `PGliteWorker`: its multi-tab leader election breaks `terminate()`.
- `src/grader.ts` runs the player's SQL and the ticket's Solution on the same DB and compares by column position, as a row multiset (or sequence when `ordered: true`), with all numbers rounded to 2 decimals. PGlite returns `numeric` as strings and `date` as `Date`.
- Tickets are markdown files in `content/tickets/chN/` loaded by `src/content.ts` (`import.meta.glob`) and parsed by `src/tickets.ts`. Normal tickets have one `## Solution`; boss tickets have `## Step N: …` sections plus a `conclusion` in frontmatter.
- `src/progress.ts` holds linear progression, XP, which tables each chapter reveals (`CHAPTER_TABLES`), and `contentProblems` (soft-lock and pacing checks).
- `src/save.ts` is a versioned localStorage save. Bump `SAVE_VERSION` with a migration in `MIGRATIONS` and keep old fixtures in `tests/fixtures/` forever.

## Content and seed rules

- `src/db/seed.sql` is deterministic. Each random block starts with its own `setseed()`; append new blocks at the end only. PGlite is pinned to an exact version because `random()` output depends on the Postgres build.
- In-game "today" is 2026-10-31. Solutions use literal dates; `tests/content.test.ts` fails on `CURRENT_DATE`/`now()`.
- Ordered or top-N tickets must state a complete tiebreaker in the prompt.
- Each chapter must go teach → … → rest → boss, and `requires`/`tables` must already be granted/unlocked (`contentProblems`).
- Story hooks the later chapters rely on are listed at the top of `seed.sql`; do not change them without updating tickets and `tests/seed.test.ts`.
- Project skills live in `.claude/skills/` (`web-games`, `level-design`, `save-systems`).
````

- [ ] **Step 2: Chạy toàn bộ test lần cuối**

Run: `npm test`
Expected: tất cả PASS.

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
- Kích thước tải trang ~5MB gzip (PGlite wasm + data) — cân nhắc màn hình chờ có tiến độ.
