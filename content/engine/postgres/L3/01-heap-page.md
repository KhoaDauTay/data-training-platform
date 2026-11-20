---
id: e-pg-l3-01
engine: postgres
level: L3
module: pages
title: Một trang heap trông thế nào
title_en: What a heap page looks like
kind: concept
runtime: docs
minutes: 8
viz: pg-heap-page
objectives:
  - vi: Kể đúng bốn phần của một trang 8 KB (header, line pointer, chỗ trống, tuple)
    en: Name the four parts of an 8 KB page (header, line pointers, free space, tuples)
  - vi: Giải thích `ctid` là (số trang, số line pointer)
    en: Explain that `ctid` is (page number, line pointer number)
requires: []
sources:
  - https://www.postgresql.org/docs/18/storage-page-layout.html
  - https://www.postgresql.org/docs/18/ddl-system-columns.html
quiz:
  - q:
      vi: "Header trang có `lower` = 36 và `upper` = 8088. Trang này có bao nhiêu line pointer?"
      en: "A page header has `lower` = 36 and `upper` = 8088. How many line pointers does the page have?"
    options:
      - { vi: "3: (36 − 24) / 4", en: "3: (36 - 24) / 4" }
      - { vi: "9: 36 / 4", en: "9: 36 / 4" }
      - { vi: "Không biết được nếu không đọc tuple", en: "Cannot tell without reading the tuples" }
    answer: 0
    why:
      vi: "Chia 36 cho 4 nghe hợp lý vì mỗi line pointer đúng là 4 byte, nhưng 24 byte đầu của `lower` là header trang. Header chiếm 24 byte đầu, mỗi line pointer 4 byte, và `lower` là nơi mảng line pointer kết thúc: (36 − 24) / 4 = 3."
      en: "Dividing 36 by 4 sounds right because each line pointer really is 4 bytes, but the first 24 bytes counted by `lower` are the page header. The header takes the first 24 bytes, each line pointer is 4 bytes, and `lower` is where the line pointer array ends: (36 - 24) / 4 = 3."
  - q:
      vi: "Index lưu gì để tìm lại một dòng trong heap?"
      en: "What does an index store to find a row again in the heap?"
    options:
      - { vi: "Byte offset của tuple trong file", en: "The tuple's byte offset in the file" }
      - { vi: "`ctid`: số trang và số line pointer", en: "`ctid`: the page number and line pointer number" }
      - { vi: "Giá trị khóa chính", en: "The primary key value" }
    answer: 1
    why:
      vi: "Khóa chính nghe hợp lý vì ta hay tìm dòng bằng nó, nhưng index nào (kể cả index khóa chính) cũng phải dẫn tới chỗ dòng nằm trong heap. Index trỏ tới line pointer, không trỏ thẳng tới byte. Nhờ vậy Postgres dời được tuple trong trang (khi dọn chỗ) mà không phải sửa index."
      en: "The primary key sounds plausible because we usually look rows up by it, but every index (the primary key index included) has to lead to where the row sits in the heap. Indexes point at the line pointer, not straight at bytes. That is why Postgres can move a tuple inside the page (when compacting) without touching any index."
---

## Ý chính

Bảng có ba dòng thì chúng nằm ở đâu trên đĩa, và index tìm lại chúng bằng cách nào?

Bảng là một heap: dãy trang (page) 8192 byte, dòng mới vào trang nào còn chỗ, không theo thứ tự nào. Mỗi trang có:

- header 24 byte (`pd_lsn`, `pd_lower`, `pd_upper`, `pd_special`…);
- mảng line pointer, mỗi cái 4 byte, mọc từ đầu trang xuống;
- chỗ trống ở giữa;
- các tuple (mỗi tuple là một phiên bản của một dòng), xếp từ cuối trang lên. Mỗi tuple có header cố định 23 byte (`t_xmin`, `t_xmax`, `t_ctid`, các cờ…).

`ctid` = (số trang, số line pointer). Line pointer là lớp gián tiếp: tuple dời chỗ trong trang thì chỉ line pointer đổi, index không đổi.

## Ví dụ

```sql
SELECT lower, upper FROM page_header(get_raw_page('notes', 0));
SELECT lp, lp_off, lp_len FROM heap_page_items(get_raw_page('notes', 0));
```

`get_raw_page()` của extension `pageinspect` đọc nguyên trang; hai hàm còn lại tách nó ra.

## Thực hành

Bấm qua sơ đồ trang: INSERT ba dòng, xem line pointer mọc xuống và tuple mọc lên. Rồi trả lời hai câu hỏi. Học xong mô-đun này bạn nhìn một trang heap thật và nói được dòng nào nằm ở đâu, nhờ đó đọc được dấu hiệu bảng phình to.

# EN

## Key idea

A table has three rows: where do they live on disk, and how does an index find them again?

A table is a heap: a sequence of 8192-byte pages, where a new row goes into any page with room, in no particular order. Each page has:

- a 24-byte header (`pd_lsn`, `pd_lower`, `pd_upper`, `pd_special`…);
- an array of 4-byte line pointers growing down from the top;
- free space in the middle;
- tuples (each tuple is one version of a row), stacked up from the end of the page. Each tuple has a fixed 23-byte header (`t_xmin`, `t_xmax`, `t_ctid`, flags…).

`ctid` = (page number, line pointer number). The line pointer is an indirection: when a tuple moves inside the page only its line pointer changes, indexes do not.

## Example

```sql
SELECT lower, upper FROM page_header(get_raw_page('notes', 0));
SELECT lp, lp_off, lp_len FROM heap_page_items(get_raw_page('notes', 0));
```

`get_raw_page()` from the `pageinspect` extension reads the whole page; the other two functions take it apart.

## Practice

Step through the page diagram: INSERT three rows, watch line pointers grow down and tuples grow up. Then answer the two questions. After this module you can look at a real heap page and say which row lives where, which is how you read the signs of a bloated table.
