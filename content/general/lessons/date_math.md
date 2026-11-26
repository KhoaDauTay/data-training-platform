---
id: date_math
title: "Tính toán với ngày: khoảng cách, cộng ngày và khoảng nửa mở"
title_en: "Date arithmetic: gaps, adding days and half-open ranges"
minutes: 25
figures: [{ name: sql-half-open-range, at: idea }]
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-24" }
objectives:
  - vi: Tính số ngày giữa hai ngày và cộng thêm ngày hay giờ vào một mốc.
    en: Compute the days between two dates and add days or hours to a point in time.
  - vi: Lọc một khoảng thời gian bằng khoảng nửa mở `>= đầu AND < sau-cuối`.
    en: Filter a period with a half-open range `>= start AND < day-after-end`.
  - vi: Phân biệt `date` và `timestamp` khi so sánh.
    en: Tell `date` and `timestamp` apart when comparing.
syntax: |-
  SELECT date_b - date_a AS days,
         date_a + 30 AS due,
         ts + interval '2 hours' AS later
  FROM table_name
  WHERE ts >= '2026-10-01' AND ts < '2026-11-01'
options:
  - { code: "date - date", vi: "số ngày (số nguyên)", en: "a number of days (a whole number)" }
  - { code: "date + n", vi: "n ngày sau", en: "n days later" }
  - { code: "timestamp + interval '2 hours'", vi: "cộng một khoảng thời gian có đơn vị", en: "adds a span of time with a unit" }
  - { code: "age(a, b)", vi: "khoảng cách dạng năm, tháng, ngày", en: "the gap in years, months and days" }
  - { code: ">= start AND < next", vi: "khoảng nửa mở: đúng cho cả `date` lẫn `timestamp`", en: "half-open range: right for both `date` and `timestamp`" }
  - { code: "'2026-10-31'", vi: "một ngày viết theo ISO (năm-tháng-ngày) trong nháy đơn", en: "a date written ISO style (year-month-day) in single quotes" }
examples:
  - title: { vi: "Số ngày từ lúc đặt tới lúc giao", en: "Days from ordering to delivery" }
    sql: |-
      SELECT id, order_date, delivered_on, delivered_on - order_date AS days
      FROM orders
      WHERE channel = 'ONLINE' AND order_date = '2026-10-20'
    read:
      vi: "1 đơn online đặt ngày 20/10/2026, giao ngày 26/10: 6 ngày. Hai cột đều kiểu `date`, nên phép trừ cho ra số nguyên."
      en: "1 online order placed on 20 October 2026 and delivered on the 26th: 6 days. Both columns are `date`, so the subtraction gives a whole number."
  - title: { vi: "Hạn thanh toán sau 30 ngày", en: "A payment due 30 days later" }
    sql: |-
      SELECT id, order_date + 30 AS due
      FROM orders
      WHERE order_date = '2026-10-31'
    read:
      vi: "5 đơn ngày 31/10/2026, hạn là 30/11/2026. Cộng một số nguyên vào `date` là cộng ngày; Postgres tự tính sang tháng mới."
      en: "5 orders of 31 October 2026, due on 30 November 2026. Adding a whole number to a `date` adds days; Postgres rolls into the next month by itself."
  - title: { vi: "Cộng giờ vào một thời điểm", en: "Adding hours to a timestamp" }
    sql: |-
      SELECT id, paid_at, paid_at + interval '2 hours' AS later
      FROM payments
      WHERE paid_at >= '2026-10-31'
      ORDER BY id
      LIMIT 3
    read:
      vi: "Khoản 1345 trả lúc 07:37 ngày 31/10, hai giờ sau là 09:37. Với `timestamp`, dùng `interval` có đơn vị (`hours`, `days`, `months`)."
      en: "Payment 1345 was made at 07:37 on 31 October; two hours later is 09:37. With a `timestamp`, use an `interval` with a unit (`hours`, `days`, `months`)."
  - title: { vi: "Đã là thành viên bao lâu", en: "How long someone has been a member" }
    sql: |-
      SELECT name, signup_date, age(DATE '2026-10-31', signup_date) AS member_for
      FROM customers
      WHERE id <= 3
    read:
      vi: "`age` cho khoảng cách dễ đọc như `1 year 7 days`. Hôm nay trong lab là 31/10/2026, viết thành ngày cố định để kết quả không đổi theo đồng hồ máy."
      en: "`age` gives a readable gap such as `1 year 7 days`. Today in the lab is 31 October 2026, written as a fixed date so the result does not follow the machine's clock."
  - title: { vi: "Một ngày trọn vẹn trên cột có giờ", en: "One whole day on a column with time" }
    sql: |-
      SELECT count(*)
      FROM payments
      WHERE paid_at >= '2026-10-30' AND paid_at < '2026-10-31'
    read:
      vi: "12 khoản trong ngày 30/10, từ 00:00 tới trước nửa đêm. Khoảng nửa mở lấy đủ cả ngày mà không cần biết giây cuối cùng là mấy giờ."
      en: "12 payments on 30 October, from 00:00 up to midnight. The half-open range takes the whole day without needing to know the last second."
pitfalls:
  - title: { vi: "BETWEEN trên cột có giờ bỏ mất ngày cuối", en: "BETWEEN on a timestamp drops the last day" }
    wrong: "SELECT count(*) FROM payments WHERE paid_at BETWEEN '2026-10-01' AND '2026-10-31'"
    fix: "SELECT count(*) FROM payments WHERE paid_at >= '2026-10-01' AND paid_at < '2026-11-01'"
    why:
      vi: "`'2026-10-31'` là nửa đêm đầu ngày 31, nên mọi khoản trả sau 00:00 ngày đó bị loại: 218 thay vì 223. Dùng khoảng nửa mở tới ngày đầu tháng sau."
      en: "`'2026-10-31'` is midnight at the start of the 31st, so every payment after 00:00 that day is left out: 218 instead of 223. Use a half-open range up to the first day of the next month."
  - title: { vi: "So một thời điểm với một ngày", en: "Comparing a timestamp with a date" }
    wrong: "SELECT count(*) FROM payments WHERE paid_at = '2026-10-30'"
    fix: "SELECT count(*) FROM payments WHERE paid_at >= '2026-10-30' AND paid_at < '2026-10-31'"
    why:
      vi: "`paid_at = '2026-10-30'` chỉ khớp khoản trả đúng 00:00:00, nên ra 0. Một ngày trên cột có giờ là một khoảng, không phải một điểm. Đừng sửa bằng `paid_at::date = …`: kết quả đúng nhưng ép cột làm mất chỉ mục."
      en: "`paid_at = '2026-10-30'` only matches a payment made at exactly 00:00:00, so it gives 0. A day on a column with time is a range, not a point. Do not fix it with `paid_at::date = …`: the result is right but casting the column loses the index."
quiz:
  - q:
      vi: "Cách nào lấy đúng mọi đơn tháng 10/2026 trên cột `timestamp`?"
      en: "Which way takes exactly every October 2026 row on a `timestamp` column?"
    options:
      - { vi: "`BETWEEN '2026-10-01' AND '2026-10-31'`", en: "`BETWEEN '2026-10-01' AND '2026-10-31'`" }
      - { vi: "`>= '2026-10-01' AND < '2026-11-01'`", en: "`>= '2026-10-01' AND < '2026-11-01'`" }
      - { vi: "`extract(month FROM ts) = 10`", en: "`extract(month FROM ts) = 10`" }
    answer: 1
    trap: 0
    why:
      vi: "`BETWEEN` nghe đúng nhất vì nó \"tính cả hai đầu\", nhưng đầu cuối là nửa đêm đầu ngày 31. `extract(month …)` thì lấy cả tháng 10 của mọi năm. Khoảng nửa mở đúng cho mọi kiểu ngày giờ và còn dùng được chỉ mục."
      en: "`BETWEEN` sounds right because it \"includes both ends\", but the end is midnight at the start of the 31st. `extract(month …)` takes October of every year. The half-open range is right for every date type and can still use an index."
  - q:
      vi: "`DATE '2026-01-31' + 30` là ngày nào?"
      en: "What is `DATE '2026-01-31' + 30`?"
    options:
      - { vi: "2026-03-02", en: "2026-03-02" }
      - { vi: "2026-02-31", en: "2026-02-31" }
      - { vi: "Lỗi vì tháng 2 không có ngày 31", en: "An error, because February has no 31st" }
    answer: 0
    trap: 1
    why:
      vi: "Nghĩ theo \"cộng vào số ngày của tháng\" thì ra 31/02, ngày không tồn tại. Cộng số nguyên vào `date` là đếm tiếp từng ngày trên lịch: 28 ngày tháng 2 rồi 2 ngày tháng 3."
      en: "Thinking \"add to the day of the month\" gives 31 February, a day that does not exist. Adding a whole number to a `date` counts forward day by day on the calendar: 28 days of February, then 2 of March."
recap:
  - vi: "`date - date` = số ngày; `date + n` = n ngày sau; với `timestamp` dùng `interval`."
    en: "`date - date` = days; `date + n` = n days later; with a `timestamp` use an `interval`."
  - vi: "Lọc khoảng thời gian bằng `>= '2026-10-01' AND < '2026-11-01'`, không bằng `BETWEEN` trên cột có giờ."
    en: "Filter a period with `>= '2026-10-01' AND < '2026-11-01'`, not `BETWEEN`, on a column with time."
  - vi: "Viết \"hôm nay\" thành ngày cố định khi kết quả cần lặp lại được."
    en: "Write \"today\" as a fixed date when the result must be repeatable."
sources:
  - https://www.postgresql.org/docs/current/functions-datetime.html
  - https://www.postgresql.org/docs/current/datatype-datetime.html
---
## Mở bài

Đội giao hàng hỏi: "Đơn online mất bao nhiêu ngày mới tới tay khách?" và kế toán hỏi: "Tháng 10 thu được bao nhiêu khoản?" Cả hai câu đều là phép tính trên ngày, và câu thứ hai có một cái bẫy nằm ở ngày cuối tháng.

## Ý chính

Ngày và thời điểm cộng trừ được như số. Hai `date` trừ nhau ra số ngày; `date` cộng số nguyên ra ngày khác; `timestamp` cộng một `interval` (như `interval '2 hours'`). Để lọc một khoảng, viết khoảng **nửa mở**: lớn hơn hoặc bằng ngày đầu, nhỏ hơn ngày ngay sau ngày cuối.

Nhiều người nghĩ **`'2026-10-31'` nghĩa là cả ngày 31**. Với cột `timestamp`, nó là một điểm: nửa đêm đầu ngày. Vì vậy `BETWEEN … AND '2026-10-31'` bỏ gần trọn ngày cuối, và `= '2026-10-30'` gần như không khớp gì. Khoảng nửa mở tránh được cả hai.

Hình từng bước ở cuối mục này đặt năm khoản thanh toán ngày 31/10 cạnh hai cách viết mốc cuối tháng.

## Cú pháp

Ngày viết dạng năm-tháng-ngày trong nháy đơn; Postgres tự hiểu là ngày khi so với cột ngày.

# EN

## Opening

The delivery team asks: "How many days does an online order take to reach the customer?" and accounting asks: "How many payments came in during October?" Both are arithmetic on dates, and the second hides a trap on the last day of the month.

## Key idea

Dates and timestamps can be added and subtracted like numbers. Two `date` values subtract into a number of days; a `date` plus a whole number is another date; a `timestamp` takes an `interval` (such as `interval '2 hours'`). To filter a period, write a **half-open** range: greater than or equal to the first day, less than the day right after the last day.

Many people think **`'2026-10-31'` means the whole of the 31st**. On a `timestamp` column it is a point: midnight at the start of the day. That is why `BETWEEN … AND '2026-10-31'` drops almost all of the last day, and `= '2026-10-30'` matches almost nothing. The half-open range avoids both.

The step-through figure at the end of this section puts the five payments of 31 October beside the two ways to write the month's end.

## Syntax

Write dates as year-month-day in single quotes; Postgres reads them as dates when compared with a date column.
