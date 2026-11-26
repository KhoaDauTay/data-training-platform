---
id: e-pg-l5-19
engine: postgres
level: L5
module: multi-tenant
title: "RLS sâu hơn: FORCE, RESTRICTIVE và view an toàn"
title_en: "RLS in depth: FORCE, RESTRICTIVE and safe views"
kind: lab
runtime: browser
minutes: 25
figures: [{ name: pg-rls-restrictive, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-25" }
objectives:
  - { vi: "Bắt cả chủ bảng theo policy bằng `FORCE ROW LEVEL SECURITY`", en: "Make the table owner follow the policies with `FORCE ROW LEVEL SECURITY`" }
  - { vi: "Viết luật bắt buộc bằng `AS RESTRICTIVE` và biết vì sao một policy permissive thêm vào lại mở rộng quyền", en: "Write must-hold rules with `AS RESTRICTIVE` and know why one more permissive policy widens access" }
  - { vi: "Cho view đọc bảng theo quyền người gọi bằng `security_invoker`", en: "Make a view read its table with the caller's rights using `security_invoker`" }
requires: [e-pg-l5-10]
sources:
  - url: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
    title: "Row Security Policies"
  - url: https://www.postgresql.org/docs/18/sql-createpolicy.html
    title: "CREATE POLICY"
  - url: https://www.postgresql.org/docs/18/sql-altertable.html
    title: "ALTER TABLE"
  - url: https://www.postgresql.org/docs/18/sql-createview.html
    title: "CREATE VIEW"
lab:
  setup: |
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app') THEN CREATE ROLE app NOLOGIN; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'portal_owner') THEN CREATE ROLE portal_owner NOLOGIN; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'support') THEN CREATE ROLE support NOLOGIN; END IF;
    END $$;
    -- Cargo Query customer portal: one row per support ticket, tenant_id = the shipper
    CREATE TABLE tickets (tenant_id int NOT NULL, id int NOT NULL, archived boolean NOT NULL, title text NOT NULL, PRIMARY KEY (tenant_id, id));
    INSERT INTO tickets SELECT g % 3 + 1, g, g % 5 = 0, 'ticket ' || g FROM generate_series(1, 30) g;
    ALTER TABLE tickets OWNER TO portal_owner;
    GRANT SELECT, INSERT ON tickets TO app;
    GRANT SELECT ON tickets TO support;
    ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_rows ON tickets TO app USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int);
    -- a view owned by a role applies that role's policies (the lab cannot SET ROLE)
    CREATE VIEW tickets_as_app AS SELECT * FROM tickets;
    ALTER VIEW tickets_as_app OWNER TO app;
    CREATE VIEW tickets_as_owner AS SELECT * FROM tickets;
    ALTER VIEW tickets_as_owner OWNER TO portal_owner;
    SET app.tenant_id = '2';
  steps:
    - task: { vi: "Phiên đang là khách 2. Đếm số vé hai bên thấy, hai cột: owner_sees (view `tickets_as_owner`, của chủ bảng) và app_sees (view `tickets_as_app`). Đoán trước owner_sees.", en: "The session acts as tenant 2. Count the tickets each side sees, two columns: owner_sees (view `tickets_as_owner`, owned by the table owner) and app_sees (view `tickets_as_app`). Guess owner_sees first." }
      solution: "SELECT (SELECT count(*) FROM tickets_as_owner) AS owner_sees, (SELECT count(*) FROM tickets_as_app) AS app_sees"
      check: rows
      hint: { vi: "Hai truy vấn con `count(*)` trong một SELECT.", en: "Two `count(*)` sub-queries in one SELECT." }
    - task: { vi: "Bắt cả chủ bảng `tickets` theo policy. Bài chấm bằng catalog (cờ RLS của bảng).", en: "Make the owner of `tickets` follow the policies too. Graded on the catalog (the table's RLS flags)." }
      solution: "ALTER TABLE tickets FORCE ROW LEVEL SECURITY"
      check: catalog
      hint: { vi: "`ALTER TABLE … FORCE ROW LEVEL SECURITY`.", en: "`ALTER TABLE … FORCE ROW LEVEL SECURITY`." }
    - task: { vi: "Chủ bảng giờ thấy bao nhiêu vé qua `tickets_as_owner`? Một cột owner_sees. Đoán trước: không có policy nào dành cho chủ bảng.", en: "How many tickets does the owner see now through `tickets_as_owner`? One column owner_sees. Guess first: no policy is written for the owner." }
      solution: "SELECT count(*) AS owner_sees FROM tickets_as_owner"
      check: rows
      hint: { vi: "Đếm view của chủ bảng.", en: "Count the owner's view." }
      fact:
        vi: "0: khi đã FORCE, chủ bảng cũng bị áp RLS, và không có policy nào cho nó nên là từ chối mặc định."
        en: "0: with FORCE on, the owner is subject to RLS too, and no policy applies to it, so it is default deny."
        probe: SELECT count(*) FROM tickets_as_owner
        expect: [[0]]
    - task: { vi: "Vé đã lưu trữ không bao giờ được hiện cho `app`, dù có thêm policy nào khác. Tạo policy `live_only` cho SELECT, vai trò `app`, gộp bằng AND với các policy khác, điều kiện `NOT archived`.", en: "Archived tickets must never show for `app`, whatever other policy is added. Create policy `live_only` for SELECT, role `app`, combined with AND with the other policies, condition `NOT archived`." }
      solution: "CREATE POLICY live_only ON tickets AS RESTRICTIVE FOR SELECT TO app USING (NOT archived)"
      check: catalog
      hint: { vi: "`CREATE POLICY … AS RESTRICTIVE FOR SELECT TO app USING (…)`.", en: "`CREATE POLICY … AS RESTRICTIVE FOR SELECT TO app USING (…)`." }
    - task: { vi: "Tạo view `open_by_tenant` (cột tenant_id và n = số vé, gom theo tenant_id) đọc `tickets` bằng quyền của người gọi, không phải của chủ view. Chấm bằng catalog (định nghĩa và tùy chọn của view).", en: "Create view `open_by_tenant` (columns tenant_id and n = ticket count, grouped by tenant_id) that reads `tickets` with the caller's rights, not the view owner's. Graded on the catalog (the view's definition and options)." }
      solution: "CREATE VIEW open_by_tenant WITH (security_invoker = true) AS SELECT tenant_id, count(*) AS n FROM tickets GROUP BY tenant_id"
      check: catalog
      hint: { vi: "`CREATE VIEW name WITH (security_invoker = true) AS SELECT …`.", en: "`CREATE VIEW name WITH (security_invoker = true) AS SELECT …`." }
quiz:
  - q: { vi: "Policy `tenant_rows` cho `app` lọc theo khách. Một bạn thêm `CREATE POLICY support_read ON tickets FOR SELECT TO app USING (true)` \"cho đội hỗ trợ\". `app` của khách 2 giờ thấy gì?", en: "Policy `tenant_rows` for `app` filters by tenant. Someone adds `CREATE POLICY support_read ON tickets FOR SELECT TO app USING (true)` \"for the support team\". What does tenant 2's `app` see now?" }
    options:
      - { vi: "Vẫn chỉ vé của khách 2: policy cũ vẫn lọc như trước", en: "Still only tenant 2's tickets: the old policy keeps filtering as before" }
      - { vi: "Vé của mọi khách: hai policy permissive gộp bằng OR", en: "Every tenant's tickets: the two permissive policies are combined with OR" }
      - { vi: "Lỗi: hai policy cho cùng vai trò mâu thuẫn", en: "An error: two policies for one role conflict" }
    answer: 1
    trap: 0
    why: { vi: "\"Policy cũ vẫn lọc\" nghe hợp lý vì thêm luật thường là thêm giới hạn, nhưng các policy permissive (loại mặc định) được gộp bằng OR: một dòng chỉ cần qua một policy là hiện. `USING (true)` đúng với mọi dòng, nên `app` thấy vé của mọi khách (tenant). Hai policy cũng không mâu thuẫn gì, nên không có lỗi. Luật phải luôn đúng thì viết `AS RESTRICTIVE` (gộp AND với các policy khác); quyền riêng của đội hỗ trợ thì cấp cho vai trò `support`, không cho `app`.", en: "\"The old policy keeps filtering\" sounds right because adding a rule usually adds a limit, but permissive policies (the default kind) are combined with OR: a row only needs to pass one policy to show. `USING (true)` is true for every row, so `app` sees every tenant's tickets. The two policies do not conflict either, so there is no error. A rule that must always hold is written `AS RESTRICTIVE` (combined with AND with the others); the support team's own access goes to role `support`, not `app`." }
  - q: { vi: "Bảng đã `FORCE ROW LEVEL SECURITY`; mọi policy chỉ viết `TO app`. Chủ bảng chạy `SELECT count(*) FROM tickets`. Kết quả?", en: "The table has `FORCE ROW LEVEL SECURITY`; every policy says `TO app`. The owner runs `SELECT count(*) FROM tickets`. The result?" }
    options:
      - { vi: "Mọi dòng: chủ bảng luôn thấy hết dữ liệu", en: "Every row: the owner always sees everything" }
      - { vi: "0: chủ bảng bị áp RLS, không policy nào cho nó", en: "0: the owner is subject to RLS, no policy applies" }
      - { vi: "Lỗi 42501: chủ bảng bị cấm đọc bảng của mình", en: "Error 42501: the owner may not read" }
    answer: 1
    trap: 0
    why: { vi: "\"Chủ bảng luôn thấy hết\" chỉ đúng khi chưa có `FORCE`: mặc định chủ bảng (owner) được miễn RLS, và `FORCE` bỏ đúng ngoại lệ đó. Khi đó chủ bảng như mọi vai trò khác: mọi policy chỉ viết cho `app`, không policy nào áp cho chủ bảng, nên là từ chối mặc định (default deny): 0 dòng, không lỗi. Lỗi 42501 chỉ xảy ra khi thiếu quyền trên bảng, mà chủ bảng có đủ quyền. Superuser và vai trò `BYPASSRLS` thì vẫn bỏ qua RLS.", en: "\"The owner always sees everything\" only holds without `FORCE`: by default the table owner is exempt from RLS, and `FORCE` removes exactly that exemption. The owner is then like any other role: every policy is written for `app` only, none applies to the owner, so it is default deny: 0 rows, no error. Error 42501 only happens without a privilege on the table, and the owner has every privilege. Superusers and `BYPASSRLS` roles still skip RLS." }
  - q: { vi: "View báo cáo tạo không có tùy chọn gì, do một vai trò quản trị sở hữu, và `app` được `GRANT SELECT` trên view. `app` của khách 2 đọc view thấy gì?", en: "A report view is created with no options, owned by an admin role, and `app` is given `GRANT SELECT` on it. What does tenant 2's `app` see through it?" }
    options:
      - { vi: "Dữ liệu của mọi khách mà chủ view thấy", en: "Every tenant's data the view owner can see" }
      - { vi: "Chỉ dữ liệu khách 2: policy theo người đọc", en: "Only tenant 2's data: policies follow the reader" }
      - { vi: "Không gì cả: view bị chặn hoàn toàn", en: "Nothing: the view is blocked entirely" }
    answer: 0
    trap: 1
    why: { vi: "\"Chỉ dữ liệu khách 2\" nghe hợp lý vì policy viết cho `app`, nhưng view mặc định đọc bảng bên dưới bằng quyền của chủ view, không phải của người đọc. Chủ view là vai trò quản trị, được miễn RLS, nên `app` thấy mọi dữ liệu vai trò đó thấy: của mọi khách. View cũng không bị chặn, vì `app` đã được cấp quyền đọc nó. Sửa: tạo view `WITH (security_invoker = true)` để quyền và policy được kiểm theo người gọi.", en: "\"Only tenant 2's data\" sounds right because the policies are written for `app`, but a default view reads its underlying table with the view owner's rights, not the reader's. The owner is an admin role exempt from RLS, so `app` sees everything that role sees: every tenant's data. The view is not blocked either, since `app` was granted read access to it. Fix: create the view `WITH (security_invoker = true)` so rights and policies are checked for the caller." }
---
## Mở bài

Cổng khách hàng của Cargo Query đã có RLS, kiểm thử bằng vai trò ứng dụng đều ổn. Rồi một job chạy bằng chủ bảng, một policy "cho đội hỗ trợ" và một view báo cáo lần lượt cho khách A thấy vé của khách B. Ba lỗ đó nằm ở đâu?

## Ý chính

Chủ bảng bỏ qua RLS, trừ khi bảng có `FORCE ROW LEVEL SECURITY`. Khi đã `FORCE`, chủ bảng như mọi vai trò khác: không có policy dành cho nó thì thấy 0 dòng. Superuser và vai trò `BYPASSRLS` luôn bỏ qua, nên ứng dụng không chạy bằng chúng.

Nhiều người nghĩ thêm policy là thêm giới hạn. Thật ra policy permissive (mặc định) gộp bằng OR: một dòng chỉ cần qua một policy, nên một policy rộng mở toang mọi lệnh nó áp dụng. Luật phải luôn đúng, như "không hiện vé lưu trữ", viết `AS RESTRICTIVE`: gộp bằng AND lên kết quả. Quyền riêng của một nhóm thì viết `TO` đúng vai trò của nhóm đó.

`WITH CHECK` kiểm dòng mới. Bỏ trống thì Postgres dùng lại `USING`, nên một policy `FOR ALL` theo khách vẫn chặn được việc ghi sang khách khác. Lỗ thật là một policy `FOR INSERT` có `WITH CHECK (true)` hay không có điều kiện khách.

View mặc định đọc bảng bằng quyền của chủ view, nên policy của người đọc không được áp. `WITH (security_invoker = true)` (từ PostgreSQL 15) bắt view kiểm quyền và policy theo người gọi.

Hình từng bước ở cuối mục này đặt `OR` và `AND` vào đúng chỗ của chúng trên đường dòng đi tới vai trò `app`.

## Cú pháp

```sql
ALTER TABLE t FORCE ROW LEVEL SECURITY;
CREATE POLICY name ON t
  AS RESTRICTIVE
  FOR SELECT TO app
  USING (condition);
CREATE VIEW v
  WITH (security_invoker = true)
  AS SELECT …;
```

- `FORCE`: áp RLS cả cho chủ bảng.
- `AS RESTRICTIVE`: gộp bằng AND; vẫn cần ít nhất một policy permissive mới thấy dòng nào.
- `security_invoker`: view kiểm quyền theo người gọi.

## Ví dụ

Phiên là khách 2. Chủ bảng, chưa `FORCE`:

```sql
SET ROLE portal_owner;
SELECT count(*) AS owner_sees
FROM tickets;
RESET ROLE;
```

Chủ bảng thấy cả 30 vé. Bật `FORCE`:

```sql
ALTER TABLE tickets
  FORCE ROW LEVEL SECURITY;
SET ROLE portal_owner;
SELECT count(*) AS owner_sees
FROM tickets;
RESET ROLE;
```

Giờ là 0: không có policy nào cho chủ bảng. Thêm luật bắt buộc:

```sql
CREATE POLICY live_only ON tickets
  AS RESTRICTIVE FOR SELECT TO app
  USING (NOT archived);
SET ROLE app;
SELECT count(*) AS app_sees
FROM tickets;
RESET ROLE;
```

Khách 2 có 10 vé, bỏ 2 vé lưu trữ, còn 8. Ghi một vé của chính mình (`USING` làm luôn `WITH CHECK`):

```sql
SET ROLE app;
INSERT INTO tickets
  VALUES (2, 31, false, 'new ticket')
  RETURNING tenant_id, id;
RESET ROLE;
```

Điều kiện policy có mặt trong kế hoạch của mọi câu:

```sql
SET ROLE app;
EXPLAIN (COSTS OFF)
  SELECT id FROM tickets WHERE id = 7;
RESET ROLE;
```

View đọc theo người gọi:

```sql
CREATE VIEW open_by_tenant
  WITH (security_invoker = true) AS
  SELECT tenant_id, count(*) AS n
  FROM tickets GROUP BY tenant_id;
GRANT SELECT ON open_by_tenant TO app;
SET ROLE app;
SELECT * FROM open_by_tenant;
RESET ROLE;
```

`app` chỉ thấy dòng của khách 2.

## Lỗi hay gặp

Thêm một policy permissive "cho đội hỗ trợ":

```sql
-- WRONG: one more PERMISSIVE policy
CREATE POLICY support_read ON tickets
  FOR SELECT TO app USING (true);
SET ROLE app;
SELECT count(*) AS app_sees
FROM tickets;
RESET ROLE;
```

```sql
-- FIX: give the extra rule its own role
ALTER POLICY support_read ON tickets
  TO support;
SET ROLE app;
SELECT count(*) AS app_sees
FROM tickets;
RESET ROLE;
```

Câu sai thấy 25 vé của cả ba khách, câu đúng còn 9. Policy `FOR INSERT` không có điều kiện khách:

```sql
-- WRONG: INSERT policy, no tenant
CREATE POLICY import_rows ON tickets
  FOR INSERT TO app WITH CHECK (true);
SET ROLE app;
INSERT INTO tickets
  VALUES (3, 32, false, 'pushed');
RESET ROLE;
SELECT tenant_id, title FROM tickets
WHERE title = 'pushed';
```

```sql
-- FIX: check the tenant on every write
DELETE FROM tickets
WHERE title = 'pushed';
ALTER POLICY import_rows ON tickets
  WITH CHECK (tenant_id = NULLIF(
    current_setting(
      'app.tenant_id', true), '')::int);
SELECT count(*) AS pushed FROM tickets
WHERE title = 'pushed';
```

Khách 2 vừa ghi được vé vào khách 3; sửa xong thì không còn. View thường đọc bằng quyền của chủ view (ở đây là superuser):

```sql
-- WRONG: a plain view reads as owner
CREATE VIEW report_plain AS
  SELECT tenant_id, count(*) AS n
  FROM tickets GROUP BY tenant_id;
GRANT SELECT ON report_plain TO app;
SET ROLE app;
SELECT * FROM report_plain;
RESET ROLE;
```

```sql
-- FIX: security_invoker = the caller
SET ROLE app;
SELECT * FROM open_by_tenant;
RESET ROLE;
```

## Thực hành

Lab không dùng được `SET ROLE` (bước sau chạy lại bước trước), nên mỗi bên được thử qua một view do chính nó sở hữu, và phiên đã đặt khách 2 sẵn. Năm bước: đếm theo hai bên, `FORCE`, đếm lại, policy restrictive, view `security_invoker`. Ba bước chấm bằng catalog: cờ RLS, policy và tùy chọn view đều được đọc.

## Tóm tắt

- Chủ bảng bỏ qua RLS trừ khi `FORCE`; khi đó nó cũng cần policy riêng, không thì thấy 0 dòng.
- Policy permissive gộp OR: thêm một policy rộng là mở thêm đường; luật bắt buộc viết `AS RESTRICTIVE`.
- Thiếu `WITH CHECK` thì `USING` làm thay; lỗ thật là policy `FOR INSERT` không có điều kiện khách.
- View đọc bằng quyền chủ view; dùng `security_invoker = true`. Đọc tiếp: `e-pg-l5-20`, `e-bp-x08`, `e-ds-l4-09`.

# EN

## Opening

The Cargo Query customer portal already has RLS, and tests under the application role all pass. Then a job running as the table owner, a policy "for the support team" and a report view each let tenant A see tenant B's tickets. Where are those three holes?

## Key idea

The table owner skips RLS unless the table has `FORCE ROW LEVEL SECURITY`. With `FORCE` on, the owner is like any other role: with no policy for it, it sees 0 rows. Superusers and `BYPASSRLS` roles always skip RLS, so the application never runs as them.

Many people think adding a policy adds a limit. In fact permissive policies (the default) are combined with OR: a row only needs to pass one policy, so a broad policy opens up every command it covers. A rule that must always hold, such as "never show archived tickets", is written `AS RESTRICTIVE`: combined with AND on top. A group's own access is written `TO` that group's role.

`WITH CHECK` validates new rows. Left out, Postgres reuses `USING`, so a per-tenant `FOR ALL` policy still blocks writes into another tenant. The real hole is a `FOR INSERT` policy with `WITH CHECK (true)` or with no tenant condition.

A default view reads its table with the view owner's rights, so the reader's policies are not applied. `WITH (security_invoker = true)` (since PostgreSQL 15) makes the view check rights and policies for the caller.

The step-through figure at the end of this section puts `OR` and `AND` where they sit on the way rows travel to role `app`.

## Syntax

```sql
ALTER TABLE t FORCE ROW LEVEL SECURITY;
CREATE POLICY name ON t
  AS RESTRICTIVE
  FOR SELECT TO app
  USING (condition);
CREATE VIEW v
  WITH (security_invoker = true)
  AS SELECT …;
```

- `FORCE`: applies RLS to the table owner too.
- `AS RESTRICTIVE`: combined with AND; at least one permissive policy is still needed to see any row.
- `security_invoker`: the view checks rights for the caller.

## Example

The session acts as tenant 2. The owner, before `FORCE`:

```sql
SET ROLE portal_owner;
SELECT count(*) AS owner_sees
FROM tickets;
RESET ROLE;
```

The owner sees all 30 tickets. Turn `FORCE` on:

```sql
ALTER TABLE tickets
  FORCE ROW LEVEL SECURITY;
SET ROLE portal_owner;
SELECT count(*) AS owner_sees
FROM tickets;
RESET ROLE;
```

Now it is 0: no policy applies to the owner. Add a must-hold rule:

```sql
CREATE POLICY live_only ON tickets
  AS RESTRICTIVE FOR SELECT TO app
  USING (NOT archived);
SET ROLE app;
SELECT count(*) AS app_sees
FROM tickets;
RESET ROLE;
```

Tenant 2 has 10 tickets; dropping the 2 archived ones leaves 8. Write one of its own tickets (`USING` also serves as `WITH CHECK`):

```sql
SET ROLE app;
INSERT INTO tickets
  VALUES (2, 31, false, 'new ticket')
  RETURNING tenant_id, id;
RESET ROLE;
```

The policy condition is in the plan of every query:

```sql
SET ROLE app;
EXPLAIN (COSTS OFF)
  SELECT id FROM tickets WHERE id = 7;
RESET ROLE;
```

A view that reads as the caller:

```sql
CREATE VIEW open_by_tenant
  WITH (security_invoker = true) AS
  SELECT tenant_id, count(*) AS n
  FROM tickets GROUP BY tenant_id;
GRANT SELECT ON open_by_tenant TO app;
SET ROLE app;
SELECT * FROM open_by_tenant;
RESET ROLE;
```

`app` sees only tenant 2's row.

## Common mistakes

Adding a permissive policy "for the support team":

```sql
-- WRONG: one more PERMISSIVE policy
CREATE POLICY support_read ON tickets
  FOR SELECT TO app USING (true);
SET ROLE app;
SELECT count(*) AS app_sees
FROM tickets;
RESET ROLE;
```

```sql
-- FIX: give the extra rule its own role
ALTER POLICY support_read ON tickets
  TO support;
SET ROLE app;
SELECT count(*) AS app_sees
FROM tickets;
RESET ROLE;
```

The wrong one sees 25 tickets of all three tenants, the fixed one 9. A `FOR INSERT` policy with no tenant condition:

```sql
-- WRONG: INSERT policy, no tenant
CREATE POLICY import_rows ON tickets
  FOR INSERT TO app WITH CHECK (true);
SET ROLE app;
INSERT INTO tickets
  VALUES (3, 32, false, 'pushed');
RESET ROLE;
SELECT tenant_id, title FROM tickets
WHERE title = 'pushed';
```

```sql
-- FIX: check the tenant on every write
DELETE FROM tickets
WHERE title = 'pushed';
ALTER POLICY import_rows ON tickets
  WITH CHECK (tenant_id = NULLIF(
    current_setting(
      'app.tenant_id', true), '')::int);
SELECT count(*) AS pushed FROM tickets
WHERE title = 'pushed';
```

Tenant 2 just wrote a ticket into tenant 3; after the fix there is none. A plain view reads with its owner's rights (a superuser here):

```sql
-- WRONG: a plain view reads as owner
CREATE VIEW report_plain AS
  SELECT tenant_id, count(*) AS n
  FROM tickets GROUP BY tenant_id;
GRANT SELECT ON report_plain TO app;
SET ROLE app;
SELECT * FROM report_plain;
RESET ROLE;
```

```sql
-- FIX: security_invoker = the caller
SET ROLE app;
SELECT * FROM open_by_tenant;
RESET ROLE;
```

## Practice

The lab cannot use `SET ROLE` (each step replays the earlier ones), so each side is tried through a view it owns, and the session already acts as tenant 2. Five steps: count for both sides, `FORCE`, count again, a restrictive policy, a `security_invoker` view. Three steps are graded on the catalog: RLS flags, policies and view options are all read.

## Recap

- The owner skips RLS unless `FORCE`; then it needs a policy of its own, or it sees 0 rows.
- Permissive policies combine with OR: one broad policy opens one more way in; must-hold rules are `AS RESTRICTIVE`.
- Without `WITH CHECK`, `USING` stands in; the real hole is a `FOR INSERT` policy with no tenant condition.
- A view reads with its owner's rights; use `security_invoker = true`. Read next: `e-pg-l5-20`, `e-bp-x08`, `e-ds-l4-09`.
