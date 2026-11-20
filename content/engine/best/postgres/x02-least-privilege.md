---
id: e-bp-x02
engine: best
track: postgres
level: L2
module: x
title: "Quyền tối thiểu: role nhóm cho từng việc"
title_en: "Least privilege: a group role per job"
kind: quiz
minutes: 3
objectives:
  - vi: "Gán đúng quyền cần cho một role nhóm `NOLOGIN` (báo cáo chỉ `SELECT`), rồi cho người dùng làm thành viên, thay vì `GRANT ALL` cho từng tài khoản."
    en: "Grant exactly the privileges a job needs to a `NOLOGIN` group role (reporting gets only `SELECT`), then make users members, instead of `GRANT ALL` to each account."
avoid:
  vi: "Một mật khẩu lộ của công cụ báo cáo đủ để sửa, xóa hay làm rỗng bảng."
  en: "A leaked reporting-tool password that is enough to change, delete or empty tables."
requires: []
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/ddl-priv.html
  - https://www.postgresql.org/docs/18/role-membership.html
  - https://www.postgresql.org/docs/18/functions-info.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE store_targets (store_id int PRIMARY KEY, target_vnd bigint NOT NULL);
    INSERT INTO store_targets VALUES (1, 500000000), (2, 300000000);
    CREATE ROLE report_bad LOGIN;
    GRANT ALL ON store_targets TO report_bad;
    CREATE ROLE report_reader NOLOGIN;
    GRANT SELECT ON store_targets TO report_reader;
    CREATE ROLE bi_tool LOGIN;
    GRANT report_reader TO bi_tool;
  bad: |
    SELECT p AS privilege
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS p
    WHERE has_table_privilege('report_bad', 'store_targets', p)
    ORDER BY p
  good: |
    SELECT p AS privilege
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS p
    WHERE has_table_privilege('bi_tool', 'store_targets', p)
    ORDER BY p
  expect: null
quiz:
  - q:
      vi: "Role `bi_tool` không được cấp quyền trực tiếp nào, chỉ là thành viên của `report_reader` (có `SELECT` trên `store_targets`). `bi_tool` đọc được bảng không?"
      en: "Role `bi_tool` has no privileges granted directly; it is only a member of `report_reader` (which has `SELECT` on `store_targets`). Can `bi_tool` read the table?"
    options:
      - { vi: "Không, quyền phải cấp thẳng cho tài khoản", en: "No, privileges must be granted to the account itself" }
      - { vi: "Có, thành viên thừa hưởng quyền của role nhóm", en: "Yes, members inherit the group role's privileges" }
      - { vi: "Có, và còn ghi được", en: "Yes, and it can write too" }
    answer: 1
    why:
      vi: "Thành viên của một role mặc định thừa hưởng quyền của role đó. Quyền chỉ khai một lần ở role nhóm; thêm hay bớt người chỉ là `GRANT`/`REVOKE` thành viên."
      en: "By default a member inherits its role's privileges. Privileges are declared once on the group role; adding or removing a person is just a membership `GRANT`/`REVOKE`."
---

## Ý chính

Ứng dụng và người phân tích dùng role riêng, không phải superuser, không là owner của bảng. Chỉ `GRANT` đúng quyền cần (báo cáo chỉ `SELECT`). Quyền gán cho role nhóm `NOLOGIN`, người dùng là thành viên.

## Vì sao

- Một lỗi hay một mật khẩu lộ chỉ gây hại trong phạm vi quyền của role đó.
- `GRANT ALL` cho cả `TRUNCATE`: một lệnh làm rỗng bảng.
- Superuser và owner của bảng bỏ qua RLS, nên tài khoản hằng ngày không được là chúng.
- Khai quyền một lần ở role nhóm thì dễ kiểm và dễ thu hồi.

# EN

## Key idea

Applications and analysts use their own roles: not a superuser, not the table owner. `GRANT` only what is needed (reporting gets only `SELECT`). Privileges go to a `NOLOGIN` group role, and users are members.

## Why

- A bug or a leaked password can only do harm within that role's privileges.
- `GRANT ALL` includes `TRUNCATE`: one statement empties the table.
- Superusers and table owners bypass RLS, so everyday accounts must be neither.
- Privileges declared once on a group role are easy to audit and easy to revoke.
