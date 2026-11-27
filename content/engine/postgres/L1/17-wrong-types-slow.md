---
id: e-pg-l1-17
engine: postgres
level: L1
module: ddl
title: "Kiểu sai: đúng mà chậm"
title_en: "Wrong types: right but slow"
kind: lab
runtime: browser
minutes: 15
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Nhận ra số và ngày lưu dưới dạng `text` làm sai thứ tự, sai khoảng và không dùng được index.
    en: Spot numbers and dates stored as `text` that sort wrong, filter ranges wrong and cannot use an index.
  - vi: Viết điều kiện cùng kiểu với cột để kế hoạch vẫn đọc qua index.
    en: Write conditions of the same type as the column so the plan still reads through the index.
  - vi: Lọc một ngày trên cột `timestamptz` bằng khoảng nửa mở thay vì ép cột về `date`.
    en: Filter one day on a `timestamptz` column with a half-open range instead of casting the column to `date`.
requires: [e-pg-l1-09]
figures: [{ name: pg-text-compare, at: idea }]
sources:
  - { url: https://www.postgresql.org/docs/18/datatype.html, title_vi: "Kiểu dữ liệu" }
  - { url: https://www.postgresql.org/docs/18/datatype-datetime.html, title_vi: "Kiểu ngày giờ" }
  - { url: https://www.postgresql.org/docs/18/typeconv-oper.html, title_vi: "Chuyển kiểu cho toán tử" }
  - { url: https://www.postgresql.org/docs/18/indexes-types.html, title_vi: "Các loại index" }
  - { url: https://www.postgresql.org/docs/18/indexes-expressional.html, title_vi: "Index trên biểu thức" }
  - { url: https://www.postgresql.org/docs/18/using-explain.html, title_vi: "Dùng EXPLAIN" }
lab:
  setup: |
    CREATE TABLE readings (
      id bigint PRIMARY KEY,
      sensor_id int NOT NULL,
      read_at timestamptz NOT NULL,
      value numeric(6,1) NOT NULL
    );
    INSERT INTO readings
    SELECT g, 1 + (g * 7919) % 500,
           timestamptz '2026-01-01 00:00:00+00' + (g % 200) * interval '1 day' + (g % 1440) * interval '1 minute',
           (g % 1000) / 10.0
    FROM generate_series(1, 20000) AS g;
    CREATE INDEX readings_sensor_idx ON readings (sensor_id);
    CREATE INDEX readings_time_idx ON readings (read_at);
    -- wrong on purpose: the same data with every column as text
    CREATE TABLE readings_text (
      id bigint PRIMARY KEY,
      sensor_id text NOT NULL,
      read_on text NOT NULL,
      value text NOT NULL
    );
    INSERT INTO readings_text
    SELECT id, sensor_id::text, to_char(read_at, 'DD/MM/YYYY'), value::text FROM readings;
    CREATE INDEX readings_text_sensor_idx ON readings_text (sensor_id);
    ANALYZE;
  steps:
    - task:
        vi: "Đếm số lần đo và giá trị trung bình (làm tròn 2 chữ số) của cảm biến 42 trong `readings`. Bài chấm cả tốc độ: câu phải đọc qua index của `sensor_id`."
        en: "Count the readings of sensor 42 in `readings` and their average value (rounded to 2 decimals). Speed is graded too: the query must read through the index on `sensor_id`."
      solution: SELECT count(*), round(avg(value), 2) FROM readings WHERE sensor_id = 42
      check: rows
      perf: { table: readings }
      slow: SELECT count(*), round(avg(value), 2) FROM readings WHERE sensor_id = 42.0
      hint:
        vi: "Cột là `int`: so với một số nguyên. `42.0` là `numeric`, nên Postgres phải ép cột sang `numeric` và bỏ index."
        en: "The column is `int`: compare it with an integer. `42.0` is a `numeric`, so Postgres must cast the column to `numeric` and skip the index."
    - task:
        vi: "Đếm số lần đo và giá trị lớn nhất trong ngày 2026-03-01 (giờ UTC) của `readings`. Câu phải đọc qua index của `read_at`."
        en: "Count the readings and the highest value on 2026-03-01 (UTC) in `readings`. The query must read through the index on `read_at`."
      solution: SELECT count(*), max(value) FROM readings WHERE read_at >= timestamptz '2026-03-01 00:00:00+00' AND read_at < timestamptz '2026-03-02 00:00:00+00'
      check: rows
      perf: { table: readings }
      slow: SELECT count(*), max(value) FROM readings WHERE read_at::date = date '2026-03-01'
      hint:
        vi: "Dùng khoảng nửa mở trên cột trần: từ 00:00 ngày đó (`>=`) tới trước 00:00 ngày sau (`<`)."
        en: "Use a half-open range on the bare column: from 00:00 that day (`>=`) to before 00:00 the next day (`<`)."
    - task:
        vi: "Sửa bảng sai `readings_text`: đổi cột `sensor_id` sang `int`."
        en: "Fix the wrong table `readings_text`: change column `sensor_id` to `int`."
      solution: ALTER TABLE readings_text ALTER COLUMN sensor_id TYPE int USING sensor_id::int
      check: catalog
      hint:
        vi: "`ALTER COLUMN … TYPE int USING sensor_id::int`. Index trên cột được dựng lại theo kiểu mới."
        en: "`ALTER COLUMN … TYPE int USING sensor_id::int`. The index on the column is rebuilt for the new type."
    - task:
        vi: "Mã cảm biến lớn nhất trong `readings_text` là bao nhiêu? Một cột, một dòng."
        en: "What is the largest sensor number in `readings_text`? One column, one row."
      solution: SELECT max(sensor_id) FROM readings_text
      check: rows
      hint:
        vi: "Sau khi sửa kiểu, `max` so theo số và đọc được ngay từ cuối index."
        en: "After the type fix, `max` compares numbers and can read straight from the end of the index."
quiz:
  - q:
      vi: "Cột `sensor_id` kiểu `int` có index. Ứng dụng gửi tham số kiểu `numeric`, nên câu chạy là `WHERE sensor_id = 42.0`. Chuyện gì xảy ra?"
      en: "Column `sensor_id` is an indexed `int`. The application sends a `numeric` parameter, so the query runs `WHERE sensor_id = 42.0`. What happens?"
    options:
      - { vi: "Postgres đổi `42.0` thành `42` rồi dùng index như thường", en: "Postgres turns `42.0` into `42` and uses the index as usual" }
      - { vi: "Kết quả vẫn đúng, nhưng cột bị ép sang `numeric` nên kế hoạch đọc cả bảng", en: "The result is still right, but the column is cast to `numeric`, so the plan reads the whole table" }
      - { vi: "Lỗi vì hai kiểu khác nhau", en: "An error because the types differ" }
    answer: 1
    trap: 0
    why:
      vi: "\"Postgres đổi `42.0` thành `42`\" nghe hợp lý vì hai số bằng nhau, nhưng Postgres không ép một `numeric` xuống `int` (có thể mất phần lẻ). Nó ép cột lên `numeric` cho từng dòng, và index xếp theo `int` không tra được giá trị `numeric`, nên kế hoạch đọc cả bảng. Không lỗi: kết quả vẫn đúng, chỉ chậm. So với `bigint` thì vẫn dùng index, vì Postgres có sẵn phép so `int` với `bigint` mà index hiểu được."
      en: "\"Postgres turns `42.0` into `42`\" sounds right because the two numbers are equal, but Postgres does not cast a `numeric` down to `int` (it could lose the fraction). It casts the column up to `numeric` on every row, and an index ordered by `int` cannot look up a `numeric` value, so the plan reads the whole table. No error: the result is right, just slow. Comparing with a `bigint` still uses the index, because Postgres has a built-in `int`-to-`bigint` comparison the index understands."
  - q:
      vi: "Ngày lưu dạng `text` theo mẫu `DD/MM/YYYY`. `WHERE read_on BETWEEN '01/03/2026' AND '31/03/2026'` trả gì?"
      en: "Dates are stored as `text` in the form `DD/MM/YYYY`. What does `WHERE read_on BETWEEN '01/03/2026' AND '31/03/2026'` return?"
    options:
      - { vi: "Đúng các ngày của tháng 3", en: "Exactly the days of March" }
      - { vi: "Gần như mọi dòng, vì chữ được so từng ký tự, bắt đầu bằng ngày", en: "Almost every row, because text compares character by character, starting with the day" }
      - { vi: "Lỗi vì không phải kiểu `date`", en: "An error because it is not a `date`" }
    answer: 1
    why:
      vi: "Không lỗi, vì cả cột lẫn hai mốc đều là chữ, và Postgres so chữ với chữ: từng ký tự từ trái sang phải. Ký tự đầu là ngày, nên `'15/07/2026'` (\"15\") nằm giữa `'01/03/2026'` (\"01\") và `'31/03/2026'` (\"31\") dù là tháng 7. Mọi ngày từ 01 tới 31 của mọi tháng đều lọt vào. Lưu ngày bằng kiểu `date` hoặc `timestamptz` thì thứ tự và khoảng mới đúng."
      en: "No error, because the column and both bounds are text, and Postgres compares text with text: character by character, left to right. The first characters are the day, so `'15/07/2026'` (\"15\") falls between `'01/03/2026'` (\"01\") and `'31/03/2026'` (\"31\") although it is in July. Every day 01 to 31 of every month gets in. Store dates as `date` or `timestamptz` to get the right order and ranges."
---
## Mở bài

Câu báo cáo của bạn trả đúng số, nhưng mỗi lần chạy lại chậm hơn khi bảng lớn lên. Index đã có, `EXPLAIN` vẫn ghi Seq Scan. Lỗi không nằm ở câu truy vấn mà ở kiểu dữ liệu.

## Ý chính

Kiểu của cột quyết định ba điều: so sánh và sắp xếp ra sao, khoảng nào là đúng, và index nào dùng được. Số lưu dưới dạng `text` thì `'99'` lớn hơn `'500'`, vì chữ được so từng ký tự. Ngày dạng `'DD/MM/YYYY'` thì một khoảng `BETWEEN` gom cả các tháng khác.

Index B-tree chỉ dùng được khi điều kiện so chính cột đó với một giá trị cùng họ kiểu. Nhiều người nghĩ Postgres sẽ tự đổi giá trị cho khớp cột. Thật ra khi hai kiểu khác nhau, Postgres thường ép phía cột: `int` so với `42.0` thành `sensor_id::numeric = 42.0`, và index xếp theo `int` không phục vụ được biểu thức đó. Kết quả vẫn đúng, chỉ là đọc cả bảng.

Ép cột về kiểu khác trong `WHERE` cũng vậy: `read_at::date = …`, `sensor_id::int = 42` trên cột chữ. Cách sửa: chọn đúng kiểu ngay từ đầu, viết hằng cùng kiểu với cột, lọc ngày bằng khoảng nửa mở trên cột trần. Nếu chưa sửa được bảng, index trên biểu thức là đường lui.

Lưu ý: ép `timestamptz` về `date` dùng múi giờ của phiên, nên cùng một câu có thể ra ngày khác nhau ở hai máy. Lab này chạy ở UTC.

Hình từng bước ở cuối mục này so cùng dữ liệu lưu bằng kiểu đúng và bằng `text`: cả số dòng trả về cũng khác.

## Cú pháp

```sql
SELECT ... FROM table_name WHERE column = value_of_the_same_type;
SELECT ... FROM table_name
WHERE ts_column >= timestamptz 'day 00:00+00' AND ts_column < timestamptz 'next day 00:00+00';
ALTER TABLE table_name ALTER COLUMN column TYPE right_type USING column::right_type;
CREATE INDEX index_name ON table_name ((expression));
```

- Cùng kiểu: cột `int` so với số nguyên, cột `date` so với `date`.
- Khoảng nửa mở: `>=` đầu ngày, `<` đầu ngày sau; không cần biết ngày kết thúc lúc mấy giờ.
- `USING`: chuyển dữ liệu cũ sang kiểu đúng (bài Sửa bảng an toàn).
- Index trên biểu thức: chỉ khi câu viết đúng biểu thức đó.

## Ví dụ

`readings_text` là bảng sai cố ý: cùng dữ liệu với `readings` nhưng mọi cột là `text`. So `max` theo chữ và theo số:

```sql
SELECT max(sensor_id) AS text_max, max(sensor_id::int) AS number_max FROM readings_text;
```

`text_max` là `'99'`, còn mã lớn nhất thật là 500.

Trên bảng đúng kiểu, điều kiện cùng kiểu đọc qua index:

```sql
EXPLAIN SELECT count(*) FROM readings WHERE sensor_id = 42;
```

Kế hoạch có Bitmap Index Scan trên `readings_sensor_idx`. Lọc cả tháng 3 bằng khoảng nửa mở:

```sql
SELECT count(*) FROM readings
WHERE read_at >= timestamptz '2026-03-01 00:00:00+00' AND read_at < timestamptz '2026-04-01 00:00:00+00';
```

## Lỗi hay gặp

So cột chữ với một số:

```sql
-- ERROR 42883: operator does not exist: text = integer
SELECT count(*) FROM readings_text WHERE sensor_id = 42;
```

Postgres không tự ép giữa `text` và số. Viết `sensor_id::int = 42` thì chạy, nhưng ép cột nên mất index; cách đúng là đổi kiểu cột.

Lọc khoảng trên ngày lưu dạng chữ:

```sql
-- WRONG: text compares character by character, so other months match
SELECT count(*) FROM readings_text WHERE read_on BETWEEN '01/03/2026' AND '31/03/2026';
```

```sql
-- FIX: compare real dates
SELECT count(*) FROM readings_text
WHERE to_date(read_on, 'DD/MM/YYYY') >= date '2026-03-01' AND to_date(read_on, 'DD/MM/YYYY') < date '2026-04-01';
```

Câu sai đếm 19700 dòng, câu sửa đếm 3100 như bảng đúng kiểu. Câu sửa vẫn phải chuyển từng dòng, nên chỉ là chữa cháy.

Hằng khác kiểu với cột số:

```sql
-- WRONG: 42.0 is numeric, so the int column is cast and the index is skipped
EXPLAIN SELECT count(*) FROM readings WHERE sensor_id = 42.0;
```

```sql
-- FIX: an integer constant keeps the index
EXPLAIN SELECT count(*) FROM readings WHERE sensor_id = 42;
```

Kế hoạch sai là Seq Scan với `Filter: ((sensor_id)::numeric = 42.0)`. Hãy đọc dòng `Filter` hoặc `Index Cond`: thấy cột bị ép kiểu là biết index bị bỏ.

## Thực hành

Bảng `readings` có kiểu đúng và index trên `sensor_id`, `read_at`; bảng `readings_text` sai cố ý. Viết hai câu đọc đi qua index (bài chấm cả tốc độ), sửa kiểu một cột của bảng sai, rồi đọc lại. Sau đó là 2 câu hỏi.

## Tóm tắt

- Số và ngày lưu dạng `text` sắp xếp sai và lọc khoảng sai, dù câu trông đúng.
- Khi hai kiểu khác nhau, Postgres thường ép phía cột, và index trên cột bị bỏ.
- Viết hằng cùng kiểu với cột; kiểm bằng `EXPLAIN` xem có `Index Cond` hay cột bị ép trong `Filter`.
- Lọc một ngày trên `timestamptz` bằng khoảng nửa mở, không ép cột về `date`.
- Cách sửa gốc là đổi kiểu cột bằng `ALTER TABLE … TYPE … USING`.

# EN

## Opening

Your report query returns the right numbers, but it gets slower every time the table grows. The index exists, yet `EXPLAIN` still says Seq Scan. The fault is not in the query but in the data type.

## Key idea

A column's type decides three things: how values compare and sort, which ranges are right, and which index can be used. With numbers stored as `text`, `'99'` is greater than `'500'`, because text compares character by character. With dates as `'DD/MM/YYYY'`, a `BETWEEN` range picks up other months too.

A B-tree index only helps when the condition compares the column itself with a value of the same type family. Many people think Postgres will convert the value to match the column. In fact when the two types differ Postgres usually casts the column side: `int` compared with `42.0` becomes `sensor_id::numeric = 42.0`, and an index ordered by `int` cannot serve that expression. The result is still right; the table is just read in full.

Casting the column in `WHERE` does the same: `read_at::date = …`, `sensor_id::int = 42` on a text column. The fix: pick the right type from the start, write constants of the column's type, filter a day with a half-open range on the bare column. If you cannot fix the table yet, an index on the expression is a fallback.

Note: casting `timestamptz` to `date` uses the session time zone, so the same query can give different days on two machines. This lab runs in UTC.

The step-through figure at the end of this section compares the same data stored with the right types and as `text`: even the row counts differ.

## Syntax

```sql
SELECT ... FROM table_name WHERE column = value_of_the_same_type;
SELECT ... FROM table_name
WHERE ts_column >= timestamptz 'day 00:00+00' AND ts_column < timestamptz 'next day 00:00+00';
ALTER TABLE table_name ALTER COLUMN column TYPE right_type USING column::right_type;
CREATE INDEX index_name ON table_name ((expression));
```

- Same type: an `int` column against an integer, a `date` column against a `date`.
- Half-open range: `>=` the start of the day, `<` the start of the next day; no need to know when the day ends.
- `USING`: converts the old data to the right type (lesson Altering tables safely).
- Index on an expression: only helps when the query writes that exact expression.

## Example

`readings_text` is wrong on purpose: the same data as `readings` but every column is `text`. Compare `max` as text and as a number:

```sql
SELECT max(sensor_id) AS text_max, max(sensor_id::int) AS number_max FROM readings_text;
```

`text_max` is `'99'`, while the real largest number is 500.

On the table with the right types, a condition of the same type reads through the index:

```sql
EXPLAIN SELECT count(*) FROM readings WHERE sensor_id = 42;
```

The plan has a Bitmap Index Scan on `readings_sensor_idx`. Filter all of March with a half-open range:

```sql
SELECT count(*) FROM readings
WHERE read_at >= timestamptz '2026-03-01 00:00:00+00' AND read_at < timestamptz '2026-04-01 00:00:00+00';
```

## Common mistakes

Comparing a text column with a number:

```sql
-- ERROR 42883: operator does not exist: text = integer
SELECT count(*) FROM readings_text WHERE sensor_id = 42;
```

Postgres does not cast between `text` and numbers on its own. Writing `sensor_id::int = 42` runs, but it casts the column and loses the index; the real fix is to change the column type.

Filtering a range on dates stored as text:

```sql
-- WRONG: text compares character by character, so other months match
SELECT count(*) FROM readings_text WHERE read_on BETWEEN '01/03/2026' AND '31/03/2026';
```

```sql
-- FIX: compare real dates
SELECT count(*) FROM readings_text
WHERE to_date(read_on, 'DD/MM/YYYY') >= date '2026-03-01' AND to_date(read_on, 'DD/MM/YYYY') < date '2026-04-01';
```

The wrong version counts 19700 rows, the fix counts 3100, like the table with the right types. The fix still converts every row, so it is only a stopgap.

A constant of another type than the numeric column:

```sql
-- WRONG: 42.0 is numeric, so the int column is cast and the index is skipped
EXPLAIN SELECT count(*) FROM readings WHERE sensor_id = 42.0;
```

```sql
-- FIX: an integer constant keeps the index
EXPLAIN SELECT count(*) FROM readings WHERE sensor_id = 42;
```

The wrong plan is a Seq Scan with `Filter: ((sensor_id)::numeric = 42.0)`. Read the `Filter` or `Index Cond` line: a cast on the column tells you the index was skipped.

## Practice

Table `readings` has the right types and indexes on `sensor_id` and `read_at`; table `readings_text` is wrong on purpose. Write two reads that go through an index (speed is graded too), fix the type of one column of the wrong table, then read it again. Then 2 questions.

## Recap

- Numbers and dates stored as `text` sort wrong and filter ranges wrong, even when the query looks right.
- When two types differ, Postgres usually casts the column side, and the column's index is skipped.
- Write constants of the column's type; check with `EXPLAIN` for an `Index Cond` or a cast column in `Filter`.
- Filter one day on `timestamptz` with a half-open range, never by casting the column to `date`.
- The root fix is changing the column type with `ALTER TABLE … TYPE … USING`.
