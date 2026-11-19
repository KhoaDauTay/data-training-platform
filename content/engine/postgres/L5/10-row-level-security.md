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
objectives:
  - { vi: "Viết policy permissive theo vai trò và một policy restrictive gộp bằng AND", en: "Write role-based permissive policies and a restrictive policy combined with AND" }
  - { vi: "Biết ai bỏ qua RLS: chủ bảng (trừ khi `FORCE`), superuser, `BYPASSRLS`", en: "Know who bypasses RLS: the table owner (unless `FORCE`), superusers, `BYPASSRLS`" }
  - { vi: "Phân biệt `USING` (dòng thấy được) và `WITH CHECK` (dòng được ghi)", en: "Tell `USING` (rows you can see) from `WITH CHECK` (rows you may write)" }
requires: []
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
    - task: { vi: "Đếm số dòng mỗi bên thấy được, bốn cột: owner_sees (đọc thẳng `tickets` với vai trò hiện tại), t1, t2, support (đọc ba view tương ứng).", en: "Count the rows each party can see, four columns: owner_sees (read `tickets` directly with the current role), t1, t2, support (read the three matching views)." }
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
    why: { vi: "Tài liệu: khi RLS bật mà không có policy áp dụng, bảng hành xử như từ chối mặc định: không dòng nào thấy hay sửa được. Lab cho `support` = 0.", en: "The docs: with RLS on and no applicable policy, the table is default-deny: no row can be seen or changed. The lab gives `support` = 0." }
  - q: { vi: "Policy `FOR UPDATE ... USING (tenant_id = 1)` không có `WITH CHECK`. Khách 1 chạy `UPDATE tickets SET tenant_id = 2 WHERE id = 3`. Chuyện gì xảy ra?", en: "A policy `FOR UPDATE ... USING (tenant_id = 1)` has no `WITH CHECK`. Tenant 1 runs `UPDATE tickets SET tenant_id = 2 WHERE id = 3`. What happens?" }
    options:
      - { vi: "Dòng được chuyển sang khách 2", en: "The row moves to tenant 2" }
      - { vi: "Bị từ chối: khi chỉ có `USING`, biểu thức đó cũng được dùng làm `WITH CHECK`, nên dòng mới phải vẫn có tenant_id = 1", en: "It is rejected: with only `USING`, that expression is also used as `WITH CHECK`, so the new row must still have tenant_id = 1" }
      - { vi: "Dòng biến mất", en: "The row disappears" }
    answer: 1
    why: { vi: "`USING` lọc dòng cũ được nhắm tới; `WITH CHECK` kiểm dòng mới. Không ghi `WITH CHECK` thì Postgres dùng lại `USING`, chặn việc \"đẩy\" dòng sang khách khác.", en: "`USING` filters the existing rows you can target; `WITH CHECK` validates the new row. Without `WITH CHECK`, Postgres reuses `USING`, which stops a row being \"pushed\" to another tenant." }
  - q: { vi: "Ứng dụng kết nối bằng chính vai trò sở hữu bảng. Policy không có tác dụng. Sửa thế nào?", en: "The application connects as the role that owns the table. The policies have no effect. How do you fix it?" }
    options:
      - { vi: "`ALTER TABLE tickets FORCE ROW LEVEL SECURITY`, hoặc tốt hơn: cho ứng dụng một vai trò riêng không sở hữu bảng", en: "`ALTER TABLE tickets FORCE ROW LEVEL SECURITY`, or better: give the application its own role that does not own the table" }
      - { vi: "Tạo lại policy", en: "Recreate the policies" }
      - { vi: "Đặt `row_security = off`", en: "Set `row_security = off`" }
    answer: 0
    why: { vi: "Chủ bảng bỏ qua RLS trừ khi bật `FORCE`. Superuser và vai trò `BYPASSRLS` luôn bỏ qua. `row_security = off` không tắt được RLS: nó báo lỗi khi câu bị policy lọc.", en: "The table owner bypasses RLS unless `FORCE` is on. Superusers and `BYPASSRLS` roles always bypass it. `row_security = off` cannot switch RLS off: it raises an error when a query would be filtered by a policy." }
---

## Ý chính

- `ALTER TABLE … ENABLE ROW LEVEL SECURITY` bật RLS. Không có policy áp dụng = từ chối mặc định.
- `CREATE POLICY … FOR … TO … USING (…) WITH CHECK (…)`: `USING` lọc dòng đã có (SELECT, UPDATE, DELETE); `WITH CHECK` kiểm dòng mới (INSERT, UPDATE). Chỉ có `USING` thì nó làm luôn `WITH CHECK`.
- Policy permissive (mặc định) gộp với nhau bằng OR; policy `AS RESTRICTIVE` gộp bằng AND với kết quả đó. Restrictive hợp cho luật chung như "không bao giờ thấy dòng đã lưu trữ".
- Ai bỏ qua RLS: superuser, vai trò `BYPASSRLS`, chủ bảng (trừ khi `FORCE ROW LEVEL SECURITY`). Kiểm tra ràng buộc (unique, khóa ngoại) không đi qua RLS.
- Mẫu nhiều khách: một vai trò cho ứng dụng (không sở hữu bảng) + policy dựa trên `current_setting('app.tenant_id')` hoặc theo vai trò. Index trên `tenant_id` vì điều kiện policy được thêm vào mọi câu.
- View mặc định (`security_invoker` = false) áp policy của chủ view. Bài này dùng điều đó để thử ba vai trò trong một câu.

Giới hạn khi chạy: mỗi bài là một câu trong một transaction, nên không đổi được `SET ROLE` giữa chừng; mỗi vai trò được thử qua một view do vai trò đó sở hữu. Vai trò hiện tại của PGlite là superuser.

## Ví dụ

Kết quả thật trên PGlite (30 vé, 3 khách, mỗi vé thứ năm đã lưu trữ):

```text
owner_sees  t1  t2  support
30          10  8   0

policyname     permissive   roles       cmd     qual
hide_archived  RESTRICTIVE  {tenant_2}  SELECT  (NOT archived)
tenant_1_rows  PERMISSIVE   {tenant_1}  SELECT  (tenant_id = 1)
tenant_2_rows  PERMISSIVE   {tenant_2}  SELECT  (tenant_id = 2)
```

Khách 2 có 10 vé, policy restrictive bỏ 2 vé đã lưu trữ. `support` không có policy nên thấy 0.

## Thực hành

Ba câu: đếm theo vai trò, đọc policy, giải thích vì sao vai trò hiện tại thấy tất cả. Kỹ năng chuyên gia: thiết kế RLS cho hệ thống nhiều khách và kiểm nó dưới đúng vai trò ứng dụng, không dưới superuser.

# EN

## Key idea

- `ALTER TABLE … ENABLE ROW LEVEL SECURITY` turns RLS on. No applicable policy = default deny.
- `CREATE POLICY … FOR … TO … USING (…) WITH CHECK (…)`: `USING` filters existing rows (SELECT, UPDATE, DELETE); `WITH CHECK` validates new rows (INSERT, UPDATE). With only `USING`, it also serves as `WITH CHECK`.
- Permissive policies (the default) are combined with OR; `AS RESTRICTIVE` policies are combined with AND on top of that. Restrictive suits global rules such as "never show archived rows".
- Who bypasses RLS: superusers, `BYPASSRLS` roles, the table owner (unless `FORCE ROW LEVEL SECURITY`). Constraint checks (unique, foreign keys) do not go through RLS.
- Multi-tenant pattern: one application role (not the table owner) + policies based on `current_setting('app.tenant_id')` or on roles. Index `tenant_id`, because the policy condition is added to every query.
- A default view (`security_invoker` = false) applies the policies of the view owner. This lesson uses that to try three roles in one statement.

Running limit: each lesson is one statement in one transaction, so `SET ROLE` cannot change midway; each role is tried through a view that the role owns. PGlite's current role is a superuser.

## Example

Real output from PGlite (30 tickets, 3 tenants, every fifth ticket archived):

```text
owner_sees  t1  t2  support
30          10  8   0

policyname     permissive   roles       cmd     qual
hide_archived  RESTRICTIVE  {tenant_2}  SELECT  (NOT archived)
tenant_1_rows  PERMISSIVE   {tenant_1}  SELECT  (tenant_id = 1)
tenant_2_rows  PERMISSIVE   {tenant_2}  SELECT  (tenant_id = 2)
```

Tenant 2 has 10 tickets; the restrictive policy drops the 2 archived ones. `support` has no policy, so it sees 0.

## Practice

Three statements: count per role, read the policies, explain why the current role sees everything. Expert skill: design RLS for a multi-tenant system and test it under the real application role, not as a superuser.
