---
id: e-bp-a21
engine: best
track: sql
level: L2
module: a
title: "Đếm khách riêng biệt không cộng dồn được"
title_en: "Distinct counts are not additive"
kind: quiz
minutes: 3
objectives:
  - vi: "Tính số người dùng riêng biệt của một kỳ bằng một `count(DISTINCT …)` trên cả kỳ, không cộng số của từng ngày."
    en: "Count the distinct users of a period with one `count(DISTINCT …)` over the whole period, not by adding up each day's count."
avoid:
  vi: "Số người dùng tháng bị phồng vì một người quay lại nhiều ngày được đếm nhiều lần."
  en: "A monthly user count inflated because someone who came back on several days is counted several times."
requires: []
skills: [distinct, aggregate]
adv: [b1]
sources:
  - https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-AGGREGATES
  - https://www.postgresql.org/docs/18/functions-aggregate.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT sum(dau) AS october_users
    FROM (
      SELECT ts::date AS day, count(DISTINCT user_id) AS dau
      FROM app_events
      WHERE ts >= TIMESTAMP '2026-10-01' AND ts < TIMESTAMP '2026-11-01'
      GROUP BY ts::date
    ) AS d
  good: |
    SELECT count(DISTINCT user_id) AS october_users
    FROM app_events
    WHERE ts >= TIMESTAMP '2026-10-01' AND ts < TIMESTAMP '2026-11-01'
  expect: null
quiz:
  - q:
      vi: "Bảng tổng hợp theo ngày có cột `revenue_vnd`, `orders` và `dau` (người dùng riêng biệt trong ngày). Cộng cột nào qua 31 ngày thì ra đúng số của tháng?"
      en: "A daily summary table has columns `revenue_vnd`, `orders` and `dau` (distinct users that day). Which columns can you add up over 31 days to get the month's figure?"
    options:
      - { vi: "Cả ba cột", en: "All three columns" }
      - { vi: "`revenue_vnd` và `orders`, không phải `dau`", en: "`revenue_vnd` and `orders`, not `dau`" }
      - { vi: "Chỉ `dau`", en: "Only `dau`" }
    answer: 1
    why:
      vi: "Doanh thu và số đơn là tổng, nên cộng được. Một người dùng vào ba ngày nằm trong `dau` của cả ba ngày, nên cộng `dau` đếm người đó ba lần."
      en: "Revenue and orders are sums, so they add up. A user active on three days is in the `dau` of all three days, so adding `dau` counts that user three times."
---

## Ý chính

Số người dùng riêng biệt của một kỳ phải tính thẳng trên cả kỳ: `count(DISTINCT user_id)` với khoảng ngày của tháng. Không cộng số riêng biệt của từng ngày.

## Vì sao

- Một người quay lại ba ngày nằm trong số của cả ba ngày, nên tổng các ngày đếm người đó ba lần.
- Câu vẫn chạy và con số trông hợp lý, chỉ là lớn hơn sự thật.
- Bảng tổng hợp theo ngày nên ghi rõ cột nào cộng được (doanh thu, số đơn) và cột nào không (người dùng riêng biệt, tỷ lệ).

# EN

## Key idea

Count a period's distinct users directly over the whole period: `count(DISTINCT user_id)` over the month's date range. Do not add up each day's distinct count.

## Why

- Someone who comes back on three days is in all three daily counts, so the sum of the days counts them three times.
- The query still runs and the number looks plausible; it is just bigger than the truth.
- A daily summary table should say which columns add up (revenue, orders) and which do not (distinct users, ratios).
