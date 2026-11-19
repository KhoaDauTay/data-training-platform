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
viz: pg-heap-page
objectives:
  - vi: Đọc header trang (`lower`, `upper`) và tính chỗ trống
    en: Read the page header (`lower`, `upper`) and compute the free space
  - vi: Ghép mỗi line pointer với `ctid` của dòng
    en: Match each line pointer to the row's `ctid`
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
---

## Ý chính

`lower` là chỗ mảng line pointer kết thúc, `upper` là chỗ tuple đầu tiên bắt đầu; khoảng giữa là chỗ trống của trang. Mỗi line pointer ghi tuple nằm ở byte nào (`lp_off`) và dài bao nhiêu (`lp_len`).

## Ví dụ

```sql
SELECT lp, lp_off, lp_len
FROM heap_page_items(get_raw_page('notes', 0));
```

Tuple `(1, 'an')` dài 31 byte: 24 byte header tuple (23 byte, căn lề lên 24) + 4 byte `int` + 3 byte chuỗi ngắn.

## Thực hành

Bốn bước trên bảng 3 dòng do lab dựng sẵn. Mỗi bước chấm kết quả của bạn với đáp án, và lab ghi rõ sự thật được kiểm (ví dụ "trang có 3 line pointer, lp 3 nằm ở 8088"). Sau lab này bạn đọc được một trang bất kỳ khi nghi ngờ bảng phình to.

# EN

## Key idea

`lower` is where the line pointer array ends, `upper` is where the first tuple starts; the gap is the page's free space. Each line pointer records at which byte its tuple lives (`lp_off`) and how long it is (`lp_len`).

## Example

```sql
SELECT lp, lp_off, lp_len
FROM heap_page_items(get_raw_page('notes', 0));
```

The tuple `(1, 'an')` is 31 bytes: a 24-byte tuple header (23 bytes, aligned up to 24) + 4 bytes of `int` + 3 bytes of short string.

## Practice

Four steps on a 3-row table the lab builds for you. Each step grades your result against the answer, and the lab states the fact being checked (for example "the page has 3 line pointers, lp 3 sits at 8088"). After this lab you can read any page when you suspect a table is bloated.
