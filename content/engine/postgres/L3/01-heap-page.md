---
id: e-pg-l3-01
engine: postgres
level: L3
module: pages
title: Một trang heap trông thế nào
title_en: What a heap page looks like
kind: concept
runtime: docs
docs_why: next
minutes: 10
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
viz: pg-heap-page
objectives:
  - vi: Kể đúng bốn phần của một trang 8 KB (header, line pointer, chỗ trống, tuple)
    en: Name the four parts of an 8 KB page (header, line pointers, free space, tuples)
  - vi: Giải thích `ctid` là (số trang, số line pointer) và vì sao nó không phải mã cố định của dòng
    en: Explain that `ctid` is (page number, line pointer number) and why it is not a fixed id of the row
  - vi: Đọc header và line pointer của một trang bằng `pageinspect`
    en: Read the header and line pointers of a page with `pageinspect`
requires: []
sources:
  - https://www.postgresql.org/docs/18/storage-page-layout.html
  - https://www.postgresql.org/docs/18/ddl-system-columns.html
  - https://www.postgresql.org/docs/18/pageinspect.html
quiz:
  - q:
      vi: "Header trang có `lower` = 36 và `upper` = 8088. Trang này có bao nhiêu line pointer?"
      en: "A page header has `lower` = 36 and `upper` = 8088. How many line pointers does the page have?"
    options:
      - { vi: "3: (36 − 24) / 4", en: "3: (36 - 24) / 4" }
      - { vi: "9: 36 / 4", en: "9: 36 / 4" }
      - { vi: "Không biết được nếu không đọc tuple", en: "Cannot tell without reading the tuples" }
    answer: 0
    trap: 1
    why:
      vi: "36 / 4 = 9 nghe hợp lý vì mỗi line pointer đúng là 4 byte, nhưng `lower` đếm từ byte đầu tiên của trang (page), nên 36 gồm cả 24 byte header trang. Mảng line pointer nằm ngay sau header và kết thúc ở `lower`: (36 − 24) / 4 = 3. Không cần đọc tuple: hai con số trong header trang đã đủ để tính."
      en: "36 / 4 = 9 sounds right because each line pointer really is 4 bytes, but `lower` counts from the first byte of the page, so 36 includes the 24-byte page header. The line pointer array starts right after the header and ends at `lower`: (36 - 24) / 4 = 3. No need to read the tuples: the two numbers in the page header are enough."
  - q:
      vi: "Index lưu gì để tìm lại một dòng trong heap?"
      en: "What does an index store to find a row again in the heap?"
    options:
      - { vi: "Byte offset của tuple trong file", en: "The tuple's byte offset in the file" }
      - { vi: "`ctid`: số trang và số line pointer", en: "`ctid`: the page number and line pointer number" }
      - { vi: "Giá trị khóa chính", en: "The primary key value" }
    answer: 1
    trap: 2
    why:
      vi: "Khóa chính nghe hợp lý vì ta hay tìm dòng bằng nó, nhưng index nào (kể cả index của khóa chính) cũng phải dẫn tới chỗ dòng nằm trong heap (các trang của bảng). Nên index lưu `ctid` = (số trang, số line pointer). Nó không lưu byte offset: line pointer là lớp gián tiếp, nên khi Postgres dồn tuple trong trang cho gọn, chỉ line pointer đổi, index không phải sửa."
      en: "The primary key sounds right because we usually look rows up by it, but every index (the primary key's included) has to lead to where the row sits in the heap (the table's pages). So an index stores `ctid` = (page number, line pointer number). It does not store a byte offset: the line pointer is an indirection, so when Postgres compacts the tuples inside a page only the line pointer changes, and no index has to be updated."
---
## Mở bài

Bạn chèn ba dòng vào một bảng mới. Chúng nằm ở đâu trên đĩa, và vì sao index tìm lại được chúng nhanh như vậy?

## Ý chính

Một bảng trong Postgres là một heap: một dãy trang (page) 8192 byte, đánh số từ 0. Dòng mới vào trang nào còn chỗ, không theo thứ tự khóa nào. Mọi thứ Postgres đọc và ghi xuống đĩa đều theo đơn vị trang, nên hiểu một trang là hiểu cách bảng phình to hay co lại.

Mỗi trang có bốn phần:

- header 24 byte, trong đó `pd_lower` là chỗ mảng line pointer kết thúc và `pd_upper` là chỗ tuple đầu tiên bắt đầu;
- mảng line pointer, mỗi cái 4 byte, mọc từ đầu trang xuống, ghi tuple nằm ở byte nào và dài bao nhiêu;
- chỗ trống ở giữa, bằng `upper` trừ `lower`;
- các tuple, xếp từ cuối trang ngược lên. Mỗi tuple là một phiên bản của một dòng, có header 23 byte (căn lề thành 24) chứa `t_xmin`, `t_xmax`, `t_ctid` và các cờ.

Địa chỉ của một tuple là `ctid` = (số trang, số line pointer). Line pointer là một lớp gián tiếp: khi Postgres dồn tuple trong trang cho gọn, chỉ con số trong line pointer đổi, còn index vẫn trỏ đúng chỗ cũ.

Nhiều người nghĩ `ctid` là mã cố định của dòng, dùng thay khóa chính được. Thật ra `ctid` là địa chỉ của một phiên bản: mỗi UPDATE ghi một tuple mới ở chỗ khác, nên `ctid` đổi. Hãy tìm dòng bằng khóa chính, chỉ đọc `ctid` để hiểu bảng được lưu thế nào.

Extension `pageinspect` cho bạn nhìn thẳng vào trang: `get_raw_page()` đọc nguyên 8192 byte, `page_header()` tách header, `heap_page_items()` liệt kê từng line pointer và tuple. Mặc định chỉ superuser gọi được các hàm này, vì chúng đọc cả dữ liệu mà quyền trên bảng thường che đi.

## Cú pháp

```sql
CREATE EXTENSION [ IF NOT EXISTS ] pageinspect;
SELECT lower, upper, special, pagesize
FROM page_header(get_raw_page('table_name', block_number));
SELECT lp, lp_off, lp_len, t_ctid
FROM heap_page_items(get_raw_page('table_name', block_number));
SELECT ctid, column_name [, ...] FROM table_name [ WHERE ctid = '(page,item)' ];
```

- `block_number`: số trang, bắt đầu từ 0; trang phải có thật trong bảng.
- `lower`, `upper`: cuối mảng line pointer và đầu vùng tuple.
- `lp_off`, `lp_len`: tuple nằm ở byte nào của trang và dài bao nhiêu byte.
- `ctid`: cột hệ thống, không có trong `SELECT *`, phải gọi tên.

## Ví dụ

Tạo một bảng nhỏ rồi đọc header của trang 0:

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE TABLE notes (id int PRIMARY KEY, body text);
INSERT INTO notes VALUES (1, 'an'), (2, 'binh'), (3, 'chi');
SELECT lower, upper, special, pagesize
FROM page_header(get_raw_page('notes', 0));
```

Ra `lower` = 36 (24 byte header cộng 3 line pointer 4 byte) và `upper` = 8088. Trang còn 8052 byte trống.

```sql
SELECT lp, lp_off, lp_len
FROM heap_page_items(get_raw_page('notes', 0));
```

Ba line pointer trỏ tới offset 8160, 8120 và 8088: tuple xếp từ cuối trang ngược lên, và tuple cuối cùng bắt đầu đúng ở `upper`.

```sql
SELECT ctid, id, body FROM notes ORDER BY id;
```

`ctid` của ba dòng là (0,1), (0,2), (0,3): trang 0, line pointer 1 tới 3.

```sql
SELECT pg_relation_size('notes') AS bytes,
       pg_relation_size('notes') / current_setting('block_size')::int AS pages;
```

Bảng chiếm đúng một trang 8192 byte, dù dữ liệu thật chưa tới 100 byte.

## Lỗi hay gặp

Đọc một trang bảng chưa có:

```sql
-- ERROR 22023: block number 1 is out of range for relation "notes"
SELECT * FROM get_raw_page('notes', 1);
```

Trang đánh số từ 0 và bảng này chỉ có một trang. Tính số trang bằng `pg_relation_size()` chia cho kích thước trang trước khi đọc.

Dùng `ctid` làm mã cố định của dòng:

```sql
-- WRONG: the UPDATE wrote a new version, so (0,1) no longer holds row 1
UPDATE notes SET body = 'an moi' WHERE id = 1;
SELECT id, body FROM notes WHERE ctid = '(0,1)';
```

```sql
-- FIX: find the row by its key
SELECT id, body FROM notes WHERE id = 1;
```

Câu sai không ra dòng nào: sau UPDATE, dòng 1 đã sang (0,4). Khóa chính không đổi khi dòng được sửa, `ctid` thì đổi.

Viết sai dạng địa chỉ:

```sql
-- ERROR 22P02: invalid input syntax for type tid: "(0)"
SELECT id FROM notes WHERE ctid = '(0)';
```

Kiểu `tid` cần đủ hai số, trang và line pointer, ví dụ `'(0,2)'`.

## Tóm tắt

- Bảng là một heap gồm các trang 8192 byte, dòng mới vào trang nào còn chỗ.
- Trang có header 24 byte, line pointer 4 byte mọc xuống, tuple mọc lên, chỗ trống ở giữa (`upper` trừ `lower`).
- `ctid` = (trang, line pointer) là địa chỉ của một phiên bản, đổi sau mỗi UPDATE; tìm dòng bằng khóa.
- Index trỏ tới line pointer, nên tuple dời trong trang mà index không phải sửa.

# EN

## Opening

You insert three rows into a new table. Where do they live on disk, and why can an index find them again so fast?

## Key idea

A Postgres table is a heap: a sequence of 8192-byte pages, numbered from 0. A new row goes into any page with room, in no key order. Everything Postgres reads and writes on disk is a whole page, so understanding one page means understanding how a table grows or shrinks.

Each page has four parts:

- a 24-byte header, where `pd_lower` is where the line pointer array ends and `pd_upper` is where the first tuple starts;
- an array of line pointers, 4 bytes each, growing down from the top, recording at which byte each tuple lives and how long it is;
- free space in the middle, equal to `upper` minus `lower`;
- the tuples, stacked up from the end of the page. Each tuple is one version of a row, with a 23-byte header (aligned to 24) holding `t_xmin`, `t_xmax`, `t_ctid` and flags.

A tuple's address is `ctid` = (page number, line pointer number). The line pointer is an indirection: when Postgres compacts the tuples inside a page, only the number in the line pointer changes, and indexes still point at the right place.

Many people think `ctid` is a fixed id of the row that can stand in for the primary key. In fact `ctid` is the address of one version: every UPDATE writes a new tuple somewhere else, so `ctid` changes. Find rows by their key, and read `ctid` only to understand how the table is stored.

The `pageinspect` extension lets you look straight into a page: `get_raw_page()` reads all 8192 bytes, `page_header()` splits out the header, `heap_page_items()` lists each line pointer and tuple. By default only superusers can call these functions, because they read data that table privileges would normally hide.

## Syntax

```sql
CREATE EXTENSION [ IF NOT EXISTS ] pageinspect;
SELECT lower, upper, special, pagesize
FROM page_header(get_raw_page('table_name', block_number));
SELECT lp, lp_off, lp_len, t_ctid
FROM heap_page_items(get_raw_page('table_name', block_number));
SELECT ctid, column_name [, ...] FROM table_name [ WHERE ctid = '(page,item)' ];
```

- `block_number`: the page number, from 0; the page must exist in the table.
- `lower`, `upper`: end of the line pointer array and start of the tuple area.
- `lp_off`, `lp_len`: at which byte of the page the tuple lives and how many bytes it takes.
- `ctid`: a system column, not part of `SELECT *`, it must be named.

## Example

Create a small table, then read the header of page 0:

```sql
CREATE EXTENSION IF NOT EXISTS pageinspect;
CREATE TABLE notes (id int PRIMARY KEY, body text);
INSERT INTO notes VALUES (1, 'an'), (2, 'binh'), (3, 'chi');
SELECT lower, upper, special, pagesize
FROM page_header(get_raw_page('notes', 0));
```

It shows `lower` = 36 (a 24-byte header plus 3 line pointers of 4 bytes) and `upper` = 8088. The page has 8052 bytes free.

```sql
SELECT lp, lp_off, lp_len
FROM heap_page_items(get_raw_page('notes', 0));
```

The three line pointers point at offsets 8160, 8120 and 8088: tuples stack up from the end of the page, and the last one starts exactly at `upper`.

```sql
SELECT ctid, id, body FROM notes ORDER BY id;
```

The three rows have `ctid` (0,1), (0,2), (0,3): page 0, line pointers 1 to 3.

```sql
SELECT pg_relation_size('notes') AS bytes,
       pg_relation_size('notes') / current_setting('block_size')::int AS pages;
```

The table takes exactly one 8192-byte page, although the real data is under 100 bytes.

## Common mistakes

Reading a page the table does not have:

```sql
-- ERROR 22023: block number 1 is out of range for relation "notes"
SELECT * FROM get_raw_page('notes', 1);
```

Pages are numbered from 0 and this table has only one. Work out the page count with `pg_relation_size()` divided by the page size before reading.

Using `ctid` as a fixed id of the row:

```sql
-- WRONG: the UPDATE wrote a new version, so (0,1) no longer holds row 1
UPDATE notes SET body = 'an moi' WHERE id = 1;
SELECT id, body FROM notes WHERE ctid = '(0,1)';
```

```sql
-- FIX: find the row by its key
SELECT id, body FROM notes WHERE id = 1;
```

The wrong query returns no row: after the UPDATE, row 1 moved to (0,4). The primary key does not change when a row is updated; `ctid` does.

Writing the address in the wrong form:

```sql
-- ERROR 22P02: invalid input syntax for type tid: "(0)"
SELECT id FROM notes WHERE ctid = '(0)';
```

The `tid` type needs both numbers, page and line pointer, for example `'(0,2)'`.

## Recap

- A table is a heap of 8192-byte pages; a new row goes into any page with room.
- A page has a 24-byte header, 4-byte line pointers growing down, tuples growing up and free space in the middle (`upper` minus `lower`).
- `ctid` = (page, line pointer) is the address of one version and changes after every UPDATE; find rows by key.
- Indexes point at the line pointer, so a tuple can move inside its page without any index change.
