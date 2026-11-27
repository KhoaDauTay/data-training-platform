---
id: e-pg-ext-01
engine: postgres
level: EXT
module: ext-basics
title: "Extension là gì: cài, xem, gỡ"
title_en: "What an extension is: install, list, remove"
kind: lab
runtime: browser
minutes: 12
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-26" }
figures: [{ name: pg-ext-anatomy, at: idea }]
objectives:
  - vi: Cài một extension bằng `CREATE EXTENSION` và xem gói nào đã cài, bản nào, qua `pg_extension`.
    en: Install an extension with `CREATE EXTENSION` and see which packages are installed, at which version, through `pg_extension`.
  - vi: Dùng kiểu `citext` để so email không phân biệt hoa thường.
    en: Use the `citext` type to compare emails regardless of letter case.
  - vi: Biết `DROP EXTENSION` mang theo những gì, và vì sao `CASCADE` có thể xóa cả dữ liệu.
    en: Know what `DROP EXTENSION` takes with it, and why `CASCADE` can delete data too.
requires: []
sources:
  - { url: https://www.postgresql.org/docs/18/sql-createextension.html, title_vi: "CREATE EXTENSION" }
  - { url: https://www.postgresql.org/docs/18/extend-extensions.html, title_vi: "Đóng gói đối tượng thành extension" }
  - { url: https://www.postgresql.org/docs/18/view-pg-available-extensions.html, title_vi: "pg_available_extensions" }
  - { url: https://www.postgresql.org/docs/18/citext.html, title_vi: "citext" }
  - { url: https://www.postgresql.org/docs/18/sql-dropextension.html, title_vi: "DROP EXTENSION" }
lab:
  setup: |
    CREATE TABLE staff (
      id int PRIMARY KEY,
      name text NOT NULL,
      email text NOT NULL
    );
    INSERT INTO staff VALUES
      (1, 'An', 'An.Tran@shop.vn'),
      (2, 'Binh', 'binh.le@shop.vn'),
      (3, 'Chi', 'CHI.PHAM@shop.vn'),
      (4, 'Dung', 'dung.vo@shop.vn');
  steps:
    - task:
        vi: "Cài extension `citext` vào database của lab."
        en: "Install the `citext` extension into the lab database."
      solution: CREATE EXTENSION citext
      check: rows
      after: SELECT extname, extversion FROM pg_extension WHERE extname = 'citext'
      hint:
        vi: "Một lệnh: `CREATE EXTENSION` rồi tên gói."
        en: "One statement: `CREATE EXTENSION` and the package name."
    - task:
        vi: "Đổi kiểu cột `email` của bảng `staff` sang `citext`, giữ nguyên dữ liệu."
        en: "Change the type of the `email` column of `staff` to `citext`, keeping the data."
      solution: ALTER TABLE staff ALTER COLUMN email TYPE citext
      check: catalog
      hint:
        vi: "`ALTER TABLE ... ALTER COLUMN ... TYPE`."
        en: "`ALTER TABLE ... ALTER COLUMN ... TYPE`."
    - task:
        vi: "Nhân viên gõ email toàn chữ thường: `chi.pham@shop.vn`. Lấy `id` và `name` của người có email đó."
        en: "Someone types the email in lower case: `chi.pham@shop.vn`. Return the `id` and `name` of the person with that email."
      solution: SELECT id, name FROM staff WHERE email = 'chi.pham@shop.vn'
      check: rows
      hint:
        vi: "Cột đã là `citext`, nên một phép `=` bình thường là đủ."
        en: "The column is `citext` now, so a plain `=` is enough."
    - task:
        vi: "Trước khi gỡ `citext`, liệt kê các cột đang dùng kiểu đó: tên bảng (`table_name`) và tên cột (`column_name`)."
        en: "Before removing `citext`, list the columns that use that type: table name (`table_name`) and column name (`column_name`)."
      solution: SELECT table_name, column_name FROM information_schema.columns WHERE udt_name = 'citext'
      check: rows
      hint:
        vi: "`information_schema.columns` có cột `udt_name` ghi tên kiểu."
        en: "`information_schema.columns` has a `udt_name` column holding the type name."
quiz:
  - q:
      vi: "Cột `staff.email` có kiểu `citext`. Bạn chạy `DROP EXTENSION citext CASCADE`. Cột đó ra sao?"
      en: "Column `staff.email` has type `citext`. You run `DROP EXTENSION citext CASCADE`. What happens to that column?"
    options:
      - { vi: "Cột tự đổi về `text`, dữ liệu vẫn còn", en: "It turns back into `text`, the data stays" }
      - { vi: "Cột bị xóa khỏi bảng, cùng mọi email trong đó", en: "It is dropped from the table with every email in it" }
      - { vi: "Lệnh bị từ chối vì cột vẫn còn dữ liệu", en: "The command is refused because the column has data" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì `citext` trông như `text` có thêm luật so sánh, nhưng Postgres không tự đổi kiểu cho bạn. Cột phụ thuộc vào kiểu `citext`, nên `CASCADE` xóa luôn cột: bảng còn 2 cột và email mất hẳn. Không có `CASCADE` thì lệnh bị chặn với lỗi 2BP01; muốn giữ dữ liệu, hãy đổi cột về `text` trước."
      en: "It sounds right because `citext` looks like `text` with a different comparison rule, but Postgres never changes the type for you. The column depends on the `citext` type, so `CASCADE` drops the column: the table keeps 2 columns and the emails are gone. Without `CASCADE` the command is blocked with error 2BP01; to keep the data, change the column back to `text` first."
  - q:
      vi: "Trong lab, `pg_available_extensions` chỉ có 2 dòng: `citext` và `plpgsql`. Vì sao ít vậy?"
      en: "In the lab, `pg_available_extensions` has only 2 rows: `citext` and `plpgsql`. Why so few?"
    options:
      - { vi: "PostgreSQL chỉ đi kèm đúng hai extension", en: "PostgreSQL ships with exactly two extensions" }
      - { vi: "Bảng chỉ liệt kê gói có file trong bản cài này", en: "It only lists packages whose files this install has" }
      - { vi: "Phải là superuser mới thấy các gói còn lại", en: "You must be a superuser to see the other packages" }
    answer: 1
    trap: 2
    why:
      vi: "Nghe hợp lý vì nhiều thứ trong catalog cần quyền cao, nhưng view này đọc thẳng thư mục extension của bản cài, ai cũng xem được. Server thật cài sẵn cả bộ contrib nên danh sách dài hàng chục dòng; lab PGlite chỉ nạp gói mà bài cần, nên chỉ thấy `citext` và `plpgsql` có sẵn."
      en: "It sounds right because much of the catalog needs high privileges, but this view simply reads the install's extension directory and anyone can query it. A real server usually has the whole contrib set, so the list runs to dozens of rows; the PGlite lab only loads the packages a lesson needs, so it shows `citext` and the built-in `plpgsql`."
---
## Mở bài

Bảng nhân viên của chuỗi cửa hàng lưu email với đủ kiểu viết hoa, và ô đăng nhập tìm `chi.pham@shop.vn` thì không thấy ai. Sửa từng câu bằng `lower()` thì dễ sót. PostgreSQL có sẵn một gói thêm kiểu dữ liệu giải quyết đúng việc này: extension `citext`.

## Ý chính

Extension là một gói cắm thêm vào PostgreSQL: kiểu dữ liệu, hàm, toán tử, phép ép kiểu, lớp toán tử cho index. Một lệnh `CREATE EXTENSION` cài cả lô vào database đang mở, và ghi một dòng vào `pg_extension` làm "chủ" của lô đó. Từ đó Postgres biết đối tượng nào thuộc gói nào: `pg_depend` nối từng đối tượng về dòng của gói với loại phụ thuộc `e`.

- `pg_available_extensions`: những gói bản cài này có file, cài được.
- `pg_extension`: những gói đã cài trong database này, kèm `extversion`.
- Extension cài theo từng database, không phải cho cả server.
- `DROP EXTENSION` gỡ cả lô. Nếu một bảng còn dùng kiểu của gói, lệnh bị chặn; thêm `CASCADE` thì xóa luôn thứ phụ thuộc, kể cả cột có dữ liệu.

Nhiều người nghĩ extension là "plugin bên ngoài", gỡ đi thì dữ liệu vẫn nguyên. Thật ra kiểu `citext` là một phần của định nghĩa bảng: gỡ gói bằng `CASCADE` là xóa cột.

Hình ở cuối mục này cho thấy một lệnh `CREATE EXTENSION citext` cài những gì, và cột nào đang dựa vào chúng.

## Cú pháp

```sql
CREATE EXTENSION [IF NOT EXISTS] name;
ALTER EXTENSION name UPDATE;
DROP EXTENSION name [CASCADE];
```

`IF NOT EXISTS` bỏ qua khi gói đã cài. `ALTER EXTENSION ... UPDATE` nâng lên bản mới nhất mà bản cài có. `DROP` mặc định là `RESTRICT`: từ chối nếu còn thứ phụ thuộc.

## Ví dụ

Cài gói rồi xem các gói đã cài:

```sql
CREATE EXTENSION citext;
SELECT extname, extversion
FROM pg_extension;
```

Có `citext` bản 1.8, cạnh `plpgsql` (ngôn ngữ hàm, luôn cài sẵn).

```sql
SELECT name, default_version
FROM pg_available_extensions;
```

Lab chỉ nạp gói bài cần, nên danh sách ngắn; một server thật có hàng chục dòng.

```sql
SELECT 'Chi.Pham@shop.vn'::citext
     = 'chi.pham@shop.vn' AS same;
```

Kết quả `true`: `citext` so sánh như thể hai bên đều viết thường.

```sql
SELECT d.classid::regclass AS kind,
       count(*) AS objects
FROM pg_depend d
JOIN pg_extension e
  ON e.oid = d.refobjid
WHERE e.extname = 'citext'
  AND d.deptype = 'e'
GROUP BY 1 ORDER BY 2 DESC;
```

Một lệnh cài 47 hàm, 26 toán tử, 8 phép ép kiểu, 3 lớp toán tử, 3 họ toán tử và 2 kiểu.

## Lỗi hay gặp

Chạy lại script cài đặt lần thứ hai:

```sql
-- ERROR 42710: extension "citext" already exists
CREATE EXTENSION citext;
```

Script chạy nhiều lần thì viết `CREATE EXTENSION IF NOT EXISTS citext`.

So email trên cột `text` rồi tưởng đã không phân biệt hoa thường:

```sql
-- WRONG: text compares letter case
SELECT count(*) AS found FROM staff
WHERE email = 'chi.pham@shop.vn';
```

```sql
-- FIX: compare as citext
SELECT count(*) AS found FROM staff
WHERE email::citext
    = 'chi.pham@shop.vn';
```

Bản sai đếm 0 vì cột lưu `CHI.PHAM@shop.vn`; bản sửa đếm 1. Sửa tận gốc là đổi kiểu cột, như bước 2 của lab.

Gỡ gói khi một cột còn dùng kiểu của nó:

```sql
-- ERROR 2BP01: other objects depend on it
ALTER TABLE staff
  ALTER COLUMN email TYPE citext;
DROP EXTENSION citext;
```

Postgres chặn lại và kể ra cột `staff.email`. Đừng vội thêm `CASCADE`: nó xóa cả cột. Đổi cột về `text` trước, rồi mới gỡ.

## Thực hành

Cài `citext`, đổi cột `email` sang kiểu đó, tìm một người bằng email viết thường, rồi liệt kê cột nào sẽ chặn việc gỡ gói. Sau đó trả lời hai câu hỏi.

## Tóm tắt

- `CREATE EXTENSION` cài một lô đối tượng vào database đang mở, ghi chủ của lô vào `pg_extension`.
- `pg_available_extensions` là gói cài được; `pg_extension` là gói đã cài.
- `citext` so sánh không phân biệt hoa thường mà không cần `lower()` ở mọi câu.
- `DROP EXTENSION` bị chặn khi còn thứ phụ thuộc; `CASCADE` xóa luôn thứ đó, kể cả cột có dữ liệu.

# EN

## Opening

The shop chain's staff table stores emails in every mix of capitals, and the login box finds nobody for `chi.pham@shop.vn`. Patching every query with `lower()` is easy to get wrong. PostgreSQL ships a package that adds a data type for exactly this: the `citext` extension.

## Key idea

An extension is a package you plug into PostgreSQL: data types, functions, operators, casts, operator classes for indexes. One `CREATE EXTENSION` installs the whole set into the current database and writes one row in `pg_extension` that owns it. From then on Postgres knows which object belongs to which package: `pg_depend` links each object to the package's row with dependency type `e`.

- `pg_available_extensions`: the packages this install has files for, ready to install.
- `pg_extension`: the packages installed in this database, with their `extversion`.
- Extensions are installed per database, not for the whole server.
- `DROP EXTENSION` removes the whole set. If a table still uses one of the package's types, the command is blocked; `CASCADE` drops the dependent objects too, columns with data included.

Many people think an extension is an "outside plugin" and removing it leaves the data alone. In fact the `citext` type is part of the table's definition: removing the package with `CASCADE` drops the column.

The figure at the end of this section shows what one `CREATE EXTENSION citext` installs, and which column relies on it.

## Syntax

```sql
CREATE EXTENSION [IF NOT EXISTS] name;
ALTER EXTENSION name UPDATE;
DROP EXTENSION name [CASCADE];
```

`IF NOT EXISTS` skips a package already installed. `ALTER EXTENSION ... UPDATE` moves to the newest version the install has. `DROP` is `RESTRICT` by default: it refuses while anything depends on the package.

## Example

Install the package, then list the installed ones:

```sql
CREATE EXTENSION citext;
SELECT extname, extversion
FROM pg_extension;
```

`citext` version 1.8 is there, next to `plpgsql` (the function language, always installed).

```sql
SELECT name, default_version
FROM pg_available_extensions;
```

The lab only loads the packages a lesson needs, so the list is short; a real server has dozens of rows.

```sql
SELECT 'Chi.Pham@shop.vn'::citext
     = 'chi.pham@shop.vn' AS same;
```

The result is `true`: `citext` compares as if both sides were lower case.

```sql
SELECT d.classid::regclass AS kind,
       count(*) AS objects
FROM pg_depend d
JOIN pg_extension e
  ON e.oid = d.refobjid
WHERE e.extname = 'citext'
  AND d.deptype = 'e'
GROUP BY 1 ORDER BY 2 DESC;
```

One command installs 47 functions, 26 operators, 8 casts, 3 operator classes, 3 operator families and 2 types.

## Common mistakes

Running the install script a second time:

```sql
-- ERROR 42710: extension "citext" already exists
CREATE EXTENSION citext;
```

For a script that may run more than once, write `CREATE EXTENSION IF NOT EXISTS citext`.

Comparing emails on a `text` column and believing case no longer matters:

```sql
-- WRONG: text compares letter case
SELECT count(*) AS found FROM staff
WHERE email = 'chi.pham@shop.vn';
```

```sql
-- FIX: compare as citext
SELECT count(*) AS found FROM staff
WHERE email::citext
    = 'chi.pham@shop.vn';
```

The wrong version counts 0 because the column holds `CHI.PHAM@shop.vn`; the fix counts 1. The real fix is changing the column's type, as in step 2 of the lab.

Removing the package while a column still uses its type:

```sql
-- ERROR 2BP01: other objects depend on it
ALTER TABLE staff
  ALTER COLUMN email TYPE citext;
DROP EXTENSION citext;
```

Postgres stops and names the column `staff.email`. Do not reach for `CASCADE`: it drops the column. Change the column back to `text` first, then remove the package.

## Practice

Install `citext`, change the `email` column to that type, find a person by a lower-case email, then list which columns would block removing the package. Then answer two questions.

## Recap

- `CREATE EXTENSION` installs a set of objects into the current database and records their owner in `pg_extension`.
- `pg_available_extensions` lists what can be installed; `pg_extension` lists what is installed.
- `citext` compares without letter case, with no `lower()` in every query.
- `DROP EXTENSION` is blocked while something depends on it; `CASCADE` drops that too, columns with data included.
