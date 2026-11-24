---
id: e-pg-l5-20
engine: postgres
level: L5
module: multi-tenant
title: "Khách hiện tại qua connection pool: SET LOCAL và đóng an toàn"
title_en: "The current tenant through a connection pool: SET LOCAL and failing closed"
kind: lab
runtime: browser
minutes: 20
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-25" }
objectives:
  - { vi: "Giải thích vì sao `SET` thường rò sang yêu cầu sau trên cùng kết nối, còn `SET LOCAL` thì không", en: "Explain why a plain `SET` leaks into the next request on the same connection while `SET LOCAL` does not" }
  - { vi: "Gắn khách cho từng transaction bằng `SET LOCAL` hoặc `set_config(…, true)`", en: "Bind the tenant per transaction with `SET LOCAL` or `set_config(…, true)`" }
  - { vi: "Viết policy đóng an toàn khi thiếu khách: `NULLIF(current_setting(…, true), '')`", en: "Write a policy that fails closed when no tenant is set: `NULLIF(current_setting(…, true), '')`" }
requires: [e-pg-l5-19]
sources:
  - https://www.postgresql.org/docs/18/sql-set.html
  - https://www.postgresql.org/docs/18/functions-admin.html
  - https://www.postgresql.org/docs/18/ddl-rowsecurity.html
lab:
  setup: |
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app') THEN CREATE ROLE app NOLOGIN; END IF;
    END $$;
    -- Lantern Market: each seller (tenant) sees only its own invoices
    CREATE TABLE invoices (tenant_id int NOT NULL, id int NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id));
    INSERT INTO invoices SELECT g % 4 + 1, g, (g * 37) % 500 + 100 FROM generate_series(1, 40) g;
    GRANT SELECT ON invoices TO app;
    ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
    -- a view owned by app applies app's policies (the lab cannot SET ROLE)
    CREATE VIEW invoices_as_app AS SELECT * FROM invoices;
    ALTER VIEW invoices_as_app OWNER TO app;
  steps:
    - task: { vi: "Tạo policy `seller_rows` trên `invoices` cho vai trò `app`: chỉ dòng có `tenant_id` bằng khách trong thiết lập `app.tenant_id`, và khi thiếu khách thì không dòng nào (không báo lỗi). Chấm bằng catalog (điều kiện của policy).", en: "Create policy `seller_rows` on `invoices` for role `app`: only rows whose `tenant_id` equals the tenant in setting `app.tenant_id`, and no row at all (no error) when no tenant is set. Graded on the catalog (the policy's condition)." }
      solution: "CREATE POLICY seller_rows ON invoices TO app USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int)"
      check: catalog
      hint: { vi: "`current_setting('app.tenant_id', true)` cho NULL hoặc `''` khi thiếu; `NULLIF(…, '')` đổi `''` thành NULL rồi mới ép `::int`.", en: "`current_setting('app.tenant_id', true)` gives NULL or `''` when unset; `NULLIF(…, '')` turns `''` into NULL before the `::int` cast." }
    - task: { vi: "Chưa yêu cầu nào đặt khách. `app` thấy bao nhiêu hóa đơn qua `invoices_as_app`? Một cột rows_seen.", en: "No request has set a tenant yet. How many invoices does `app` see through `invoices_as_app`? One column rows_seen." }
      solution: "SELECT count(*) AS rows_seen FROM invoices_as_app"
      check: rows
      hint: { vi: "Đếm view của `app`.", en: "Count `app`'s view." }
      fact:
        vi: "0 và không lỗi: thiếu khách thì điều kiện là NULL, policy không giữ dòng nào. Đó là đóng an toàn."
        en: "0 and no error: with no tenant the condition is NULL and the policy keeps no row. That is failing closed."
        probe: SELECT count(*) FROM invoices_as_app
        expect: [[0]]
    - task: { vi: "Đóng vai yêu cầu 1 trên một kết nối của pool: đặt khách 3 cho cả phiên bằng `set_config` với `is_local = false` (như `SET` thường). Bài chấm bằng số hóa đơn `app` thấy NGAY SAU câu của bạn, tức là thứ yêu cầu kế tiếp trên kết nối này nhận được.", en: "Play request 1 on a pooled connection: set tenant 3 for the whole session with `set_config` and `is_local = false` (like a plain `SET`). It is graded on the invoices `app` sees RIGHT AFTER your statement, which is what the next request on this connection gets." }
      solution: "SELECT set_config('app.tenant_id', '3', false)"
      after: "SELECT count(*) AS rows_seen FROM invoices_as_app"
      check: rows
      hint: { vi: "`SELECT set_config('app.tenant_id', '3', false)`.", en: "`SELECT set_config('app.tenant_id', '3', false)`." }
    - task: { vi: "Giờ làm đúng: đặt khách 3 chỉ trong transaction của câu (`is_local = true`). Mỗi câu ở đây tự là một transaction. Bài chấm bằng giá trị yêu cầu sau đọc được: `current_setting('app.tenant_id', true)`.", en: "Now do it right: set tenant 3 for the statement's own transaction only (`is_local = true`). Each statement here is its own transaction. It is graded on what the next request reads: `current_setting('app.tenant_id', true)`." }
      solution: "SELECT set_config('app.tenant_id', '3', true)"
      after: "SELECT current_setting('app.tenant_id', true) AS left_over"
      check: rows
      hint: { vi: "`SELECT set_config('app.tenant_id', '3', true)`.", en: "`SELECT set_config('app.tenant_id', '3', true)`." }
      fact:
        vi: "Yêu cầu sau đọc được chuỗi rỗng `''`, không phải NULL: thiết lập đã có trong phiên nhưng giá trị chỉ sống tới hết transaction. Vì thế policy cần `NULLIF(…, '')`: `''::int` sẽ báo lỗi."
        en: "The next request reads an empty string `''`, not NULL: the setting now exists in the session but its value lived only until the transaction ended. That is why the policy needs `NULLIF(…, '')`: `''::int` would raise an error."
        probe: SELECT current_setting('app.tenant_id', true) = '' AS empty
        expect: [[true]]
quiz:
  - q: { vi: "Ứng dụng chạy `BEGIN; SET LOCAL app.tenant_id = '5'; …; COMMIT;` rồi trả kết nối về pool. Yêu cầu sau gọi `current_setting('app.tenant_id', true)`. Kết quả?", en: "The application runs `BEGIN; SET LOCAL app.tenant_id = '5'; …; COMMIT;` and returns the connection to the pool. The next request calls `current_setting('app.tenant_id', true)`. The result?" }
    options:
      - { vi: "`'5'`: thiết lập vẫn còn tới khi kết nối đóng", en: "`'5'`: the setting stays until the connection closes" }
      - { vi: "Chuỗi rỗng `''`", en: "An empty string `''`" }
      - { vi: "Lỗi 42704", en: "Error 42704" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì `SET` thường sống hết phiên, nhưng `SET LOCAL` hết hiệu lực ở `COMMIT` hoặc `ROLLBACK`. Thiết lập đã từng được đặt nên tên vẫn còn trong phiên, với giá trị rỗng: `''`, không phải NULL và không lỗi. Lab đo đúng điều này.", en: "It sounds right because a plain `SET` lives for the session, but `SET LOCAL` ends at `COMMIT` or `ROLLBACK`. The setting was defined once, so its name stays in the session with an empty value: `''`, not NULL and no error. The lab measures exactly this." }
  - q: { vi: "Policy dùng `tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int`. Một yêu cầu quên đặt khách. Nó thấy gì?", en: "A policy uses `tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int`. A request forgets to set the tenant. What does it see?" }
    options:
      - { vi: "Mọi dòng, vì không có điều kiện khách", en: "Every row, because there is no tenant condition" }
      - { vi: "Không dòng nào, không lỗi", en: "No rows, no error" }
      - { vi: "Lỗi 22P02", en: "Error 22P02" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì thiếu khách thì tưởng không lọc, nhưng điều kiện so với NULL không bao giờ đúng: policy không giữ dòng nào. Đó là đóng an toàn nhưng im lặng. Muốn ồn ào thì bỏ `true`: `current_setting('app.tenant_id')` báo lỗi 42704 khi tên chưa từng được đặt.", en: "It sounds right because no tenant looks like no filter, but a comparison with NULL is never true: the policy keeps no row. That fails closed, but silently. For a loud failure drop the `true`: `current_setting('app.tenant_id')` raises error 42704 when the name was never set." }
  - q: { vi: "Pool chạy ở chế độ transaction (mỗi transaction có thể nhận một kết nối khác). Ứng dụng đặt khách bằng `SET app.tenant_id` thường. Rủi ro?", en: "The pool runs in transaction mode (each transaction may get a different connection). The application sets the tenant with a plain `SET app.tenant_id`. The risk?" }
    options:
      - { vi: "Không có: pool tự xóa thiết lập sau mỗi yêu cầu", en: "None: the pool clears settings after each request" }
      - { vi: "Thiết lập ở lại trên kết nối, nên yêu cầu khác mượn kết nối đó có thể chạy với khách cũ", en: "The setting stays on the connection, so another request borrowing it may run as the old tenant" }
      - { vi: "Lệnh `SET` bị từ chối", en: "The `SET` is refused" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì pool trông như quản lý kết nối giúp ta, nhưng thiết lập phiên thuộc về kết nối, không thuộc về yêu cầu. Gắn khách theo transaction bằng `SET LOCAL` hoặc `set_config(…, true)`. Một số pooler còn ghim kết nối khi thấy câu đổi thiết lập phiên: đọc tài liệu của pooler bạn dùng.", en: "It sounds right because the pool seems to manage connections for us, but a session setting belongs to the connection, not to the request. Bind the tenant per transaction with `SET LOCAL` or `set_config(…, true)`. Some poolers also pin a connection when they see a statement that changes session state: read your pooler's documentation." }
---
## Mở bài

Hóa đơn của người bán số 3 ở Lantern Market hiện ra trên trang của người bán số 1. Không câu SQL nào sai: yêu cầu trước đặt khách 3 bằng `SET`, rồi trả kết nối về pool, và yêu cầu sau mượn đúng kết nối đó. Làm sao để khách hiện tại không bao giờ sống lâu hơn một transaction?

## Ý chính

Ứng dụng web thường dùng chung một nhóm kết nối (connection pool): mỗi yêu cầu mượn một kết nối, xong thì trả. Thiết lập phiên như `app.tenant_id` thuộc về kết nối, nên một `SET` thường ở lại cho người mượn sau.

`SET LOCAL` và `set_config(name, value, true)` chỉ sống tới hết transaction hiện tại. Mẫu an toàn: `BEGIN; SET LOCAL app.tenant_id = '…'; …; COMMIT;` cho mỗi yêu cầu. Ngoài transaction, `SET LOCAL` không có tác dụng gì (Postgres chỉ cảnh báo).

Nhiều người nghĩ thiếu khách thì policy "mở toang". Thật ra `current_setting('app.tenant_id')` báo lỗi 42704 nếu tên chưa từng được đặt (thất bại ồn ào), còn với `true` nó trả NULL và policy giữ 0 dòng (thất bại im lặng). Bẫy: một khi tên đã được đặt trong phiên, kể cả bằng `SET LOCAL` đã hết, nó trả `''`, và `''::int` báo lỗi 22P02. `NULLIF(…, '')` gộp cả hai trường hợp về NULL: đóng an toàn, không lỗi.

## Cú pháp

```sql
BEGIN;
SET LOCAL app.tenant_id = '3';
-- or: SELECT set_config(
--   'app.tenant_id', '3', true);
COMMIT;
USING (tenant_id = NULLIF(
  current_setting(
    'app.tenant_id', true), '')::int)
```

- `SET LOCAL` / `set_config(…, true)`: tới hết transaction.
- `SET` / `set_config(…, false)`: tới hết phiên, tức là hết đời kết nối trong pool.
- `current_setting(name, true)`: NULL hoặc `''` thay vì lỗi khi thiếu.

## Ví dụ

Policy đóng an toàn, chưa yêu cầu nào đặt khách:

```sql
CREATE POLICY seller_rows ON invoices
  TO app USING (tenant_id = NULLIF(
    current_setting(
      'app.tenant_id', true), '')::int);
SET ROLE app;
SELECT count(*) AS seen FROM invoices;
RESET ROLE;
```

0 dòng, không lỗi. Yêu cầu 1 đặt khách 3 bằng `SET` thường:

```sql
SET app.tenant_id = '3';
SET ROLE app;
SELECT count(*) AS seen FROM invoices;
RESET ROLE;
```

Yêu cầu 2 mượn lại kết nối, không đặt khách nào:

```sql
SET ROLE app;
SELECT current_setting('app.tenant_id')
  AS tenant, count(*) AS seen
FROM invoices;
RESET ROLE;
```

Nó vẫn chạy với khách 3: rò rỉ. Cách đúng, gắn khách theo transaction:

```sql
RESET app.tenant_id;
BEGIN;
SET LOCAL app.tenant_id = '1';
SET ROLE app;
SELECT count(*) AS seen FROM invoices;
RESET ROLE;
COMMIT;
```

Sau `COMMIT`, yêu cầu kế tiếp không còn khách nào:

```sql
SET ROLE app;
SELECT current_setting(
    'app.tenant_id', true)
  AS tenant, count(*) AS seen
FROM invoices;
RESET ROLE;
```

Giá trị là `''` và 0 dòng: đóng an toàn.

## Lỗi hay gặp

Ép thẳng thiết lập sang số, không có `NULLIF`:

```sql
-- ERROR 22P02
SELECT current_setting(
  'app.tenant_id', true)::int;
```

Sau một `SET LOCAL` đã hết, giá trị là `''`, và `''` không phải số. Gõ sai tên thiết lập:

```sql
-- ERROR 42704
SELECT current_setting('app.tenantid');
```

Không có `true` thì lỗi ồn ào, dễ thấy. Cùng lỗi gõ đó với `true` thì im lặng mãi mãi:

```sql
-- WRONG: a silent typo (missing_ok)
SET app.tenant_id = '2';
SELECT count(*) AS seen FROM invoices
WHERE tenant_id = NULLIF(
  current_setting(
    'app.tenantid', true), '')::int;
```

```sql
-- FIX: one name, written once
SELECT count(*) AS seen FROM invoices
WHERE tenant_id = NULLIF(
  current_setting(
    'app.tenant_id', true), '')::int;
```

Câu sai thấy 0, câu đúng thấy 10. Giữ tên thiết lập ở một chỗ duy nhất trong code.

## Thực hành

Bốn bước trên hóa đơn của người bán: policy đóng an toàn, đếm khi chưa có khách, rồi hai cách đặt khách. Mỗi câu của lab tự là một transaction, nên bước 3 và 4 được chấm bằng một câu đọc chạy ngay sau câu của bạn, đúng như yêu cầu kế tiếp trên cùng kết nối.

## Tóm tắt

- Thiết lập phiên thuộc về kết nối; qua pool, `SET` thường rò sang yêu cầu sau.
- Gắn khách theo transaction: `SET LOCAL` hoặc `set_config(…, true)` trong `BEGIN … COMMIT`.
- `current_setting(…, true)` trả NULL hoặc `''`; `NULLIF(…, '')::int` làm policy đóng an toàn.
- Đọc tiếp: `e-pg-l5-19`, `e-pg-l5-21`, bản đồ chủ đề `e-ds-l4-09`.

# EN

## Opening

Lantern Market seller 3's invoices show up on seller 1's page. No SQL is wrong: the previous request set tenant 3 with `SET`, returned the connection to the pool, and the next request borrowed that very connection. How do you make sure the current tenant never outlives one transaction?

## Key idea

Web applications usually share a group of connections (a connection pool): each request borrows a connection and returns it when done. A session setting such as `app.tenant_id` belongs to the connection, so a plain `SET` stays for the next borrower.

`SET LOCAL` and `set_config(name, value, true)` last only until the current transaction ends. The safe pattern is `BEGIN; SET LOCAL app.tenant_id = '…'; …; COMMIT;` for each request. Outside a transaction, `SET LOCAL` has no effect (Postgres only warns).

Many people think a missing tenant makes the policy "wide open". In fact `current_setting('app.tenant_id')` raises error 42704 when the name was never set (a loud failure), while with `true` it returns NULL and the policy keeps 0 rows (a silent failure). The trap: once the name has been set in the session, even by a `SET LOCAL` that has ended, it returns `''`, and `''::int` raises error 22P02. `NULLIF(…, '')` folds both cases into NULL: fail closed, no error.

## Syntax

```sql
BEGIN;
SET LOCAL app.tenant_id = '3';
-- or: SELECT set_config(
--   'app.tenant_id', '3', true);
COMMIT;
USING (tenant_id = NULLIF(
  current_setting(
    'app.tenant_id', true), '')::int)
```

- `SET LOCAL` / `set_config(…, true)`: until the transaction ends.
- `SET` / `set_config(…, false)`: until the session ends, that is, for the pooled connection's whole life.
- `current_setting(name, true)`: NULL or `''` instead of an error when unset.

## Example

A policy that fails closed, before any request has set a tenant:

```sql
CREATE POLICY seller_rows ON invoices
  TO app USING (tenant_id = NULLIF(
    current_setting(
      'app.tenant_id', true), '')::int);
SET ROLE app;
SELECT count(*) AS seen FROM invoices;
RESET ROLE;
```

0 rows, no error. Request 1 sets tenant 3 with a plain `SET`:

```sql
SET app.tenant_id = '3';
SET ROLE app;
SELECT count(*) AS seen FROM invoices;
RESET ROLE;
```

Request 2 borrows the same connection and sets no tenant:

```sql
SET ROLE app;
SELECT current_setting('app.tenant_id')
  AS tenant, count(*) AS seen
FROM invoices;
RESET ROLE;
```

It still runs as tenant 3: a leak. The right way, binding the tenant per transaction:

```sql
RESET app.tenant_id;
BEGIN;
SET LOCAL app.tenant_id = '1';
SET ROLE app;
SELECT count(*) AS seen FROM invoices;
RESET ROLE;
COMMIT;
```

After `COMMIT`, the next request holds no tenant:

```sql
SET ROLE app;
SELECT current_setting(
    'app.tenant_id', true)
  AS tenant, count(*) AS seen
FROM invoices;
RESET ROLE;
```

The value is `''` and there are 0 rows: failing closed.

## Common mistakes

Casting the setting straight to a number, without `NULLIF`:

```sql
-- ERROR 22P02
SELECT current_setting(
  'app.tenant_id', true)::int;
```

After a `SET LOCAL` has ended the value is `''`, and `''` is not a number. A typo in the setting name:

```sql
-- ERROR 42704
SELECT current_setting('app.tenantid');
```

Without `true` the failure is loud and easy to spot. The same typo with `true` stays silent forever:

```sql
-- WRONG: a silent typo (missing_ok)
SET app.tenant_id = '2';
SELECT count(*) AS seen FROM invoices
WHERE tenant_id = NULLIF(
  current_setting(
    'app.tenantid', true), '')::int;
```

```sql
-- FIX: one name, written once
SELECT count(*) AS seen FROM invoices
WHERE tenant_id = NULLIF(
  current_setting(
    'app.tenant_id', true), '')::int;
```

The wrong one sees 0, the fixed one 10. Keep the setting name in one single place in the code.

## Practice

Four steps on the sellers' invoices: a policy that fails closed, a count with no tenant, then the two ways to set the tenant. Each lab statement is its own transaction, so steps 3 and 4 are graded on a read that runs right after your statement, exactly like the next request on the same connection.

## Recap

- A session setting belongs to the connection; through a pool, a plain `SET` leaks into the next request.
- Bind the tenant per transaction: `SET LOCAL` or `set_config(…, true)` inside `BEGIN … COMMIT`.
- `current_setting(…, true)` returns NULL or `''`; `NULLIF(…, '')::int` makes the policy fail closed.
- Read next: `e-pg-l5-19`, `e-pg-l5-21`, the theme map `e-ds-l4-09`.
