---
id: e-pg-ext-10
engine: postgres
level: EXT
module: ext-analysis
title: "tablefunc: crosstab xoay bảng"
title_en: "tablefunc: crosstab pivots"
kind: lab
runtime: browser
minutes: 14
verified: { version: "PostgreSQL 18.x (PGlite 0.5.16)", date: "2026-11-26" }
figures:
  - { name: pg-ext-crosstab-shift, at: pitfalls }
objectives:
  - vi: Xoay dòng dài thành bảng rộng bằng `sum(...) FILTER (WHERE ...)`, không cần extension.
    en: Pivot long rows into a wide table with `sum(...) FILTER (WHERE ...)`, no extension needed.
  - vi: Viết `crosstab` hai tham số, có danh sách cột cố định.
    en: Write the two-argument `crosstab`, with a fixed list of columns.
  - vi: Nhận ra vì sao dạng một tham số dồn giá trị sang sai cột khi thiếu dữ liệu.
    en: See why the one-argument form slides values into the wrong column when data is missing.
sources:
  - { url: https://www.postgresql.org/docs/18/tablefunc.html, title_vi: "tablefunc" }
  - { url: https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-AGGREGATES, title_vi: "Biểu thức › biểu thức gộp" }
lab:
  setup: |
    CREATE EXTENSION IF NOT EXISTS tablefunc;
    CREATE TABLE city_revenue (
      city text NOT NULL,
      month int NOT NULL,
      revenue int NOT NULL,
      PRIMARY KEY (city, month)
    );
    INSERT INTO city_revenue VALUES
      ('Da Nang', 8, 210), ('Da Nang', 9, 190), ('Da Nang', 10, 240),
      ('Hoi An', 8, 120), ('Hoi An', 9, 135), ('Hoi An', 10, 150),
      ('Hue', 8, 80), ('Hue', 10, 95);
  steps:
    - task:
        vi: "Bảng `city_revenue` giữ doanh thu (triệu đồng) của Chợ Lồng Đèn theo thành phố và tháng 8–10. Xoay thành một dòng mỗi thành phố với các cột `city`, `m8`, `m9`, `m10`, không dùng extension. Sắp theo `city`."
        en: "Table `city_revenue` holds Lantern Market's revenue (million VND) per city for months 8–10. Pivot it into one row per city with columns `city`, `m8`, `m9`, `m10`, without an extension. Order by `city`."
      solution: |-
        SELECT city,
          sum(revenue) FILTER (WHERE month = 8) AS m8,
          sum(revenue) FILTER (WHERE month = 9) AS m9,
          sum(revenue) FILTER (WHERE month = 10) AS m10
        FROM city_revenue GROUP BY city ORDER BY city
      check: rows
      ordered: true
      hint:
        vi: "Một cột cho mỗi tháng: `sum(revenue) FILTER (WHERE month = 8) AS m8`, rồi `GROUP BY city`."
        en: "One column per month: `sum(revenue) FILTER (WHERE month = 8) AS m8`, then `GROUP BY city`."
    - task:
        vi: "Ra cùng bảng đó bằng `crosstab` dạng hai tham số: câu nguồn trả `city, month, revenue` đã sắp, câu thứ hai liệt kê các tháng 8, 9, 10. Cột kết quả `city text, m8 int, m9 int, m10 int`, sắp theo `city`."
        en: "Produce the same table with the two-argument `crosstab`: the source query returns `city, month, revenue` sorted, the second query lists months 8, 9, 10. Result columns `city text, m8 int, m9 int, m10 int`, ordered by `city`."
      solution: |-
        SELECT city, m8, m9, m10
        FROM crosstab(
          $$SELECT city, month, revenue FROM city_revenue ORDER BY 1, 2$$,
          $$VALUES (8), (9), (10)$$
        ) AS ct(city text, m8 int, m9 int, m10 int)
        ORDER BY city
      check: rows
      ordered: true
      hint:
        vi: "`crosstab($$...$$, $$VALUES (8), (9), (10)$$) AS ct(city text, m8 int, m9 int, m10 int)`."
        en: "`crosstab($$...$$, $$VALUES (8), (9), (10)$$) AS ct(city text, m8 int, m9 int, m10 int)`."
    - task:
        vi: "Lấy danh sách tháng từ chính dữ liệu thay vì gõ tay: câu thứ hai là `SELECT DISTINCT month` đã sắp. Chỉ trả về các thành phố thiếu ít nhất một tháng: cột `city`."
        en: "Take the month list from the data itself instead of typing it: the second query is a sorted `SELECT DISTINCT month`. Return only the cities missing at least one month: column `city`."
      solution: |-
        SELECT city
        FROM crosstab(
          $$SELECT city, month, revenue FROM city_revenue ORDER BY 1, 2$$,
          $$SELECT DISTINCT month FROM city_revenue ORDER BY 1$$
        ) AS ct(city text, m8 int, m9 int, m10 int)
        WHERE m8 IS NULL OR m9 IS NULL OR m10 IS NULL
      check: rows
      hint:
        vi: "Tháng thiếu là `NULL` ở đúng cột của nó, nên lọc `m8 IS NULL OR m9 IS NULL OR m10 IS NULL`."
        en: "A missing month is `NULL` in its own column, so filter `m8 IS NULL OR m9 IS NULL OR m10 IS NULL`."
quiz:
  - q:
      vi: "Hue không có dòng tháng 9. Bạn chạy `crosstab` dạng một tham số với các cột `m8, m9, m10`. Dòng Hue ra sao?"
      en: "Hue has no September row. You run the one-argument `crosstab` with columns `m8, m9, m10`. What does Hue's row look like?"
    options:
      - { vi: "80, NULL, 95: crosstab nhìn tháng và để trống cột tháng 9", en: "80, NULL, 95: crosstab reads the month and leaves September empty" }
      - { vi: "Báo lỗi vì dòng Hue có ít giá trị hơn số cột đã khai", en: "An error, because Hue has fewer values than the declared columns" }
      - { vi: "80, 95, NULL: giá trị điền từ trái, tháng 10 rơi vào cột tháng 9", en: "80, 95, NULL: values fill from the left, October lands under September" }
    answer: 2
    trap: 0
    why:
      vi: "Nghe hợp lý vì câu nguồn có cột `month`, nhưng dạng một tham số bỏ qua giá trị của cột đó: nó chỉ đặt giá trị thứ nhất, thứ hai… vào cột thứ nhất, thứ hai… Không có lỗi nào. Dạng hai tham số dùng danh sách tháng để chọn đúng cột."
      en: "It sounds right because the source has a `month` column, but the one-argument form ignores that column's value: it puts the first, second… value into the first, second… column. There is no error. The two-argument form uses the month list to pick the right column."
  - q:
      vi: "Nhóm báo cáo không được cài extension trên database dùng chung. Cách nào vẫn ra bảng xoay đúng?"
      en: "The reporting team may not install extensions on the shared database. Which way still gives a correct pivot?"
    options:
      - { vi: "`sum(revenue) FILTER (WHERE month = 9)` cho từng cột, nhóm theo thành phố", en: "`sum(revenue) FILTER (WHERE month = 9)` for each column, grouped by city" }
      - { vi: "Không có cách nào: Postgres lõi không xoay được dòng thành cột", en: "There is none: core Postgres cannot turn rows into columns" }
      - { vi: "`string_agg(revenue::text, ',')` rồi tách chuỗi ở phía ứng dụng", en: "`string_agg(revenue::text, ',')` and split the string in the app" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì Postgres không có từ khóa `PIVOT` như vài database khác, nhưng `FILTER` trên hàm gộp làm đúng việc đó, mỗi cột một điều kiện. Danh sách cột phải viết sẵn, giống `crosstab`. Chuỗi gộp thì mất vị trí tháng khi thiếu dữ liệu."
      en: "It sounds right because Postgres has no `PIVOT` keyword like some other databases, but `FILTER` on an aggregate does exactly that, one condition per column. The column list must be written out, as with `crosstab`. A joined string loses the month positions when data is missing."
---
## Mở bài

Kế toán Chợ Lồng Đèn muốn một bảng: mỗi thành phố một dòng, mỗi tháng một cột. Dữ liệu lại nằm dọc: một dòng cho mỗi cặp thành phố và tháng. Xoay bảng thì dễ, xoay sai mà không ai biết mới là chuyện.

## Ý chính

Xoay bảng (pivot) là đổi giá trị của một cột thành tên cột. Postgres lõi làm được bằng hàm gộp có `FILTER`: mỗi cột kết quả là một `sum(...) FILTER (WHERE month = n)`, nhóm theo thành phố. Tháng không có dữ liệu thì cột đó là `NULL`, đúng chỗ.

Extension `tablefunc` có hàm `crosstab` làm cùng việc từ một câu nguồn trả ba cột: tên dòng, loại, giá trị. Vì hàm trả `record`, bạn phải khai danh sách cột sau `AS ct(...)`. Dạng hai tham số nhận thêm câu liệt kê các loại (ở đây là tháng); mỗi giá trị đi vào cột của loại khớp với nó.

Nhiều người nghĩ dạng một tham số cũng nhìn cột tháng. Thật ra nó bỏ qua giá trị của cột loại và chỉ điền từ trái sang phải theo thứ tự dòng. Khi một thành phố thiếu tháng, giá trị tháng sau trượt sang cột tháng trước, không có lỗi nào. Câu nguồn cũng phải sắp theo tên dòng, nếu không một thành phố bị tách thành nhiều dòng.

## Cú pháp

```sql
SELECT ... FROM crosstab(
  $$source_sql$$,
  $$category_sql$$
) AS ct(row_name type,
        cat1 type, cat2 type);
SELECT key,
  sum(v) FILTER (WHERE c = 1) AS c1
FROM t GROUP BY key;
```

- `source_sql`: trả tên dòng, loại, giá trị; sắp theo tên dòng.
- `category_sql`: trả các loại theo đúng thứ tự cột.
- `AS ct(...)`: bắt buộc, vì `crosstab` trả `record`.
- `FILTER`: cách xoay không cần extension.

## Ví dụ

Dữ liệu dọc của Hue:

```sql
SELECT city, month, revenue
FROM city_revenue
WHERE city = 'Hue'
ORDER BY month;
```

Hue có tháng 8 và tháng 10, không có tháng 9.

Xoay bằng `FILTER`:

```sql
SELECT city,
  sum(revenue)
    FILTER (WHERE month = 9) AS m9,
  sum(revenue)
    FILTER (WHERE month = 10) AS m10
FROM city_revenue
GROUP BY city
ORDER BY city;
```

Hue có `m9` là `NULL` và `m10` là 95.

Xoay bằng `crosstab` hai tham số:

```sql
SELECT city, m8, m9, m10
FROM crosstab(
  $$SELECT city, month, revenue
    FROM city_revenue
    ORDER BY 1, 2$$,
  $$VALUES (8), (9), (10)$$
) AS ct(city text, m8 int,
        m9 int, m10 int)
ORDER BY city;
```

Ba dòng; Hue là 80, `NULL`, 95.

## Lỗi hay gặp

Dùng dạng một tham số khi có tháng thiếu:

```sql
-- WRONG: values fill from the left
SELECT city, m8, m9, m10
FROM crosstab(
  $$SELECT city, month, revenue
    FROM city_revenue
    ORDER BY 1, 2$$
) AS ct(city text, m8 int,
        m9 int, m10 int)
ORDER BY city;
```

```sql
-- FIX: name the categories
SELECT city, m8, m9, m10
FROM crosstab(
  $$SELECT city, month, revenue
    FROM city_revenue
    ORDER BY 1, 2$$,
  $$VALUES (8), (9), (10)$$
) AS ct(city text, m8 int,
        m9 int, m10 int)
ORDER BY city;
```

Câu sai cho Hue 80, 95, `NULL`: doanh thu tháng 10 nằm ở cột tháng 9. Không có thông báo nào.

Quên danh sách cột:

```sql
-- ERROR 42601:
SELECT * FROM crosstab(
  $$SELECT city, month, revenue
    FROM city_revenue
    ORDER BY 1, 2$$,
  $$VALUES (8), (9), (10)$$
);
```

`crosstab` trả `record`, nên Postgres không biết cột nào ra; luôn viết `AS ct(...)`.

## Thực hành

Ba bước trên cùng bảng doanh thu: xoay bằng `FILTER`, xoay bằng `crosstab` hai tham số, rồi lấy danh sách tháng từ dữ liệu và tìm thành phố thiếu tháng. Sau lab là hai câu hỏi.

## Tóm tắt

- `sum(...) FILTER (WHERE ...)` xoay bảng trong Postgres lõi, không cần extension.
- `crosstab` cần câu nguồn đã sắp và danh sách cột `AS ct(...)`.
- Luôn dùng dạng hai tham số: mỗi giá trị vào đúng cột theo loại.
- Dạng một tham số dồn giá trị sang trái khi thiếu dữ liệu, không báo lỗi.

# EN

## Opening

Lantern Market's accountant wants a table: one row per city, one column per month. The data is long instead: one row per city and month. Pivoting is easy; pivoting wrongly without anyone noticing is the problem.

## Key idea

A pivot turns the values of one column into column names. Core Postgres does it with aggregates that carry `FILTER`: each result column is a `sum(...) FILTER (WHERE month = n)`, grouped by city. A month with no data is `NULL` in that column, in the right place.

The `tablefunc` extension has a `crosstab` function that does the same from a source query returning three columns: row name, category, value. Because the function returns `record`, you must declare the column list after `AS ct(...)`. The two-argument form also takes a query listing the categories (here, months); each value goes into the column of its matching category.

Many people think the one-argument form also looks at the month column. In fact it ignores the category's value and just fills from left to right in row order. When a city is missing a month, the next month's value slides into the earlier column, with no error. The source query must also be sorted by row name, or one city is split into several rows.

## Syntax

```sql
SELECT ... FROM crosstab(
  $$source_sql$$,
  $$category_sql$$
) AS ct(row_name type,
        cat1 type, cat2 type);
SELECT key,
  sum(v) FILTER (WHERE c = 1) AS c1
FROM t GROUP BY key;
```

- `source_sql`: returns row name, category, value; sorted by row name.
- `category_sql`: returns the categories in column order.
- `AS ct(...)`: required, because `crosstab` returns `record`.
- `FILTER`: the pivot that needs no extension.

## Example

Hue's long data:

```sql
SELECT city, month, revenue
FROM city_revenue
WHERE city = 'Hue'
ORDER BY month;
```

Hue has August and October, no September.

Pivot with `FILTER`:

```sql
SELECT city,
  sum(revenue)
    FILTER (WHERE month = 9) AS m9,
  sum(revenue)
    FILTER (WHERE month = 10) AS m10
FROM city_revenue
GROUP BY city
ORDER BY city;
```

Hue has `m9` = `NULL` and `m10` = 95.

Pivot with the two-argument `crosstab`:

```sql
SELECT city, m8, m9, m10
FROM crosstab(
  $$SELECT city, month, revenue
    FROM city_revenue
    ORDER BY 1, 2$$,
  $$VALUES (8), (9), (10)$$
) AS ct(city text, m8 int,
        m9 int, m10 int)
ORDER BY city;
```

Three rows; Hue is 80, `NULL`, 95.

## Common mistakes

Using the one-argument form when a month is missing:

```sql
-- WRONG: values fill from the left
SELECT city, m8, m9, m10
FROM crosstab(
  $$SELECT city, month, revenue
    FROM city_revenue
    ORDER BY 1, 2$$
) AS ct(city text, m8 int,
        m9 int, m10 int)
ORDER BY city;
```

```sql
-- FIX: name the categories
SELECT city, m8, m9, m10
FROM crosstab(
  $$SELECT city, month, revenue
    FROM city_revenue
    ORDER BY 1, 2$$,
  $$VALUES (8), (9), (10)$$
) AS ct(city text, m8 int,
        m9 int, m10 int)
ORDER BY city;
```

The wrong query gives Hue 80, 95, `NULL`: October's revenue sits under September. No message at all.

Forgetting the column list:

```sql
-- ERROR 42601:
SELECT * FROM crosstab(
  $$SELECT city, month, revenue
    FROM city_revenue
    ORDER BY 1, 2$$,
  $$VALUES (8), (9), (10)$$
);
```

`crosstab` returns `record`, so Postgres cannot know which columns come out; always write `AS ct(...)`.

## Practice

Three steps on the same revenue table: pivot with `FILTER`, pivot with the two-argument `crosstab`, then take the month list from the data and find the cities missing a month. Two questions follow the lab.

## Recap

- `sum(...) FILTER (WHERE ...)` pivots in core Postgres, no extension needed.
- `crosstab` needs a sorted source query and an `AS ct(...)` column list.
- Always use the two-argument form: each value goes to its category's column.
- The one-argument form slides values left when data is missing, with no error.
