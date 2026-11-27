---
id: e-bp-t06
engine: best
track: timeseries
level: L2
module: t
title: "Trung bình trượt theo thời gian, không theo số dòng"
title_en: "Moving averages by time, not by row count"
kind: quiz
minutes: 4
objectives:
  - vi: "Viết khung cửa sổ bằng `RANGE BETWEEN interval '20 minutes' PRECEDING AND CURRENT ROW` khi dữ liệu có thể có lỗ."
    en: "Write the window frame as `RANGE BETWEEN interval '20 minutes' PRECEDING AND CURRENT ROW` when the data can have gaps."
avoid:
  vi: "`ROWS BETWEEN 2 PRECEDING`: sau một lỗ dữ liệu, trung bình 20 phút lại trộn số đo của hơn một giờ trước."
  en: "`ROWS BETWEEN 2 PRECEDING`: after a gap, the 20-minute average mixes in readings from over an hour ago."
requires: [e-ts-l2-01]
skills: []
adv: []
sources:
  - https://www.postgresql.org/docs/18/sql-expressions.html#SYNTAX-WINDOW-FUNCTIONS
  - https://www.postgresql.org/docs/18/tutorial-window.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE readings (device text, ts timestamptz, temp numeric);
    INSERT INTO readings VALUES ('rf-1', '2026-10-31 08:00+00', 4.0), ('rf-1', '2026-10-31 08:10+00', 4.2), ('rf-1', '2026-10-31 08:20+00', 4.4), ('rf-1', '2026-10-31 09:30+00', 8.0), ('rf-1', '2026-10-31 09:40+00', 8.2);
  bad: |
    SELECT ts, round(avg(temp) OVER (
      ORDER BY ts ROWS BETWEEN
        2 PRECEDING AND CURRENT ROW), 2)
      AS avg_temp
    FROM readings
  good: |
    SELECT ts, round(avg(temp) OVER (
      ORDER BY ts RANGE BETWEEN
        interval '20 minutes' PRECEDING
        AND CURRENT ROW), 2) AS avg_temp
    FROM readings
  expect: null
quiz:
  - q:
      vi: "Số đo mỗi 10 phút, nhưng mất kết nối từ 08:20 đến 09:30. Ở dòng 09:30, `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` lấy trung bình những số đo nào?"
      en: "Readings come every 10 minutes, but the connection drops from 08:20 to 09:30. At the 09:30 row, which readings does `ROWS BETWEEN 2 PRECEDING AND CURRENT ROW` average?"
    options:
      - { vi: "Chỉ 09:30, vì 20 phút trước đó không có số đo", en: "Only 09:30, because there was no reading in the 20 minutes before" }
      - { vi: "08:10, 08:20 và 09:30: hai dòng liền trước, dù cách hơn một giờ", en: "08:10, 08:20 and 09:30: the two rows before, though over an hour away" }
      - { vi: "Mọi số đo từ 08:00", en: "Every reading since 08:00" }
    answer: 1
    why:
      vi: "\"Chỉ 09:30\" là cách `RANGE` theo thời gian hiểu khung, không phải `ROWS`; còn \"mọi số đo\" là khung không giới hạn. `ROWS` đếm dòng chứ không đếm phút: hai dòng liền trước 09:30 là 08:10 và 08:20, nên trung bình ra 5.53 thay vì 8.00, trộn nhiệt độ của hơn một giờ trước vào lúc container đang nóng lên. `RANGE BETWEEN interval '20 minutes' PRECEDING` chỉ lấy số đo trong 20 phút thật."
      en: "\"Only 09:30\" is how a time-based `RANGE` reads the frame, not `ROWS`; \"every reading\" would be an unbounded frame. `ROWS` counts rows, not minutes: the two rows before 09:30 are 08:10 and 08:20, so the average is 5.53 instead of 8.00, mixing temperatures from over an hour ago into the moment the container is warming up. `RANGE BETWEEN interval '20 minutes' PRECEDING` only takes readings within a real 20 minutes."
---

## Ý chính

Khi nói "trung bình 20 phút", khung cửa sổ phải đo bằng thời gian: `RANGE BETWEEN interval '20 minutes' PRECEDING AND CURRENT ROW`. `ROWS BETWEEN n PRECEDING` chỉ đúng khi số đo đều đặn và không bao giờ thiếu.

## Vì sao

- `ROWS` đếm dòng. Dữ liệu có lỗ (mất kết nối, thiết bị ngủ) làm "2 dòng trước" kéo dài tới cả giờ.
- `RANGE` với `interval` đo bằng giá trị của `ts`, nên khung luôn là 20 phút thật, dù trong đó có bao nhiêu dòng.
- Ở đây container nóng lên sau lỗ dữ liệu: bản Không nên báo `5.53` lúc 09:30, che mất mức `8.00` thật.
- Hai bản giống nhau trước lỗ (08:00–08:20) và chỉ khác sau nó, nên lỗi này dễ lọt qua khi thử trên dữ liệu đẹp.

# EN

## Key idea

When you say "20-minute average", the window frame must be measured in time: `RANGE BETWEEN interval '20 minutes' PRECEDING AND CURRENT ROW`. `ROWS BETWEEN n PRECEDING` is only right when readings are regular and never missing.

## Why

- `ROWS` counts rows. Gaps in the data (a lost connection, a sleeping device) stretch "2 rows before" to an hour or more.
- `RANGE` with an `interval` measures by the value of `ts`, so the frame is always a real 20 minutes, however many rows it holds.
- Here the container warms up after the gap: the Avoid version reports `5.53` at 09:30, hiding the real `8.00`.
- Both versions agree before the gap (08:00–08:20) and only differ after it, so this mistake slips through tests on tidy data.
