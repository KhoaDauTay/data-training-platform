---
id: e-bp-s10
engine: best
track: postgres
level: L4
module: s
title: "Multi-tenant: tenant_id mọi nơi và RLS có FORCE"
title_en: "Multi-tenant: tenant_id everywhere, RLS forced"
kind: quiz
minutes: 5
objectives:
  - vi: "Bật Row Level Security kèm `FORCE ROW LEVEL SECURITY` để cả owner của bảng cũng bị lọc theo tenant."
    en: "Enable Row Level Security with `FORCE ROW LEVEL SECURITY` so even the table owner is filtered by tenant."
avoid:
  vi: "Ứng dụng chạy bằng role owner thấy dữ liệu của mọi khách thuê."
  en: "An application running as the owner role sees every tenant's data."
requires: [e-pg-l5-10]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/ddl-rowsecurity.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE ROLE app_owner NOLOGIN;
    CREATE TABLE invoices_rls (tenant_id int NOT NULL, id int NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id));
    CREATE TABLE invoices_forced (tenant_id int NOT NULL, id int NOT NULL, amount int NOT NULL, PRIMARY KEY (tenant_id, id));
    INSERT INTO invoices_rls VALUES (1, 1, 100), (1, 2, 200), (2, 1, 999), (2, 2, 888);
    INSERT INTO invoices_forced VALUES (1, 1, 100), (1, 2, 200), (2, 1, 999), (2, 2, 888);
    ALTER TABLE invoices_rls OWNER TO app_owner;
    ALTER TABLE invoices_forced OWNER TO app_owner;
    ALTER TABLE invoices_rls ENABLE ROW LEVEL SECURITY;
    ALTER TABLE invoices_forced ENABLE ROW LEVEL SECURITY;
    ALTER TABLE invoices_forced FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_only ON invoices_rls USING (tenant_id = current_setting('app.tenant_id')::int);
    CREATE POLICY tenant_only ON invoices_forced USING (tenant_id = current_setting('app.tenant_id')::int);
    SET app.tenant_id = '1';
    SET ROLE app_owner;
  bad: |
    SELECT count(*) AS visible_invoices FROM invoices_rls
  good: |
    SELECT count(*) AS visible_invoices FROM invoices_forced
  expect: null
quiz:
  - q:
      vi: "Bảng đã `ENABLE ROW LEVEL SECURITY` và có policy theo tenant. Ứng dụng đăng nhập bằng chính role owner của bảng. Policy có lọc không?"
      en: "A table has `ENABLE ROW LEVEL SECURITY` and a per-tenant policy. The application logs in as the table's owner role. Does the policy filter?"
    options:
      - { vi: "Có, policy áp cho mọi role", en: "Yes, policies apply to every role" }
      - { vi: "Không, owner bỏ qua policy trừ khi bảng có `FORCE ROW LEVEL SECURITY`", en: "No, the owner bypasses policies unless the table has `FORCE ROW LEVEL SECURITY`" }
      - { vi: "Không, vì RLS chỉ chạy khi có `WHERE tenant_id`", en: "No, because RLS only runs when there is a `WHERE tenant_id`" }
    answer: 1
    why:
      vi: "Theo docs, owner của bảng thường không bị RLS lọc. `FORCE ROW LEVEL SECURITY` bắt cả owner theo policy. Superuser và role `BYPASSRLS` thì luôn bỏ qua, nên ứng dụng không được chạy bằng chúng."
      en: "Per the docs, a table's owner is normally not subject to RLS. `FORCE ROW LEVEL SECURITY` makes the owner follow the policies too. Superusers and `BYPASSRLS` roles always bypass it, so the application must not run as them."
---

## Ý chính

Nhiều khách thuê (tenant: một khách hàng doanh nghiệp dùng chung database) chung bảng thì mỗi bảng có `tenant_id NOT NULL` đứng đầu khóa chính và index. Bật Row Level Security với policy đọc tenant từ thiết lập phiên, và thêm `FORCE ROW LEVEL SECURITY`. Ứng dụng không chạy bằng superuser hay role `BYPASSRLS`.

## Vì sao

- Một truy vấn quên `WHERE tenant_id = …` là lộ dữ liệu của khách khác. RLS là lớp phòng thủ thứ hai.
- Không có `FORCE`, owner của bảng bỏ qua policy. Superuser luôn bỏ qua.
- `tenant_id` đứng đầu khóa giúp index phục vụ mọi truy vấn trong một tenant.

## Ví dụ

Phiên đặt `app.tenant_id = '1'` rồi `SET ROLE app_owner`. Bảng chỉ `ENABLE` cho owner thấy 4 hóa đơn của 2 tenant. Bảng có `FORCE` cho thấy 2 hóa đơn của tenant 1. Đọc thêm: `e-pg-l5-19` (RLS sâu hơn), bản đồ chủ đề `e-ds-l4-09`.

# EN

## Key idea

When tenants (business customers sharing one database) share tables, every table has `tenant_id NOT NULL` leading its primary key and indexes. Enable Row Level Security with a policy that reads the tenant from a session setting, and add `FORCE ROW LEVEL SECURITY`. The application never runs as a superuser or a `BYPASSRLS` role.

## Why

- One query that forgets `WHERE tenant_id = …` leaks another customer's data. RLS is a second line of defence.
- Without `FORCE`, the table owner bypasses the policies. Superusers always do.
- A leading `tenant_id` lets the index serve every query within one tenant.

## Example

The session sets `app.tenant_id = '1'` and then `SET ROLE app_owner`. The table with only `ENABLE` shows the owner 4 invoices from 2 tenants. The table with `FORCE` shows the 2 invoices of tenant 1. Read more: `e-pg-l5-19` (RLS in depth), the topic map `e-ds-l4-09`.
