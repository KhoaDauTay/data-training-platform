---
id: e-ol-l4-02
engine: olap
level: L4
module: chtuning
title: "SummingMergeTree: cộng dồn khi gộp part"
title_en: "SummingMergeTree: totals added up on merge"
kind: lab
runtime: browser
minutes: 30
figures: [{ name: ol-summing, at: idea }]
objectives:
  - vi: Biết SummingMergeTree thay các dòng cùng khóa sắp xếp bằng một dòng tổng, nhưng chỉ khi gộp part.
    en: Know that SummingMergeTree replaces rows with the same sorting key by one total row, but only when parts merge.
  - vi: Đọc đúng ngay cả trước khi gộp bằng `sum` + `GROUP BY`, như tài liệu khuyên.
    en: Read correctly even before a merge with `sum` + `GROUP BY`, as the docs advise.
  - vi: Tự làm bước gộp trên PostgreSQL, kể cả việc bỏ dòng có tổng bằng 0.
    en: Do the merge yourself on PostgreSQL, including dropping rows whose total is 0.
requires: [e-ol-l3-03]
sources:
  - { url: "https://clickhouse.com/docs/engines/table-engines/mergetree-family/summingmergetree", title: "ClickHouse docs: SummingMergeTree" }
  - { url: "https://www.postgresql.org/docs/18/tutorial-agg.html", title: "PostgreSQL 18 docs: Aggregate Functions (tutorial)" }
lab:
  setup: |
    CREATE TABLE daily_teu (
      port text, day date, teu int
    );
    INSERT INTO daily_teu
    SELECT (ARRAY['VNDAD', 'VNHPH',
        'VNSGN'])[1 + g % 3],
      date '2026-10-01' + g % 5,
      1 + g % 4
    FROM generate_series(1, 60) AS g;
    INSERT INTO daily_teu VALUES
      ('VNQNH', '2026-10-02', 5),
      ('VNQNH', '2026-10-02', -5);
  steps:
    - task:
        vi: "Chưa gộp thì mỗi cặp cảng và ngày còn bao nhiêu dòng? Trả `port`, `day`, `row_count`."
        en: "Before any merge, how many rows does each port and day pair have? Return `port`, `day`, `row_count`."
      solution: |
        SELECT port, day,
          count(*) AS row_count
        FROM daily_teu
        GROUP BY port, day;
      check: rows
      hint:
        vi: "`count(*)` theo `port, day`."
        en: "`count(*)` by `port, day`."
    - task:
        vi: "Đọc đúng ngay cả khi chưa gộp: tổng TEU của mỗi cặp cảng và ngày: `port`, `day`, `teu`."
        en: "Read correctly even before a merge: total TEU for each port and day pair: `port`, `day`, `teu`."
      solution: |
        SELECT port, day,
          sum(teu) AS teu
        FROM daily_teu
        GROUP BY port, day;
      check: rows
      hint:
        vi: "`sum(teu)` với `GROUP BY port, day`."
        en: "`sum(teu)` with `GROUP BY port, day`."
    - task:
        vi: "Tự làm bước gộp: dựng bảng `teu_summed` (`port`, `day`, `teu`), mỗi cặp một dòng tổng, bỏ cặp có tổng bằng 0 như SummingMergeTree."
        en: "Do the merge yourself: build table `teu_summed` (`port`, `day`, `teu`), one total row per pair, dropping pairs whose total is 0 as SummingMergeTree does."
      solution: |
        CREATE TABLE teu_summed AS
        SELECT port, day,
          sum(teu) AS teu
        FROM daily_teu
        GROUP BY port, day
        HAVING sum(teu) <> 0;
      after: SELECT port, day, teu FROM teu_summed
      check: rows
      hint:
        vi: "`CREATE TABLE teu_summed AS` câu của bước 2, thêm `HAVING sum(teu) <> 0`."
        en: "`CREATE TABLE teu_summed AS` with step 2's query, plus `HAVING sum(teu) <> 0`."
    - task:
        vi: "Báo cáo từ `teu_summed`: tổng TEU mỗi cảng: `port`, `teu`."
        en: "Report from `teu_summed`: total TEU per port: `port`, `teu`."
      solution: |
        SELECT port, sum(teu) AS teu
        FROM teu_summed
        GROUP BY port;
      check: rows
      hint:
        vi: "`sum(teu)` theo `port` trên `teu_summed`."
        en: "`sum(teu)` by `port` on `teu_summed`."
quiz:
  - q:
      vi: "Bảng SummingMergeTree vừa nhận hai lần chèn cho cùng `(port, day)`. Một câu đọc không có `GROUP BY` ngay sau đó trả gì cho cặp đó?"
      en: "A SummingMergeTree table just received two inserts for the same `(port, day)`. What does a read without `GROUP BY` return for that pair right after?"
    options:
      - { vi: "Một dòng, cộng lúc chèn", en: "One row, summed on insert" }
      - { vi: "Có thể hai dòng chưa cộng", en: "Maybe two rows, not summed" }
      - { vi: "Báo lỗi cho tới khi gộp", en: "An error until the merge" }
    answer: 1
    trap: 0
    why:
      vi: "Việc cộng không xảy ra lúc chèn: mỗi lần chèn tạo một part riêng, và tài liệu ghi các dòng chỉ được cộng khi gộp part, mà lần gộp nào cũng không bảo đảm gom hết. Vì thế hai dòng có thể vẫn nằm ở hai part và đều được đọc. Không có lỗi nào; tài liệu khuyên luôn đọc bằng `sum` + `GROUP BY` để kết quả đúng dù đã gộp hay chưa."
      en: "Nothing is summed on insert: each insert creates its own part, and the docs say rows are summed only when parts merge, with no guarantee that one merge gathers them all. So the two rows may still sit in two parts and both are read. There is no error; the docs advise always reading with `sum` + `GROUP BY` so the result is right whether or not a merge happened."
  - q:
      vi: "`SummingMergeTree` không khai danh sách cột, `ORDER BY (port, day)`, có cột số `teu` và cột chữ `vessel`. Khi gộp, cột nào được cộng?"
      en: "`SummingMergeTree` with no column list, `ORDER BY (port, day)`, a numeric column `teu` and a text column `vessel`. Which columns are summed on merge?"
    options:
      - { vi: "`teu` và cả cột khóa", en: "`teu` and the key columns" }
      - { vi: "Mọi cột, kể cả `vessel`", en: "Every column, `vessel` too" }
      - { vi: "Chỉ `teu`", en: "Only `teu`" }
    answer: 2
    trap: 0
    why:
      vi: "Cột khóa sắp xếp không bao giờ được cộng: chúng là thứ dùng để nhận ra các dòng cần gộp. Không khai danh sách thì tài liệu ghi mọi cột kiểu số nằm ngoài khóa được cộng, ở đây chỉ có `teu`. Cột chữ `vessel` không cộng được; nó giữ một giá trị lấy từ một trong các dòng cũ."
      en: "Sorting-key columns are never summed: they are what identifies the rows to merge. With no list, the docs say every numeric column outside the key is summed, here only `teu`. The text column `vessel` cannot be summed; it keeps one value taken from one of the old rows."
---
## Mở bài

Bảng TEU theo ngày của Cargo Query nhận một dòng cho mỗi lô chèn, nên một cặp cảng và ngày có nhiều dòng. Trong ClickHouse, SummingMergeTree cộng các dòng đó lại; bài này cho thấy việc cộng xảy ra khi nào và cách đọc đúng trước lúc đó.

## Ý chính

**SummingMergeTree** là một biến thể của MergeTree. Theo tài liệu, khi gộp part, các dòng có cùng khóa sắp xếp được thay bằng **một dòng** giữ tổng của các cột số. Có thể khai danh sách cột cần cộng (`SummingMergeTree((teu))`); không khai thì mọi cột số nằm ngoài khóa được cộng. Cột không cộng được giữ một giá trị lấy từ các dòng cũ. Dòng có mọi cột cộng bằng 0 bị bỏ khi gộp.

Việc cộng chỉ xảy ra **khi gộp part**, và lần gộp không bảo đảm gom hết các dòng cùng khóa. Vì thế tài liệu khuyên đọc bằng `sum` + `GROUP BY`. Tài liệu cũng khuyên giữ dữ liệu đầy đủ ở một bảng MergeTree và chỉ dùng SummingMergeTree cho dữ liệu đã tổng hợp, để khóa chọn sai không làm mất dữ liệu.

Trên PostgreSQL, bảng `daily_teu` là các part chưa gộp, và một bảng dựng bằng `GROUP BY … HAVING sum(teu) <> 0` là kết quả sau khi gộp.

## Cú pháp

```text
-- ClickHouse (read only)
CREATE TABLE daily_teu (
  port String, day Date,
  teu Int32
)
ENGINE = SummingMergeTree((teu))
ORDER BY (port, day);

SELECT port, day, sum(teu)
FROM daily_teu
GROUP BY port, day;
```

```sql
SELECT port, day,
  sum(teu) AS teu
FROM daily_teu
GROUP BY port, day
HAVING sum(teu) <> 0;
```

- `GROUP BY` theo đúng khóa sắp xếp: một dòng mỗi khóa.
- `HAVING sum(teu) <> 0`: bỏ khóa có tổng bằng 0, như khi gộp.

## Ví dụ

Các dòng của một cặp cảng và ngày, chưa cộng.

```sql
SELECT port, day, teu
FROM daily_teu
WHERE port = 'VNDAD'
  AND day = '2026-10-01';
```

Một bút toán và bút toán sửa của nó: hai dòng, tổng bằng 0.

```sql
SELECT port, day,
  count(*) AS row_count,
  sum(teu) AS teu
FROM daily_teu
WHERE port = 'VNQNH'
GROUP BY port, day;
```

## Lỗi hay gặp

Lấy một dòng mỗi khóa như thể bảng đã cộng sẵn: các dòng còn lại của khóa bị bỏ qua.

```sql
-- WRONG: one row, not the total
SELECT DISTINCT ON (port, day)
  port, day, teu
FROM daily_teu
ORDER BY port, day;
```

```sql
-- FIX: add the rows of each key
SELECT port, day,
  sum(teu) AS teu
FROM daily_teu
GROUP BY port, day
ORDER BY port, day;
```

Đếm số khóa mà quên khóa có tổng bằng 0: sau khi gộp, khóa đó không còn.

```sql
-- WRONG: counts the zero key
SELECT count(*) AS keys
FROM (SELECT DISTINCT port, day
  FROM daily_teu) s;
```

```sql
-- FIX: keys left after the merge
SELECT count(*) AS keys
FROM (SELECT port, day
  FROM daily_teu
  GROUP BY port, day
  HAVING sum(teu) <> 0) s;
```

## Thực hành

Bốn bước: đếm dòng mỗi khóa khi chưa gộp, đọc tổng đúng bằng `sum` + `GROUP BY`, tự gộp thành bảng `teu_summed`, rồi báo cáo theo cảng trên bảng đó.

## Tóm tắt

- SummingMergeTree thay các dòng cùng khóa bằng một dòng tổng, chỉ khi gộp part.
- Cột số ngoài khóa được cộng; dòng có tổng bằng 0 bị bỏ.
- Luôn đọc bằng `sum` + `GROUP BY`, vì lần gộp không bảo đảm gom hết.
- Giữ dữ liệu đầy đủ ở MergeTree, dùng SummingMergeTree cho bảng tổng hợp.

# EN

## Opening

Cargo Query's daily TEU table gets one row per insert batch, so one port and day pair has several rows. In ClickHouse, SummingMergeTree adds those rows up; this lesson shows when that happens and how to read correctly before it does.

## Key idea

**SummingMergeTree** is a variant of MergeTree. According to the docs, when parts merge, rows with the same sorting key are replaced by **one row** holding the totals of the numeric columns. You can list the columns to sum (`SummingMergeTree((teu))`); without a list, every numeric column outside the key is summed. A column that cannot be summed keeps one value taken from the old rows. A row whose summed columns all add up to 0 is dropped on merge.

Summing happens **only when parts merge**, and a merge is not guaranteed to gather every row with the same key. That is why the docs advise reading with `sum` + `GROUP BY`. The docs also advise keeping the full data in a MergeTree table and using SummingMergeTree only for aggregated data, so a badly chosen key cannot lose data.

On PostgreSQL, table `daily_teu` is the unmerged parts, and a table built with `GROUP BY … HAVING sum(teu) <> 0` is the result after the merge.

## Syntax

```text
-- ClickHouse (read only)
CREATE TABLE daily_teu (
  port String, day Date,
  teu Int32
)
ENGINE = SummingMergeTree((teu))
ORDER BY (port, day);

SELECT port, day, sum(teu)
FROM daily_teu
GROUP BY port, day;
```

```sql
SELECT port, day,
  sum(teu) AS teu
FROM daily_teu
GROUP BY port, day
HAVING sum(teu) <> 0;
```

- `GROUP BY` the sorting key itself: one row per key.
- `HAVING sum(teu) <> 0`: drop keys whose total is 0, as a merge does.

## Example

The rows of one port and day pair, not yet summed.

```sql
SELECT port, day, teu
FROM daily_teu
WHERE port = 'VNDAD'
  AND day = '2026-10-01';
```

An entry and its correction: two rows that add up to 0.

```sql
SELECT port, day,
  count(*) AS row_count,
  sum(teu) AS teu
FROM daily_teu
WHERE port = 'VNQNH'
GROUP BY port, day;
```

## Common mistakes

Taking one row per key as if the table were already summed: the key's other rows are ignored.

```sql
-- WRONG: one row, not the total
SELECT DISTINCT ON (port, day)
  port, day, teu
FROM daily_teu
ORDER BY port, day;
```

```sql
-- FIX: add the rows of each key
SELECT port, day,
  sum(teu) AS teu
FROM daily_teu
GROUP BY port, day
ORDER BY port, day;
```

Counting keys and forgetting the key whose total is 0: after the merge, that key is gone.

```sql
-- WRONG: counts the zero key
SELECT count(*) AS keys
FROM (SELECT DISTINCT port, day
  FROM daily_teu) s;
```

```sql
-- FIX: keys left after the merge
SELECT count(*) AS keys
FROM (SELECT port, day
  FROM daily_teu
  GROUP BY port, day
  HAVING sum(teu) <> 0) s;
```

## Practice

Four steps: count the rows per key before a merge, read the right totals with `sum` + `GROUP BY`, do the merge yourself into table `teu_summed`, then report by port on that table.

## Recap

- SummingMergeTree replaces rows with the same key by one total row, only when parts merge.
- Numeric columns outside the key are summed; a row totalling 0 is dropped.
- Always read with `sum` + `GROUP BY`, since a merge is not guaranteed to gather everything.
- Keep the full data in MergeTree; use SummingMergeTree for summary tables.
