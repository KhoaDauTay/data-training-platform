---
id: e-ds-l1-01
engine: design
level: L1
module: dbms
title: DBMS làm gì, ba tầng schema và độc lập dữ liệu
title_en: What a DBMS does, the three schema levels and data independence
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ds-three-levels, at: idea }]
objectives:
  - vi: Kể được năm việc một hệ quản trị CSDL làm thay cho ứng dụng.
    en: Name five jobs a database management system does so that applications do not have to.
  - vi: Chỉ ra tầng ngoài, tầng khái niệm và tầng trong trên một database PostgreSQL thật.
    en: Point at the external, conceptual and internal levels on a real PostgreSQL database.
  - vi: Phân biệt độc lập dữ liệu logic và vật lý bằng một view và một index.
    en: Tell logical from physical data independence with a view and an index.
requires: []
sources:
  - https://www.postgresql.org/docs/18/tutorial-arch.html
  - https://www.postgresql.org/docs/18/sql-createview.html
  - https://www.postgresql.org/docs/18/storage-file-layout.html
  - https://doi.org/10.1145/362384.362685
lab:
  setup: |
    CREATE TABLE products (
      id int PRIMARY KEY,
      name text NOT NULL,
      price numeric(10,2) NOT NULL
    );
    INSERT INTO products VALUES (1, 'pen', 5.00), (2, 'notebook', 35.00), (3, 'backpack', 420.00), (4, 'ruler', 12.00);
  steps:
    - task:
        vi: "Nhóm bán hàng chỉ cần thấy hàng rẻ. Tạo view `cheap_products` gồm `name` và `price` của các sản phẩm giá dưới 100: đây là một schema ngoài."
        en: "The sales team only needs cheap items. Create a view `cheap_products` with `name` and `price` of the products under 100: this is an external schema."
      solution: CREATE VIEW cheap_products AS SELECT name, price FROM products WHERE price < 100
      check: catalog
      hint:
        vi: "`CREATE VIEW name AS SELECT …`; điều kiện giá đặt trong `WHERE`."
        en: "`CREATE VIEW name AS SELECT …`; the price condition goes in `WHERE`."
    - task:
        vi: "Đổi schema khái niệm: thêm vào `products` cột `stock` kiểu `int`, không null, mặc định 0."
        en: "Change the conceptual schema: add to `products` a column `stock` of type `int`, not null, default 0."
      solution: ALTER TABLE products ADD COLUMN stock int NOT NULL DEFAULT 0
      check: catalog
      hint:
        vi: "`ALTER TABLE … ADD COLUMN stock int NOT NULL DEFAULT 0`: tên cột, kiểu, rồi các tùy chọn."
        en: "`ALTER TABLE … ADD COLUMN stock int NOT NULL DEFAULT 0`: column name, type, then the options."
    - task:
        vi: "Kiểm tra độc lập logic: đọc lại mọi dòng của `cheap_products`, xếp theo giá tăng dần. View không cần sửa gì."
        en: "Check logical independence: read every row of `cheap_products` again, ordered by price ascending. The view needs no change."
      solution: SELECT name, price FROM cheap_products ORDER BY price
      check: rows
      ordered: true
      hint:
        vi: Đọc view như đọc một bảng, rồi `ORDER BY price`.
        en: Read the view like a table, then `ORDER BY price`.
quiz:
  - q:
      vi: "Bạn thêm một index lên `products (price)`. Câu `SELECT * FROM products WHERE price < 100` cần sửa gì?"
      en: "You add an index on `products (price)`. What must change in `SELECT * FROM products WHERE price < 100`?"
    options:
      - { vi: "Phải thêm tên index vào câu, nếu không Postgres không dùng nó", en: "The index name must be added to the query, or Postgres will not use it" }
      - { vi: "Không gì cả: index thuộc tầng trong, planner tự quyết có dùng hay không", en: "Nothing: the index belongs to the internal level and the planner decides whether to use it" }
      - { vi: "Phải tạo lại view dùng bảng đó", en: "Every view over that table must be created again" }
    answer: 1
    trap: 0
    why:
      vi: "Thêm tên index nghe hợp lý vì vài hệ khác cho gợi ý index trong câu, nhưng SQL chỉ mô tả kết quả cần lấy, không mô tả đường đi. Index nằm ở tầng trong (cách dữ liệu nằm trên đĩa); planner (bộ lập kế hoạch) tự xem index có giúp được câu này không. View cũng không cần tạo lại, vì view đọc bảng theo tên cột, không theo index. Đổi tầng trong mà chữ của câu giữ nguyên: đó là độc lập dữ liệu vật lý (physical data independence)."
      en: "Adding the index name sounds right because some other systems accept index hints in the query, but SQL only describes the result, not the path. The index lives at the internal level (how data sits on disk); the planner decides by itself whether it helps this query. Views need no rebuild either, since a view reads the table by column names, not through an index. The internal level changes while the query text stays the same: that is physical data independence."
  - q:
      vi: "Việc nào dưới đây KHÔNG phải việc của hệ quản trị CSDL mà thuộc về ứng dụng?"
      en: "Which job below is NOT the database management system's but the application's?"
    options:
      - { vi: "Giữ dữ liệu đúng sau khi máy mất điện giữa chừng", en: "Keeping data correct after a power cut in the middle of a write" }
      - { vi: "Cho hai người cùng ghi mà không giẫm lên nhau", en: "Letting two people write at once without stepping on each other" }
      - { vi: "Quyết định giao diện hiển thị đơn hàng ra sao", en: "Deciding how the order screen looks" }
    answer: 2
    trap: 1
    why:
      vi: "Hai lựa chọn đầu là việc của hệ quản trị CSDL (DBMS). Giữ dữ liệu đúng sau khi mất điện là phục hồi sau sự cố: Postgres ghi nhật ký WAL (write-ahead log) trước khi sửa dữ liệu, nên khởi động lại thì làm lại được phần đã commit. Cho hai người cùng ghi là điều khiển đồng thời: nhiều người tưởng phải tự viết code chặn trong ứng dụng, nhưng database đã làm bằng transaction và row lock (giữ riêng một dòng cho người đang ghi). Giao diện màn hình đơn hàng thì database không biết gì, nên đó là việc của ứng dụng."
      en: "The first two choices are DBMS (database management system) jobs. Keeping data correct after a power cut is crash recovery: Postgres writes the WAL (write-ahead log) before changing data, so after a restart it can redo what was committed. Letting two people write at once is concurrency control: many people think they must write blocking code in the application, but the database already does it with transactions and row locks. The database knows nothing about the order screen, so that is the application's job."
---
## Mở bài

Hồi chưa có hệ quản trị cơ sở dữ liệu, mỗi chương trình tự đọc ghi file của mình: chương trình kế toán một định dạng, chương trình kho một định dạng khác. Muốn thêm một cột là phải sửa mọi chương trình đọc file đó. Bài này cho thấy DBMS gỡ mối buộc ấy ra sao.

## Ý chính

Một hệ quản trị cơ sở dữ liệu (DBMS) là phần mềm đứng giữa dữ liệu và mọi chương trình dùng nó. Nó làm năm việc mà nếu không có nó, ứng dụng nào cũng phải tự viết lại: cho một ngôn ngữ truy vấn (SQL), giữ các luật toàn vẹn (khóa, ràng buộc), cho nhiều người dùng cùng lúc mà không giẫm lên nhau, phục hồi đúng sau sự cố, và kiểm soát ai được đọc ghi gì.

Mỗi tầng là một mức trừu tượng, và mỗi tầng có **schema** (bản mô tả, ít khi đổi) tách khỏi **thể hiện** (dữ liệu lúc này, đổi liên tục). Kiến trúc ba tầng (ANSI/SPARC) tách một database thành ba cách nhìn. **Tầng ngoài** là những gì từng nhóm người dùng thấy, thường là view. **Tầng khái niệm** là toàn bộ bảng, cột, kiểu và ràng buộc của tổ chức. **Tầng trong** là cách dữ liệu nằm trên đĩa: file, trang 8 kB, index.

Lợi ích của việc tách tầng là **độc lập dữ liệu**. Độc lập logic: đổi tầng khái niệm (thêm cột, tách bảng) mà view và chương trình cũ vẫn chạy. Độc lập vật lý: đổi tầng trong (thêm index, chuyển file) mà không câu SQL nào phải sửa. Nhiều người nghĩ thêm index là phải sửa câu truy vấn để "dùng" nó. Thật ra planner tự chọn, câu giữ nguyên.

Có thể xếp loại DBMS theo **mô hình dữ liệu**: phân cấp (IBM IMS, dạng cây), mạng (CODASYL, con trỏ giữa bản ghi), quan hệ (Codd 1970, bảng giá trị), đối tượng-quan hệ (PostgreSQL), rồi các họ NoSQL: tài liệu (MongoDB), khóa-giá trị (DynamoDB), đồ thị. Cũng xếp được theo số người dùng (một hay nhiều) và theo nơi đặt (tập trung, khách/chủ, phân tán).

PostgreSQL là hệ khách/chủ: mỗi kết nối có một tiến trình server riêng, chung một vùng nhớ đệm, có tiến trình nền ghi WAL và dọn rác. PGlite trong trình duyệt là cùng mã server đó dịch sang WebAssembly, chạy một phiên.

Hình cuối mục này xếp ba tầng của chính lab: view ở tầng ngoài, bảng `products` ở tầng khái niệm, file và index ở tầng trong.

## Ví dụ

Tầng trong: bảng `products` là một file trên đĩa, chia thành trang 8 kB.

```sql
SELECT pg_relation_filepath('products') AS file, current_setting('block_size') AS page_bytes;
```

Tầng khái niệm: chính database mô tả mình trong catalog, đọc được bằng SQL như mọi bảng khác.

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

Tầng ngoài: một view chỉ cho thấy tên và giá.

```sql
CREATE VIEW price_list AS SELECT name, price FROM products;
SELECT * FROM price_list ORDER BY price;
```

Độc lập vật lý: thêm index rồi chạy đúng câu cũ, kết quả không đổi.

```sql
CREATE INDEX products_price_idx ON products (price);
SELECT * FROM price_list ORDER BY price;
```

Câu thứ hai giống hệt câu trước, chữ không đổi một ký tự. Index thuộc tầng trong; planner có dùng nó hay không là chuyện của planner.

## Lỗi hay gặp

View viết bằng `SELECT *` không tự lớn theo bảng: danh sách cột bị chốt lúc tạo view.

```sql
-- WRONG: the view keeps the column list it had when it was created
CREATE VIEW all_products AS SELECT * FROM products;
ALTER TABLE products ADD COLUMN stock int NOT NULL DEFAULT 0;
SELECT * FROM all_products ORDER BY id LIMIT 1;
```

```sql
-- FIX: replace the view so it lists the new column too
CREATE OR REPLACE VIEW all_products AS SELECT * FROM products;
SELECT * FROM all_products ORDER BY id LIMIT 1;
```

Câu sai ra ba cột, câu sửa ra bốn. Độc lập logic bảo vệ view khỏi thay đổi, nhưng cũng có nghĩa view không tự thấy cột mới.

Độc lập không phải vô điều kiện: không xóa được cột mà một view đang dùng.

```sql
-- ERROR 2BP01: cannot drop column price of table products because other objects depend on it
ALTER TABLE products DROP COLUMN price;
```

Postgres ghi lại view nào phụ thuộc cột nào và chặn thay đổi làm hỏng tầng ngoài. Muốn xóa, hãy sửa hoặc bỏ view trước (hoặc `CASCADE`, khi bạn chắc chắn).

## Thực hành

Lab tạo một schema ngoài, đổi schema khái niệm, rồi kiểm rằng view vẫn trả đúng dòng.

## Tóm tắt

- DBMS cho ngôn ngữ truy vấn, toàn vẹn, đồng thời, phục hồi và phân quyền.
- Ba tầng: ngoài (view), khái niệm (bảng, ràng buộc), trong (file, trang, index).
- Độc lập logic: đổi bảng mà view cũ vẫn chạy; độc lập vật lý: thêm index mà câu không đổi.
- Catalog (`information_schema`, `pg_catalog`) là database tự mô tả mình, đọc bằng SQL.

# EN

## Opening

Before database management systems, every program read and wrote its own files: accounting used one format, the warehouse another. Adding one column meant changing every program that read the file. This lesson shows how a DBMS cuts that knot.

## Key idea

A database management system (DBMS) is the software between the data and every program that uses it. It does five jobs that every application would otherwise rewrite: it offers a query language (SQL), keeps integrity rules (keys, constraints), lets many users work at once without stepping on each other, recovers correctly after a crash, and controls who may read or write what.

Each level is a level of abstraction, and each has a **schema** (the description, rarely changed) kept apart from the **instance** (the data right now, always changing). The three-level architecture (ANSI/SPARC) splits a database into three views. The **external level** is what each group of users sees, usually views. The **conceptual level** is every table, column, type and constraint of the organisation. The **internal level** is how data sits on disk: files, 8 kB pages, indexes.

Splitting the levels gives **data independence**. Logical independence: change the conceptual level (add a column, split a table) and old views and programs still work. Physical independence: change the internal level (add an index, move files) and no SQL query has to change. Many people think adding an index means editing queries to "use" it. In fact the planner chooses, and the query stays the same.

A DBMS can be classified by its **data model**: hierarchical (IBM IMS, trees), network (CODASYL, pointers between records), relational (Codd 1970, tables of values), object-relational (PostgreSQL), then the NoSQL families: document (MongoDB), key-value (DynamoDB), graph. It can also be classified by number of users (one or many) and by where it runs (centralised, client/server, distributed).

PostgreSQL is a client/server system: each connection has its own server process, they share a buffer cache, and background processes write the WAL and clean up. PGlite in the browser is the same server code compiled to WebAssembly, running one session.

The figure at the end of this section stacks the lab's own three levels: views at the external level, the table `products` at the conceptual level, the file and the index at the internal level.

## Example

Internal level: table `products` is a file on disk, cut into 8 kB pages.

```sql
SELECT pg_relation_filepath('products') AS file, current_setting('block_size') AS page_bytes;
```

Conceptual level: the database describes itself in its catalog, readable with SQL like any other table.

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products'
ORDER BY ordinal_position;
```

External level: a view that shows only names and prices.

```sql
CREATE VIEW price_list AS SELECT name, price FROM products;
SELECT * FROM price_list ORDER BY price;
```

Physical independence: add an index and run the very same query; the result does not change.

```sql
CREATE INDEX products_price_idx ON products (price);
SELECT * FROM price_list ORDER BY price;
```

The second query is the first one, not one character changed. The index belongs to the internal level; whether to use it is the planner's business.

## Common mistakes

A view written with `SELECT *` does not grow with the table: its column list is fixed when the view is created.

```sql
-- WRONG: the view keeps the column list it had when it was created
CREATE VIEW all_products AS SELECT * FROM products;
ALTER TABLE products ADD COLUMN stock int NOT NULL DEFAULT 0;
SELECT * FROM all_products ORDER BY id LIMIT 1;
```

```sql
-- FIX: replace the view so it lists the new column too
CREATE OR REPLACE VIEW all_products AS SELECT * FROM products;
SELECT * FROM all_products ORDER BY id LIMIT 1;
```

The wrong query returns three columns, the fixed one four. Logical independence protects a view from change, which also means the view does not see new columns by itself.

Independence has limits: you cannot drop a column a view still uses.

```sql
-- ERROR 2BP01: cannot drop column price of table products because other objects depend on it
ALTER TABLE products DROP COLUMN price;
```

Postgres records which view depends on which column and blocks a change that would break the external level. To drop it, change or drop the view first (or use `CASCADE`, when you are sure).

## Practice

The lab creates an external schema, changes the conceptual schema, then checks that the view still returns the right rows.

## Recap

- A DBMS gives a query language, integrity, concurrency, recovery and access control.
- Three levels: external (views), conceptual (tables, constraints), internal (files, pages, indexes).
- Logical independence: change tables and old views still run; physical independence: add an index and queries stay the same.
- The catalog (`information_schema`, `pg_catalog`) is the database describing itself, read with SQL.
