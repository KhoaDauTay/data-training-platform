---
id: e-bp-a02
engine: best
track: sql
level: L2
module: a
title: "Gom theo ngày ở múi giờ của doanh nghiệp"
title_en: "Bucket days in the business time zone"
kind: quiz
minutes: 3
objectives:
  - vi: "Đổi `timestamptz` về múi giờ nghiệp vụ (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`) trước khi lấy ngày bằng `::date` hay `date_trunc`."
    en: "Convert a `timestamptz` to the business time zone (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`) before taking the day with `::date` or `date_trunc`."
avoid:
  vi: "Doanh thu buổi sáng sớm ở Việt Nam bị ghi sang ngày hôm trước, có khi sang tháng trước."
  en: "Early-morning sales in Vietnam booked on the previous day, sometimes the previous month."
requires: [e-pg-l1-01]
skills: [date_math, date_bucket]
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-ZONECONVERT
  - https://www.postgresql.org/docs/18/datatype-datetime.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: diff
  setup: |
    SET TIME ZONE 'UTC';
    CREATE TABLE sales (id int PRIMARY KEY, paid_at timestamptz NOT NULL, amount_vnd bigint NOT NULL);
    INSERT INTO sales VALUES
      (1, '2026-10-31 10:00:00+07', 100000),
      (2, '2026-10-31 23:30:00+07', 200000),
      (3, '2026-11-01 03:00:00+07', 300000),
      (4, '2026-11-01 09:00:00+07', 400000);
  bad: |
    SELECT paid_at::date AS sales_day, sum(amount_vnd) AS revenue_vnd
    FROM sales
    GROUP BY paid_at::date
    ORDER BY sales_day
  good: |
    SELECT (paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS sales_day, sum(amount_vnd) AS revenue_vnd
    FROM sales
    GROUP BY (paid_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    ORDER BY sales_day
  expect: null
quiz:
  - q:
      vi: "Phiên đặt `TIME ZONE 'UTC'`. Một khoản trả lúc `2026-11-01 03:00:00+07` (3 giờ sáng ở Việt Nam). `paid_at::date` cho ngày nào?"
      en: "The session has `TIME ZONE 'UTC'`. A payment was made at `2026-11-01 03:00:00+07` (3 a.m. in Vietnam). Which day does `paid_at::date` give?"
    options:
      - { vi: "`2026-11-01`", en: "`2026-11-01`" }
      - { vi: "`2026-10-31`", en: "`2026-10-31`" }
      - { vi: "Báo lỗi vì thiếu múi giờ", en: "An error, because the time zone is missing" }
    answer: 1
    why:
      vi: "`::date` cắt theo múi giờ của phiên. 03:00 giờ Việt Nam là 20:00 UTC ngày hôm trước, nên khoản này rơi vào `2026-10-31`, tức tháng 10."
      en: "`::date` cuts in the session's time zone. 03:00 in Vietnam is 20:00 UTC the day before, so this payment lands on `2026-10-31`, in October."
---

## Ý chính

Lưu thời điểm bằng `timestamptz`. Khi gom theo ngày, đổi về múi giờ nghiệp vụ trước (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`), rồi mới `::date` hay `date_trunc`.

## Vì sao

- `::date` và `date_trunc` trên `timestamptz` dùng múi giờ của phiên (`TimeZone`). Server và PGlite thường để UTC.
- Việt Nam đi trước UTC 7 giờ, nên khoản trả từ 0 giờ tới 7 giờ sáng bị ghi sang ngày hôm trước.
- Ngày cuối tháng, khoản đó còn bị đẩy sang tháng trước.

# EN

## Key idea

Store instants as `timestamptz`. When you bucket by day, convert to the business time zone first (`AT TIME ZONE 'Asia/Ho_Chi_Minh'`), and only then take `::date` or `date_trunc`.

## Why

- `::date` and `date_trunc` on a `timestamptz` use the session's time zone (`TimeZone`). Servers and PGlite often run in UTC.
- Vietnam is 7 hours ahead of UTC, so payments between midnight and 7 a.m. land on the previous day.
- At the end of a month, they even move into the previous month.
