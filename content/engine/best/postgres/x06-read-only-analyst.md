---
id: e-bp-x06
engine: best
track: postgres
level: L2
module: x
title: "Người phân tích dùng role chỉ đọc"
title_en: "Analysts work through a read-only role"
kind: quiz
minutes: 3
objectives:
  - vi: "Cho người phân tích và công cụ BI một role chỉ đọc (`pg_read_all_data` hoặc `GRANT SELECT`), kèm `default_transaction_read_only = on`."
    en: "Give analysts and BI tools a read-only role (`pg_read_all_data` or `GRANT SELECT`), plus `default_transaction_read_only = on`."
avoid:
  vi: "Một `DELETE` thiếu `WHERE` gõ nhầm trong notebook xóa dữ liệu thật."
  en: "A mistyped `DELETE` with no `WHERE` in a notebook that deletes real data."
requires: []
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/predefined-roles.html
  - https://www.postgresql.org/docs/18/runtime-config-client.html#GUC-DEFAULT-TRANSACTION-READ-ONLY
  - https://www.postgresql.org/docs/18/functions-info.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE sales (id int PRIMARY KEY, amount_vnd bigint NOT NULL);
    INSERT INTO sales VALUES (1, 100000), (2, 250000);
    CREATE ROLE app_rw NOLOGIN;
    GRANT SELECT, INSERT, UPDATE, DELETE ON sales TO app_rw;
    CREATE ROLE analyst_ro NOLOGIN;
    GRANT pg_read_all_data TO analyst_ro;
    ALTER ROLE analyst_ro SET default_transaction_read_only = on;
  bad: |
    SELECT has_table_privilege('app_rw', 'sales', 'SELECT') AS can_read,
           has_table_privilege('app_rw', 'sales', 'DELETE') AS can_delete
  good: |
    SELECT has_table_privilege('analyst_ro', 'sales', 'SELECT') AS can_read,
           has_table_privilege('analyst_ro', 'sales', 'DELETE') AS can_delete
  expect: null
quiz:
  - q:
      vi: "Role `analyst_ro` chỉ là thành viên của `pg_read_all_data`. Nó chạy `DELETE FROM sales`. Chuyện gì xảy ra?"
      en: "Role `analyst_ro` is only a member of `pg_read_all_data`. It runs `DELETE FROM sales`. What happens?"
    options:
      - { vi: "Xóa hết dòng của `sales`", en: "Every row of `sales` is deleted" }
      - { vi: "Bị từ chối với lỗi `42501` (không đủ quyền)", en: "It is refused with error `42501` (insufficient privilege)" }
      - { vi: "Xóa được, nhưng tự rollback", en: "It deletes, then rolls back by itself" }
    answer: 1
    why:
      vi: "`pg_read_all_data` cho quyền đọc mọi bảng, view, sequence, nhưng không cho ghi gì. Lệnh xóa bị chặn trước khi chạm vào dòng nào."
      en: "`pg_read_all_data` grants read access to every table, view and sequence, but no write access at all. The delete is stopped before it touches a row."
---

## Ý chính

Tài khoản của người phân tích và của công cụ BI là thành viên một role chỉ đọc: `GRANT SELECT` trên schema cần, hoặc role có sẵn `pg_read_all_data`. Đặt thêm `ALTER ROLE … SET default_transaction_read_only = on`. Không phân tích bằng tài khoản của ứng dụng.

## Vì sao

- Người phân tích chạy SQL tự do mỗi ngày; một `DELETE` thiếu `WHERE` là mất dữ liệu thật.
- `pg_read_all_data` đọc được mọi bảng, kể cả bảng tạo sau, nhưng không ghi được gì. Docs ghi rõ nó vẫn chịu RLS.
- `default_transaction_read_only` chặn cả lệnh ghi gõ nhầm trong phiên đăng nhập bằng role đó.

# EN

## Key idea

Analyst and BI tool accounts are members of a read-only role: `GRANT SELECT` on the schemas they need, or the built-in `pg_read_all_data` role. Also set `ALTER ROLE … SET default_transaction_read_only = on`. Never analyse with the application's account.

## Why

- Analysts run free-form SQL every day; one `DELETE` without a `WHERE` loses real data.
- `pg_read_all_data` reads every table, including tables created afterwards, but writes nothing. The docs say it still obeys RLS.
- `default_transaction_read_only` also stops mistyped writes in sessions that log in as that role.
