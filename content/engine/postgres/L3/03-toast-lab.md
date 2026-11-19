---
id: e-pg-l3-03
engine: postgres
level: L3
module: pages
title: "Lab: giá trị lớn thật ra nằm ở đâu (TOAST)"
title_en: "Lab: where a large value really lives (TOAST)"
kind: lab
minutes: 15
objectives:
  - vi: So độ dài logic với số byte lưu thật bằng `pg_column_size()`
    en: Compare logical length with stored bytes using `pg_column_size()`
  - vi: Phân biệt giá trị nén tại chỗ với giá trị bị đẩy ra bảng TOAST
    en: Tell a value compressed in place from a value moved out to the TOAST table
requires: [e-pg-l3-02]
sources:
  - https://www.postgresql.org/docs/18/storage-toast.html
  - https://www.postgresql.org/docs/18/pageinspect.html
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS pageinspect;
    CREATE TABLE doc(id int, body text);
    INSERT INTO doc VALUES (1, repeat('a', 100));
    INSERT INTO doc VALUES (2, (SELECT string_agg(md5(g::text), '' ORDER BY g) FROM generate_series(1, 200) g));
    INSERT INTO doc VALUES (3, repeat('b', 100000));
    DO $$ BEGIN EXECUTE format('CREATE VIEW doc_toast AS SELECT chunk_id, chunk_seq, length(chunk_data) AS len FROM %s', (SELECT reltoastrelid::regclass FROM pg_class WHERE relname = 'doc')); END $$;
  steps:
    - task:
        vi: Với mỗi dòng của `doc` (theo `id`), lấy `id`, số ký tự của `body` và số byte `body` chiếm thật.
        en: For each row of `doc` (by `id`), return `id`, the character length of `body` and the bytes `body` really takes.
      solution: SELECT id, length(body), pg_column_size(body) FROM doc ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`length()` đếm ký tự, `pg_column_size()` đếm byte lưu trữ."
        en: "`length()` counts characters, `pg_column_size()` counts stored bytes."
      fact:
        vi: "Dòng 3 dài 100000 ký tự nhưng chỉ chiếm 1156 byte (nén). Dòng 2 dài 6400 ký tự và chiếm đủ 6400 byte: chuỗi md5 gần như ngẫu nhiên, nén không lợi."
        en: "Row 3 is 100000 characters but takes only 1156 bytes (compressed). Row 2 is 6400 characters and takes the full 6400 bytes: an md5 string is nearly random and does not compress."
        probe: SELECT id, length(body), pg_column_size(body) FROM doc ORDER BY id
        expect: [[1, 100, 101], [2, 6400, 6400], [3, 100000, 1156]]
    - task:
        vi: Liệt kê `lp` và `lp_len` của trang 0 bảng `doc`.
        en: List `lp` and `lp_len` of page 0 of `doc`.
      solution: SELECT lp, lp_len FROM heap_page_items(get_raw_page('doc', 0))
      check: rows
      ordered: true
      hint:
        vi: Như lab trước, đọc `heap_page_items()`.
        en: As in the previous lab, read `heap_page_items()`.
      fact:
        vi: "Tuple của dòng 2 chỉ dài 46 byte trên trang: giá trị 6400 byte đã ra bảng TOAST, trên trang chỉ còn con trỏ 18 byte. Dòng 3 (1184 byte) vẫn ở trên trang vì bản nén đã đủ nhỏ."
        en: "Row 2's tuple is only 46 bytes on the page: the 6400-byte value moved to the TOAST table and only an 18-byte pointer stays. Row 3 (1184 bytes) stays on the page because the compressed value is small enough."
        probe: SELECT lp, lp_len FROM heap_page_items(get_raw_page('doc', 0))
        expect: [[1, 129], [2, 46], [3, 1184]]
    - task:
        vi: "View `doc_toast` đọc bảng TOAST của `doc`. Đếm số chunk và tổng số byte của chúng."
        en: "The view `doc_toast` reads the TOAST table of `doc`. Count the chunks and the total bytes they hold."
      solution: SELECT count(*) AS chunks, sum(len) AS bytes FROM doc_toast
      check: rows
      hint:
        vi: "Mỗi dòng của `doc_toast` là một chunk; cột `len` là số byte của nó."
        en: "Each row of `doc_toast` is one chunk; the `len` column is its size in bytes."
      fact:
        vi: "Bảng TOAST có đúng 4 chunk của một giá trị, tổng 6400 byte: ba chunk 1996 byte và một chunk 412 byte."
        en: "The TOAST table holds exactly 4 chunks of one value, 6400 bytes in total: three chunks of 1996 bytes and one of 412."
        probe: SELECT count(*) AS chunks, count(DISTINCT chunk_id) AS vals, string_agg(len::text, ',' ORDER BY chunk_seq) AS sizes FROM doc_toast
        expect: [[4, 1, "1996,1996,1996,412"]]
    - task:
        vi: Lấy `id` và phương thức nén của `body` cho từng dòng, theo `id`.
        en: Return `id` and the compression method of `body` for each row, by `id`.
      solution: SELECT id, pg_column_compression(body) FROM doc ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "Có hàm `pg_column_compression()`."
        en: "There is a function `pg_column_compression()`."
      fact:
        vi: "Chỉ dòng 3 được nén (`pglz`, mặc định của `default_toast_compression`); dòng 1 quá nhỏ, dòng 2 nén không đáng."
        en: "Only row 3 is compressed (`pglz`, the `default_toast_compression` default); row 1 is too small and row 2 is not worth compressing."
        probe: SELECT id, pg_column_compression(body) FROM doc ORDER BY id
        expect: [[1, null], [2, null], [3, pglz]]
---

## Ý chính

Một dòng không được vượt quá một trang, nên Postgres có TOAST. Khi dòng rộng hơn khoảng 2 kB (`TOAST_TUPLE_THRESHOLD`), Postgres **nén** cột dài trước. Nếu vẫn chưa đủ nhỏ, nó **đẩy giá trị ra** một bảng TOAST riêng, cắt thành chunk, và trên trang chỉ còn con trỏ 18 byte.

## Ví dụ

```sql
SELECT id, length(body), pg_column_size(body) FROM doc ORDER BY id;
```

Chuỗi `repeat('b', 100000)` dài nhưng lặp lại, nén còn rất nhỏ nên vẫn ở trên trang. Chuỗi md5 ngắn hơn nhiều nhưng không nén được, nên phải ra TOAST.

## Thực hành

Bốn bước, mỗi bước kiểm một con số thật. Sau lab này bạn giải thích được vì sao `SELECT *` trên bảng có cột văn bản dài chậm hơn hẳn `SELECT id`: mỗi giá trị ở TOAST là thêm lần đọc bảng TOAST và giải nén.

# EN

## Key idea

A row cannot span pages, so Postgres has TOAST. When a row is wider than about 2 kB (`TOAST_TUPLE_THRESHOLD`), Postgres first **compresses** the long columns. If that is still not small enough, it **moves the value out** to a separate TOAST table, cut into chunks, and only an 18-byte pointer stays on the page.

## Example

```sql
SELECT id, length(body), pg_column_size(body) FROM doc ORDER BY id;
```

The string `repeat('b', 100000)` is long but repetitive, compresses to almost nothing and stays on the page. The md5 string is much shorter but does not compress, so it has to go to TOAST.

## Practice

Four steps, each checks a real number. After this lab you can explain why `SELECT *` on a table with long text columns is much slower than `SELECT id`: every value in TOAST means extra reads of the TOAST table plus decompression.
