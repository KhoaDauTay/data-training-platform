---
id: e-bp-t03
engine: best
track: timeseries
level: L2
module: t
title: "Counter có thể reset: cộng từng bước, không lấy max − min"
title_en: "Counters reset: add step by step, not max − min"
kind: quiz
minutes: 4
objectives:
  - vi: "Tính lượng dùng từ counter tích lũy bằng hiệu từng bước với `lag()`, coi bước âm là một lần reset."
    en: "Compute usage from a cumulative counter with step differences from `lag()`, treating a negative step as a reset."
avoid:
  vi: "`max − min` trên counter đã reset: ra 135 kWh trong khi đồng hồ chỉ chạy 65 kWh."
  en: "`max − min` on a counter that reset: 135 kWh while the meter only ran 65 kWh."
requires: [e-ts-l2-02]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/functions-window.html
  - https://prometheus.io/docs/prometheus/latest/querying/functions/
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE energy (meter text, ts timestamptz, kwh_total numeric);
    INSERT INTO energy VALUES ('m1', '2026-10-31 08:00+00', 100), ('m1', '2026-10-31 09:00+00', 120), ('m1', '2026-10-31 10:00+00', 140), ('m1', '2026-10-31 11:00+00', 5), ('m1', '2026-10-31 12:00+00', 25);
  bad: |
    SELECT max(kwh_total) - min(kwh_total)
      AS used
    FROM energy
  good: |
    SELECT sum(CASE WHEN d < 0
      THEN kwh_total ELSE d END) AS used
    FROM (SELECT kwh_total,
        kwh_total - lag(kwh_total)
          OVER (ORDER BY ts) AS d
      FROM energy) x
  expect: null
quiz:
  - q:
      vi: "Đồng hồ đọc 100, 120, 140, rồi khởi động lại và đọc 5, 25. Đồng hồ đã chạy bao nhiêu kWh?"
      en: "A meter reads 100, 120, 140, then restarts and reads 5, 25. How many kWh did it run?"
    options:
      - { vi: "135 (140 − 5)", en: "135 (140 − 5)" }
      - { vi: "65 (20 + 20 + 5 + 20)", en: "65 (20 + 20 + 5 + 20)" }
      - { vi: "−75 (25 − 100)", en: "−75 (25 − 100)" }
    answer: 1
    why:
      vi: "135 là `max − min` (140 − 5), lấy hai số đo không liên quan nhau; −75 là số đo cuối trừ số đầu, mang dấu âm vô nghĩa. Cộng từng bước: 100→120 là 20, 120→140 là 20; từ 140 tụt về 5 là reset, nên bước đó tính 5 (đồng hồ đếm lại từ 0); 5→25 là 20. Tổng 20 + 20 + 5 + 20 = 65. Hàm `rate()` của Prometheus xử lý reset theo đúng cách này."
      en: "135 is `max − min` (140 − 5), two readings that have nothing to do with each other; −75 is the last reading minus the first, with a meaningless sign. Add step by step: 100→120 is 20, 120→140 is 20; the fall from 140 to 5 is a reset, so that step counts 5 (the meter counted again from 0); 5→25 is 20. Total 20 + 20 + 5 + 20 = 65. Prometheus' `rate()` handles resets the same way."
---

## Ý chính

Counter tích lũy (đồng hồ điện, số request) có thể về 0 khi thiết bị khởi động lại. Tính lượng dùng bằng hiệu từng bước với `lag()`; bước nào âm thì đó là reset, và lấy chính giá trị mới làm lượng của bước đó.

## Vì sao

- `max − min` chỉ đúng khi counter chưa từng reset. Một lần reset là con số sai, mà không có lỗi nào báo.
- `kwh_total - lag(kwh_total) OVER (ORDER BY ts)` cho lượng tăng giữa hai lần đọc liền nhau.
- Bước âm nghĩa là counter đã đếm lại từ 0, nên lượng thật của bước đó là giá trị mới đọc. Prometheus làm đúng như vậy trong `rate()` và `increase()`.
- Bản Không nên trả `135`. Bản Nên trả `65`.

# EN

## Key idea

A cumulative counter (an energy meter, a request count) can go back to 0 when the device restarts. Compute usage from step differences with `lag()`; a negative step is a reset, and the new value itself is that step's usage.

## Why

- `max − min` is only right if the counter never reset. One reset and the number is wrong, with no error to warn you.
- `kwh_total - lag(kwh_total) OVER (ORDER BY ts)` gives the increase between two consecutive readings.
- A negative step means the counter started again from 0, so that step's real usage is the new reading. Prometheus does exactly this in `rate()` and `increase()`.
- The Avoid version returns `135`. The Prefer version returns `65`.
