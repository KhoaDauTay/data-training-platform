---
id: insert_select
title: "Thêm dòng: INSERT, INSERT … SELECT và CREATE TABLE AS"
title_en: "Adding rows: INSERT, INSERT … SELECT and CREATE TABLE AS"
minutes: 25
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: sql-insert-select, at: idea }]
objectives:
  - vi: Thêm một hay nhiều dòng bằng `INSERT … VALUES`, luôn kèm danh sách cột.
    en: Add one or many rows with `INSERT … VALUES`, always with a column list.
  - vi: Chép dòng từ một câu đọc bằng `INSERT … SELECT`, và tạo bảng mới từ kết quả bằng `CREATE TABLE … AS`.
    en: Copy rows from a query with `INSERT … SELECT`, and make a new table from a result with `CREATE TABLE … AS`.
  - vi: Xem lại dòng vừa ghi bằng `RETURNING`, và biết vì sao id tự sinh có thể nhảy cóc.
    en: See the rows you just wrote with `RETURNING`, and know why generated ids can skip numbers.
syntax: |-
  INSERT INTO table_name (column1, column2, ...)
  { VALUES (value1, value2, ...) [, (...)] | SELECT ... }
  [ ON CONFLICT ... ]
  [ RETURNING column, ... ]

  CREATE TABLE new_table AS SELECT ...
options:
  - { code: "(column1, column2, …)", vi: "danh sách cột nhận giá trị; cột không nêu lấy giá trị mặc định (cột tự sinh như `id`)", en: "the columns that get values; unlisted columns take their default (a generated column such as `id`)" }
  - { code: "VALUES (…), (…)", vi: "một hay nhiều dòng gõ tay, mỗi dòng đúng thứ tự danh sách cột", en: "one or more typed rows, each in the order of the column list" }
  - { code: "SELECT …", vi: "dòng mới lấy từ kết quả một câu đọc (thay cho VALUES)", en: "the new rows come from a query's result (instead of VALUES)" }
  - { code: "DEFAULT", vi: "đặt ở chỗ một giá trị: dùng giá trị mặc định của cột đó", en: "in place of a value: use that column's default" }
  - { code: "RETURNING …", vi: "trả lại các cột của dòng vừa ghi, như một câu SELECT", en: "returns columns of the rows just written, like a SELECT" }
  - { code: "CREATE TABLE … AS SELECT", vi: "tạo bảng mới có cột và dữ liệu của kết quả (không chép khóa, ràng buộc, chỉ mục)", en: "creates a new table with the result's columns and data (keys, constraints and indexes are not copied)" }
examples:
  - title: { vi: "Một dòng, có danh sách cột", en: "One row, with a column list" }
    sql: |-
      INSERT INTO products (name, category, price_vnd)
      VALUES ('Pandan cake', 'Snacks', 24000)
      RETURNING name, category, price_vnd
    read:
      vi: "Một dòng mới trong nhóm ăn vặt. Cột `id` không có trong danh sách nên Postgres tự sinh. `RETURNING` cho bạn thấy dòng vừa thêm mà không cần câu đọc thứ hai."
      en: "One new row in the snacks category. The `id` column is not in the list, so Postgres generates it. `RETURNING` shows you the new row without a second query."
  - title: { vi: "Id tự sinh không quay lại", en: "A generated id never goes back" }
    sql: |-
      INSERT INTO stores (name, city, opened_on)
      VALUES ('My Khe', 'Da Nang', '2026-12-01')
      RETURNING id, name, city
    read:
      vi: "Trên dữ liệu vừa nạp, cửa hàng mới nhận `id` 6. Bấm Chạy lần nữa: số tăng lên 7, dù lần trước đã được hoàn tác. Bộ đếm sinh id không bao giờ lùi khi transaction hoàn tác, nên id có thể nhảy cóc; đừng dựa vào việc chúng liền nhau."
      en: "On freshly loaded data the new store gets `id` 6. Press Run again: the number goes up to 7, even though the previous run was rolled back. The counter behind generated ids never moves back on a rollback, so ids can skip; never rely on them being consecutive."
  - title: { vi: "Chép dòng từ một câu đọc", en: "Copying rows from a query" }
    sql: |-
      INSERT INTO store_targets (store_id, month, target_vnd)
      SELECT t.store_id, DATE '2027-01-01', t.target_vnd
      FROM store_targets t
      JOIN stores s ON s.id = t.store_id
      WHERE s.city = 'Da Nang' AND t.month = '2026-12-01'
      RETURNING store_id, month, target_vnd
    read:
      vi: "2 dòng: hai cửa hàng Đà Nẵng giữ chỉ tiêu tháng 12 cho tháng 01/2027. `INSERT … SELECT` không có `VALUES`; mỗi dòng kết quả của câu đọc thành một dòng mới, cột theo đúng thứ tự."
      en: "2 rows: the two Da Nang stores carry their December target into January 2027. `INSERT … SELECT` has no `VALUES`; each row of the query's result becomes a new row, columns in order."
  - title: { vi: "Giá trị cố định trộn với cột của câu đọc", en: "Fixed values mixed with the query's columns" }
    sql: |-
      INSERT INTO store_targets (store_id, month, target_vnd)
      SELECT id, DATE '2027-01-01', 5000000
      FROM stores
      WHERE opened_on >= '2024-01-01'
      RETURNING store_id, month, target_vnd
    read:
      vi: "3 cửa hàng mở từ 2024 (Son Tra, Thao Dien, Hoan Kiem) nhận chỉ tiêu khởi điểm 5 triệu cho tháng 01/2027. Phần `SELECT` có thể trả hằng số: mỗi dòng nhận cùng tháng và cùng số tiền."
      en: "3 stores opened since 2024 (Son Tra, Thao Dien, Hoan Kiem) get a starting target of 5 million for January 2027. The `SELECT` part may return constants: every row gets the same month and amount."
pitfalls:
  - title: { vi: "Bỏ danh sách cột", en: "Leaving out the column list" }
    wrong: "INSERT INTO products VALUES ('Pandan cake', 'Snacks', 24000) RETURNING name"
    fix: "INSERT INTO products (name, category, price_vnd) VALUES ('Pandan cake', 'Snacks', 24000) RETURNING name"
    why:
      vi: "Không có danh sách cột, giá trị đầu đi vào cột đầu của bảng là `id`, nên Postgres báo 22P02 (chữ không thành số). Tệ hơn, nếu kiểu tình cờ khớp thì dữ liệu vào sai cột mà không lỗi. Luôn viết danh sách cột."
      en: "With no column list the first value goes into the table's first column, `id`, so Postgres raises 22P02 (text is not a number). Worse, when the types happen to fit, the data lands in the wrong column with no error. Always write the column list."
  - title: { vi: "Đổi thứ tự cột mà không đổi giá trị", en: "Reordering the columns but not the values" }
    wrong: "INSERT INTO staff (name, role, manager_id, store_id, hired_on) VALUES ('Kim Ha', 'Cashier', 2, 5, '2026-11-02') RETURNING name, store_id, manager_id"
    fix: "INSERT INTO staff (name, role, store_id, manager_id, hired_on) VALUES ('Kim Ha', 'Cashier', 2, 5, '2026-11-02') RETURNING name, store_id, manager_id"
    why:
      vi: "Giá trị ghép với cột theo vị trí. Câu sai đặt `manager_id` trước `store_id`, nên Kim Ha thành nhân viên cửa hàng 5 báo cáo cho người số 2. Hai cột đều là số và cả hai mã đều có thật, nên không ràng buộc nào báo lỗi."
      en: "Values pair with columns by position. The wrong query puts `manager_id` before `store_id`, so Kim Ha becomes a store 5 employee reporting to person 2. Both columns are numbers and both ids exist, so no constraint complains."
  - title: { vi: "Tự gõ cột tự sinh", en: "Typing the generated column yourself" }
    wrong: "INSERT INTO products (id, name, category, price_vnd) VALUES (5, 'Pandan cake', 'Snacks', 24000) RETURNING name"
    fix: "INSERT INTO products (name, category, price_vnd) VALUES ('Pandan cake', 'Snacks', 24000) RETURNING name, category"
    why:
      vi: "Số 5 đã thuộc về một món khác, nên khóa chính báo 23505. Kể cả khi chọn một số còn trống, bộ đếm sinh id không biết điều đó và về sau sẽ đụng đúng số ấy. Để Postgres tự sinh `id`."
      en: "Number 5 already belongs to another item, so the primary key raises 23505. Even if you pick a free number, the id counter does not know about it and will later hit that very number. Let Postgres generate `id`."
quiz:
  - q:
      vi: "Bạn chạy một câu thêm dòng, nhận `id` 6, rồi transaction bị hoàn tác. Lần thêm kế tiếp nhận id nào?"
      en: "You run an insert, get `id` 6, then the transaction is rolled back. Which id does the next insert get?"
    options:
      - { vi: "6, vì lần trước đã bị hoàn tác như chưa từng xảy ra", en: "6, because the earlier one was rolled back as if it never happened" }
      - { vi: "7: bộ đếm sinh id không lùi khi hoàn tác, nên số 6 bị bỏ qua", en: "7: the id counter does not move back on a rollback, so 6 is skipped" }
      - { vi: "Báo lỗi trùng khóa", en: "A duplicate key error" }
    answer: 1
    trap: 0
    why:
      vi: "Hoàn tác xóa dòng, nhưng không trả lại số đã cấp: bộ đếm (sequence) nằm ngoài transaction để nhiều người thêm dòng cùng lúc không phải chờ nhau. Id vì thế có lỗ hổng, và đó là bình thường."
      en: "A rollback removes the row but does not give the number back: the counter (a sequence) lives outside the transaction so that many people can insert at once without waiting for each other. Ids therefore have gaps, and that is normal."
  - q:
      vi: "`CREATE TABLE price_copy AS SELECT * FROM products` chép những gì sang bảng mới?"
      en: "What does `CREATE TABLE price_copy AS SELECT * FROM products` copy into the new table?"
    options:
      - { vi: "Một bản sao y hệt: dữ liệu, khóa chính, ràng buộc và chỉ mục", en: "An exact copy: data, primary key, constraints and indexes" }
      - { vi: "Tên cột, kiểu và dữ liệu; không có khóa chính, ràng buộc hay chỉ mục", en: "Column names, types and data; no primary key, constraints or indexes" }
      - { vi: "Chỉ cấu trúc cột, không có dòng nào", en: "Only the column structure, with no rows" }
    answer: 1
    trap: 0
    why:
      vi: "\"Sao chép bảng\" nghe như chép hết, nhưng `CREATE TABLE … AS` chỉ lưu kết quả của câu đọc. Muốn có khóa và chỉ mục, thêm chúng sau, hoặc dùng `CREATE TABLE … (LIKE products INCLUDING ALL)` rồi `INSERT … SELECT`."
      en: "\"Copying a table\" sounds like copying everything, but `CREATE TABLE … AS` only stores the query's result. To get keys and indexes, add them afterwards, or use `CREATE TABLE … (LIKE products INCLUDING ALL)` and then `INSERT … SELECT`."
  - q:
      vi: "Một câu `INSERT … SELECT` mà phần `SELECT` trả 0 dòng thì sao?"
      en: "What happens to an `INSERT … SELECT` whose `SELECT` part returns 0 rows?"
    options:
      - { vi: "Báo lỗi vì không có gì để thêm", en: "An error, because there is nothing to add" }
      - { vi: "Chạy xong, thêm 0 dòng", en: "It completes and adds 0 rows" }
      - { vi: "Thêm một dòng toàn NULL", en: "It adds one row of NULLs" }
    answer: 1
    trap: 0
    why:
      vi: "Không có dòng nào trong kết quả thì không có dòng nào để thêm, và đó không phải lỗi. Khi câu chạy êm mà bảng không đổi, hãy chạy riêng phần `SELECT` để xem nó trả gì."
      en: "No rows in the result means no rows to add, and that is not an error. When the statement runs fine but the table does not change, run the `SELECT` part alone to see what it returns."
recap:
  - vi: "Luôn viết danh sách cột; giá trị ghép với cột theo vị trí, không theo tên."
    en: "Always write the column list; values pair with columns by position, not by name."
  - vi: "`INSERT … SELECT` chép kết quả của một câu đọc; `CREATE TABLE … AS` tạo hẳn bảng mới, không có khóa hay chỉ mục."
    en: "`INSERT … SELECT` copies a query's result; `CREATE TABLE … AS` makes a whole new table, without keys or indexes."
  - vi: "`RETURNING` cho thấy dòng vừa ghi; id tự sinh không lùi khi hoàn tác, nên có thể nhảy cóc."
    en: "`RETURNING` shows the rows just written; generated ids do not move back on a rollback, so they can skip."
sources:
  - https://www.postgresql.org/docs/current/sql-insert.html
  - https://www.postgresql.org/docs/current/dml-insert.html
  - https://www.postgresql.org/docs/current/sql-createtableas.html
  - https://www.postgresql.org/docs/current/functions-sequence.html
---
## Mở bài

Phòng mua hàng có món mới, kế toán cần chỉ tiêu tháng sau cho mọi cửa hàng, còn bạn muốn giữ lại bảng giá hôm nay trước khi nó đổi. Cả ba việc đều là thêm dòng, và SQL có một lệnh cho cả ba.

## Ý chính

`INSERT INTO` một bảng, kèm danh sách cột, thêm dòng mới. Giá trị đến từ `VALUES` (gõ tay, một hay nhiều dòng) hoặc từ một câu `SELECT` (chép từ dữ liệu đã có). Cột không nêu trong danh sách nhận giá trị mặc định; cột `id` kiểu identity tự sinh số. `RETURNING` trả lại dòng vừa ghi, rất tiện để kiểm tra ngay.

Nhiều người nghĩ **giá trị được ghép với cột theo tên**. Thật ra chúng ghép theo **vị trí** trong danh sách cột bạn viết: đổi chỗ hai cột cùng kiểu là dữ liệu vào nhầm cột mà không lỗi nào báo. Và khi muốn lưu cả một kết quả thành bảng mới, `CREATE TABLE … AS SELECT` làm việc đó trong một câu.

## Cú pháp

Ở BoonData mọi câu ghi chạy trong một transaction rồi được hoàn tác, nên bạn thử thoải mái: bảng không đổi thật.

Postgres cũng nhận `SELECT … INTO new_table FROM …` (cách viết của SQL Server) để tạo bảng từ kết quả, nhưng tài liệu Postgres khuyên dùng `CREATE TABLE … AS`, vì `INTO` còn có nghĩa khác bên trong hàm PL/pgSQL.

# EN

## Opening

Purchasing has a new item, accounting needs next month's target for every store, and you want to keep today's price list before it changes. All three jobs add rows, and SQL has one statement for all of them.

## Key idea

`INSERT INTO` a table, with a column list, adds new rows. The values come from `VALUES` (typed, one or many rows) or from a `SELECT` (copied from existing data). Columns missing from the list take their default; an identity `id` column generates its number. `RETURNING` gives back the rows just written, handy for checking at once.

Many people think **values are matched to columns by name**. In fact they are matched by **position** in the column list you write: swap two columns of the same type and the data lands in the wrong column with no error. And when you want to keep a whole result as a new table, `CREATE TABLE … AS SELECT` does it in one statement.

## Syntax

In BoonData every write runs inside a transaction that is then rolled back, so experiment freely: the table does not really change.

Postgres also accepts `SELECT … INTO new_table FROM …` (the SQL Server way of writing it) to make a table from a result, but the Postgres manual recommends `CREATE TABLE … AS`, because `INTO` means something else inside PL/pgSQL functions.
