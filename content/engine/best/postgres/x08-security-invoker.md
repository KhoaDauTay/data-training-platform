---
id: e-bp-x08
engine: best
track: postgres
level: L5
module: x
title: "View trên bảng có RLS: dùng security_invoker"
title_en: "Views over RLS tables: use security_invoker"
kind: quiz
minutes: 5
objectives:
  - vi: "Tạo view trên bảng có RLS với `WITH (security_invoker = true)` để quyền và policy được kiểm theo người gọi."
    en: "Create views over RLS tables `WITH (security_invoker = true)` so rights and policies are checked for the caller."
avoid:
  vi: "Một view tạo mặc định cho người đọc thấy dữ liệu của mọi khách, dù bảng đã có policy."
  en: "A view created with the defaults shows its readers every tenant's data, even though the table has policies."
requires: [e-pg-l5-19]
skills: []
adv: []
sources:
  - url: https://www.postgresql.org/docs/18/sql-createview.html
    title: "CREATE VIEW"
  - url: https://www.postgresql.org/docs/18/ddl-rowsecurity.html
    title: "Row Security Policies"
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-25" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE ROLE app NOLOGIN;
    CREATE TABLE inv (tenant_id int NOT NULL, id int NOT NULL, PRIMARY KEY (tenant_id, id));
    INSERT INTO inv VALUES (1, 1), (1, 2), (2, 3), (2, 4);
    ALTER TABLE inv ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_only ON inv USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::int);
    CREATE VIEW inv_report AS SELECT * FROM inv;
    CREATE VIEW inv_report_safe WITH (security_invoker = true) AS SELECT * FROM inv;
    GRANT SELECT ON inv, inv_report, inv_report_safe TO app;
    SET app.tenant_id = '1';
    SET ROLE app;
  bad: |
    -- CREATE VIEW inv_report AS
    --   SELECT * FROM inv;
    SELECT count(*) AS visible
    FROM inv_report
  good: |
    -- CREATE VIEW inv_report_safe
    --   WITH (security_invoker = true)
    --   AS SELECT * FROM inv;
    SELECT count(*) AS visible
    FROM inv_report_safe
  expect: null
quiz:
  - q:
      vi: "Bảng `inv` có RLS theo khách. Một view báo cáo được tạo không có tùy chọn gì, chủ view là vai trò quản trị, và `app` được `GRANT SELECT` trên view. `app` của khách 1 đọc view thấy gì?"
      en: "Table `inv` has per-tenant RLS. A report view is created with no options, its owner is an admin role, and `app` is given `GRANT SELECT` on the view. What does tenant 1's `app` see through it?"
    options:
      - { vi: "Chỉ dòng của khách 1: policy áp theo người đọc", en: "Only tenant 1's rows: the policies follow the reader" }
      - { vi: "Dòng của mọi khách: view đọc bằng quyền chủ view", en: "Every tenant's rows: the view reads as its owner" }
      - { vi: "Lỗi 42501: app không được đọc bảng gốc", en: "Error 42501: app may not read the base table" }
    answer: 1
    why:
      vi: "Theo docs, view mặc định truy cập bảng gốc bằng quyền của chủ view, và chủ là vai trò quản trị nên bỏ qua RLS. `WITH (security_invoker = true)` (từ PostgreSQL 15) bắt view kiểm quyền và policy theo người gọi."
      en: "Per the docs, a default view accesses its base table with the view owner's rights, and an admin owner skips RLS. `WITH (security_invoker = true)` (since PostgreSQL 15) makes the view check rights and policies for the caller."
---

## Ý chính

View đặt trên bảng có RLS thì tạo `WITH (security_invoker = true)`. Mặc định, view đọc bảng gốc bằng quyền của chủ view; chủ thường là chủ bảng hoặc một vai trò quản trị, nên bỏ qua RLS, và ai được `GRANT SELECT` trên view là đọc được mọi khách.

## Vì sao

- Lớp báo cáo hay được làm bằng view, nên đây là đường lộ dữ liệu giữa các khách hay gặp.
- Policy viết đúng trên bảng không giúp gì nếu view đọc bằng quyền của chủ view.
- `security_invoker` có từ PostgreSQL 15; view cũ tạo trước đó cần tạo lại hoặc `ALTER VIEW … SET (security_invoker = true)`.
- Cả chủ đề nhiều khách hàng, với mọi bài liên quan: `e-ds-l4-09`.

## Ví dụ

Phiên đặt `app.tenant_id = '1'` rồi `SET ROLE app`. View thường do superuser sở hữu cho `app` thấy 4 hóa đơn của 2 khách. View `security_invoker` cho thấy 2 hóa đơn của khách 1.

# EN

## Key idea

A view over an RLS table is created `WITH (security_invoker = true)`. By default a view reads its base table with the view owner's rights; the owner is usually the table owner or an admin role, so it skips RLS, and anyone given `GRANT SELECT` on the view reads every tenant.

## Why

- Reporting layers are often built from views, so this is a common way data leaks between tenants.
- A correct policy on the table does not help if the view reads with its owner's rights.
- `security_invoker` exists since PostgreSQL 15; older views need recreating or `ALTER VIEW … SET (security_invoker = true)`.
- The whole multi-tenant topic, with every related lesson: `e-ds-l4-09`.

## Example

The session sets `app.tenant_id = '1'` and then `SET ROLE app`. The plain view owned by a superuser shows `app` 4 invoices from 2 tenants. The `security_invoker` view shows the 2 invoices of tenant 1.
