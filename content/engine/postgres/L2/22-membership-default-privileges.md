---
id: e-pg-l2-22
engine: postgres
level: L2
module: roles
title: Thành viên vai trò, quyền mặc định, USAGE trên schema
title_en: Role membership, default privileges and schema USAGE
kind: lab
runtime: browser
minutes: 18
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-privilege-gates, at: idea }]
objectives:
  - vi: Gom quyền vào một vai trò nhóm, cho người dùng làm thành viên và đọc tùy chọn INHERIT, SET của từng lần cấp.
    en: Collect privileges in a group role, make users its members and read the INHERIT and SET options of each grant.
  - vi: Cấp `USAGE` trên schema để quyền trên bảng thật sự dùng được, và đặt quyền mặc định cho bảng tạo sau.
    en: Grant `USAGE` on a schema so table privileges actually work, and set default privileges for tables created later.
  - vi: Đổi thuộc tính của vai trò bằng `ALTER ROLE` và xóa một vai trò còn sở hữu bảng.
    en: Change a role's attributes with `ALTER ROLE` and drop a role that still owns tables.
requires: [e-pg-l2-21]
sources:
  - https://www.postgresql.org/docs/18/role-membership.html
  - https://www.postgresql.org/docs/18/sql-grant.html
  - https://www.postgresql.org/docs/18/sql-alterrole.html
  - https://www.postgresql.org/docs/18/sql-droprole.html
  - https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html
  - https://www.postgresql.org/docs/18/ddl-schemas.html
  - https://www.postgresql.org/docs/18/ddl-priv.html
lab:
  setup: |
    CREATE SCHEMA sales;
    CREATE TABLE sales.orders (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      customer text NOT NULL,
      amount numeric(12,2) NOT NULL CHECK (amount > 0)
    );
    INSERT INTO sales.orders (customer, amount) VALUES ('An', 120.00), ('Binh', 80.50), ('Chi', 310.00);
    CREATE ROLE readers NOLOGIN;
    CREATE ROLE linh LOGIN;
    CREATE ROLE app_owner NOLOGIN;
    CREATE ROLE intern LOGIN;
    GRANT SELECT ON sales.orders TO readers;
    GRANT USAGE, CREATE ON SCHEMA sales TO app_owner;
    CREATE TABLE sales.scratch (id int PRIMARY KEY, note text);
    ALTER TABLE sales.scratch OWNER TO intern;
  steps:
    - task:
        vi: Cho `linh` vào nhóm `readers` để cô ấy hưởng quyền đọc của nhóm.
        en: Put `linh` into group `readers` so she gets the group's read privilege.
      solution: GRANT readers TO linh
      check: catalog
      hint:
        vi: "Cấp một vai trò cho vai trò khác: `GRANT group_role TO member_role`."
        en: "Grant one role to another: `GRANT group_role TO member_role`."
    - task:
        vi: Nhóm `readers` có quyền trên `sales.orders` nhưng chưa vào được schema `sales`. Mở cửa schema cho nhóm, chỉ để dùng, không để tạo bảng.
        en: Group `readers` holds a privilege on `sales.orders` but cannot enter schema `sales` yet. Open the schema to the group, for use only, not to create tables.
      solution: GRANT USAGE ON SCHEMA sales TO readers
      check: catalog
      hint:
        vi: "Quyền vào schema là `USAGE`; quyền tạo bảng trong đó là `CREATE`."
        en: "The privilege to enter a schema is `USAGE`; the privilege to create tables in it is `CREATE`."
    - task:
        vi: "Mọi bảng mà `app_owner` tạo sau này trong schema `sales` phải tự cho `readers` đọc."
        en: "Every table that `app_owner` creates later in schema `sales` must let `readers` read it automatically."
      solution: ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA sales GRANT SELECT ON TABLES TO readers
      check: catalog
      after: SELECT defaclrole::regrole::text AS creator, defaclnamespace::regnamespace::text AS in_schema, defaclobjtype AS kind, defaclacl::text AS acl FROM pg_default_acl ORDER BY 1, 2, 3
      hint:
        vi: "`ALTER DEFAULT PRIVILEGES FOR ROLE creator IN SCHEMA name GRANT ... ON TABLES TO role`."
        en: "`ALTER DEFAULT PRIVILEGES FOR ROLE creator IN SCHEMA name GRANT ... ON TABLES TO role`."
    - task:
        vi: "Kiểm lại, một dòng ba cột: `linh` là thành viên của `readers`? `linh` dùng được schema `sales`? `linh` đọc được `sales.orders`?"
        en: "Check it, one row of three columns: is `linh` a member of `readers`? Can `linh` use schema `sales`? Can `linh` read `sales.orders`?"
      solution: SELECT pg_has_role('linh', 'readers', 'MEMBER') AS linh_in_readers, has_schema_privilege('linh', 'sales', 'USAGE') AS linh_uses_sales, has_table_privilege('linh', 'sales.orders', 'SELECT') AS linh_reads_orders
      check: rows
      hint:
        vi: "`pg_has_role(user, role, 'MEMBER')`, `has_schema_privilege(user, schema, 'USAGE')`, `has_table_privilege(user, table, 'SELECT')`."
        en: "`pg_has_role(user, role, 'MEMBER')`, `has_schema_privilege(user, schema, 'USAGE')`, `has_table_privilege(user, table, 'SELECT')`."
    - task:
        vi: "Thực tập sinh `intern` nghỉ việc. Chuyển mọi đối tượng `intern` sở hữu cho `app_owner`."
        en: "The intern `intern` is leaving. Hand every object `intern` owns over to `app_owner`."
      solution: REASSIGN OWNED BY intern TO app_owner
      check: catalog
      after: SELECT tablename, tableowner FROM pg_tables WHERE schemaname = 'sales' ORDER BY tablename
      hint:
        vi: "`REASSIGN OWNED BY old_role TO new_role` đổi chủ, không xóa gì."
        en: "`REASSIGN OWNED BY old_role TO new_role` changes the owner and drops nothing."
    - task:
        vi: Giờ `intern` không còn sở hữu gì. Xóa vai trò này.
        en: Now `intern` owns nothing. Drop this role.
      solution: DROP ROLE intern
      check: catalog
      hint:
        vi: "`DROP ROLE name`; nó chỉ chạy khi không còn gì phụ thuộc vào vai trò."
        en: "`DROP ROLE name`; it only works when nothing depends on the role any more."
quiz:
  - q:
      vi: "`readers` có `SELECT` trên `sales.orders`, `minh` là thành viên của `readers`, nhưng `minh` đọc bảng thì gặp `permission denied for schema sales`. Thiếu gì?"
      en: "`readers` holds `SELECT` on `sales.orders` and `minh` is a member of `readers`, yet `minh` reading the table gets `permission denied for schema sales`. What is missing?"
    options:
      - { vi: "Thêm một lần `GRANT SELECT` nữa, lần này cấp thẳng cho `minh`", en: "Another `GRANT SELECT`, this time straight to `minh`" }
      - { vi: "`USAGE` trên schema `sales` cho `readers` (hoặc cho `minh`)", en: "`USAGE` on schema `sales` for `readers` (or for `minh`)" }
      - { vi: "`minh` phải đăng nhập lại", en: "`minh` must log in again" }
    answer: 1
    trap: 0
    why:
      vi: "Cấp thêm `SELECT` hay đăng nhập lại đều không giúp, vì thông báo nói rõ là schema, không phải bảng. Muốn chạm tới một bảng, vai trò cần `USAGE` trên schema chứa nó rồi mới tới quyền trên bảng; cấp thêm quyền bảng không mở được cửa schema."
      en: "Another `SELECT` grant or a new login does not help, because the message names the schema, not the table. To reach a table a role first needs `USAGE` on its schema, then the table privilege; more table grants never open the schema door."
  - q:
      vi: "Bạn (vai trò `postgres`) chạy `ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT ON TABLES TO readers`. Ngày mai `app_owner` tạo bảng `sales.refunds`. `readers` đọc được bảng đó không?"
      en: "You (role `postgres`) run `ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT ON TABLES TO readers`. Tomorrow `app_owner` creates table `sales.refunds`. Can `readers` read it?"
    options:
      - { vi: "Được, quyền mặc định áp cho mọi bảng mới trong schema", en: "Yes, default privileges apply to every new table in the schema" }
      - { vi: "Không, quyền mặc định chỉ áp cho bảng do vai trò đã đặt nó tạo ra (ở đây là `postgres`)", en: "No, default privileges only apply to tables created by the role that set them (here `postgres`)" }
      - { vi: "Không, vì quyền mặc định chỉ có hiệu lực sau khi khởi động lại server", en: "No, because default privileges only apply after a server restart" }
    answer: 1
    trap: 0
    why:
      vi: "Câu lệnh có ghi tên schema, nhưng quyền mặc định gắn với vai trò tạo đối tượng. Không ghi `FOR ROLE` thì đó là vai trò đang chạy lệnh, ở đây là `postgres`; bảng do `app_owner` tạo không được phủ. Không cần khởi động lại: quyền mặc định có hiệu lực ngay. Muốn phủ bảng của `app_owner`, viết `FOR ROLE app_owner`."
      en: "The command names the schema, but default privileges belong to the role that creates the objects. Without `FOR ROLE` that is the role running the command, here `postgres`; tables `app_owner` creates are not covered. No restart is needed: default privileges apply at once. To cover the tables of `app_owner`, write `FOR ROLE app_owner`."
  - q:
      vi: "Trong PostgreSQL 16 trở lên, vai trò `khoa` được tạo với `NOINHERIT` rồi được `GRANT readers TO khoa`. Điều gì đúng?"
      en: "In PostgreSQL 16 and later, role `khoa` is created with `NOINHERIT` and then gets `GRANT readers TO khoa`. What is true?"
    options:
      - { vi: "`khoa` dùng ngay mọi quyền của `readers`", en: "`khoa` uses every privilege of `readers` at once" }
      - { vi: "Lần cấp này có `inherit_option` false: `khoa` là thành viên nhưng chỉ dùng quyền nhóm sau `SET ROLE readers`", en: "This grant has `inherit_option` false: `khoa` is a member but uses the group's privileges only after `SET ROLE readers`" }
      - { vi: "Câu GRANT bị từ chối vì `khoa` là NOINHERIT", en: "The GRANT is refused because `khoa` is NOINHERIT" }
    answer: 1
    why:
      vi: "GRANT không bị từ chối: `khoa` vẫn thành thành viên. Từ bản 16, thuộc tính INHERIT (tự dùng quyền của nhóm) của vai trò chỉ là giá trị mặc định cho tùy chọn INHERIT của từng lần cấp. `khoa` là `NOINHERIT`, nên lần cấp này nhận false: `khoa` chỉ dùng quyền của `readers` sau `SET ROLE readers`. Vì vậy `pg_has_role('khoa', 'readers', 'USAGE')` trả false còn `'MEMBER'` trả true."
      en: "The GRANT is not refused: `khoa` still becomes a member. Since version 16 a role's INHERIT attribute (using the group's privileges automatically) is only the default for the INHERIT option of each grant. `khoa` is `NOINHERIT`, so this grant gets false: `khoa` uses `readers`' privileges only after `SET ROLE readers`. Hence `pg_has_role('khoa', 'readers', 'USAGE')` returns false while `'MEMBER'` returns true."
---
## Mở bài

Công ty có ba người phân tích và sắp có người thứ tư. Nếu mỗi lần có người mới bạn phải GRANT lại từng bảng, sớm muộn sẽ có người thiếu quyền hoặc thừa quyền. Bài này gom quyền vào một nhóm, mở cửa schema và đặt quyền cho cả những bảng chưa tồn tại.

## Ý chính

Một vai trò có thể là thành viên của vai trò khác: `GRANT readers TO minh` cho `minh` vào nhóm `readers`. Từ PostgreSQL 16, mỗi lần cấp có ba tùy chọn riêng: `INHERIT` (tự dùng quyền của nhóm), `SET` (được `SET ROLE` sang nhóm) và `ADMIN` (được thêm, bớt thành viên). Thuộc tính `NOINHERIT` của vai trò giờ chỉ là giá trị mặc định cho `INHERIT` của các lần cấp mới. Hàm `pg_has_role` trả lời: `'MEMBER'` là có thuộc nhóm không, `'USAGE'` là có đang dùng quyền nhóm không.

Nhiều người nghĩ cấp `SELECT` trên bảng là đủ để đọc. Thật ra mỗi bảng nằm trong một schema, và vai trò cần `USAGE` trên schema đó mới chạm được tới bảng; `CREATE` trên schema là quyền tạo đối tượng trong đó. Từ PostgreSQL 15, `PUBLIC` không còn quyền `CREATE` trên schema `public`, nên người dùng thường không tạo bảng ở đó được nữa.

`ALTER DEFAULT PRIVILEGES` đặt quyền cho đối tượng tạo sau này. Nó không đụng tới bảng đang có, và chỉ áp cho đối tượng do một vai trò cụ thể tạo: vai trò ghi sau `FOR ROLE`, nếu không ghi thì là vai trò đang chạy lệnh. Muốn giới hạn quyền tới từng dòng thì cần RLS (row-level security, bảo mật theo dòng), học ở `e-pg-l5-10`.

Khi một người nghỉ, `ALTER ROLE` khóa đăng nhập (`NOLOGIN`, `VALID UNTIL`). Muốn xóa hẳn, chuyển đối tượng của họ bằng `REASSIGN OWNED BY`, gỡ phần còn lại bằng `DROP OWNED BY`, rồi `DROP ROLE`.

Hình từng bước ở cuối mục này vẽ ba cửa mà `linh` phải qua để đọc `sales.orders`: `CONNECT`, `USAGE` trên schema, `SELECT` trên bảng.

## Cú pháp

```sql
GRANT group_role TO member_role [ WITH { INHERIT | SET | ADMIN } { TRUE | FALSE } [, ...] ];
GRANT { USAGE | CREATE } ON SCHEMA schema_name TO role_name;
ALTER DEFAULT PRIVILEGES [ FOR ROLE creator ] [ IN SCHEMA schema_name ]
  GRANT privilege [, ...] ON { TABLES | SEQUENCES | FUNCTIONS } TO role_name;
ALTER ROLE role_name [ WITH ] { LOGIN | NOLOGIN | CONNECTION LIMIT n | VALID UNTIL 'timestamp' };
ALTER ROLE role_name RENAME TO new_name;
REASSIGN OWNED BY old_role TO new_role;
DROP OWNED BY role_name;
```

- `WITH INHERIT FALSE`: thành viên chỉ dùng quyền nhóm sau `SET ROLE`.
- `WITH SET FALSE`: không được `SET ROLE` sang nhóm.
- `FOR ROLE`: vai trò tạo đối tượng mà quyền mặc định áp vào.
- `VALID UNTIL`: mật khẩu hết hạn từ thời điểm đó.

## Ví dụ

Tạo hai người dùng, một có `NOINHERIT`, rồi xem tùy chọn của từng lần cấp:

```sql
CREATE ROLE minh LOGIN;
CREATE ROLE khoa LOGIN NOINHERIT;
GRANT readers TO minh;
GRANT readers TO khoa;
GRANT readers TO linh WITH SET FALSE;
SELECT m.rolname AS member, a.inherit_option, a.set_option, a.admin_option
FROM pg_auth_members a JOIN pg_roles m ON m.oid = a.member
WHERE a.roleid = 'readers'::regrole
ORDER BY member;
```

`khoa` có `inherit_option` false vì vai trò của nó là `NOINHERIT`; `linh` có `set_option` false.

```sql
SELECT pg_has_role('khoa', 'readers', 'MEMBER') AS khoa_member,
       pg_has_role('khoa', 'readers', 'USAGE') AS khoa_uses,
       has_table_privilege('minh', 'sales.orders', 'SELECT') AS minh_reads,
       has_table_privilege('khoa', 'sales.orders', 'SELECT') AS khoa_reads;
```

`khoa` là thành viên nhưng không dùng quyền nhóm, nên không đọc được `sales.orders`; `minh` thì đọc được.

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT ON TABLES TO readers;
CREATE TABLE sales.refunds (id int PRIMARY KEY, order_id bigint NOT NULL);
SELECT has_table_privilege('readers', 'sales.refunds', 'SELECT') AS refunds_readable;
```

```sql
ALTER ROLE khoa RENAME TO khoa_old;
ALTER ROLE khoa_old NOLOGIN CONNECTION LIMIT 0 VALID UNTIL '2026-12-31';
SELECT rolname, rolcanlogin, rolconnlimit, rolvaliduntil::date AS valid_until
FROM pg_roles WHERE rolname = 'khoa_old';
```

Bảng mới tạo đã đọc được ngay nhờ quyền mặc định; vai trò đổi tên giữ nguyên mọi quyền và thành viên.

## Lỗi hay gặp

Có quyền trên bảng nhưng thiếu `USAGE` trên schema:

```sql
SET ROLE minh;
-- ERROR 42501: permission denied for schema sales
SELECT count(*) FROM sales.orders;
```

```sql
RESET ROLE;
GRANT USAGE ON SCHEMA sales TO readers;
SET ROLE minh;
SELECT count(*) AS orders FROM sales.orders;
```

Tạo bảng trong `public` bằng một vai trò thường, từ PostgreSQL 15:

```sql
-- ERROR 42501: permission denied for schema public
CREATE TABLE public.notes (id int PRIMARY KEY);
```

Cấp `CREATE ON SCHEMA public` cho đúng vai trò cần nó, hoặc tốt hơn là cho ứng dụng một schema riêng.

Đặt quyền mặc định bằng vai trò của mình nhưng bảng lại do vai trò khác tạo:

```sql
-- WRONG: the defaults set by postgres do not cover tables app_owner creates
RESET ROLE;
SET ROLE app_owner;
CREATE TABLE sales.credits (id int PRIMARY KEY);
RESET ROLE;
SELECT has_table_privilege('readers', 'sales.credits', 'SELECT') AS readable;
```

```sql
-- FIX: set them FOR ROLE app_owner, the role that creates the tables
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA sales GRANT SELECT ON TABLES TO readers;
SET ROLE app_owner;
CREATE TABLE sales.returns (id int PRIMARY KEY);
RESET ROLE;
SELECT has_table_privilege('readers', 'sales.returns', 'SELECT') AS readable;
```

Câu sai trả `false`: quyền mặc định của `postgres` chỉ áp cho bảng `postgres` tạo. Bảng `sales.credits` đã có thì phải `GRANT` tay.

## Thực hành

Database có schema `sales`, nhóm `readers` đã có quyền đọc `sales.orders`, người dùng `linh`, vai trò `app_owner` tạo bảng và `intern` sắp nghỉ. Làm sáu bước: thêm thành viên, mở schema, đặt quyền mặc định, kiểm bằng hàm, chuyển chủ và xóa vai trò; sau đó là ba câu hỏi.

## Tóm tắt

- Gom quyền vào vai trò nhóm và `GRANT group TO user`; mỗi lần cấp có tùy chọn `INHERIT`, `SET`, `ADMIN` riêng.
- Đọc bảng cần cả `USAGE` trên schema lẫn `SELECT` trên bảng; `PUBLIC` không còn `CREATE` trên `public`.
- `ALTER DEFAULT PRIVILEGES` chỉ áp cho đối tượng tạo sau, bởi vai trò ghi trong `FOR ROLE`.
- Xóa vai trò: `REASSIGN OWNED BY`, `DROP OWNED BY`, rồi `DROP ROLE`.

# EN

## Opening

The company has three analysts and a fourth is about to join. If every newcomer means granting each table again, sooner or later someone ends up with too few or too many privileges. This lesson collects privileges in a group, opens the schema door and sets privileges even for tables that do not exist yet.

## Key idea

A role can be a member of another role: `GRANT readers TO minh` puts `minh` into group `readers`. Since PostgreSQL 16 each grant has three options of its own: `INHERIT` (use the group's privileges automatically), `SET` (may `SET ROLE` to the group) and `ADMIN` (may add and remove members). A role's `NOINHERIT` attribute is now only the default for `INHERIT` on new grants. Function `pg_has_role` answers: `'MEMBER'` asks whether the role belongs to the group, `'USAGE'` whether it is using the group's privileges right now.

Many people think a `SELECT` grant on a table is enough to read it. In fact every table lives in a schema, and a role needs `USAGE` on that schema before it can reach the table; `CREATE` on a schema is the privilege to create objects in it. Since PostgreSQL 15, `PUBLIC` no longer has `CREATE` on schema `public`, so ordinary users cannot create tables there any more.

`ALTER DEFAULT PRIVILEGES` sets privileges for objects created later. It does not touch existing tables, and it only covers objects created by one specific role: the role named after `FOR ROLE`, or else the role running the command. Limiting access to single rows needs RLS (row-level security), taught in `e-pg-l5-10`.

When someone leaves, `ALTER ROLE` locks their login (`NOLOGIN`, `VALID UNTIL`). To remove them for good, move their objects with `REASSIGN OWNED BY`, clear what is left with `DROP OWNED BY`, then `DROP ROLE`.

The step-through figure at the end of this section draws the three doors `linh` must pass to read `sales.orders`: `CONNECT`, `USAGE` on the schema, `SELECT` on the table.

## Syntax

```sql
GRANT group_role TO member_role [ WITH { INHERIT | SET | ADMIN } { TRUE | FALSE } [, ...] ];
GRANT { USAGE | CREATE } ON SCHEMA schema_name TO role_name;
ALTER DEFAULT PRIVILEGES [ FOR ROLE creator ] [ IN SCHEMA schema_name ]
  GRANT privilege [, ...] ON { TABLES | SEQUENCES | FUNCTIONS } TO role_name;
ALTER ROLE role_name [ WITH ] { LOGIN | NOLOGIN | CONNECTION LIMIT n | VALID UNTIL 'timestamp' };
ALTER ROLE role_name RENAME TO new_name;
REASSIGN OWNED BY old_role TO new_role;
DROP OWNED BY role_name;
```

- `WITH INHERIT FALSE`: the member uses the group's privileges only after `SET ROLE`.
- `WITH SET FALSE`: the member may not `SET ROLE` to the group.
- `FOR ROLE`: the creating role whose new objects get the defaults.
- `VALID UNTIL`: the password stops working from that moment.

## Example

Create two users, one with `NOINHERIT`, then look at the options of each grant:

```sql
CREATE ROLE minh LOGIN;
CREATE ROLE khoa LOGIN NOINHERIT;
GRANT readers TO minh;
GRANT readers TO khoa;
GRANT readers TO linh WITH SET FALSE;
SELECT m.rolname AS member, a.inherit_option, a.set_option, a.admin_option
FROM pg_auth_members a JOIN pg_roles m ON m.oid = a.member
WHERE a.roleid = 'readers'::regrole
ORDER BY member;
```

`khoa` has `inherit_option` false because its role is `NOINHERIT`; `linh` has `set_option` false.

```sql
SELECT pg_has_role('khoa', 'readers', 'MEMBER') AS khoa_member,
       pg_has_role('khoa', 'readers', 'USAGE') AS khoa_uses,
       has_table_privilege('minh', 'sales.orders', 'SELECT') AS minh_reads,
       has_table_privilege('khoa', 'sales.orders', 'SELECT') AS khoa_reads;
```

`khoa` is a member but does not use the group's privileges, so it cannot read `sales.orders`; `minh` can.

```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA sales GRANT SELECT ON TABLES TO readers;
CREATE TABLE sales.refunds (id int PRIMARY KEY, order_id bigint NOT NULL);
SELECT has_table_privilege('readers', 'sales.refunds', 'SELECT') AS refunds_readable;
```

```sql
ALTER ROLE khoa RENAME TO khoa_old;
ALTER ROLE khoa_old NOLOGIN CONNECTION LIMIT 0 VALID UNTIL '2026-12-31';
SELECT rolname, rolcanlogin, rolconnlimit, rolvaliduntil::date AS valid_until
FROM pg_roles WHERE rolname = 'khoa_old';
```

The new table is readable at once thanks to the default privileges; a renamed role keeps all its privileges and memberships.

## Common mistakes

A privilege on the table but no `USAGE` on its schema:

```sql
SET ROLE minh;
-- ERROR 42501: permission denied for schema sales
SELECT count(*) FROM sales.orders;
```

```sql
RESET ROLE;
GRANT USAGE ON SCHEMA sales TO readers;
SET ROLE minh;
SELECT count(*) AS orders FROM sales.orders;
```

Creating a table in `public` as an ordinary role, since PostgreSQL 15:

```sql
-- ERROR 42501: permission denied for schema public
CREATE TABLE public.notes (id int PRIMARY KEY);
```

Grant `CREATE ON SCHEMA public` to the one role that needs it, or better, give the application a schema of its own.

Setting default privileges as yourself while another role creates the tables:

```sql
-- WRONG: the defaults set by postgres do not cover tables app_owner creates
RESET ROLE;
SET ROLE app_owner;
CREATE TABLE sales.credits (id int PRIMARY KEY);
RESET ROLE;
SELECT has_table_privilege('readers', 'sales.credits', 'SELECT') AS readable;
```

```sql
-- FIX: set them FOR ROLE app_owner, the role that creates the tables
ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA sales GRANT SELECT ON TABLES TO readers;
SET ROLE app_owner;
CREATE TABLE sales.returns (id int PRIMARY KEY);
RESET ROLE;
SELECT has_table_privilege('readers', 'sales.returns', 'SELECT') AS readable;
```

The wrong version returns `false`: the defaults of `postgres` only cover tables `postgres` creates. Table `sales.credits` already exists, so it needs a manual `GRANT`.

## Practice

The database has schema `sales`, group `readers` that may already read `sales.orders`, user `linh`, role `app_owner` that creates tables and `intern` who is leaving. Do six steps: add a member, open the schema, set default privileges, check with functions, change the owner and drop the role; then three questions.

## Recap

- Collect privileges in a group role and `GRANT group TO user`; each grant has its own `INHERIT`, `SET`, `ADMIN` options.
- Reading a table needs both `USAGE` on the schema and `SELECT` on the table; `PUBLIC` no longer has `CREATE` on `public`.
- `ALTER DEFAULT PRIVILEGES` only covers objects created later, by the role named in `FOR ROLE`.
- Dropping a role: `REASSIGN OWNED BY`, `DROP OWNED BY`, then `DROP ROLE`.
