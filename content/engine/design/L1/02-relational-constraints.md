---
id: e-ds-l1-02
engine: design
level: L1
module: relational
title: Mô hình quan hệ, quy tắc Codd và ràng buộc
title_en: The relational model, Codd's rules and constraints
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ds-relation-anatomy, at: idea }]
objectives:
  - vi: Gọi đúng tên quan hệ, bộ, thuộc tính, miền và nói bảng SQL khác quan hệ toán học ở đâu.
    en: Name relation, tuple, attribute and domain correctly and say where an SQL table differs from a mathematical relation.
  - vi: Viết bốn loại ràng buộc toàn vẹn và biết mỗi vi phạm trả SQLSTATE nào.
    en: Write the four kinds of integrity constraint and know which SQLSTATE each violation returns.
  - vi: Tìm dữ liệu vi phạm trước khi thêm ràng buộc, rồi sửa nó.
    en: Find the rows that break a rule before adding the constraint, then fix them.
requires: [e-ds-l1-01]
sources:
  - https://doi.org/10.1145/362384.362685
  - https://www.postgresql.org/docs/18/ddl-constraints.html
  - https://www.postgresql.org/docs/18/errcodes-appendix.html
lab:
  setup: |
    CREATE TABLE departments (id int NOT NULL, name text NOT NULL);
    CREATE TABLE staff (
      id int PRIMARY KEY,
      name text NOT NULL,
      dept_id int NOT NULL,
      salary numeric(10,2) NOT NULL
    );
    INSERT INTO departments VALUES (1, 'sales'), (2, 'ops'), (3, 'it');
    INSERT INTO staff VALUES (1, 'An', 1, 900), (2, 'Binh', 2, 750), (3, 'Chi', 3, 1200), (4, 'Dung', 9, 680), (5, 'Giang', 1, 820);
  steps:
    - task:
        vi: "Bảng `departments` chưa có khóa. Cho cột `id` làm khóa chính (toàn vẹn thực thể). Đừng đặt tên ràng buộc."
        en: "Table `departments` has no key yet. Make column `id` its primary key (entity integrity). Do not name the constraint."
      solution: ALTER TABLE departments ADD PRIMARY KEY (id)
      check: catalog
      hint:
        vi: "`ALTER TABLE … ADD PRIMARY KEY (column)`; Postgres tự đặt tên `departments_pkey`."
        en: "`ALTER TABLE … ADD PRIMARY KEY (column)`; Postgres names it `departments_pkey` by itself."
    - task:
        vi: "Trước khi nối `staff` với `departments`, tìm các nhân viên có mã phòng không tồn tại: trả `id`, `name`, `dept_id`."
        en: "Before linking `staff` to `departments`, find the employees whose department id does not exist: return `id`, `name`, `dept_id`."
      solution: SELECT s.id, s.name, s.dept_id FROM staff s WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = s.dept_id)
      check: rows
      hint:
        vi: "Phép phản nối: `WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = s.dept_id)`."
        en: "An anti-join: `WHERE NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = s.dept_id)`."
    - task:
        vi: "Phòng nhân sự xác nhận: người có mã phòng 9 thật ra thuộc phòng `it` (mã 3). Sửa dữ liệu đó."
        en: "HR confirms that the person with department id 9 actually belongs to `it` (id 3). Fix that data."
      solution: UPDATE staff SET dept_id = 3 WHERE dept_id = 9
      after: SELECT id, dept_id FROM staff ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`UPDATE staff SET dept_id = 3 WHERE dept_id = 9`; lab đọc lại cả bảng để chấm."
        en: "`UPDATE staff SET dept_id = 3 WHERE dept_id = 9`; the lab reads the whole table back to grade it."
    - task:
        vi: "Giờ thêm toàn vẹn tham chiếu: `staff.dept_id` phải trỏ tới `departments.id`. Đừng đặt tên ràng buộc."
        en: "Now add referential integrity: `staff.dept_id` must point to `departments.id`. Do not name the constraint."
      solution: ALTER TABLE staff ADD FOREIGN KEY (dept_id) REFERENCES departments (id)
      check: catalog
      hint:
        vi: "`ALTER TABLE staff ADD FOREIGN KEY (dept_id) REFERENCES departments (id)`."
        en: "`ALTER TABLE staff ADD FOREIGN KEY (dept_id) REFERENCES departments (id)`."
    - task:
        vi: "Thêm ràng buộc miền: lương phải lớn hơn 0. Đừng đặt tên ràng buộc."
        en: "Add a domain rule: salary must be greater than 0. Do not name the constraint."
      solution: ALTER TABLE staff ADD CHECK (salary > 0)
      check: catalog
      hint:
        vi: "`ALTER TABLE … ADD CHECK (condition)`."
        en: "`ALTER TABLE … ADD CHECK (condition)`."
quiz:
  - q:
      vi: "Cột `email text UNIQUE`. Hai dòng cùng có `email` là NULL. Postgres làm gì?"
      en: "Column `email text UNIQUE`. Two rows both have a NULL `email`. What does Postgres do?"
    options:
      - { vi: "Báo lỗi 23505 vì hai giá trị trùng nhau", en: "Raises 23505 because the two values are equal" }
      - { vi: "Nhận cả hai: NULL không bằng NULL nên không trùng", en: "Accepts both: NULL is not equal to NULL, so they are not duplicates" }
      - { vi: "Tự đổi dòng sau thành chuỗi rỗng", en: "Turns the second one into an empty string" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì hai ô trông giống hệt nhau, nhưng theo SQL, NULL là \"không biết\", nên hai NULL không được coi là trùng. Muốn chặn, dùng `UNIQUE NULLS NOT DISTINCT` hoặc thêm `NOT NULL`."
      en: "It sounds right because the two cells look identical, but in SQL NULL means \"unknown\", so two NULLs are not duplicates. To forbid it, use `UNIQUE NULLS NOT DISTINCT` or add `NOT NULL`."
  - q:
      vi: "Theo Codd, một quan hệ là tập các bộ. Bảng SQL khác ở điểm nào?"
      en: "In Codd's model a relation is a set of tuples. Where does an SQL table differ?"
    options:
      - { vi: "Bảng SQL không có cột", en: "An SQL table has no columns" }
      - { vi: "Bảng SQL có thể chứa hai dòng giống hệt nhau nếu không có khóa", en: "An SQL table may hold two identical rows unless a key forbids it" }
      - { vi: "Không khác gì: bảng nào cũng là tập", en: "No difference: every table is a set" }
    answer: 1
    trap: 2
    why:
      vi: "Nhiều người nghĩ bảng nào cũng là tập. Thật ra SQL dùng đa tập: không có khóa thì hai dòng trùng vẫn nằm đó, và `SELECT` không tự bỏ trùng (phải `DISTINCT`). Khóa chính đưa bảng về đúng định nghĩa của Codd."
      en: "Many people think every table is a set. In fact SQL uses multisets: without a key two equal rows can sit side by side, and `SELECT` does not remove duplicates by itself (that takes `DISTINCT`). A primary key brings the table back to Codd's definition."
---
## Mở bài

Năm 1970, Edgar Codd đề xuất lưu mọi dữ liệu thành bảng giá trị và chỉ tìm theo giá trị, không theo con trỏ. Mọi database quan hệ hôm nay vẫn dựa trên ý đó. Bài này nói các luật giữ cho bảng luôn đúng, và mỗi luật bị phá thì Postgres báo mã gì.

## Ý chính

Trong mô hình quan hệ, một **quan hệ** (bảng) là tập các **bộ** (dòng); mỗi bộ có giá trị cho từng **thuộc tính** (cột), lấy từ một **miền** (kiểu và luật của cột). Thứ tự dòng, thứ tự cột không mang nghĩa. Bảng SQL lệch khỏi định nghĩa ở hai chỗ: không có khóa thì hai dòng trùng vẫn nằm được, và ô có thể là `NULL`.

Toàn vẹn dữ liệu có bốn loại. **Miền**: kiểu, `NOT NULL`, `CHECK`. **Khóa**: không hai dòng nào trùng khóa (`UNIQUE`). **Thực thể**: khóa chính không được null (`PRIMARY KEY` = `UNIQUE` + `NOT NULL`). **Tham chiếu**: khóa ngoại phải trỏ tới một dòng có thật (`FOREIGN KEY`).

Khi một câu phá luật, mặc định cả câu bị hủy và Postgres trả một mã SQLSTATE lớp 23: `23502` thiếu giá trị bắt buộc, `23505` trùng khóa, `23503` khóa ngoại không có cha, `23514` sai `CHECK`. Với khóa ngoại, bạn còn chọn được cách xử lý khi xóa dòng cha: chặn (mặc định), `CASCADE` (xóa theo), `SET NULL`, `SET DEFAULT`.

Codd sau đó viết 13 quy tắc (đánh số 0 đến 12) mô tả một hệ "quan hệ đầy đủ": mọi thông tin là giá trị trong bảng, catalog cũng là bảng đọc được bằng SQL, có độc lập dữ liệu, luật toàn vẹn khai báo trong database chứ không trong ứng dụng. Đó là thước đo lịch sử; không sản phẩm nào đạt trọn.

Hình cuối mục này đặt các từ ấy cạnh bảng `staff` của lab, cùng bốn loại luật và mã lỗi của chúng.

## Cú pháp

```sql
CREATE TABLE t (
  col type [ NOT NULL ] [ UNIQUE [ NULLS NOT DISTINCT ] ] [ CHECK ( condition ) ],
  [ CONSTRAINT name ] PRIMARY KEY ( col [, ...] ),
  [ CONSTRAINT name ] FOREIGN KEY ( col ) REFERENCES parent ( col )
    [ ON DELETE { NO ACTION | RESTRICT | CASCADE | SET NULL | SET DEFAULT } ]
);
ALTER TABLE t ADD [ CONSTRAINT name ] { PRIMARY KEY (...) | UNIQUE (...) | CHECK (...) | FOREIGN KEY (...) REFERENCES ... };
```

- Không ghi `CONSTRAINT name`: Postgres tự đặt tên, ví dụ `staff_salary_check`.
- `ON DELETE`: chuyện gì xảy ra với dòng con khi dòng cha bị xóa.
- `NULLS NOT DISTINCT`: coi các NULL là trùng nhau trong `UNIQUE`.

## Ví dụ

Hai bảng nhỏ đủ bốn loại ràng buộc, rồi đọc catalog xem Postgres ghi lại gì (quy tắc 4 của Codd: catalog là bảng).

```sql
CREATE TABLE ex_dept (id int PRIMARY KEY, name text NOT NULL UNIQUE);
CREATE TABLE ex_emp (
  id int PRIMARY KEY,
  dept_id int REFERENCES ex_dept (id) ON DELETE CASCADE,
  salary numeric(10,2) CHECK (salary > 0)
);
INSERT INTO ex_dept VALUES (1, 'sales'), (2, 'ops');
INSERT INTO ex_emp VALUES (10, 1, 500), (11, 2, 650);
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'ex_emp'::regclass ORDER BY conname;
```

`contype` là `p` (khóa chính), `f` (khóa ngoại), `c` (check). Giờ phá từng luật:

```sql
-- ERROR 23505: duplicate key value violates unique constraint "ex_dept_pkey"
INSERT INTO ex_dept VALUES (1, 'it');
```

```sql
-- ERROR 23503: insert or update on table "ex_emp" violates foreign key constraint "ex_emp_dept_id_fkey"
INSERT INTO ex_emp VALUES (12, 99, 700);
```

```sql
-- ERROR 23514: new row for relation "ex_emp" violates check constraint "ex_emp_salary_check"
INSERT INTO ex_emp VALUES (13, 1, -5);
```

```sql
-- ERROR 23502: null value in column "name" of relation "ex_dept" violates not-null constraint
INSERT INTO ex_dept VALUES (3, NULL);
```

Xóa dòng cha với `ON DELETE CASCADE`: dòng con đi theo.

```sql
DELETE FROM ex_dept WHERE id = 2;
SELECT id, dept_id FROM ex_emp ORDER BY id;
```

Chỉ còn nhân viên 10; nhân viên 11 bị xóa cùng phòng 2.

## Lỗi hay gặp

`UNIQUE` không chặn nhiều NULL.

```sql
-- WRONG: two NULL emails pass a plain UNIQUE
CREATE TABLE ex_user (id int PRIMARY KEY, email text UNIQUE);
INSERT INTO ex_user VALUES (1, NULL), (2, NULL);
SELECT count(*) AS null_emails FROM ex_user WHERE email IS NULL;
```

```sql
-- FIX: NULLS NOT DISTINCT treats NULLs as equal
CREATE TABLE ex_user2 (id int PRIMARY KEY, email text UNIQUE NULLS NOT DISTINCT);
INSERT INTO ex_user2 VALUES (1, NULL);
SELECT count(*) AS null_emails FROM ex_user2 WHERE email IS NULL;
```

Bảng thứ nhất giữ hai NULL; bảng thứ hai sẽ từ chối NULL thứ hai với `23505`.

`CHECK` cho NULL đi qua: điều kiện ra "không biết" thì không bị coi là sai.

```sql
-- WRONG: CHECK (salary > 0) accepts a NULL salary
INSERT INTO ex_emp VALUES (14, 1, NULL);
SELECT count(*) AS no_salary FROM ex_emp WHERE salary IS NULL;
```

```sql
-- FIX: remove the bad row and add NOT NULL
DELETE FROM ex_emp WHERE salary IS NULL;
ALTER TABLE ex_emp ALTER COLUMN salary SET NOT NULL;
SELECT count(*) AS no_salary FROM ex_emp WHERE salary IS NULL;
```

Thêm khóa ngoại khi dữ liệu cũ còn "mồ côi" thì cả lệnh thất bại; hãy tìm và sửa trước, như trong lab.

```sql
CREATE TABLE ex_parent (id int PRIMARY KEY);
CREATE TABLE ex_child (parent_id int);
INSERT INTO ex_child VALUES (7);
-- ERROR 23503: insert or update on table "ex_child" violates foreign key constraint "ex_child_parent_id_fkey"
ALTER TABLE ex_child ADD FOREIGN KEY (parent_id) REFERENCES ex_parent (id);
```

## Thực hành

Bảng `staff` và `departments` chưa có luật nào nối nhau, và một nhân viên trỏ tới phòng không tồn tại. Thêm khóa chính, tìm dòng mồ côi, sửa nó, rồi mới thêm khóa ngoại và ràng buộc lương.

## Tóm tắt

- Quan hệ = tập bộ trên các thuộc tính có miền; bảng SQL cho phép dòng trùng (khi không có khóa) và NULL.
- Bốn loại toàn vẹn: miền, khóa, thực thể, tham chiếu.
- Vi phạm trả SQLSTATE lớp 23: `23502`, `23505`, `23503`, `23514`.
- `UNIQUE` và `CHECK` đều cho NULL đi qua; muốn chặn thì thêm `NOT NULL` hoặc `NULLS NOT DISTINCT`.
- Tìm và sửa dữ liệu vi phạm trước khi thêm ràng buộc lên bảng đã có dữ liệu.

# EN

## Opening

In 1970 Edgar Codd proposed storing all data as tables of values and finding it by value only, never by pointer. Every relational database today still rests on that idea. This lesson covers the rules that keep tables correct, and which code Postgres returns when each one is broken.

## Key idea

In the relational model a **relation** (table) is a set of **tuples** (rows); each tuple has a value for every **attribute** (column), taken from a **domain** (the column's type and rules). Row order and column order carry no meaning. SQL tables depart from the definition in two places: without a key two equal rows can coexist, and a cell can be `NULL`.

Integrity comes in four kinds. **Domain**: types, `NOT NULL`, `CHECK`. **Key**: no two rows share a key (`UNIQUE`). **Entity**: the primary key is never null (`PRIMARY KEY` = `UNIQUE` + `NOT NULL`). **Referential**: a foreign key must point at a row that exists (`FOREIGN KEY`).

When a statement breaks a rule, by default the whole statement is cancelled and Postgres returns a class 23 SQLSTATE: `23502` a required value is missing, `23505` duplicate key, `23503` foreign key with no parent, `23514` failed `CHECK`. For a foreign key you also choose what happens when the parent row is deleted: block it (the default), `CASCADE` (delete along), `SET NULL`, `SET DEFAULT`.

Codd later wrote 13 rules (numbered 0 to 12) for a "fully relational" system: all information is values in tables, the catalog is tables readable with SQL, data independence holds, integrity rules are declared in the database rather than the application. They are a historical yardstick; no product meets them all.

The figure at the end of this section sets those words beside the lab's `staff` table, with the four kinds of rule and their error codes.

## Syntax

```sql
CREATE TABLE t (
  col type [ NOT NULL ] [ UNIQUE [ NULLS NOT DISTINCT ] ] [ CHECK ( condition ) ],
  [ CONSTRAINT name ] PRIMARY KEY ( col [, ...] ),
  [ CONSTRAINT name ] FOREIGN KEY ( col ) REFERENCES parent ( col )
    [ ON DELETE { NO ACTION | RESTRICT | CASCADE | SET NULL | SET DEFAULT } ]
);
ALTER TABLE t ADD [ CONSTRAINT name ] { PRIMARY KEY (...) | UNIQUE (...) | CHECK (...) | FOREIGN KEY (...) REFERENCES ... };
```

- Without `CONSTRAINT name`, Postgres picks a name, for example `staff_salary_check`.
- `ON DELETE`: what happens to child rows when the parent row is deleted.
- `NULLS NOT DISTINCT`: treat NULLs as equal inside `UNIQUE`.

## Example

Two small tables with all four kinds of constraint, then the catalog shows what Postgres recorded (Codd's rule 4: the catalog is tables).

```sql
CREATE TABLE ex_dept (id int PRIMARY KEY, name text NOT NULL UNIQUE);
CREATE TABLE ex_emp (
  id int PRIMARY KEY,
  dept_id int REFERENCES ex_dept (id) ON DELETE CASCADE,
  salary numeric(10,2) CHECK (salary > 0)
);
INSERT INTO ex_dept VALUES (1, 'sales'), (2, 'ops');
INSERT INTO ex_emp VALUES (10, 1, 500), (11, 2, 650);
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'ex_emp'::regclass ORDER BY conname;
```

`contype` is `p` (primary key), `f` (foreign key), `c` (check). Now break each rule:

```sql
-- ERROR 23505: duplicate key value violates unique constraint "ex_dept_pkey"
INSERT INTO ex_dept VALUES (1, 'it');
```

```sql
-- ERROR 23503: insert or update on table "ex_emp" violates foreign key constraint "ex_emp_dept_id_fkey"
INSERT INTO ex_emp VALUES (12, 99, 700);
```

```sql
-- ERROR 23514: new row for relation "ex_emp" violates check constraint "ex_emp_salary_check"
INSERT INTO ex_emp VALUES (13, 1, -5);
```

```sql
-- ERROR 23502: null value in column "name" of relation "ex_dept" violates not-null constraint
INSERT INTO ex_dept VALUES (3, NULL);
```

Delete a parent row with `ON DELETE CASCADE`: its children go too.

```sql
DELETE FROM ex_dept WHERE id = 2;
SELECT id, dept_id FROM ex_emp ORDER BY id;
```

Only employee 10 is left; employee 11 was deleted with department 2.

## Common mistakes

`UNIQUE` does not block several NULLs.

```sql
-- WRONG: two NULL emails pass a plain UNIQUE
CREATE TABLE ex_user (id int PRIMARY KEY, email text UNIQUE);
INSERT INTO ex_user VALUES (1, NULL), (2, NULL);
SELECT count(*) AS null_emails FROM ex_user WHERE email IS NULL;
```

```sql
-- FIX: NULLS NOT DISTINCT treats NULLs as equal
CREATE TABLE ex_user2 (id int PRIMARY KEY, email text UNIQUE NULLS NOT DISTINCT);
INSERT INTO ex_user2 VALUES (1, NULL);
SELECT count(*) AS null_emails FROM ex_user2 WHERE email IS NULL;
```

The first table keeps two NULLs; the second would refuse a second NULL with `23505`.

`CHECK` lets NULL through: a condition that comes out "unknown" does not count as false.

```sql
-- WRONG: CHECK (salary > 0) accepts a NULL salary
INSERT INTO ex_emp VALUES (14, 1, NULL);
SELECT count(*) AS no_salary FROM ex_emp WHERE salary IS NULL;
```

```sql
-- FIX: remove the bad row and add NOT NULL
DELETE FROM ex_emp WHERE salary IS NULL;
ALTER TABLE ex_emp ALTER COLUMN salary SET NOT NULL;
SELECT count(*) AS no_salary FROM ex_emp WHERE salary IS NULL;
```

Adding a foreign key while old data still has "orphans" makes the whole command fail; find and fix them first, as in the lab.

```sql
CREATE TABLE ex_parent (id int PRIMARY KEY);
CREATE TABLE ex_child (parent_id int);
INSERT INTO ex_child VALUES (7);
-- ERROR 23503: insert or update on table "ex_child" violates foreign key constraint "ex_child_parent_id_fkey"
ALTER TABLE ex_child ADD FOREIGN KEY (parent_id) REFERENCES ex_parent (id);
```

## Practice

Tables `staff` and `departments` have no rule linking them, and one employee points at a department that does not exist. Add the primary key, find the orphan row, fix it, and only then add the foreign key and the salary constraint.

## Recap

- A relation is a set of tuples over attributes with domains; SQL tables allow duplicate rows (without a key) and NULLs.
- Four kinds of integrity: domain, key, entity, referential.
- Violations return class 23 SQLSTATEs: `23502`, `23505`, `23503`, `23514`.
- `UNIQUE` and `CHECK` both let NULL through; add `NOT NULL` or `NULLS NOT DISTINCT` to block it.
- Find and fix the offending rows before adding a constraint to a table that already holds data.
