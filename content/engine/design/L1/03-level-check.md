---
id: e-ds-l1-03
engine: design
level: L1
module: relational
title: Kiểm tra cấp 1 - hệ CSDL và mô hình quan hệ
title_en: Level 1 check - database systems and the relational model
kind: quiz
runtime: browser
minutes: 10
objectives:
  - vi: Tự kiểm tra ba tầng schema, độc lập dữ liệu và bốn loại toàn vẹn.
    en: Check yourself on the three schema levels, data independence and the four kinds of integrity.
  - vi: Đọc catalog để biết một bảng đang có những luật nào.
    en: Read the catalog to see which rules a table already has.
requires: [e-ds-l1-02]
sources:
  - { url: https://www.postgresql.org/docs/18/catalog-pg-constraint.html, title_vi: "pg_constraint" }
  - { url: https://www.postgresql.org/docs/18/infoschema-columns.html, title_vi: "information_schema.columns" }
  - { url: https://doi.org/10.1145/362384.362685, title_vi: "Bài báo ACM 10.1145/362384.362685" }
lab:
  setup: |
    CREATE TABLE customers (id int PRIMARY KEY, email text NOT NULL UNIQUE, city text);
    CREATE TABLE orders (
      id int PRIMARY KEY,
      customer_id int NOT NULL REFERENCES customers (id),
      total numeric(12,2) NOT NULL CHECK (total >= 0)
    );
    INSERT INTO customers VALUES (1, 'an@example.com', 'Hue'), (2, 'binh@example.com', NULL);
    INSERT INTO orders VALUES (100, 1, 250.00), (101, 2, 80.00);
  steps:
    - task:
        vi: "Liệt kê các ràng buộc của bảng `orders`: tên và loại (`contype`), xếp theo tên."
        en: "List the constraints of table `orders`: name and kind (`contype`), ordered by name."
      solution: SELECT conname, contype FROM pg_constraint WHERE conrelid = 'orders'::regclass ORDER BY conname
      check: rows
      ordered: true
      hint:
        vi: "Catalog `pg_constraint`, lọc `conrelid = 'orders'::regclass`."
        en: "Catalog `pg_constraint`, filtered with `conrelid = 'orders'::regclass`."
    - task:
        vi: "Những cột nào trong schema `public` không nhận NULL? Trả `table_name`, `column_name`, xếp theo hai cột đó."
        en: "Which columns in schema `public` refuse NULL? Return `table_name`, `column_name`, ordered by those two columns."
      solution: SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND is_nullable = 'NO' ORDER BY table_name, column_name
      check: rows
      ordered: true
      hint:
        vi: "`information_schema.columns` có cột `is_nullable` (`YES`/`NO`)."
        en: "`information_schema.columns` has a column `is_nullable` (`YES`/`NO`)."
quiz:
  - q:
      vi: "Nhóm phân tích chỉ được thấy doanh thu theo tháng. Bạn đặt luật đó ở tầng nào?"
      en: "The analysts may only see revenue by month. At which level do you put that rule?"
    options:
      - { vi: "Tầng trong: một index riêng cho họ", en: "Internal: an index just for them" }
      - { vi: "Tầng ngoài: một view tổng hợp theo tháng, cấp quyền trên view", en: "External: a monthly summary view, with privileges on the view" }
      - { vi: "Tầng khái niệm: xóa các cột chi tiết khỏi bảng", en: "Conceptual: drop the detail columns from the table" }
    answer: 1
    trap: 2
    why:
      vi: "Xóa cột chi tiết nghe gọn, nhưng tầng khái niệm là dữ liệu chung: xóa đi thì nhóm kế toán, nhóm kho cũng mất. Index chỉ giúp đọc nhanh hơn, không giới hạn ai thấy gì. Cách đúng là tầng ngoài: một view cộng doanh thu theo tháng, rồi chỉ cấp quyền đọc view đó cho nhóm phân tích, không cấp quyền trên bảng gốc."
      en: "Dropping the detail columns sounds tidy, but the conceptual level is shared data: drop them and accounting and the warehouse lose them too. An index only makes reads faster; it does not limit who sees what. The right place is the external level: a view that sums revenue by month, with read access granted to the analysts on that view only, not on the base table."
  - q:
      vi: "Bạn tách bảng `customers` thành hai bảng và tạo lại view `customers` cũ bằng một JOIN. Ứng dụng cũ chạy tiếp. Đó là gì?"
      en: "You split table `customers` into two tables and recreate the old `customers` as a view with a JOIN. The old application keeps working. What is that?"
    options:
      - { vi: "Độc lập dữ liệu vật lý", en: "Physical data independence" }
      - { vi: "Độc lập dữ liệu logic", en: "Logical data independence" }
      - { vi: "Toàn vẹn tham chiếu", en: "Referential integrity" }
    answer: 1
    trap: 0
    why:
      vi: "Dễ nhầm vì bảng \"vật lý\" bị tách, nhưng tách bảng là đổi tầng khái niệm. Giữ được tầng ngoài khi tầng khái niệm đổi là độc lập logic; độc lập vật lý nói về file, trang, index."
      en: "It is easy to confuse because a \"physical\" table was split, but splitting tables changes the conceptual level. Keeping the external level while the conceptual one changes is logical independence; physical independence is about files, pages and indexes."
  - q:
      vi: "`INSERT INTO orders VALUES (102, 7, 10)` khi không có khách số 7. Mã lỗi nào?"
      en: "`INSERT INTO orders VALUES (102, 7, 10)` when there is no customer 7. Which error code?"
    options:
      - { vi: "`23505`", en: "`23505`" }
      - { vi: "`23503`", en: "`23503`" }
      - { vi: "`23514`", en: "`23514`" }
    answer: 1
    trap: 0
    why:
      vi: "Đơn 102 không trùng mã đơn nào, nên không phải `23505` (trùng khóa); tổng 10 ≥ 0 nên `CHECK` cũng qua, không phải `23514`. Lỗi nằm ở `customer_id` = 7: khóa ngoại (foreign key) đòi khách 7 phải có trong `customers`, mà bảng chỉ có khách 1 và 2, nên Postgres trả `23503` (foreign_key_violation)."
      en: "Order 102 duplicates no order id, so it is not `23505` (duplicate key); the total 10 ≥ 0 passes the `CHECK`, so not `23514` either. The problem is `customer_id` = 7: the foreign key requires customer 7 to exist in `customers`, which holds only customers 1 and 2, so Postgres returns `23503` (foreign_key_violation)."
  - q:
      vi: "Khóa chính khác một `UNIQUE` ở điểm nào?"
      en: "How does a primary key differ from a `UNIQUE`?"
    options:
      - { vi: "Không khác: cả hai chỉ chặn trùng", en: "No difference: both only block duplicates" }
      - { vi: "Khóa chính còn cấm NULL, và mỗi bảng chỉ có một khóa chính", en: "A primary key also forbids NULL, and a table has only one primary key" }
      - { vi: "Khóa chính làm bảng được sắp theo khóa trên đĩa", en: "A primary key keeps the table sorted by key on disk" }
    answer: 1
    trap: 2
    why:
      vi: "Nhiều người nghĩ khóa chính sắp bảng trên đĩa; điều đó đúng với InnoDB của MySQL, không đúng với Postgres: bảng Postgres là heap (dòng nằm theo thứ tự được ghi, không theo khóa), còn khóa chính chỉ là một index B-tree riêng bên cạnh. \"Không khác\" cũng sai: `UNIQUE` vẫn nhận nhiều NULL, còn khóa chính cấm NULL (toàn vẹn thực thể) và mỗi bảng chỉ có một."
      en: "Many people think a primary key sorts the table on disk; that holds for MySQL InnoDB, not for Postgres: a Postgres table is a heap (rows sit in the order they were written, not by key), and the primary key is just a separate B-tree index beside it. \"No difference\" is wrong too: `UNIQUE` still accepts several NULLs, while a primary key forbids NULL (entity integrity) and a table has only one."
---
## Mở bài

Bốn câu hỏi ngắn và một lab đọc catalog để chốt lại cấp 1. Sai một câu thì đọc lời giải thích rồi quay lại bài liên quan.

## Ý chính

Cấp 1 có ba ý. DBMS làm thay ứng dụng các việc chung: ngôn ngữ truy vấn, toàn vẹn, đồng thời, phục hồi, phân quyền. Kiến trúc ba tầng (ngoài, khái niệm, trong) cho độc lập logic và vật lý. Mô hình quan hệ lưu mọi thứ thành bảng giá trị, giữ đúng bằng bốn loại toàn vẹn: miền, khóa, thực thể, tham chiếu.

Catalog là nơi kiểm chứng tất cả: muốn biết một bảng có luật gì, đừng đoán, hãy đọc `pg_constraint` và `information_schema`.

## Ví dụ

Bảng tra nhanh: luật nào, viết thế nào, vi phạm ra mã gì.

```text
Loại toàn vẹn / Integrity   Khai báo / Declared as         SQLSTATE
domain                      type, NOT NULL, CHECK          23502, 23514
key                         UNIQUE                         23505
entity                      PRIMARY KEY                    23505, 23502
referential                 FOREIGN KEY ... REFERENCES     23503
```

## Tóm tắt

- Tầng ngoài = view theo nhóm người dùng; tầng khái niệm = bảng và luật; tầng trong = file, trang, index.
- Đổi tầng khái niệm mà view cũ chạy được: độc lập logic; thêm index không sửa câu: độc lập vật lý.
- Khóa chính = `UNIQUE` + `NOT NULL`; bảng Postgres là heap, khóa chính không sắp bảng.
- Đọc `pg_constraint` và `information_schema.columns` để biết luật thật của một bảng.

# EN

## Opening

Four short questions and a catalog lab to wrap up level 1. If you miss one, read the explanation and go back to the lesson it comes from.

## Key idea

Level 1 has three ideas. A DBMS does the shared jobs for applications: a query language, integrity, concurrency, recovery and access control. The three-level architecture (external, conceptual, internal) gives logical and physical independence. The relational model stores everything as tables of values and keeps them correct with four kinds of integrity: domain, key, entity and referential.

The catalog is where you check all of it: to know a table's rules, do not guess, read `pg_constraint` and `information_schema`.

## Example

A quick table: which rule, how it is written, which code a violation returns.

```text
Loại toàn vẹn / Integrity   Khai báo / Declared as         SQLSTATE
domain                      type, NOT NULL, CHECK          23502, 23514
key                         UNIQUE                         23505
entity                      PRIMARY KEY                    23505, 23502
referential                 FOREIGN KEY ... REFERENCES     23503
```

## Recap

- External level = views per group of users; conceptual = tables and rules; internal = files, pages, indexes.
- Change the conceptual level and old views still run: logical independence; add an index without editing queries: physical independence.
- Primary key = `UNIQUE` + `NOT NULL`; a Postgres table is a heap and the primary key does not sort it.
- Read `pg_constraint` and `information_schema.columns` to learn a table's real rules.
