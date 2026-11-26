---
id: e-pg-l3-02
engine: postgres
level: L3
module: pages
title: "Lab: mở một trang heap"
title_en: "Lab: open a heap page"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-heap-page
objectives:
  - vi: Đọc header trang (`lower`, `upper`) và tính chỗ trống
    en: Read the page header (`lower`, `upper`) and compute the free space
  - vi: Ghép mỗi line pointer với `ctid` của dòng
    en: Match each line pointer to the row's `ctid`
  - vi: Đoán một dòng mới còn vào được trang hay phải sang trang sau
    en: Tell whether a new row still fits on the page or goes to the next one
requires: [e-pg-l3-01]
sources:
  - https://www.postgresql.org/docs/18/storage-page-layout.html
  - https://www.postgresql.org/docs/18/pageinspect.html
  - https://www.postgresql.org/docs/18/ddl-system-columns.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE TABLE notes(id int, body text);
    INSERT INTO notes VALUES (1, 'an'), (2, 'binh'), (3, 'chi');
  steps:
    - task:
        vi: Đọc header của trang 0 bảng `notes`. Lấy các cột `lower`, `upper`, `special`, `pagesize`.
        en: Read the header of page 0 of `notes`. Return the columns `lower`, `upper`, `special`, `pagesize`.
      solution: SELECT lower, upper, special, pagesize FROM page_header(get_raw_page('notes', 0))
      check: rows
      hint:
        vi: "`page_header()` nhận đúng thứ mà `get_raw_page('notes', 0)` trả về."
        en: "`page_header()` takes exactly what `get_raw_page('notes', 0)` returns."
      fact:
        vi: "`lower` = 36 (24 byte header + 3 line pointer × 4 byte), `upper` = 8088, trang 8192 byte."
        en: "`lower` = 36 (24-byte header + 3 line pointers x 4 bytes), `upper` = 8088, page size 8192 bytes."
        probe: SELECT lower, upper, special, pagesize FROM page_header(get_raw_page('notes', 0))
        expect: [[36, 8088, 8192, 8192]]
    - task:
        vi: Liệt kê mọi line pointer của trang 0 với `lp`, `lp_off`, `lp_len`.
        en: List every line pointer of page 0 with `lp`, `lp_off`, `lp_len`.
      solution: SELECT lp, lp_off, lp_len FROM heap_page_items(get_raw_page('notes', 0))
      check: rows
      ordered: true
      hint:
        vi: Dùng `heap_page_items()` trên cùng trang thô.
        en: Use `heap_page_items()` on the same raw page.
      fact:
        vi: "Trang có 3 line pointer: lp 1 ở offset 8160, lp 2 ở 8120, lp 3 ở 8088. Tuple mọc từ cuối trang lùi về, và lp 3 chính là `upper`."
        en: "The page has 3 line pointers: lp 1 at offset 8160, lp 2 at 8120, lp 3 at 8088. Tuples grow back from the end of the page, and lp 3 is exactly `upper`."
        probe: SELECT lp, lp_off, lp_len FROM heap_page_items(get_raw_page('notes', 0))
        expect: [[1, 8160, 31], [2, 8120, 33], [3, 8088, 32]]
    - task:
        vi: Đọc cột hệ thống `ctid` cùng `id` của mọi dòng trong `notes`, theo `id`.
        en: Read the system column `ctid` with `id` for every row of `notes`, by `id`.
      solution: SELECT ctid, id FROM notes ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`ctid` không có trong `SELECT *`, phải gọi tên nó."
        en: "`ctid` is not part of `SELECT *`, name it explicitly."
      fact:
        vi: "Dòng 1 là (0,1), dòng 3 là (0,3): số thứ hai chính là số line pointer của bước trước."
        en: "Row 1 is (0,1), row 3 is (0,3): the second number is the line pointer number from the previous step."
        probe: SELECT ctid::text, id FROM notes ORDER BY id
        expect: [["(0,1)", 1], ["(0,2)", 2], ["(0,3)", 3]]
    - task:
        vi: Tính số byte trống của trang 0 (`upper` trừ `lower`).
        en: Compute the free bytes of page 0 (`upper` minus `lower`).
      solution: SELECT upper - lower AS free FROM page_header(get_raw_page('notes', 0))
      check: rows
      hint:
        vi: Phép trừ ngay trong `SELECT` trên `page_header()`.
        en: A subtraction right in the `SELECT` over `page_header()`.
      fact:
        vi: "Còn 8052 byte trống: ba dòng ngắn chỉ dùng chưa tới 2 % trang. Mỗi dòng mới tốn thêm 4 byte line pointer cộng tuple của nó."
        en: "8052 bytes are free: three short rows use under 2% of the page. Each new row costs another 4-byte line pointer plus its tuple."
        probe: SELECT upper - lower FROM page_header(get_raw_page('notes', 0))
        expect: [[8052]]
quiz:
  - q:
      vi: "Bạn muốn biết trang 0 còn bao nhiêu byte trống. Phép tính nào đúng?"
      en: "You want to know how many bytes are free on page 0. Which calculation is right?"
    options:
      - { vi: "`pagesize - upper`", en: "`pagesize - upper`" }
      - { vi: "`upper - lower`", en: "`upper - lower`" }
      - { vi: "`pagesize - lower`", en: "`pagesize - lower`" }
    answer: 1
    trap: 0
    why:
      vi: "`pagesize - upper` nghe hợp lý vì `upper` là chỗ dữ liệu bắt đầu, nhưng tuple nằm từ `upper` tới cuối trang, nên phép đó ra số byte tuple đang dùng: 8192 − 8088 = 104 với bảng `notes`. `pagesize - lower` thì tính gộp cả chỗ trống lẫn tuple. Chỗ trống là khoảng giữa cuối mảng line pointer (`lower`) và tuple đầu tiên (`upper`): 8088 − 36 = 8052."
      en: "`pagesize - upper` sounds right because `upper` is where the data starts, but the tuples sit from `upper` to the end of the page, so that gives the bytes the tuples use: 8192 - 8088 = 104 for table `notes`. `pagesize - lower` counts the free space and the tuples together. The free space is the gap between the end of the line pointer array (`lower`) and the first tuple (`upper`): 8088 - 36 = 8052."
  - q:
      vi: "Một trang còn `upper - lower` = 30 byte. Dòng mới có tuple dài 28 byte. Dòng đó vào trang này được không?"
      en: "A page has `upper - lower` = 30 bytes left. A new row has a 28-byte tuple. Does that row fit on this page?"
    options:
      - { vi: "Được: 28 nhỏ hơn 30", en: "Yes: 28 is less than 30" }
      - { vi: "Không: còn cần 4 byte cho line pointer mới, và tuple được căn lề lên 32", en: "No: it also needs 4 bytes for a new line pointer, and the tuple is aligned up to 32" }
      - { vi: "Được, Postgres cắt tuple ra hai trang", en: "Yes, Postgres splits the tuple across two pages" }
    answer: 1
    trap: 0
    why:
      vi: "\"28 nhỏ hơn 30\" chỉ so độ dài tuple với chỗ trống, nhưng mỗi dòng mới tốn thêm một line pointer 4 byte, và tuple được căn lề lên bội của 8 (28 thành 32). Dòng này cần 4 + 32 = 36 byte, hơn 30. Postgres không bao giờ cắt một tuple qua hai trang: không đủ chỗ thì dòng vào trang khác."
      en: "\"28 is less than 30\" only compares the tuple length with the free space, but every new row also costs a 4-byte line pointer, and the tuple is aligned up to a multiple of 8 (28 becomes 32). This row needs 4 + 32 = 36 bytes, more than 30. Postgres never splits a tuple across two pages: without room the row goes to another page."
---
## Mở bài

Đồng nghiệp nói bảng của bạn "phình", nhưng `SELECT count(*)` vẫn ra đúng số dòng. Cách chắc chắn nhất để biết là mở một trang ra và tự đếm byte.

## Ý chính

Một trang heap là 8192 byte. Header 24 byte ở đầu ghi hai mốc: `lower` là chỗ mảng line pointer kết thúc, `upper` là chỗ tuple đầu tiên bắt đầu. Khoảng giữa hai mốc, `upper - lower`, là chỗ trống của trang.

Mỗi line pointer 4 byte ghi tuple của nó nằm ở byte nào (`lp_off`) và dài bao nhiêu (`lp_len`). Số thứ tự của line pointer (`lp`) chính là số thứ hai trong `ctid` của dòng. Tuple có header riêng 24 byte (`t_hoff`), rồi mới tới dữ liệu các cột.

Nhiều người nghĩ một dòng chỉ tốn đúng số byte của dữ liệu. Thật ra mỗi dòng tốn thêm 4 byte line pointer và 24 byte header tuple, rồi cả tuple còn được căn lề. Bảng nhiều dòng rất ngắn vì vậy tốn chỗ hơn hẳn tổng dữ liệu. Khi trang không đủ chỗ cho cả line pointer lẫn tuple, dòng mới sang trang sau.

## Cú pháp

```sql
SELECT lower, upper, special, pagesize [, upper - lower AS free ]
FROM page_header(get_raw_page('table_name', block_number));
SELECT lp, lp_off, lp_len [, t_hoff, t_ctid ]
FROM heap_page_items(get_raw_page('table_name', block_number));
```

- `special`: chỗ bắt đầu vùng riêng của index; trang heap không có, nên bằng `pagesize`.
- `lp_off`: offset byte của tuple trong trang.
- `lp_len`: độ dài tuple, gồm cả header.
- `t_hoff`: độ dài header tuple.

## Ví dụ

Đọc riêng tuple đầu tiên của `notes`:

```sql
SELECT lp, lp_off, lp_len, t_hoff
FROM heap_page_items(get_raw_page('notes', 0))
WHERE lp = 1;
```

Tuple `(1, 'an')` dài 31 byte: 24 byte header, 4 byte `int` và 3 byte chuỗi ngắn (1 byte độ dài cộng 2 ký tự).

Một bảng khác với dòng dài hơn:

```sql
CREATE TABLE memo (id int PRIMARY KEY, body text);
INSERT INTO memo VALUES (1, repeat('x', 1000));
SELECT lower, upper, upper - lower AS free
FROM page_header(get_raw_page('memo', 0));
```

Một dòng 1000 ký tự đã đẩy `upper` xuống 7160; còn 7132 byte trống.

```sql
INSERT INTO memo
SELECT g, md5(g::text) || repeat('y', 1500) FROM generate_series(2, 9) g;
SELECT ctid, id FROM memo WHERE id >= 4 ORDER BY id;
```

Trang 0 chỉ chứa thêm bốn dòng 1564 byte: từ dòng 6, `ctid` là (1,1), (1,2) và tiếp theo, tức đã sang trang 1.

## Lỗi hay gặp

Tính chỗ trống bằng phần sau `upper`:

```sql
-- WRONG: pagesize - upper is the space the tuples use, not the free space
SELECT pagesize - upper AS free FROM page_header(get_raw_page('notes', 0));
```

```sql
-- FIX: the free space is the gap between lower and upper
SELECT upper - lower AS free FROM page_header(get_raw_page('notes', 0));
```

Câu sai ra 104, là số byte ba tuple đang dùng. Câu đúng ra 8052.

Đọc trang chưa có:

```sql
-- ERROR 22023: block number 1 is out of range for relation "notes"
SELECT lower, upper FROM page_header(get_raw_page('notes', 1));
```

Bảng `notes` chỉ có trang 0. Xem số trang bằng `pg_relation_size('notes') / 8192` trước.

## Thực hành

Bốn bước trên bảng `notes` 3 dòng do lab dựng sẵn: header, line pointer, `ctid`, rồi chỗ trống. Mỗi bước chấm kết quả của bạn với đáp án và ghi rõ sự thật được kiểm. Sau đó là hai câu hỏi.

## Tóm tắt

- `lower` là cuối mảng line pointer, `upper` là đầu vùng tuple; chỗ trống là `upper - lower`.
- `lp` của line pointer là số thứ hai trong `ctid`; `lp_off` và `lp_len` chỉ chỗ và độ dài tuple.
- Mỗi dòng tốn thêm 4 byte line pointer và 24 byte header tuple ngoài dữ liệu.
- Trang không đủ chỗ cho line pointer cộng tuple thì dòng mới sang trang sau.

# EN

## Opening

A colleague says your table is "bloated", yet `SELECT count(*)` still returns the right number of rows. The surest way to know is to open a page and count the bytes yourself.

## Key idea

A heap page is 8192 bytes. The 24-byte header at the top records two marks: `lower` is where the line pointer array ends, `upper` is where the first tuple starts. The gap between them, `upper - lower`, is the page's free space.

Each 4-byte line pointer records at which byte its tuple lives (`lp_off`) and how long it is (`lp_len`). The line pointer's number (`lp`) is exactly the second number in the row's `ctid`. A tuple has its own 24-byte header (`t_hoff`) before the column data.

Many people think a row costs exactly the bytes of its data. In fact every row costs another 4-byte line pointer and a 24-byte tuple header, and then the whole tuple is aligned. A table of many very short rows therefore takes far more space than its data adds up to. When a page has no room for both the line pointer and the tuple, the new row goes to the next page.

## Syntax

```sql
SELECT lower, upper, special, pagesize [, upper - lower AS free ]
FROM page_header(get_raw_page('table_name', block_number));
SELECT lp, lp_off, lp_len [, t_hoff, t_ctid ]
FROM heap_page_items(get_raw_page('table_name', block_number));
```

- `special`: where an index's private area starts; a heap page has none, so it equals `pagesize`.
- `lp_off`: the tuple's byte offset in the page.
- `lp_len`: the tuple's length, header included.
- `t_hoff`: the length of the tuple header.

## Example

Read only the first tuple of `notes`:

```sql
SELECT lp, lp_off, lp_len, t_hoff
FROM heap_page_items(get_raw_page('notes', 0))
WHERE lp = 1;
```

The tuple `(1, 'an')` is 31 bytes: a 24-byte header, 4 bytes of `int` and 3 bytes of short string (1 length byte plus 2 characters).

Another table with longer rows:

```sql
CREATE TABLE memo (id int PRIMARY KEY, body text);
INSERT INTO memo VALUES (1, repeat('x', 1000));
SELECT lower, upper, upper - lower AS free
FROM page_header(get_raw_page('memo', 0));
```

One 1000-character row has pushed `upper` down to 7160; 7132 bytes are left.

```sql
INSERT INTO memo
SELECT g, md5(g::text) || repeat('y', 1500) FROM generate_series(2, 9) g;
SELECT ctid, id FROM memo WHERE id >= 4 ORDER BY id;
```

Page 0 holds only four more 1564-byte rows: from row 6 on, the `ctid` is (1,1), (1,2) and so on, so they went to page 1.

## Common mistakes

Computing free space from the part after `upper`:

```sql
-- WRONG: pagesize - upper is the space the tuples use, not the free space
SELECT pagesize - upper AS free FROM page_header(get_raw_page('notes', 0));
```

```sql
-- FIX: the free space is the gap between lower and upper
SELECT upper - lower AS free FROM page_header(get_raw_page('notes', 0));
```

The wrong query returns 104, the bytes the three tuples use. The right one returns 8052.

Reading a page that does not exist:

```sql
-- ERROR 22023: block number 1 is out of range for relation "notes"
SELECT lower, upper FROM page_header(get_raw_page('notes', 1));
```

Table `notes` only has page 0. Check the page count with `pg_relation_size('notes') / 8192` first.

## Practice

Four steps on the 3-row table `notes` the lab builds for you: header, line pointers, `ctid`, then free space. Each step grades your result against the answer and states the fact being checked. Then two questions.

## Recap

- `lower` is the end of the line pointer array, `upper` the start of the tuple area; free space is `upper - lower`.
- A line pointer's `lp` is the second number in `ctid`; `lp_off` and `lp_len` give the tuple's place and length.
- Every row costs a 4-byte line pointer and a 24-byte tuple header on top of its data.
- When a page has no room for line pointer plus tuple, the new row goes to the next page.
