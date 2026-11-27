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
  - url: https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/silo-pool-and-bridge-models.html
    title: "Silo, Pool, and Bridge Models"
    title_vi: "Mô hình silo, pool và bridge"
  - url: https://www.postgresql.org/docs/18/ddl-schemas.html
    title: "Schemas"
    title_vi: "Schema"
  - url: https://www.postgresql.org/docs/18/manage-ag-overview.html
    title: "Managing Databases › Overview"
    title_vi: "Quản lý database › tổng quan"
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
      vi: "Pool nghe đủ vì lọc theo `tenant_id` chặn đọc nhầm, nhưng hợp đồng hỏi dữ liệu nằm ở đâu và khôi phục thế nào, không hỏi câu SQL lọc gì. Trong pool, dòng của khách nằm chung bảng với mọi khách khác, nên khôi phục một khách là chép dòng ra khỏi bản sao lưu chung. Bridge cũng không đạt: schema riêng vẫn nằm trong cùng database và cùng bản sao lưu. Chỉ silo cho khách một database riêng, sao lưu và khôi phục riêng."
      en: "The pool sounds enough because filtering on `tenant_id` blocks wrong reads, but the contract asks where the data lives and how it is restored, not what the SQL filters. In a pool the tenant's rows share tables with every other tenant, so restoring one tenant means copying rows out of a shared backup. The bridge fails too: an own schema still lives in the same database and the same backup. Only the silo gives the tenant its own database, backed up and restored alone."
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
      vi: "Schema nghe miễn phí vì tạo nó chỉ mất một lệnh, nhưng bridge chép đủ 40 bảng vào mỗi schema: 5.000 × 40 = 200.000 bảng. Mỗi bảng là một dòng trong catalog hệ thống (system catalog, các bảng Postgres dùng để ghi mọi đối tượng), một tệp trên đĩa, một việc cho autovacuum, và một chỗ phải đổi cấu trúc, nên thêm một cột là chạy 5.000 lần. Số kết nối thì không tăng: một kết nối chỉ cần đổi `search_path` là sang schema khác."
      en: "A schema sounds free because creating one takes one command, but the bridge copies all 40 tables into each schema: 5,000 × 40 = 200,000 tables. Each table is a row in the system catalog (the tables Postgres uses to record every object), a file on disk, a job for autovacuum and one more place to migrate, so adding a column runs 5,000 times. The connection count does not grow: one connection just changes `search_path` to reach another schema."
---
## Mở bài

Chợ Lồng Đèn bắt đầu bán phần mềm quản lý cho người bán, và câu hỏi đầu tiên của nhóm thiết kế là: hóa đơn của mỗi người bán nằm ở đâu? Có ba câu trả lời quen thuộc, mỗi câu đổi cô lập lấy chi phí theo một tỉ lệ khác. Sơ đồ ở cuối bài, sau phần Lỗi hay gặp, gói cả ba vào năm bước.

## Ý chính

**Silo**: mỗi tenant một database (hay cả một cụm máy). Cô lập mạnh nhất: thông tin đăng nhập riêng, sao lưu riêng, đặt được ở vùng địa lý riêng, và một khách nặng không làm chậm ai. Đổi lại, chi phí cố định nhân với số khách, mỗi lần đổi cấu trúc chạy N lần, và Postgres không nối được giữa hai database, nên mỗi khách cần một nhóm kết nối riêng.

**Bridge**: một database, mỗi tenant một schema (`seller_a.invoices`, `seller_b.invoices`). Cùng câu SQL, khác `search_path`. Quyền cấp theo schema, nhưng hàng nghìn schema làm catalog phình và mỗi lần đổi cấu trúc chạy N lần. Lưu ý: tài liệu SaaS của AWS dùng chữ "bridge" cho kiểu trộn silo với pool theo dịch vụ; bài này dùng nghĩa cũ hơn, schema mỗi khách.

**Pool**: mọi tenant chung một bộ bảng, mỗi dòng có `tenant_id`. Rẻ nhất và chỉ đổi cấu trúc một lần, nhưng cô lập nằm trong dữ liệu: khóa ghép (`e-ds-l2-06`), luật duy nhất theo tenant (`e-ds-l2-07`), câu nào cũng lọc `tenant_id`, và thường thêm bảo mật theo dòng. Nhiều hệ thống trộn: khách nhỏ ở pool, khách lớn ra silo, cùng một cấu trúc bảng.

**Đếm trước khi chọn**: với N khách và M bảng, pool giữ M bảng, bridge giữ N × M bảng, silo giữ N database. Chợ có 300 người bán và 40 bảng: pool là 40 bảng, bridge là 12.000 bảng, và thêm một cột là chạy 300 lần. Silo với nhóm 10 kết nối cho mỗi database cần 3.000 kết nối, trong khi `max_connections` mặc định của Postgres là 100. Vì vậy câu hỏi thực tế không phải "mô hình nào tốt nhất" mà là "khách nào cần ra khỏi pool".

**Chuyển một khách giữa hai mô hình**: đưa một người bán lớn từ pool sang silo là chép các dòng `WHERE tenant_id = 7` của từng bảng sang database mới, cha trước con sau. Nhờ khóa `(tenant_id, id)`, số của khách đó không đụng số của ai ở nơi mới. Nếu khóa chỉ là `id` toàn cục thì vẫn chép được, nhưng mọi khóa ngoại phải được kiểm lại bằng tay.

**Khôi phục một khách**: bản sao lưu của Postgres là của cả cụm hay cả database. Trong silo, khôi phục một khách là khôi phục database của họ. Trong pool hay bridge, phải dựng bản sao lưu ra một chỗ riêng rồi chép lại đúng các dòng hay đúng schema của khách đó; việc này nên được tập dượt trước khi hợp đồng hứa thời gian khôi phục.

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

Bridge: khách mới chưa có schema thì mọi câu của họ hỏng cho tới khi việc tạo và đổi cấu trúc chạy xong, nên việc tạo schema phải là một bước của quy trình nhận khách:

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

**Count before you choose**: with N tenants and M tables, the pool keeps M tables, the bridge N × M tables and the silo N databases. With 300 sellers and 40 tables the pool is 40 tables and the bridge 12,000, and adding one column runs 300 times. A silo with a pool of 10 connections per database needs 3,000 connections, while Postgres's default `max_connections` is 100. So the practical question is not "which model is best" but "which tenants need to leave the pool".

**Moving a tenant between models**: taking a large seller from the pool to a silo means copying the `WHERE tenant_id = 7` rows of every table into the new database, parents before children. Thanks to the `(tenant_id, id)` key, that tenant's numbers collide with no one's in the new place. With a global `id` key the copy still works, but every foreign key has to be checked by hand.

**Restoring one tenant**: a Postgres backup covers the whole cluster or a whole database. In a silo, restoring a tenant means restoring its database. In a pool or a bridge, the backup has to be restored somewhere else first, then exactly that tenant's rows or schema copied back; rehearse this before a contract promises a restore time.

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

Bridge: a new tenant without a schema breaks every query until creating and migrating it is done, so creating the schema must be a step of the sign-up process:

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
