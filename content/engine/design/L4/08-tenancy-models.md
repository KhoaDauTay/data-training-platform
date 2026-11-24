---
id: e-ds-l4-08
engine: design
level: L4
module: multi-tenant
title: Ba mô hình nhiều khách hàng - silo, bridge, pool
title_en: Three tenancy models - silo, bridge, pool
kind: concept
runtime: browser
minutes: 15
viz: pg-tenancy-models
objectives:
  - vi: Phân biệt silo (database riêng), bridge (schema riêng) và pool (chung bảng có tenant_id).
    en: Tell silo (own database), bridge (own schema) and pool (shared tables with tenant_id) apart.
  - vi: So ba mô hình theo mức cô lập, chi phí mỗi khách và công vận hành.
    en: Compare the three models by isolation, cost per tenant and operations work.
  - vi: Thêm một khách mới trong bridge và trong pool, và thấy cái giá của mỗi cách.
    en: Add a new tenant in the bridge and in the pool, and see what each one costs.
requires: [e-ds-l2-06]
sources:
  - https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
  - https://www.postgresql.org/docs/18/ddl-schemas.html
  - https://www.postgresql.org/docs/18/manage-ag-overview.html
lab:
  setup: |
    CREATE TABLE invoices (
      tenant_id int NOT NULL,
      id int NOT NULL,
      amount int NOT NULL,
      PRIMARY KEY (tenant_id, id)
    );
    INSERT INTO invoices
    SELECT t, i, t * 1000 + i * 10
    FROM generate_series(1, 3) t, generate_series(1, 4) i;
    CREATE SCHEMA seller_a;
    CREATE SCHEMA seller_b;
    CREATE TABLE seller_a.invoices (id int PRIMARY KEY, amount int NOT NULL);
    CREATE TABLE seller_b.invoices (id int PRIMARY KEY, amount int NOT NULL);
    INSERT INTO seller_a.invoices VALUES (1, 1010), (2, 1020);
    INSERT INTO seller_b.invoices VALUES (1, 2010);
  steps:
    - task:
        vi: "Bridge: người bán C vừa ký. Tạo schema `seller_c` cho họ."
        en: "Bridge: seller C has just signed up. Create the schema `seller_c` for them."
      solution: CREATE SCHEMA seller_c
      check: catalog
      hint:
        vi: "`CREATE SCHEMA seller_c`."
        en: "`CREATE SCHEMA seller_c`."
    - task:
        vi: "Mỗi schema cần đủ bảng: tạo `seller_c.invoices` giống hai schema kia, `id int PRIMARY KEY`, `amount int NOT NULL`."
        en: "Every schema needs every table: create `seller_c.invoices` like the other two schemas, `id int PRIMARY KEY`, `amount int NOT NULL`."
      solution: CREATE TABLE seller_c.invoices (id int PRIMARY KEY, amount int NOT NULL)
      check: catalog
      hint:
        vi: "Ghi rõ schema trước tên bảng: `CREATE TABLE seller_c.invoices (…)`."
        en: "Put the schema before the table name: `CREATE TABLE seller_c.invoices (…)`."
    - task:
        vi: "Pool: người bán 4 vừa ký. Thêm hóa đơn đầu tiên của họ vào bảng chung `invoices`: `id` 1, `amount` 4010. Bài chấm bằng số hóa đơn của từng `tenant_id`."
        en: "Pool: seller 4 has just signed up. Add their first invoice to the shared `invoices` table: `id` 1, `amount` 4010. It is graded by the invoice count of each `tenant_id`."
      solution: INSERT INTO invoices VALUES (4, 1, 4010)
      after: SELECT tenant_id, count(*) AS invoices FROM invoices GROUP BY tenant_id ORDER BY tenant_id
      check: rows
      ordered: true
      hint:
        vi: "Trong pool, khách mới chỉ là một giá trị `tenant_id` mới: `INSERT INTO invoices VALUES (4, 1, 4010)`."
        en: "In a pool a new tenant is just a new `tenant_id` value: `INSERT INTO invoices VALUES (4, 1, 4010)`."
quiz:
  - q:
      vi: "Một người bán lớn có hợp đồng đòi dữ liệu nằm ở database riêng, sao lưu và khôi phục riêng. Mô hình nào hợp?"
      en: "A large seller's contract requires its data in its own database, backed up and restored on its own. Which model fits?"
    options:
      - { vi: "Pool: mọi câu đã lọc theo tenant_id nên đủ tách", en: "Pool: every query already filters on tenant_id, so it is separate enough" }
      - { vi: "Silo: database riêng, sao lưu và khôi phục riêng", en: "Silo: its own database, backed up and restored alone" }
      - { vi: "Bridge: schema riêng cũng tính là database riêng", en: "Bridge: its own schema counts as its own database" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì lọc theo tenant_id chặn được đọc nhầm, nhưng hợp đồng nói về nơi dữ liệu nằm và cách khôi phục. Trong pool, khôi phục một khách là chép dữ liệu ra khỏi bản sao lưu chung; schema riêng vẫn nằm chung database và chung bản sao lưu."
      en: "It sounds right because filtering on tenant_id prevents wrong reads, but the contract is about where the data lives and how it is restored. In a pool, restoring one tenant means copying rows out of a shared backup; an own schema still lives in the shared database and the shared backup."
  - q:
      vi: "Chợ có 5.000 người bán nhỏ, mỗi schema 40 bảng. Một bạn đề xuất bridge (schema mỗi khách). Điều gì lớn lên trước tiên?"
      en: "The market has 5,000 small sellers, 40 tables per schema. Someone proposes the bridge (a schema per tenant). What grows first?"
    options:
      - { vi: "Không gì cả: schema chỉ là tên, không tốn gì", en: "Nothing: a schema is only a name and costs nothing" }
      - { vi: "Catalog hệ thống: 200.000 bảng, đổi cấu trúc 5.000 lần", en: "The system catalog: 200,000 tables, every change run 5,000 times" }
      - { vi: "Số kết nối, vì mỗi schema cần một kết nối riêng", en: "The connection count, because each schema needs its own connection" }
    answer: 1
    trap: 0
    why:
      vi: "Nhiều người nghĩ schema là miễn phí vì tạo nó chỉ mất một lệnh. Thật ra mỗi bảng trong mỗi schema là một dòng catalog, một tệp, một việc cho autovacuum và một chỗ phải đổi cấu trúc. Kết nối thì không: một kết nối đổi `search_path` là sang schema khác."
      en: "Many people think a schema is free because creating one takes one command. In fact every table in every schema is a catalog row, a file, a job for autovacuum and one more place to migrate. Connections are not the issue: one connection changes `search_path` to reach another schema."
---
## Mở bài

Chợ Lồng Đèn bắt đầu bán phần mềm quản lý cho người bán, và câu hỏi đầu tiên của nhóm thiết kế là: hóa đơn của mỗi người bán nằm ở đâu? Có ba câu trả lời quen thuộc, mỗi câu đổi cô lập lấy chi phí theo một tỉ lệ khác. Sơ đồ ở cuối bài, sau phần Lỗi hay gặp, gói cả ba vào năm bước.

## Ý chính

**Silo**: mỗi tenant một database (hay cả một cụm máy). Cô lập mạnh nhất: thông tin đăng nhập riêng, sao lưu riêng, đặt được ở vùng địa lý riêng, và một khách nặng không làm chậm ai. Đổi lại, chi phí cố định nhân với số khách, mỗi lần đổi cấu trúc chạy N lần, và Postgres không nối được giữa hai database, nên mỗi khách cần một nhóm kết nối riêng.

**Bridge**: một database, mỗi tenant một schema (`seller_a.invoices`, `seller_b.invoices`). Cùng câu SQL, khác `search_path`. Quyền cấp theo schema, nhưng hàng nghìn schema làm catalog phình và mỗi lần đổi cấu trúc chạy N lần. Lưu ý: tài liệu SaaS của AWS dùng chữ "bridge" cho kiểu trộn silo với pool theo dịch vụ; bài này dùng nghĩa cũ hơn, schema mỗi khách.

**Pool**: mọi tenant chung một bộ bảng, mỗi dòng có `tenant_id`. Rẻ nhất và chỉ đổi cấu trúc một lần, nhưng cô lập nằm trong dữ liệu: khóa ghép (`e-ds-l2-06`), luật duy nhất theo tenant (`e-ds-l2-07`), câu nào cũng lọc `tenant_id`, và thường thêm bảo mật theo dòng. Nhiều hệ thống trộn: khách nhỏ ở pool, khách lớn ra silo, cùng một cấu trúc bảng.

## Ví dụ

Pool: một bảng, chia khách bằng `tenant_id`.

```sql
SELECT tenant_id,
  count(*) AS invoices,
  sum(amount) AS total
FROM invoices
GROUP BY tenant_id
ORDER BY tenant_id;
```

Bridge: cùng câu SQL, `search_path` chọn khách.

```sql
SET search_path =
  seller_b, public;
SELECT id, amount
FROM invoices
ORDER BY id;
RESET search_path;
```

Bridge nhân số bảng theo số khách: mỗi schema một bản `invoices`.

```sql
SELECT table_schema,
  count(*) AS tables
FROM information_schema.tables
WHERE table_name = 'invoices'
GROUP BY table_schema
ORDER BY table_schema;
```

Silo không chạy được trong trình duyệt: PGlite tạo được database thứ hai nhưng không mở kết nối tới nó. Trên máy chủ thật nó trông thế này:

```text
-- Silo: one database per tenant
CREATE DATABASE seller_a;
-- the app opens its own connection
-- (and its own pool) per database
```

## Lỗi hay gặp

Pool: quên lọc tenant thì trang của người bán 2 đếm hóa đơn của cả chợ.

```sql
-- WRONG: no tenant filter
SELECT count(*) AS invoices
FROM invoices;
```

```sql
-- FIX: name the tenant
SELECT count(*) AS invoices
FROM invoices
WHERE tenant_id = 2;
```

Bridge: `search_path` là trạng thái của phiên. Kết nối vừa phục vụ người bán A được đưa cho yêu cầu của người bán B mà chưa đổi `search_path`, thế là B đọc dữ liệu của A, không lỗi gì:

```sql
-- WRONG: path still on A
SET search_path = seller_a;
SELECT count(*) AS invoices
FROM invoices;
```

```sql
-- FIX: set it per request
SET search_path = seller_b;
SELECT count(*) AS invoices
FROM invoices;
RESET search_path;
```

Bridge: khách mới chưa có schema thì mọi câu của họ hỏng cho tới khi việc tạo và đổi cấu trúc chạy xong:

```sql
-- ERROR 42P01: C has no schema
SELECT count(*)
FROM seller_c.invoices;
```

## Tóm tắt

- Silo: database riêng, cô lập mạnh nhất, đắt nhất, mọi việc vận hành nhân N.
- Bridge (ở đây: schema mỗi khách): cùng database, catalog và việc đổi cấu trúc nhân N, `search_path` phải đúng ở mọi yêu cầu.
- Pool: chung bảng có `tenant_id`, rẻ nhất, cô lập nằm ở khóa, luật duy nhất và câu lọc.
- Đọc tiếp: `e-ds-l4-09` (bản đồ chủ đề), `e-ds-l4-10` (chọn mô hình theo tình huống).

# EN

## Opening

Lantern Market starts selling management software to its sellers, and the design team's first question is: where does each seller's invoice data live? There are three familiar answers, each trading isolation for cost at a different rate. The diagram at the end, after Common mistakes, sums up all three in five steps.

## Key idea

**Silo**: one database per tenant (or a whole cluster). The strongest isolation: own credentials, own backups, its own region if needed, and a heavy tenant slows no one else. In return the fixed cost multiplies by the tenant count, every schema change runs N times, and Postgres cannot join across two databases, so each tenant needs its own connection pool.

**Bridge**: one database, one schema per tenant (`seller_a.invoices`, `seller_b.invoices`). The same SQL with a different `search_path`. Privileges go per schema, but thousands of schemas bloat the catalog and every schema change runs N times. Note: AWS's SaaS guidance uses "bridge" for a mix of silo and pool per service; this lesson uses the older meaning, a schema per tenant.

**Pool**: all tenants share one set of tables, and every row carries `tenant_id`. The cheapest, with one schema change for everyone, but isolation lives in the data: composite keys (`e-ds-l2-06`), per-tenant uniqueness (`e-ds-l2-07`), a `tenant_id` filter in every query, and usually row-level security on top. Many systems mix: small tenants in the pool, large ones out in a silo, with one table design.

## Example

Pool: one table, tenants told apart by `tenant_id`.

```sql
SELECT tenant_id,
  count(*) AS invoices,
  sum(amount) AS total
FROM invoices
GROUP BY tenant_id
ORDER BY tenant_id;
```

Bridge: the same SQL, `search_path` picks the tenant.

```sql
SET search_path =
  seller_b, public;
SELECT id, amount
FROM invoices
ORDER BY id;
RESET search_path;
```

The bridge multiplies tables by tenants: each schema has its own `invoices`.

```sql
SELECT table_schema,
  count(*) AS tables
FROM information_schema.tables
WHERE table_name = 'invoices'
GROUP BY table_schema
ORDER BY table_schema;
```

A silo cannot run in the browser: PGlite can create a second database but cannot open a connection to it. On a real server it looks like this:

```text
-- Silo: one database per tenant
CREATE DATABASE seller_a;
-- the app opens its own connection
-- (and its own pool) per database
```

## Common mistakes

Pool: forget the tenant filter and seller 2's page counts the whole market's invoices.

```sql
-- WRONG: no tenant filter
SELECT count(*) AS invoices
FROM invoices;
```

```sql
-- FIX: name the tenant
SELECT count(*) AS invoices
FROM invoices
WHERE tenant_id = 2;
```

Bridge: `search_path` is session state. A connection that just served seller A is handed to seller B's request without changing `search_path`, so B reads A's data, with no error at all:

```sql
-- WRONG: path still on A
SET search_path = seller_a;
SELECT count(*) AS invoices
FROM invoices;
```

```sql
-- FIX: set it per request
SET search_path = seller_b;
SELECT count(*) AS invoices
FROM invoices;
RESET search_path;
```

Bridge: a new tenant without a schema breaks every query until creating and migrating it is done:

```sql
-- ERROR 42P01: C has no schema
SELECT count(*)
FROM seller_c.invoices;
```

## Recap

- Silo: its own database, the strongest isolation, the most expensive, every operations job times N.
- Bridge (here: a schema per tenant): one database, the catalog and schema changes times N, `search_path` must be right on every request.
- Pool: shared tables with `tenant_id`, the cheapest, isolation lives in keys, uniqueness rules and query filters.
- Read next: `e-ds-l4-09` (the topic map), `e-ds-l4-10` (choosing a model by scenario).
