---
id: date_bucket
title: "Gom theo tháng, tuần, thứ: date_trunc, extract, to_char"
title_en: "Bucketing by month, week, weekday: date_trunc, extract, to_char"
minutes: 25
figures: [{ name: sql-half-open-range, at: idea, variant: month }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Đếm hay cộng theo tháng, tuần bằng `date_trunc` và `GROUP BY`.
    en: Count or sum per month or week with `date_trunc` and `GROUP BY`.
  - vi: Lấy một phần của ngày (thứ, giờ) bằng `extract`.
    en: Take one part of a date (weekday, hour) with `extract`.
  - vi: Chọn cách gom giữ đúng năm và xếp đúng thứ tự thời gian.
    en: Pick a bucket that keeps the year and sorts in time order.
syntax: |-
  SELECT date_trunc('month', date_column) AS month, count(*)
  FROM table_name
  [WHERE date_column >= '2026-01-01']
  GROUP BY 1
  ORDER BY 1
options:
  - { code: "date_trunc('month', d)", vi: "lùi về ngày đầu tháng (giữ năm)", en: "rolls back to the first day of the month (keeps the year)" }
  - { code: "date_trunc('week', d)", vi: "lùi về thứ Hai đầu tuần", en: "rolls back to the Monday that starts the week" }
  - { code: "extract(isodow FROM d)", vi: "thứ trong tuần, 1 = thứ Hai … 7 = Chủ nhật", en: "day of the week, 1 = Monday … 7 = Sunday" }
  - { code: "extract(hour FROM ts)", vi: "giờ trong ngày, 0–23", en: "hour of the day, 0–23" }
  - { code: "to_char(d, 'YYYY-MM')", vi: "chữ để hiển thị; năm trước tháng để xếp đúng", en: "text for display; year before month so it sorts right" }
examples:
  - title: { vi: "Số đơn mỗi tháng", en: "Orders per month" }
    sql: |-
      SELECT date_trunc('month', order_date) AS month, count(*) AS orders
      FROM orders
      WHERE order_date >= '2026-07-01'
      GROUP BY 1
      ORDER BY 1
    read:
      vi: "4 tháng, tăng dần từ 124 đơn (tháng 7) tới 217 đơn (tháng 10). Mọi ngày trong một tháng được lùi về ngày 1, nên chúng rơi vào cùng một nhóm."
      en: "4 months, rising from 124 orders (July) to 217 (October). Every day of a month is rolled back to the 1st, so they all fall into the same group."
  - title: { vi: "Số đơn mỗi tuần", en: "Orders per week" }
    sql: |-
      SELECT date_trunc('week', order_date)::date AS week, count(*)
      FROM orders
      WHERE order_date >= '2026-10-01'
      GROUP BY 1
      ORDER BY 1
    read:
      vi: "5 tuần, bắt đầu từ thứ Hai 28/09: tuần đầu chỉ có 27 đơn vì điều kiện lọc bỏ các ngày tháng 9 của tuần đó. Tuần ở mép khoảng lọc thường thiếu ngày."
      en: "5 weeks, starting on Monday 28 September: the first week has only 27 orders because the filter drops its September days. Weeks at the edge of a filter are often short."
  - title: { vi: "Thứ nào bán nhiều đơn nhất", en: "Which weekday sells the most" }
    sql: |-
      SELECT extract(isodow FROM order_date) AS weekday, count(*)
      FROM orders
      GROUP BY 1
      ORDER BY 1
    read:
      vi: "7 dòng, thứ Tư (3) nhiều nhất với 225 đơn. `extract` bỏ hẳn năm và tháng, nên ở đây mọi tuần dồn vào 7 nhóm thứ, đúng ý câu hỏi."
      en: "7 rows; Wednesday (3) leads with 225 orders. `extract` drops the year and month entirely, which is exactly what this question wants."
  - title: { vi: "Tháng dạng chữ để hiển thị", en: "Months as text for display" }
    sql: |-
      SELECT to_char(order_date, 'YYYY-MM') AS month, count(*)
      FROM orders
      WHERE order_date >= '2026-08-01'
      GROUP BY 1
      ORDER BY 1
    read:
      vi: "3 dòng `2026-08`, `2026-09`, `2026-10`. Kết quả là chữ, nhưng vì năm đứng trước tháng nên xếp theo chữ cũng đúng thứ tự thời gian."
      en: "3 rows `2026-08`, `2026-09`, `2026-10`. The result is text, but with the year before the month, a text sort is also time order."
  - title: { vi: "Giờ cao điểm thanh toán", en: "Peak payment hours" }
    sql: |-
      SELECT extract(hour FROM paid_at) AS hour, count(*)
      FROM payments
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 3
    read:
      vi: "Ba giờ đông nhất là 8 giờ sáng (135 khoản), 18 giờ và 16 giờ. `ORDER BY 2 DESC` xếp theo cột thứ hai, tức số khoản."
      en: "The three busiest hours are 8 in the morning (135 payments), 18:00 and 16:00. `ORDER BY 2 DESC` sorts by the second column, the count."
pitfalls:
  - title: { vi: "Lấy tháng bằng extract làm trộn các năm", en: "Taking the month with extract mixes the years" }
    wrong: "SELECT extract(month FROM order_date) AS month, count(*) FROM orders GROUP BY 1 ORDER BY 1"
    fix: "SELECT date_trunc('month', order_date) AS month, count(*) FROM orders GROUP BY 1 ORDER BY 1"
    why:
      vi: "Dữ liệu trải từ 01/2025 tới 10/2026. `extract(month …)` chỉ giữ số tháng nên tháng 1/2025 và tháng 1/2026 cộng chung: 12 dòng thay vì 22. `date_trunc` giữ năm."
      en: "The data runs from January 2025 to October 2026. `extract(month …)` keeps only the month number, so January 2025 and January 2026 are added together: 12 rows instead of 22. `date_trunc` keeps the year."
  - title: { vi: "Tháng trước năm trong to_char", en: "Month before year in to_char" }
    wrong: "SELECT to_char(order_date, 'MM-YYYY') AS month, count(*) FROM orders WHERE order_date >= '2025-11-01' GROUP BY 1 ORDER BY 1 LIMIT 3"
    fix: "SELECT to_char(order_date, 'YYYY-MM') AS month, count(*) FROM orders WHERE order_date >= '2025-11-01' GROUP BY 1 ORDER BY 1 LIMIT 3"
    why:
      vi: "Kết quả của `to_char` là chữ, xếp theo từng ký tự: `01-2026` đứng trước `11-2025`. Câu hỏi \"ba tháng đầu tiên\" nhận nhầm tháng 1–3/2026. Đặt năm trước, hoặc xếp theo `date_trunc`."
      en: "`to_char` returns text, which sorts character by character: `01-2026` comes before `11-2025`. The question \"the first three months\" wrongly gets January to March 2026. Put the year first, or sort by `date_trunc`."
quiz:
  - q:
      vi: "Muốn so doanh số tháng 10/2025 với tháng 10/2026, nên gom bằng gì?"
      en: "To compare October 2025 with October 2026, what should you group by?"
    options:
      - { vi: "`extract(month FROM d)`, vì cả hai đều là tháng 10", en: "`extract(month FROM d)`, because both are October" }
      - { vi: "`date_trunc('month', d)`, để hai tháng 10 là hai nhóm riêng", en: "`date_trunc('month', d)`, so the two Octobers are separate groups" }
      - { vi: "`to_char(d, 'MM')`", en: "`to_char(d, 'MM')`" }
    answer: 1
    trap: 0
    why:
      vi: "\"Tháng 10\" nghe như một giá trị, nên `extract(month …)` có vẻ hợp. Nhưng nó dồn mọi tháng 10 vào một nhóm, nên không còn hai con số để so. `date_trunc` giữ năm."
      en: "\"October\" sounds like one value, so `extract(month …)` looks fitting. But it merges every October into one group and the comparison is gone. `date_trunc` keeps the year."
  - q:
      vi: "Vì sao lọc \"tháng 10\" bằng `WHERE date_trunc('month', order_date) = '2026-10-01'` kém hơn khoảng nửa mở?"
      en: "Why is filtering October with `WHERE date_trunc('month', order_date) = '2026-10-01'` worse than a half-open range?"
    options:
      - { vi: "Nó ra kết quả sai", en: "It returns the wrong rows" }
      - { vi: "Nó bọc cột trong hàm, nên Postgres không dùng được chỉ mục trên `order_date`", en: "It wraps the column in a function, so Postgres cannot use the index on `order_date`" }
      - { vi: "`date_trunc` không dùng được trong `WHERE`", en: "`date_trunc` is not allowed in `WHERE`" }
    answer: 1
    trap: 0
    why:
      vi: "Câu đó ra đúng dòng, nên dễ nghĩ chỉ là khác cách viết. Nhưng chỉ mục lưu giá trị `order_date`, không lưu `date_trunc(...)` của nó, nên Postgres phải đọc cả bảng. Gom bằng `date_trunc` trong `SELECT`; lọc bằng khoảng trên cột trần."
      en: "It returns the right rows, so it feels like a matter of style. But the index stores `order_date` values, not their `date_trunc(...)`, so Postgres has to read the whole table. Bucket with `date_trunc` in `SELECT`; filter with a range on the bare column."
recap:
  - vi: "`date_trunc` gom theo tháng/tuần và giữ năm; `extract` lấy một phần, bỏ phần còn lại."
    en: "`date_trunc` buckets by month/week and keeps the year; `extract` takes one part and drops the rest."
  - vi: "`to_char` cho chữ để hiển thị; đặt năm trước tháng."
    en: "`to_char` gives display text; put the year before the month."
  - vi: "Gom trong `SELECT`/`GROUP BY`, lọc bằng khoảng trên cột trần trong `WHERE`."
    en: "Bucket in `SELECT`/`GROUP BY`, filter with a range on the bare column in `WHERE`."
sources:
  - https://www.postgresql.org/docs/current/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC
  - https://www.postgresql.org/docs/current/functions-formatting.html
---
## Mở bài

Giám đốc muốn một biểu đồ: số đơn mỗi tháng trong năm nay. Bảng `orders` có một ngày cho mỗi đơn, nhưng biểu đồ cần một cột cho mỗi **tháng**. Bạn cần biến từng ngày thành cái "giỏ" tháng của nó rồi đếm.

## Ý chính

`date_trunc('month', order_date)` lùi một ngày về ngày đầu tháng của nó, nên mọi ngày trong cùng tháng cho cùng một giá trị; gom nhóm theo giá trị đó là có số liệu mỗi tháng. `'week'` lùi về thứ Hai. `extract` thì lấy riêng một phần (thứ, giờ, tháng) và bỏ hết phần còn lại.

Nhiều người nghĩ **`extract(month …)` là cách gom theo tháng**. Thật ra nó trả số 1–12 và quên năm: tháng 1/2025 và 1/2026 rơi vào một giỏ. Muốn từng tháng trên dòng thời gian, dùng `date_trunc`; chỉ dùng `extract` khi câu hỏi thật sự gom chung mọi năm (như "thứ nào đông nhất").

Hình cuối mục này cho thấy một tháng là khoảng nửa mở từ đầu tháng tới đầu tháng sau, đúng giá trị `date_trunc` trả về.

## Cú pháp

Đơn vị (`'month'`, `'week'`, `'day'`) là chữ trong nháy đơn.

# EN

## Opening

The director wants a chart: the number of orders per month this year. The `orders` table has one date per order, but the chart needs one bar per **month**. You need to turn each date into its month "bucket" and then count.

## Key idea

`date_trunc('month', order_date)` rolls a date back to the first day of its month, so every day of the same month gives the same value; grouping by that value gives one figure per month. `'week'` rolls back to Monday. `extract` takes one part on its own (weekday, hour, month) and drops everything else.

Many people think **`extract(month …)` is the way to group by month**. In fact it returns 1–12 and forgets the year: January 2025 and January 2026 land in one bucket. For each month on a timeline, use `date_trunc`; use `extract` only when the question really merges every year (such as "which weekday is busiest").

The figure at the end of this section shows that a month is the half-open range from its start to the next month's start, exactly what `date_trunc` returns.

## Syntax

The unit (`'month'`, `'week'`, `'day'`) is text in single quotes.
