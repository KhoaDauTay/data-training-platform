---
id: e-pg-l3-03
engine: postgres
level: L3
module: pages
title: "Lab: giá trị lớn thật ra nằm ở đâu (TOAST)"
title_en: "Lab: where a large value really lives (TOAST)"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
figures: [{ name: pg-toast-pointer, at: idea }]
objectives:
  - vi: So độ dài logic với số byte lưu thật bằng `pg_column_size()`
    en: Compare logical length with stored bytes using `pg_column_size()`
  - vi: Phân biệt giá trị nén tại chỗ với giá trị bị đẩy ra bảng TOAST
    en: Tell a value compressed in place from a value moved out to the TOAST table
  - vi: Đọc và đổi chiến lược lưu của một cột bằng `SET STORAGE`
    en: Read and change a column's storage strategy with `SET STORAGE`
requires: [e-pg-l3-02]
sources:
  - https://www.postgresql.org/docs/18/storage-toast.html
  - https://www.postgresql.org/docs/18/sql-altertable.html
  - https://www.postgresql.org/docs/18/functions-admin.html
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
        vi: "Với mỗi dòng của `doc` (theo `id`), lấy `id`, số ký tự của `body` và số byte `body` chiếm thật. Đoán trước khi chạy: dòng nào chiếm ít byte nhất?"
        en: "For each row of `doc` (by `id`), return `id`, the character length of `body` and the bytes `body` really takes. Guess before you run it: which row takes the fewest bytes?"
      solution: SELECT id, length(body), pg_column_size(body) FROM doc ORDER BY id
      check: rows
      ordered: true
      hint:
        vi: "`length()` đếm ký tự, `pg_column_size()` đếm byte lưu trữ."
        en: "`length()` counts characters, `pg_column_size()` counts stored bytes."
      fact:
        vi: "Dòng 3 dài 100.000 ký tự nhưng chỉ chiếm 1156 byte (nén). Dòng 2 dài 6400 ký tự và chiếm đủ 6400 byte: chuỗi md5 gần như ngẫu nhiên, nén không lợi."
        en: "Row 3 is 100,000 characters but takes only 1156 bytes (compressed). Row 2 is 6400 characters and takes the full 6400 bytes: an md5 string is nearly random and does not compress."
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
        vi: "View `doc_toast` đọc bảng TOAST của `doc`. Mỗi dòng của view là một chunk, cột `len` là số byte của nó. Đếm số chunk và tổng số byte của chúng."
        en: "The view `doc_toast` reads the TOAST table of `doc`. Each row of the view is one chunk, and its `len` column is its size in bytes. Count the chunks and the total bytes they hold."
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
        vi: Lấy `id` và phương thức nén của `body` cho từng dòng, theo `id` (hàm `pg_column_compression()`).
        en: Return `id` and the compression method of `body` for each row, by `id` (the function `pg_column_compression()`).
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
quiz:
  - q:
      vi: "Cột `body` giữ một chuỗi 100.000 ký tự chỉ gồm chữ `b`. `pg_column_size(body)` khoảng bao nhiêu?"
      en: "Column `body` holds a 100,000-character string made only of the letter `b`. About how much is `pg_column_size(body)`?"
    options:
      - { vi: "Khoảng 100.000 byte, và giá trị nằm trong bảng TOAST", en: "About 100,000 bytes, and the value lives in the TOAST table" }
      - { vi: "Khoảng 1 KB: chuỗi lặp nén rất tốt và vẫn nằm trên trang", en: "About 1 KB: a repetitive string compresses very well and stays on the page" }
      - { vi: "18 byte: chỉ còn con trỏ TOAST", en: "18 bytes: only the TOAST pointer is left" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì giá trị lớn hơn hẳn một trang, nhưng Postgres nén trước rồi mới tính chuyện đẩy ra ngoài. Lab đo được 1156 byte cho đúng chuỗi này, đủ nhỏ để ở lại trang. `pg_column_size` đếm số byte lưu thật, nên nó cũng không trả 18 khi giá trị đã ra TOAST."
      en: "It sounds right because the value is far bigger than a page, but Postgres compresses first and only then considers moving it out. The lab measures 1156 bytes for this very string, small enough to stay on the page. `pg_column_size` counts the bytes really stored, so it would not return 18 even for a value moved out to TOAST."
  - q:
      vi: "Bảng `doc` có cột `body` dài, phần lớn đã ra TOAST. Vì sao `SELECT id FROM doc` nhanh hơn hẳn `SELECT * FROM doc`?"
      en: "Table `doc` has a long `body` column, mostly moved out to TOAST. Why is `SELECT id FROM doc` much faster than `SELECT * FROM doc`?"
    options:
      - { vi: "Không nhanh hơn: cả dòng nằm trên một trang nên đọc cột nào cũng như nhau", en: "It is not faster: the whole row sits on one page, so any column costs the same" }
      - { vi: "Bảng TOAST chỉ được đọc khi câu cần chính cột đó", en: "The TOAST table is only read when the query needs that very column" }
      - { vi: "Vì `id` luôn có index", en: "Because `id` always has an index" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì ta hình dung một dòng nằm gọn trên trang, nhưng với giá trị đã ra TOAST, trên trang chỉ còn con trỏ. Câu không cần `body` thì không bao giờ đọc bảng TOAST hay giải nén; `SELECT *` thì phải ghép lại từng chunk."
      en: "It sounds right because we picture a row sitting whole on its page, but for a value moved out to TOAST only a pointer stays on the page. A query that does not need `body` never reads the TOAST table or decompresses anything; `SELECT *` has to put every chunk back together."
---
## Mở bài

Một bảng chỉ vài nghìn dòng nhưng `SELECT *` chậm hẳn so với `SELECT id`. Văn bản dài trong cột `body` thật ra nằm ở đâu?

## Ý chính

Một tuple phải nằm gọn trong một trang 8 KB, nên Postgres có TOAST cho giá trị dài. Khi một dòng rộng hơn khoảng 2 KB (`TOAST_TUPLE_THRESHOLD`), Postgres xử lý các cột dài theo hai bước: nén giá trị tại chỗ trước, và nếu dòng vẫn còn quá rộng thì đẩy giá trị ra một bảng TOAST riêng, cắt thành các chunk khoảng 2 KB. Trên trang chỉ còn một con trỏ 18 byte.

Nhiều người nghĩ cứ giá trị lớn là ra TOAST. Thật ra nén đến trước: chuỗi dài nhưng lặp lại có thể nén còn vài trăm byte và ở lại trang, còn chuỗi ngắn hơn nhưng gần như ngẫu nhiên thì nén không được và phải ra ngoài.

Mỗi cột có một chiến lược lưu (`attstorage`): `p` (PLAIN, không nén, không ra ngoài, dành cho kiểu độ dài cố định như `int`), `x` (EXTENDED, mặc định của `text`: nén rồi mới ra ngoài), `e` (EXTERNAL: ra ngoài nhưng không nén) và `m` (MAIN: nén, chỉ ra ngoài khi không còn cách nào).

Hai hàm giúp bạn đo: `length()` đếm ký tự, còn `pg_column_size()` đếm số byte thật sự lưu, sau khi nén. `pg_column_compression()` cho biết giá trị được nén bằng gì (`pglz` là mặc định), hoặc `NULL` nếu không nén.

Hình từng bước ở cuối mục này đi qua ba dòng của bảng `doc` trong lab: dòng nhỏ ở lại, dòng lặp lại được nén và ở lại, dòng gần ngẫu nhiên ra bảng TOAST.

## Cú pháp

```sql
SELECT length(column_name), pg_column_size(column_name), pg_column_compression(column_name)
FROM table_name;
ALTER TABLE table_name ALTER [ COLUMN ] column_name
  SET STORAGE { PLAIN | EXTERNAL | EXTENDED | MAIN };
SELECT reltoastrelid::regclass FROM pg_class WHERE relname = 'table_name';
SELECT pg_relation_size('table_name'), pg_table_size('table_name');
```

- `SET STORAGE`: đổi chiến lược cho các giá trị ghi sau đó, không viết lại giá trị cũ.
- `reltoastrelid`: bảng TOAST của bảng, nằm trong schema `pg_toast`.
- `pg_relation_size`: chỉ phần heap chính; `pg_table_size`: cả TOAST, free space map và visibility map.

## Ví dụ

Bảng `memo` với một văn bản 5000 ký tự và một chữ ngắn:

```sql
CREATE TABLE memo (id int PRIMARY KEY, body text);
INSERT INTO memo VALUES (1, repeat('x', 5000)), (2, 'short');
SELECT id, length(body) AS chars, octet_length(body) AS octets, pg_column_size(body) AS stored
FROM memo ORDER BY id;
```

5000 ký tự lặp lại chỉ còn 69 byte sau nén. Chữ `'short'` chiếm 6 byte: 1 byte độ dài cộng 5 ký tự.

```sql
SELECT attname, attstorage
FROM pg_attribute
WHERE attrelid = 'memo'::regclass AND attnum > 0
ORDER BY attnum;
```

`id` là `p`, `body` là `x`: cột `text` mặc định được nén rồi mới ra ngoài.

Đổi `body` sang EXTERNAL rồi chèn lại cùng văn bản:

```sql
ALTER TABLE memo ALTER COLUMN body SET STORAGE EXTERNAL;
INSERT INTO memo VALUES (3, repeat('x', 5000));
SELECT id, pg_column_size(body) AS stored, pg_column_compression(body) AS method
FROM memo ORDER BY id;
```

Dòng 1 vẫn `pglz`, 69 byte. Dòng 3 giữ đủ 5000 byte, không nén, vì EXTERNAL cấm nén.

```sql
SELECT lp, lp_len FROM heap_page_items(get_raw_page('memo', 0));
```

Trên trang, tuple của dòng 3 chỉ dài 46 byte: giá trị đã ra bảng TOAST, trang chỉ giữ con trỏ.

## Lỗi hay gặp

Đo dung lượng bằng độ dài chữ:

```sql
-- WRONG: octet_length counts the bytes before compression
SELECT sum(octet_length(body)) AS bytes FROM memo;
```

```sql
-- FIX: pg_column_size counts the bytes really stored
SELECT sum(pg_column_size(body)) AS bytes FROM memo;
```

Câu sai ra 10005, câu đúng ra 5075: dòng 1 nén còn 69 byte.

Đọc kích thước bảng mà quên TOAST:

```sql
-- WRONG: pg_relation_size leaves out the TOAST table
SELECT pg_relation_size('memo') AS bytes;
```

```sql
-- FIX: pg_table_size includes TOAST, the free space map and the visibility map
SELECT pg_table_size('memo') AS bytes;
```

Heap chính chỉ 8192 byte, nhưng cả bảng chiếm 32768 byte.

Đổi chiến lược của cột kiểu cố định:

```sql
-- ERROR 0A000: column data type integer can only have storage PLAIN
ALTER TABLE memo ALTER COLUMN id SET STORAGE EXTERNAL;
```

Kiểu độ dài cố định như `int` không bao giờ được nén hay ra TOAST, nên chỉ có PLAIN.

## Thực hành

Bảng `doc` có ba dòng: 100 ký tự, 6400 ký tự md5 và 100.000 ký tự lặp lại. Bốn bước đo kích thước thật, đọc trang, đếm chunk trong bảng TOAST và xem phương thức nén. Sau đó là hai câu hỏi.

## Tóm tắt

- Dòng rộng hơn khoảng 2 KB: Postgres nén cột dài trước, vẫn quá rộng thì đẩy ra bảng TOAST thành chunk.
- `length()` đếm ký tự, `pg_column_size()` đếm byte lưu thật sau nén.
- Chiến lược cột: `p` PLAIN, `x` EXTENDED (mặc định của `text`), `e` EXTERNAL, `m` MAIN.
- Câu không cần cột dài thì không đọc TOAST; `SELECT *` thì phải ghép và giải nén.
- Đo kích thước bảng bằng `pg_table_size`, vì `pg_relation_size` bỏ qua TOAST.

# EN

## Opening

A table has only a few thousand rows, yet `SELECT *` is far slower than `SELECT id`. Where does the long text in column `body` really live?

## Key idea

A tuple must fit inside one 8 KB page, so Postgres has TOAST for long values. When a row is wider than about 2 KB (`TOAST_TUPLE_THRESHOLD`), Postgres handles the long columns in two steps: it first compresses the value in place, and if the row is still too wide it moves the value out to a separate TOAST table, cut into chunks of about 2 KB. Only an 18-byte pointer stays on the page.

Many people think any large value goes to TOAST. In fact compression comes first: a long but repetitive string can shrink to a few hundred bytes and stay on the page, while a shorter, nearly random string does not compress and has to move out.

Each column has a storage strategy (`attstorage`): `p` (PLAIN, no compression, never moved out, for fixed-length types such as `int`), `x` (EXTENDED, the default for `text`: compress, then move out), `e` (EXTERNAL: move out but never compress) and `m` (MAIN: compress, move out only as a last resort).

Two functions let you measure: `length()` counts characters, while `pg_column_size()` counts the bytes really stored, after compression. `pg_column_compression()` tells how the value is compressed (`pglz` is the default), or `NULL` when it is not compressed.

The step-through figure at the end of this section goes through the three rows of the lab's table `doc`: the small one stays, the repetitive one is compressed and stays, the near-random one moves to the TOAST table.

## Syntax

```sql
SELECT length(column_name), pg_column_size(column_name), pg_column_compression(column_name)
FROM table_name;
ALTER TABLE table_name ALTER [ COLUMN ] column_name
  SET STORAGE { PLAIN | EXTERNAL | EXTENDED | MAIN };
SELECT reltoastrelid::regclass FROM pg_class WHERE relname = 'table_name';
SELECT pg_relation_size('table_name'), pg_table_size('table_name');
```

- `SET STORAGE`: changes the strategy for values written afterwards; old values are not rewritten.
- `reltoastrelid`: the table's TOAST table, in schema `pg_toast`.
- `pg_relation_size`: the main heap only; `pg_table_size`: TOAST, free space map and visibility map included.

## Example

Table `memo` with a 5000-character text and a short word:

```sql
CREATE TABLE memo (id int PRIMARY KEY, body text);
INSERT INTO memo VALUES (1, repeat('x', 5000)), (2, 'short');
SELECT id, length(body) AS chars, octet_length(body) AS octets, pg_column_size(body) AS stored
FROM memo ORDER BY id;
```

5000 repeated characters shrink to 69 bytes. The word `'short'` takes 6 bytes: 1 length byte plus 5 characters.

```sql
SELECT attname, attstorage
FROM pg_attribute
WHERE attrelid = 'memo'::regclass AND attnum > 0
ORDER BY attnum;
```

`id` is `p`, `body` is `x`: a `text` column is compressed first and moved out after that by default.

Switch `body` to EXTERNAL, then insert the same text again:

```sql
ALTER TABLE memo ALTER COLUMN body SET STORAGE EXTERNAL;
INSERT INTO memo VALUES (3, repeat('x', 5000));
SELECT id, pg_column_size(body) AS stored, pg_column_compression(body) AS method
FROM memo ORDER BY id;
```

Row 1 is still `pglz`, 69 bytes. Row 3 keeps all 5000 bytes, uncompressed, because EXTERNAL forbids compression.

```sql
SELECT lp, lp_len FROM heap_page_items(get_raw_page('memo', 0));
```

On the page, row 3's tuple is only 46 bytes: the value moved out to the TOAST table and the page keeps a pointer.

## Common mistakes

Measuring size by text length:

```sql
-- WRONG: octet_length counts the bytes before compression
SELECT sum(octet_length(body)) AS bytes FROM memo;
```

```sql
-- FIX: pg_column_size counts the bytes really stored
SELECT sum(pg_column_size(body)) AS bytes FROM memo;
```

The wrong query returns 10005, the right one 5075: row 1 compresses to 69 bytes.

Reading a table's size and forgetting TOAST:

```sql
-- WRONG: pg_relation_size leaves out the TOAST table
SELECT pg_relation_size('memo') AS bytes;
```

```sql
-- FIX: pg_table_size includes TOAST, the free space map and the visibility map
SELECT pg_table_size('memo') AS bytes;
```

The main heap is only 8192 bytes, but the whole table takes 32768.

Changing the strategy of a fixed-length column:

```sql
-- ERROR 0A000: column data type integer can only have storage PLAIN
ALTER TABLE memo ALTER COLUMN id SET STORAGE EXTERNAL;
```

A fixed-length type such as `int` is never compressed or moved to TOAST, so PLAIN is its only strategy.

## Practice

Table `doc` has three rows: 100 characters, 6400 md5 characters and 100,000 repeated characters. Four steps measure the real size, read the page, count the chunks in the TOAST table and check the compression method. Then two questions.

## Recap

- A row wider than about 2 KB: Postgres compresses long columns first and, if still too wide, moves them out to the TOAST table as chunks.
- `length()` counts characters, `pg_column_size()` counts the bytes really stored after compression.
- Column strategies: `p` PLAIN, `x` EXTENDED (the default for `text`), `e` EXTERNAL, `m` MAIN.
- A query that skips the long column never reads TOAST; `SELECT *` has to reassemble and decompress.
- Measure a table with `pg_table_size`, because `pg_relation_size` leaves out TOAST.
