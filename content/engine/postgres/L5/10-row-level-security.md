---
id: e-pg-l5-10
engine: postgres
level: L5
module: security
title: "Bảo mật theo dòng (RLS) cho hệ thống nhiều khách hàng"
title_en: "Row-level security for a multi-tenant system"
kind: lab
runtime: browser
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - { vi: "Viết policy permissive theo vai trò và một policy restrictive gộp bằng AND", en: "Write role-based permissive policies and a restrictive policy combined with AND" }
  - { vi: "Biết ai bỏ qua RLS: chủ bảng (trừ khi `FORCE`), superuser, `BYPASSRLS`", en: "Know who bypasses RLS: the table owner (unless `FORCE`), superusers, `BYPASSRLS`" }
  - { vi: "Phân biệt `USING` (dòng thấy được) và `WITH CHECK` (dòng được ghi)", en: "Tell `USING` (rows you can see) from `WITH CHECK` (rows you may write)" }
requires: []
viz: pg-rls-path
sources:
  - https://www.postgresql.org/docs/18/ddl-rowsecurity.html
  - https://www.postgresql.org/docs/18/sql-createpolicy.html
  - https://www.postgresql.org/docs/18/sql-createview.html
  - https://www.postgresql.org/docs/18/view-pg-policies.html
lab:
  setup: |
    DROP TABLE IF EXISTS tickets CASCADE;
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tenant_1') THEN CREATE ROLE tenant_1 NOLOGIN; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'tenant_2') THEN CREATE ROLE tenant_2 NOLOGIN; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'support') THEN CREATE ROLE support NOLOGIN; END IF;
    END $$;
    CREATE TABLE tickets (id int PRIMARY KEY, tenant_id int NOT NULL, archived boolean NOT NULL, title text NOT NULL);
    INSERT INTO tickets SELECT g, g % 3 + 1, g % 5 = 0, 'ticket ' || g FROM generate_series(1, 30) g;
    GRANT SELECT ON tickets TO tenant_1, tenant_2, support;
    ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_1_rows ON tickets FOR SELECT TO tenant_1 USING (tenant_id = 1);
    CREATE POLICY tenant_2_rows ON tickets FOR SELECT TO tenant_2 USING (tenant_id = 2);
    CREATE POLICY hide_archived ON tickets AS RESTRICTIVE FOR SELECT TO tenant_2 USING (NOT archived);
    -- one view per role: a view (security_invoker off) applies the policies of its owner
    CREATE VIEW tickets_as_tenant_1 AS SELECT * FROM tickets;
    ALTER VIEW tickets_as_tenant_1 OWNER TO tenant_1;
    CREATE VIEW tickets_as_tenant_2 AS SELECT * FROM tickets;
    ALTER VIEW tickets_as_tenant_2 OWNER TO tenant_2;
    CREATE VIEW tickets_as_support AS SELECT * FROM tickets;
    ALTER VIEW tickets_as_support OWNER TO support;
  steps:
    - task: { vi: "Đếm số dòng mỗi bên thấy được, bốn cột: owner_sees (đọc thẳng `tickets` với vai trò hiện tại), t1, t2, support (đếm ba view `tickets_as_tenant_1`, `tickets_as_tenant_2`, `tickets_as_support`; mỗi view thuộc vai trò cùng tên nên áp policy của vai trò đó). Đoán trước: owner_sees bằng bao nhiêu, khi RLS đã bật?", en: "Count the rows each party can see, four columns: owner_sees (read `tickets` directly with the current role), t1, t2, support (count the three views `tickets_as_tenant_1`, `tickets_as_tenant_2`, `tickets_as_support`; each view is owned by the role it names, so it applies that role's policies). Guess first: what is owner_sees, now that RLS is on?" }
      solution: "SELECT (SELECT count(*) FROM tickets) AS owner_sees, (SELECT count(*) FROM tickets_as_tenant_1) AS t1, (SELECT count(*) FROM tickets_as_tenant_2) AS t2, (SELECT count(*) FROM tickets_as_support) AS support"
      check: rows
      hint: { vi: "Bốn truy vấn con `count(*)` trong một SELECT.", en: "Four `count(*)` sub-queries in one SELECT." }
    - task: { vi: "Liệt kê các policy của `tickets`: tên, permissive, vai trò (ép text), lệnh, điều kiện `qual`. Sắp theo tên.", en: "List the policies of `tickets`: name, permissive, roles (cast to text), command, condition `qual`. Order by name." }
      solution: "SELECT policyname, permissive, roles::text, cmd, qual FROM pg_policies WHERE tablename = 'tickets' ORDER BY policyname"
      check: rows
      ordered: true
      hint: { vi: "View `pg_policies`.", en: "The `pg_policies` view." }
    - task: { vi: "Vì sao owner_sees thấy tất cả? Đọc vai trò hiện tại có phải superuser và có `BYPASSRLS` không, cùng hai cờ RLS của bảng `tickets`. Năm cột: rolname, rolsuper, rolbypassrls, relrowsecurity, relforcerowsecurity.", en: "Why does owner_sees see everything? Read whether the current role is a superuser and has `BYPASSRLS`, along with the two RLS flags of `tickets`. Five columns: rolname, rolsuper, rolbypassrls, relrowsecurity, relforcerowsecurity." }
      solution: "SELECT r.rolname, r.rolsuper, r.rolbypassrls, c.relrowsecurity, c.relforcerowsecurity FROM pg_roles r, pg_class c WHERE r.rolname = current_user AND c.relname = 'tickets'"
      check: rows
      hint: { vi: "`pg_roles` theo `current_user`, `pg_class` theo tên bảng.", en: "`pg_roles` by `current_user`, `pg_class` by table name." }
quiz:
  - q: { vi: "Bật RLS trên bảng nhưng chưa có policy nào cho vai trò `support`. `support` thấy gì?", en: "RLS is enabled on the table but there is no policy for role `support`. What does `support` see?" }
    options:
      - { vi: "Mọi dòng", en: "Every row" }
      - { vi: "Không dòng nào: không có policy nghĩa là từ chối mặc định", en: "No rows: no policy means default deny" }
      - { vi: "Lỗi quyền", en: "A permission error" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì không có policy thì tưởng không có giới hạn, nhưng RLS hiểu ngược lại. Docs chính thức: khi RLS bật mà không có policy áp dụng, bảng hành xử như từ chối mặc định: không dòng nào thấy hay sửa được. Lab cho `support` = 0.", en: "It sounds right because no policy looks like no restriction, but RLS reads it the other way round. The docs: with RLS on and no applicable policy, the table is default-deny: no row can be seen or changed. The lab gives `support` = 0." }
  - q: { vi: "Policy `FOR UPDATE ... USING (tenant_id = 1)` không có `WITH CHECK`. Khách 1 chạy `UPDATE tickets SET tenant_id = 2 WHERE id = 3`. Chuyện gì xảy ra?", en: "A policy `FOR UPDATE ... USING (tenant_id = 1)` has no `WITH CHECK`. Tenant 1 runs `UPDATE tickets SET tenant_id = 2 WHERE id = 3`. What happens?" }
    options:
      - { vi: "Dòng được chuyển sang khách 2", en: "The row moves to tenant 2" }
      - { vi: "Bị từ chối: khi chỉ có `USING`, biểu thức đó cũng được dùng làm `WITH CHECK`, nên dòng mới phải vẫn có tenant_id = 1", en: "It is rejected: with only `USING`, that expression is also used as `WITH CHECK`, so the new row must still have tenant_id = 1" }
      - { vi: "Dòng biến mất", en: "The row disappears" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì thiếu `WITH CHECK` thì tưởng không có gì kiểm dòng mới, nhưng Postgres tự điền nó. `USING` lọc dòng cũ được nhắm tới; `WITH CHECK` kiểm dòng mới. Không ghi `WITH CHECK` thì Postgres dùng lại `USING`, chặn việc \"đẩy\" dòng sang khách khác.", en: "It sounds right because without `WITH CHECK` nothing seems to check the new row, but Postgres fills it in. `USING` filters the existing rows you can target; `WITH CHECK` validates the new row. Without `WITH CHECK`, Postgres reuses `USING`, which stops a row being \"pushed\" to another tenant." }
  - q: { vi: "Ứng dụng kết nối bằng chính vai trò sở hữu bảng. Policy không có tác dụng. Sửa thế nào?", en: "The application connects as the role that owns the table. The policies have no effect. How do you fix it?" }
    options:
      - { vi: "`ALTER TABLE tickets FORCE ROW LEVEL SECURITY`, hoặc tốt hơn: cho ứng dụng một vai trò riêng không sở hữu bảng", en: "`ALTER TABLE tickets FORCE ROW LEVEL SECURITY`, or better: give the application its own role that does not own the table" }
      - { vi: "Tạo lại policy", en: "Recreate the policies" }
      - { vi: "Đặt `row_security = off`", en: "Set `row_security = off`" }
    answer: 0
    trap: 1
    why: { vi: "Tạo lại policy nghe hợp lý vì có vẻ policy bị sai, nhưng policy không sai: chủ bảng không bị nó áp dụng. Chủ bảng bỏ qua RLS trừ khi bật `FORCE`. Superuser và vai trò `BYPASSRLS` luôn bỏ qua. `row_security = off` không tắt được RLS: nó báo lỗi khi câu bị policy lọc.", en: "Recreating the policy sounds right because the policy seems broken, but it is not: the owner is just not subject to it. The table owner bypasses RLS unless `FORCE` is on. Superusers and `BYPASSRLS` roles always bypass it. `row_security = off` cannot switch RLS off: it raises an error when a query would be filtered by a policy." }
---
## Mở bài

Ba công ty cùng dùng một bảng `tickets`, phân biệt bằng cột `tenant_id`. Chỉ cần một câu quên `WHERE tenant_id = ...` trong code là khách này đọc được vé của khách kia. Có cách nào để chính database chặn việc đó?

## Ý chính

`ALTER TABLE … ENABLE ROW LEVEL SECURITY` bật RLS. Từ đó mỗi câu của vai trò bị áp dụng chỉ thấy các dòng mà policy cho phép; không có policy nào áp dụng thì từ chối mặc định, thấy 0 dòng. `USING` lọc dòng đã có (SELECT, UPDATE, DELETE); `WITH CHECK` kiểm dòng mới (INSERT, UPDATE). Chỉ có `USING` thì nó làm luôn `WITH CHECK`.

Policy permissive (mặc định) gộp với nhau bằng OR; policy `AS RESTRICTIVE` gộp bằng AND lên kết quả đó, hợp cho luật chung như "không bao giờ thấy vé đã lưu trữ".

Nhiều người nghĩ bật RLS là mọi người đều bị lọc. Thật ra superuser, vai trò `BYPASSRLS` và chủ bảng bỏ qua RLS (chủ bảng chỉ bị áp khi bật `FORCE ROW LEVEL SECURITY`). Kiểm thử bằng tài khoản quản trị vì thế luôn "đúng". Mẫu thường dùng: ứng dụng chạy bằng một vai trò không sở hữu bảng, policy đọc `current_setting('app.tenant_id')`, và có index trên `tenant_id` vì điều kiện policy được thêm vào mọi câu.

## Cú pháp

```sql
ALTER TABLE table_name { ENABLE | FORCE } ROW LEVEL SECURITY;
CREATE POLICY name ON table_name
  [ AS { PERMISSIVE | RESTRICTIVE } ]
  [ FOR { ALL | SELECT | INSERT | UPDATE | DELETE } ]
  [ TO role_name [, ...] ]
  [ USING ( condition ) ]
  [ WITH CHECK ( condition ) ];
```

- `AS RESTRICTIVE`: gộp bằng AND; cần ít nhất một policy permissive mới thấy được dòng.
- `FOR`: lệnh mà policy áp dụng; mặc định `ALL`.
- `USING`: dòng nào thấy hoặc nhắm tới được; `WITH CHECK`: dòng mới nào được ghi.
- `FORCE`: áp RLS cả cho chủ bảng.

## Ví dụ

Đóng vai khách 2 bằng `SET ROLE`:

```sql
SET ROLE tenant_2;
SELECT current_user, count(*) AS rows_seen FROM tickets;
RESET ROLE;
```

Khách 2 có 10 vé, policy restrictive bỏ 2 vé đã lưu trữ, còn 8.

Cho khách 1 thêm vé, nhưng chỉ vé của chính mình:

```sql
GRANT INSERT ON tickets TO tenant_1;
CREATE POLICY tenant_1_insert ON tickets FOR INSERT TO tenant_1 WITH CHECK (tenant_id = 1);
SET ROLE tenant_1;
INSERT INTO tickets VALUES (31, 1, false, 'new ticket') RETURNING id, tenant_id;
RESET ROLE;
```

Mẫu ứng dụng: một vai trò `app`, khách hiện tại nằm trong một thiết lập của phiên:

```sql
CREATE ROLE app NOLOGIN;
GRANT SELECT ON tickets TO app;
CREATE POLICY app_rows ON tickets FOR SELECT TO app
  USING (tenant_id = current_setting('app.tenant_id')::int);
BEGIN;
SET LOCAL app.tenant_id = '3';
SET ROLE app;
SELECT current_setting('app.tenant_id') AS tenant,
  count(*) AS rows_seen FROM tickets;
RESET ROLE;
COMMIT;
```

`app` thấy 10 vé của khách 3; đổi `app.tenant_id` là đổi khách. `SET LOCAL` chỉ sống tới `COMMIT`: sau đó kết nối không còn khách nào, nên khi ứng dụng dùng chung kết nối qua pool, khách sau không nhận nhầm khách 3. Một `SET` thường thì ở lại trên kết nối.

## Lỗi hay gặp

Khách 1 thử đẩy một vé sang khách 2:

```sql
SET ROLE tenant_1;
-- ERROR 42501: new row violates row-level security policy for table "tickets"
INSERT INTO tickets VALUES (32, 2, false, 'pushed to tenant 2');
```

`WITH CHECK` chặn dòng mới không thỏa điều kiện. Đó là điều bạn muốn; lỗi `42501` báo rằng policy đang làm việc.

Kiểm thử policy bằng vai trò quản trị:

```sql
-- WRONG: the owner and superusers skip RLS
RESET ROLE;
SELECT count(*) AS rows_seen FROM tickets;
```

```sql
-- FIX: test under the role the application uses
SET ROLE tenant_1;
SELECT count(*) AS rows_seen FROM tickets;
RESET ROLE;
```

Câu sai thấy cả 31 vé, câu đúng thấy 11. Luôn thử dưới đúng vai trò của ứng dụng.

Tắt RLS bằng `row_security`:

```sql
SET row_security = off;
SET ROLE tenant_1;
-- ERROR 42501: query would be affected by row-level security policy for table "tickets"
SELECT count(*) FROM tickets;
```

`row_security = off` không bỏ qua policy: nó báo lỗi thay vì trả kết quả đã lọc. Công cụ sao lưu dùng nó để chắc rằng không xuất thiếu dòng.

## Thực hành

Trong lab không dùng được `SET ROLE` (bước sau chạy lại bước trước), nên mỗi vai trò được thử qua một view do chính nó sở hữu: view mặc định áp policy của chủ view. Ba bước: đếm theo vai trò, đọc policy, giải thích vì sao vai trò hiện tại thấy tất cả.

## Tóm tắt

- Bật RLS mà không có policy áp dụng là từ chối mặc định.
- `USING` lọc dòng đã có, `WITH CHECK` kiểm dòng mới; thiếu `WITH CHECK` thì `USING` làm thay.
- Permissive gộp OR, restrictive gộp AND.
- Superuser, `BYPASSRLS` và chủ bảng (trừ khi `FORCE`) bỏ qua RLS: kiểm thử dưới vai trò ứng dụng.
- Đọc tiếp: `e-pg-l5-19` (RLS sâu hơn) và `e-pg-l5-20` (khách hiện tại qua pool).

# EN

## Opening

Three companies share one `tickets` table, told apart by column `tenant_id`. A single query that forgets `WHERE tenant_id = ...` in the code is enough for one tenant to read another's tickets. Can the database itself stop that?

## Key idea

`ALTER TABLE … ENABLE ROW LEVEL SECURITY` turns RLS on. From then on, each query of a role it applies to sees only the rows a policy allows; with no applicable policy it is default deny, 0 rows. `USING` filters existing rows (SELECT, UPDATE, DELETE); `WITH CHECK` validates new rows (INSERT, UPDATE). With only `USING`, it also serves as `WITH CHECK`.

Permissive policies (the default) are combined with OR; `AS RESTRICTIVE` policies are combined with AND on top of that, which suits global rules such as "never see archived tickets".

Many people think turning RLS on filters everyone. In fact superusers, `BYPASSRLS` roles and the table owner skip RLS (the owner is only subject to it with `FORCE ROW LEVEL SECURITY`). Testing with an admin account therefore always "works". The usual pattern: the application runs as a role that does not own the table, policies read `current_setting('app.tenant_id')`, and `tenant_id` is indexed because the policy condition is added to every query.

## Syntax

```sql
ALTER TABLE table_name { ENABLE | FORCE } ROW LEVEL SECURITY;
CREATE POLICY name ON table_name
  [ AS { PERMISSIVE | RESTRICTIVE } ]
  [ FOR { ALL | SELECT | INSERT | UPDATE | DELETE } ]
  [ TO role_name [, ...] ]
  [ USING ( condition ) ]
  [ WITH CHECK ( condition ) ];
```

- `AS RESTRICTIVE`: combined with AND; at least one permissive policy is still needed to see any row.
- `FOR`: the command the policy applies to; `ALL` by default.
- `USING`: which rows can be seen or targeted; `WITH CHECK`: which new rows may be written.
- `FORCE`: applies RLS to the table owner too.

## Example

Act as tenant 2 with `SET ROLE`:

```sql
SET ROLE tenant_2;
SELECT current_user, count(*) AS rows_seen FROM tickets;
RESET ROLE;
```

Tenant 2 has 10 tickets; the restrictive policy drops the 2 archived ones, leaving 8.

Let tenant 1 add tickets, but only its own:

```sql
GRANT INSERT ON tickets TO tenant_1;
CREATE POLICY tenant_1_insert ON tickets FOR INSERT TO tenant_1 WITH CHECK (tenant_id = 1);
SET ROLE tenant_1;
INSERT INTO tickets VALUES (31, 1, false, 'new ticket') RETURNING id, tenant_id;
RESET ROLE;
```

The application pattern: one role `app`, the current tenant held in a session setting:

```sql
CREATE ROLE app NOLOGIN;
GRANT SELECT ON tickets TO app;
CREATE POLICY app_rows ON tickets FOR SELECT TO app
  USING (tenant_id = current_setting('app.tenant_id')::int);
BEGIN;
SET LOCAL app.tenant_id = '3';
SET ROLE app;
SELECT current_setting('app.tenant_id') AS tenant,
  count(*) AS rows_seen FROM tickets;
RESET ROLE;
COMMIT;
```

`app` sees the 10 tickets of tenant 3; changing `app.tenant_id` changes the tenant. `SET LOCAL` lives only until `COMMIT`: after it the connection holds no tenant, so when the application shares connections through a pool, the next request does not inherit tenant 3. A plain `SET` stays on the connection.

## Common mistakes

Tenant 1 tries to push a ticket to tenant 2:

```sql
SET ROLE tenant_1;
-- ERROR 42501: new row violates row-level security policy for table "tickets"
INSERT INTO tickets VALUES (32, 2, false, 'pushed to tenant 2');
```

`WITH CHECK` blocks a new row that fails its condition. That is what you want; error `42501` says the policy is doing its job.

Testing policies with an admin role:

```sql
-- WRONG: the owner and superusers skip RLS
RESET ROLE;
SELECT count(*) AS rows_seen FROM tickets;
```

```sql
-- FIX: test under the role the application uses
SET ROLE tenant_1;
SELECT count(*) AS rows_seen FROM tickets;
RESET ROLE;
```

The wrong query sees all 31 tickets, the right one 11. Always test under the application's real role.

Switching RLS off with `row_security`:

```sql
SET row_security = off;
SET ROLE tenant_1;
-- ERROR 42501: query would be affected by row-level security policy for table "tickets"
SELECT count(*) FROM tickets;
```

`row_security = off` does not skip the policies: it raises an error instead of returning filtered rows. Backup tools use it to make sure no rows are silently left out.

## Practice

The lab cannot use `SET ROLE` (each step replays the earlier ones), so each role is tried through a view it owns: a default view applies the policies of its owner. Three steps: count per role, read the policies, explain why the current role sees everything.

## Recap

- RLS on with no applicable policy is default deny.
- `USING` filters existing rows, `WITH CHECK` validates new ones; without `WITH CHECK`, `USING` stands in.
- Permissive policies combine with OR, restrictive ones with AND.
- Superusers, `BYPASSRLS` and the owner (unless `FORCE`) skip RLS: test under the application role.
- Read next: `e-pg-l5-19` (RLS in depth) and `e-pg-l5-20` (the current tenant through a pool).
