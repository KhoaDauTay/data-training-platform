---
id: e-pg-l2-21
engine: postgres
level: L2
module: roles
title: Vai trò, GRANT và REVOKE
title_en: Roles, GRANT and REVOKE
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tạo vai trò cho từng loại người dùng và cho nó đúng quyền trên từng bảng bằng `GRANT`.
    en: Create a role for each kind of user and give it the right privileges on each table with `GRANT`.
  - vi: Thu hồi một quyền bằng `REVOKE` và kiểm tra kết quả bằng `has_table_privilege`.
    en: Take a privilege back with `REVOKE` and check the result with `has_table_privilege`.
  - vi: Giới hạn quyền đọc tới vài cột, và xóa một vai trò còn đang giữ quyền.
    en: Limit read access to a few columns, and drop a role that still holds privileges.
requires: [e-pg-l1-06]
sources:
  - https://www.postgresql.org/docs/18/user-manag.html
  - https://www.postgresql.org/docs/18/ddl-priv.html
  - https://www.postgresql.org/docs/18/sql-grant.html
  - https://www.postgresql.org/docs/18/sql-revoke.html
  - https://www.postgresql.org/docs/18/functions-info.html
lab:
  setup: |
    CREATE TABLE customers (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL UNIQUE
    );
    CREATE TABLE orders (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      customer_id bigint NOT NULL REFERENCES customers (id),
      amount numeric(12,2) NOT NULL CHECK (amount > 0)
    );
    INSERT INTO customers (name, email) VALUES ('An', 'an@example.com'), ('Binh', 'binh@example.com');
    INSERT INTO orders (customer_id, amount) VALUES (1, 120.00), (1, 80.50), (2, 310.00);
    CREATE ROLE support NOLOGIN;
    GRANT SELECT, INSERT, UPDATE ON orders TO support;
  steps:
    - task:
        vi: Tạo vai trò `analyst` dành cho người phân tích; vai trò này không dùng để đăng nhập.
        en: Create a role `analyst` for the analysts; this role is not used to log in.
      solution: CREATE ROLE analyst NOLOGIN
      check: catalog
      hint:
        vi: "`CREATE ROLE name NOLOGIN`. Không ghi gì thì `CREATE ROLE` cũng là NOLOGIN."
        en: "`CREATE ROLE name NOLOGIN`. With no option, `CREATE ROLE` is NOLOGIN too."
    - task:
        vi: Cho `analyst` đọc bảng `orders`, chỉ đọc, không gì khác.
        en: Let `analyst` read table `orders`, read only, nothing else.
      solution: GRANT SELECT ON orders TO analyst
      check: catalog
      hint:
        vi: "`GRANT privilege ON table TO role`. Quyền đọc là `SELECT`."
        en: "`GRANT privilege ON table TO role`. The read privilege is `SELECT`."
    - task:
        vi: Nhóm `support` không còn được sửa đơn. Thu hồi quyền sửa, giữ nguyên quyền đọc và thêm đơn.
        en: The `support` group may no longer change orders. Take back the update privilege and keep read and insert.
      solution: REVOKE UPDATE ON orders FROM support
      check: catalog
      hint:
        vi: "`REVOKE privilege ON table FROM role` chỉ gỡ đúng quyền bạn ghi."
        en: "`REVOKE privilege ON table FROM role` removes only the privilege you name."
    - task:
        vi: "Cho `analyst` đọc bảng `customers` nhưng chỉ hai cột `id` và `name`; cột `email` vẫn kín."
        en: "Let `analyst` read table `customers` but only the two columns `id` and `name`; column `email` stays hidden."
      solution: GRANT SELECT (id, name) ON customers TO analyst
      check: catalog
      hint:
        vi: Danh sách cột đặt trong ngoặc ngay sau tên quyền.
        en: The column list goes in parentheses right after the privilege name.
    - task:
        vi: "Kiểm tra lại bằng hàm, một dòng bốn cột: `analyst` đọc được `orders`? `analyst` thêm được vào `orders`? `support` sửa được `orders`? `analyst` đọc được cột `email`?"
        en: "Check with functions, one row of four columns: can `analyst` read `orders`? Can `analyst` insert into `orders`? Can `support` update `orders`? Can `analyst` read column `email`?"
      solution: SELECT has_table_privilege('analyst', 'orders', 'SELECT') AS analyst_reads, has_table_privilege('analyst', 'orders', 'INSERT') AS analyst_inserts, has_table_privilege('support', 'orders', 'UPDATE') AS support_updates, has_column_privilege('analyst', 'customers', 'email', 'SELECT') AS analyst_reads_email
      check: rows
      hint:
        vi: "`has_table_privilege(role, table, privilege)` và `has_column_privilege(role, table, column, privilege)` trả `true`/`false`."
        en: "`has_table_privilege(role, table, privilege)` and `has_column_privilege(role, table, column, privilege)` return `true`/`false`."
quiz:
  - q:
      vi: "Bạn chạy `REVOKE SELECT ON customers FROM reporter`, nhưng `reporter` vẫn đọc được `customers`. Lý do nào có thể đúng?"
      en: "You run `REVOKE SELECT ON customers FROM reporter`, yet `reporter` can still read `customers`. Which reason can be true?"
    options:
      - { vi: "REVOKE chỉ có hiệu lực từ phiên đăng nhập sau", en: "REVOKE only takes effect from the next login session" }
      - { vi: "Quyền đọc còn đến từ `PUBLIC` hoặc từ một vai trò mà `reporter` là thành viên", en: "The read privilege still comes from `PUBLIC` or from a role `reporter` is a member of" }
      - { vi: "Phải COMMIT hai lần thì REVOKE mới chạy", en: "REVOKE needs two COMMITs to apply" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì nhiều hệ thống lưu quyền lúc đăng nhập, nhưng Postgres kiểm quyền ở mỗi câu, nên REVOKE có hiệu lực ngay khi transaction của nó commit. Quyền của một vai trò là hợp của quyền cấp cho chính nó, cho `PUBLIC` và cho các vai trò nó kế thừa; gỡ một nguồn không gỡ các nguồn khác."
      en: "It sounds right because many systems load privileges at login, but Postgres checks privileges on every statement, so a REVOKE applies as soon as its transaction commits. A role's privileges are the union of those granted to itself, to `PUBLIC` and to the roles it inherits from; removing one source leaves the others."
  - q:
      vi: "Vai trò `app` tạo bảng `logs`. Muốn `app` đọc và ghi `logs`, cần làm gì thêm?"
      en: "Role `app` creates table `logs`. What else is needed for `app` to read and write `logs`?"
    options:
      - { vi: "`GRANT ALL ON logs TO app`, vì mọi vai trò đều cần GRANT", en: "`GRANT ALL ON logs TO app`, because every role needs a GRANT" }
      - { vi: "Không cần gì: chủ sở hữu có mọi quyền trên đối tượng của mình", en: "Nothing: the owner has every privilege on its own objects" }
      - { vi: "Phải là superuser", en: "It must be a superuser" }
    answer: 1
    trap: 0
    why:
      vi: "Vai trò tạo đối tượng là chủ sở hữu và có sẵn mọi quyền trên nó; GRANT chỉ cần để chia quyền cho vai trò khác. Superuser bỏ qua mọi kiểm quyền, nên không bao giờ dùng superuser cho ứng dụng."
      en: "The role that creates an object owns it and already holds every privilege on it; GRANT is only needed to share privileges with other roles. A superuser skips every privilege check, which is why an application should never connect as one."
---
## Mở bài

Một ứng dụng, một nhóm phân tích và một nhóm hỗ trợ khách cùng dùng một database. Nếu ai cũng đăng nhập bằng một tài khoản toàn quyền, một câu `DELETE` gõ nhầm của người phân tích có thể xóa sạch đơn hàng. Bài này chia quyền sao cho mỗi nhóm chỉ làm được đúng việc của mình.

## Ý chính

Trong Postgres, người dùng và nhóm là cùng một thứ: vai trò (role). Vai trò có thuộc tính `LOGIN` thì đăng nhập được, giống một tài khoản; vai trò `NOLOGIN` thường đóng vai nhóm để gom quyền. `CREATE USER` chỉ là `CREATE ROLE` kèm sẵn `LOGIN`.

Mỗi bảng có một chủ sở hữu, là vai trò đã tạo nó. Chủ sở hữu có mọi quyền trên bảng. Vai trò khác chỉ làm được những gì đã được cấp bằng `GRANT`: `SELECT` để đọc, `INSERT`, `UPDATE`, `DELETE` để ghi, `TRUNCATE` để làm rỗng. Quyền đọc có thể giới hạn tới vài cột. `REVOKE` gỡ đúng quyền được ghi và có hiệu lực ngay ở câu kế tiếp.

Nhiều người nghĩ REVOKE trên một vai trò là chặn được nó. Thật ra quyền thật của một vai trò là hợp của ba nguồn: quyền cấp cho chính nó, cho `PUBLIC` (mọi vai trò) và cho các vai trò nó là thành viên. Superuser bỏ qua mọi kiểm tra, nên ứng dụng không bao giờ nên chạy bằng superuser.

## Cú pháp

```sql
CREATE ROLE role_name [ [ WITH ] LOGIN | NOLOGIN | PASSWORD 'secret' ];
GRANT { SELECT | INSERT | UPDATE | DELETE | TRUNCATE | ALL } [, ...]
  ON { [ TABLE ] table_name [, ...] | ALL TABLES IN SCHEMA schema_name }
  TO { role_name | PUBLIC } [ WITH GRANT OPTION ];
GRANT SELECT ( column [, ...] ) ON table_name TO role_name;
REVOKE privilege [, ...] ON table_name FROM { role_name | PUBLIC } [ CASCADE ];
DROP ROLE [ IF EXISTS ] role_name;
```

- `LOGIN`: vai trò đăng nhập được; mặc định của `CREATE ROLE` là `NOLOGIN`.
- `ALL TABLES IN SCHEMA`: cấp cho mọi bảng đang có trong schema, không gồm bảng tạo sau.
- `WITH GRANT OPTION`: người nhận được phép cấp tiếp quyền đó.
- `PUBLIC`: mọi vai trò, kể cả vai trò tạo sau này.
- `CASCADE`: gỡ luôn quyền mà người nhận đã cấp tiếp.

## Ví dụ

Tạo vai trò `reporter`, cho nó đọc `customers`, rồi xem danh sách quyền:

```sql
CREATE ROLE reporter NOLOGIN;
GRANT SELECT ON customers TO reporter;
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE grantee IN ('reporter', 'support')
ORDER BY grantee, table_name, privilege_type;
```

Kết quả có một dòng cho `reporter` và ba dòng cho `support` (`INSERT`, `SELECT`, `UPDATE` trên `orders`).

Đóng vai `reporter` bằng `SET ROLE` để thử quyền thật:

```sql
SET ROLE reporter;
SELECT current_user, count(*) AS customers FROM customers;
```

```sql
-- ERROR 42501: permission denied for table orders
SELECT count(*) FROM orders;
```

```sql
RESET ROLE;
SELECT current_user;
```

`current_user` đổi thành `reporter` sau `SET ROLE` và trở lại vai trò cũ sau `RESET ROLE`. Câu đọc `orders` bị từ chối với mã `42501` vì `reporter` chưa có quyền trên bảng đó.

## Lỗi hay gặp

Gỡ quyền của một vai trò nhưng quên `PUBLIC`:

```sql
-- WRONG: the privilege still comes from PUBLIC
GRANT SELECT ON customers TO PUBLIC;
REVOKE SELECT ON customers FROM reporter;
SELECT has_table_privilege('reporter', 'customers', 'SELECT') AS still_reads;
```

```sql
-- FIX: revoke it from PUBLIC too
REVOKE SELECT ON customers FROM PUBLIC;
SELECT has_table_privilege('reporter', 'customers', 'SELECT') AS still_reads;
```

Câu sai vẫn trả `true`: `reporter` đọc được nhờ quyền của `PUBLIC`. Hãy kiểm bằng `has_table_privilege` sau mỗi lần REVOKE thay vì đoán.

Xóa một vai trò còn giữ quyền:

```sql
GRANT SELECT ON orders TO reporter;
-- ERROR 2BP01: role "reporter" cannot be dropped because some objects depend on it
DROP ROLE reporter;
```

```sql
DROP OWNED BY reporter;
DROP ROLE reporter;
SELECT count(*) AS left_over FROM pg_roles WHERE rolname = 'reporter';
```

Postgres không xóa vai trò khi còn quyền hoặc đối tượng gắn với nó. `DROP OWNED BY` gỡ mọi quyền đã cấp cho vai trò trong database này và xóa đối tượng nó sở hữu; muốn giữ đối tượng thì chạy `REASSIGN OWNED BY` trước để chuyển chủ.

## Thực hành

Database có bảng `customers` và `orders`; nhóm `support` đang đọc, thêm và sửa được `orders`. Tạo vai trò `analyst` chỉ đọc, siết quyền của `support`, mở vài cột của `customers` cho `analyst`, rồi kiểm lại cả bốn quyền bằng hàm.

## Tóm tắt

- Người dùng và nhóm đều là vai trò; `LOGIN` quyết định có đăng nhập được hay không.
- Chủ sở hữu có mọi quyền; vai trò khác chỉ có quyền đã được `GRANT`, có thể tới từng cột.
- Quyền thật là hợp của quyền riêng, quyền của `PUBLIC` và quyền kế thừa từ vai trò cha.
- Kiểm quyền bằng `has_table_privilege` thay vì đoán; xóa vai trò bằng `DROP OWNED BY` rồi `DROP ROLE`.

# EN

## Opening

An application, an analytics team and a support team share one database. If everyone logs in with one all-powerful account, one mistyped `DELETE` from an analyst can wipe out the orders. This lesson splits privileges so each group can do exactly its own job.

## Key idea

In Postgres, users and groups are the same thing: a role. A role with the `LOGIN` attribute can log in, like an account; a `NOLOGIN` role usually acts as a group that collects privileges. `CREATE USER` is just `CREATE ROLE` with `LOGIN` already set.

Every table has an owner, the role that created it. The owner holds every privilege on the table. Other roles can only do what a `GRANT` gave them: `SELECT` to read, `INSERT`, `UPDATE`, `DELETE` to write, `TRUNCATE` to empty it. Read access can be limited to a few columns. `REVOKE` removes exactly the privileges it names and applies from the next statement.

Many people think a REVOKE on a role is enough to lock it out. In fact a role's real privileges are the union of three sources: those granted to itself, to `PUBLIC` (every role) and to the roles it is a member of. A superuser skips every check, so an application should never run as a superuser.

## Syntax

```sql
CREATE ROLE role_name [ [ WITH ] LOGIN | NOLOGIN | PASSWORD 'secret' ];
GRANT { SELECT | INSERT | UPDATE | DELETE | TRUNCATE | ALL } [, ...]
  ON { [ TABLE ] table_name [, ...] | ALL TABLES IN SCHEMA schema_name }
  TO { role_name | PUBLIC } [ WITH GRANT OPTION ];
GRANT SELECT ( column [, ...] ) ON table_name TO role_name;
REVOKE privilege [, ...] ON table_name FROM { role_name | PUBLIC } [ CASCADE ];
DROP ROLE [ IF EXISTS ] role_name;
```

- `LOGIN`: the role can log in; the default of `CREATE ROLE` is `NOLOGIN`.
- `ALL TABLES IN SCHEMA`: grants on every table the schema holds now, not on tables created later.
- `WITH GRANT OPTION`: the grantee may pass the privilege on.
- `PUBLIC`: every role, including roles created later.
- `CASCADE`: also removes what the grantee passed on.

## Example

Create role `reporter`, let it read `customers`, then list the privileges:

```sql
CREATE ROLE reporter NOLOGIN;
GRANT SELECT ON customers TO reporter;
SELECT grantee, table_name, privilege_type
FROM information_schema.table_privileges
WHERE grantee IN ('reporter', 'support')
ORDER BY grantee, table_name, privilege_type;
```

The result has one row for `reporter` and three for `support` (`INSERT`, `SELECT`, `UPDATE` on `orders`).

Act as `reporter` with `SET ROLE` to test its real privileges:

```sql
SET ROLE reporter;
SELECT current_user, count(*) AS customers FROM customers;
```

```sql
-- ERROR 42501: permission denied for table orders
SELECT count(*) FROM orders;
```

```sql
RESET ROLE;
SELECT current_user;
```

`current_user` becomes `reporter` after `SET ROLE` and goes back to the previous role after `RESET ROLE`. Reading `orders` is refused with code `42501` because `reporter` has no privilege on that table yet.

## Common mistakes

Revoking from a role but forgetting `PUBLIC`:

```sql
-- WRONG: the privilege still comes from PUBLIC
GRANT SELECT ON customers TO PUBLIC;
REVOKE SELECT ON customers FROM reporter;
SELECT has_table_privilege('reporter', 'customers', 'SELECT') AS still_reads;
```

```sql
-- FIX: revoke it from PUBLIC too
REVOKE SELECT ON customers FROM PUBLIC;
SELECT has_table_privilege('reporter', 'customers', 'SELECT') AS still_reads;
```

The wrong version still returns `true`: `reporter` reads through the privilege of `PUBLIC`. Check with `has_table_privilege` after each REVOKE instead of guessing.

Dropping a role that still holds privileges:

```sql
GRANT SELECT ON orders TO reporter;
-- ERROR 2BP01: role "reporter" cannot be dropped because some objects depend on it
DROP ROLE reporter;
```

```sql
DROP OWNED BY reporter;
DROP ROLE reporter;
SELECT count(*) AS left_over FROM pg_roles WHERE rolname = 'reporter';
```

Postgres will not drop a role while privileges or objects still depend on it. `DROP OWNED BY` removes every privilege granted to the role in this database and drops the objects it owns; to keep the objects, run `REASSIGN OWNED BY` first to change their owner.

## Practice

The database has tables `customers` and `orders`; group `support` can read, insert and update `orders`. Create a read-only role `analyst`, tighten the privileges of `support`, open a few columns of `customers` to `analyst`, then check all four privileges with functions.

## Recap

- Users and groups are both roles; `LOGIN` decides whether a role can log in.
- The owner holds every privilege; other roles only hold what a `GRANT` gave them, down to single columns.
- Real privileges are the union of the role's own, those of `PUBLIC` and those inherited from parent roles.
- Check privileges with `has_table_privilege` instead of guessing; drop a role with `DROP OWNED BY` then `DROP ROLE`.
