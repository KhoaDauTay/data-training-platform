---
id: e-ts-l1-01
engine: timeseries
level: L1
module: basics
title: Dữ liệu chuỗi thời gian là gì
title_en: What makes data time-series
kind: concept
runtime: browser
minutes: 15
figures: [{ name: ts-append-retain, at: idea }]
objectives:
  - vi: Nhận ra dữ liệu chuỗi thời gian qua ba dấu hiệu là ghi thêm liên tục, đọc theo thời gian và xóa dần dữ liệu cũ.
    en: Recognise time-series data by three signs, which are constant appends, reads by time and old data dropped over time.
  - vi: So sánh bảng hẹp (một dòng mỗi số đo) với bảng rộng (một cột mỗi cảm biến).
    en: Compare a narrow table (one row per measurement) with a wide table (one column per sensor).
  - vi: Viết câu lấy số đo mới nhất và câu xóa dữ liệu quá hạn giữ.
    en: Write a query for the newest reading and a statement that removes data past its retention.
requires: []
sources:
  - { url: https://www.postgresql.org/docs/18/datatype-datetime.html, title_vi: "Kiểu ngày giờ" }
  - { url: https://www.postgresql.org/docs/18/ddl-partitioning.html, title_vi: "Phân vùng bảng (partitioning)" }
  - { url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-time-series.html", title: "AWS docs: Best practices for handling time series data in DynamoDB", title_vi: "Thực hành tốt cho dữ liệu chuỗi thời gian trong DynamoDB" }
lab:
  setup: |
    CREATE TABLE readings (
      sensor_id int NOT NULL,
      ts timestamptz NOT NULL,
      temp_c numeric(4,1) NOT NULL
    );
    INSERT INTO readings
    SELECT s, timestamptz '2026-09-28 00:00+07'
        + h * interval '6 hours',
      -18 + ((s * 7 + h) % 5) / 2.0
    FROM generate_series(0, 23) h,
      generate_series(1, 3) s
    WHERE s < 3 OR h >= 8;
    CREATE TABLE readings_wide (
      ts timestamptz PRIMARY KEY,
      s1 numeric(4,1),
      s2 numeric(4,1),
      s3 numeric(4,1)
    );
    INSERT INTO readings_wide
    SELECT ts,
      max(temp_c) FILTER (WHERE sensor_id = 1),
      max(temp_c) FILTER (WHERE sensor_id = 2),
      max(temp_c) FILTER (WHERE sensor_id = 3)
    FROM readings GROUP BY ts;
  steps:
    - task:
        vi: "Mỗi cảm biến có bao nhiêu số đo, số đầu tiên và số cuối cùng lúc nào? Trả `sensor_id`, `readings`, `first_ts`, `last_ts`, xếp theo `sensor_id`."
        en: "How many readings does each sensor have, and when were its first and last ones? Return `sensor_id`, `readings`, `first_ts`, `last_ts`, sorted by `sensor_id`."
      solution: |
        SELECT sensor_id,
          count(*) AS readings,
          min(ts) AS first_ts,
          max(ts) AS last_ts
        FROM readings
        GROUP BY sensor_id
        ORDER BY sensor_id
      check: rows
      ordered: true
      hint:
        vi: "Nhóm theo `sensor_id`; `min(ts)` và `max(ts)` cho số đầu và số cuối."
        en: "Group by `sensor_id`; `min(ts)` and `max(ts)` give the first and the last reading."
    - task:
        vi: "Số đo mới nhất của cảm biến 2: trả `ts`, `temp_c` (một dòng)."
        en: "The newest reading of sensor 2: return `ts`, `temp_c` (one row)."
      solution: |
        SELECT ts, temp_c
        FROM readings
        WHERE sensor_id = 2
        ORDER BY ts DESC
        LIMIT 1
      check: rows
      hint:
        vi: "Sắp `ts` giảm dần rồi lấy một dòng; không có `ORDER BY` thì \"dòng đầu\" không có nghĩa gì."
        en: "Sort `ts` descending and take one row; without `ORDER BY`, \"the first row\" means nothing."
    - task:
        vi: "Kho chỉ giữ số đo từ 0 giờ ngày 01/10/2026 giờ Việt Nam. Xóa các số đo cũ hơn mốc đó."
        en: "The store keeps readings only from 00:00 on 1 Oct 2026, Vietnam time. Delete the readings older than that."
      solution: |
        DELETE FROM readings
        WHERE ts < '2026-10-01 00:00+07'
      check: rows
      after: |
        SELECT count(*) AS rows_left,
          min(ts) AS oldest
        FROM readings
      hint:
        vi: "`DELETE FROM readings WHERE ts < '2026-10-01 00:00+07'`; bài chấm bằng số dòng còn lại và số đo cũ nhất."
        en: "`DELETE FROM readings WHERE ts < '2026-10-01 00:00+07'`; the step is graded on the rows left and the oldest reading."
quiz:
  - q:
      vi: "Cảng gắn thêm cảm biến số 4. Bảng nào nhận số đo của nó mà không phải đổi cấu trúc?"
      en: "The port adds sensor 4. Which table takes its readings without changing its structure?"
    options:
      - { vi: "`readings_wide`, vì một dòng chứa đủ mọi cảm biến", en: "`readings_wide`, because one row holds every sensor" }
      - { vi: "`readings`, vì cảm biến chỉ là một giá trị cột", en: "`readings`, because a sensor is only a column value" }
      - { vi: "Cả hai, PostgreSQL tự thêm cột khi cần", en: "Both, PostgreSQL adds the column when needed" }
    answer: 1
    trap: 0
    why:
      vi: "Bảng rộng gọn khi đọc vì một dòng có đủ mọi cảm biến, nhưng mỗi cảm biến là một cột, nên cảm biến 4 cần `ALTER TABLE ... ADD COLUMN s4` trước khi ghi được. Bảng hẹp `readings` lưu cảm biến trong cột `sensor_id`, nên cảm biến mới chỉ là thêm dòng với giá trị 4. PostgreSQL không tự thêm cột: ghi vào cột chưa có thì báo lỗi 42703."
      en: "The wide table reads neatly because one row holds every sensor, but each sensor is a column, so sensor 4 needs `ALTER TABLE ... ADD COLUMN s4` before it can be written. The narrow table `readings` keeps the sensor in the column `sensor_id`, so a new sensor is just new rows with the value 4. PostgreSQL never adds a column by itself: writing to a missing column fails with error 42703."
  - q:
      vi: "Bảng `readings` nhận một số đo mỗi phút từ 500 cảm biến và chỉ giữ 30 ngày. Câu nào mô tả đúng cách bảng thay đổi?"
      en: "Table `readings` receives one reading a minute from 500 sensors and keeps 30 days. Which sentence describes how the table changes?"
    options:
      - { vi: "Chủ yếu là cập nhật lại số đo cũ cho đúng", en: "Mostly old readings being updated to be correct" }
      - { vi: "Thêm dòng mới ở cuối, xóa dòng cũ ở đầu", en: "New rows added at the end, old rows removed at the start" }
      - { vi: "Bảng giữ nguyên cỡ vì số đo được ghi đè", en: "The table keeps its size because readings are overwritten" }
    answer: 1
    trap: 2
    why:
      vi: "Bảng có cỡ ổn định nên dễ nghĩ số đo được ghi đè, nhưng cỡ ổn định là do hai việc cân nhau: mỗi phút thêm 500 dòng mới, và việc giữ 30 ngày (retention) xóa dần dòng cũ nhất. Số đo đã ghi gần như không bao giờ được sửa: một phép đo lúc 08:10 là sự thật của lúc đó. Vì vậy dữ liệu chuỗi thời gian được thiết kế cho ghi thêm nhanh và xóa theo khối thời gian, không cho cập nhật."
      en: "The table has a steady size, so it is easy to think readings are overwritten, but the steady size comes from two things balancing: 500 new rows arrive every minute, and the 30-day retention removes the oldest rows. A written reading is almost never edited: a measurement at 08:10 is what was true at that moment. That is why time-series data is designed for fast appends and dropping whole time ranges, not for updates."
---
## Mở bài

Kho lạnh ở cảng Tiên Sa có ba cảm biến nhiệt độ, mỗi cái gửi một số đo mỗi 6 giờ. Dữ liệu như vậy chỉ lớn lên theo thời gian, được đọc theo khoảng thời gian, và cũ thì bị xóa. Bài này gọi tên ba dấu hiệu đó, vì cả khóa học xây trên chúng.

## Ý chính

**Ghi thêm, gần như không sửa.** Mỗi số đo là sự thật của một thời điểm, nên dòng mới luôn được thêm vào cuối và dòng cũ hiếm khi bị cập nhật. Bảng lớn đều theo thời gian.

**Đọc theo thời gian.** Câu hỏi thường là "số mới nhất", "trung bình mỗi giờ", "hôm qua có gì lạ". Cột thời gian vì vậy là cột quan trọng nhất: nó có mặt trong gần như mọi điều kiện lọc, nhóm và sắp xếp.

**Giữ có hạn (retention).** Không ai cần số đo từng phút của ba năm trước. Dữ liệu cũ bị xóa theo khối thời gian, hoặc được gom lại thành số theo giờ, theo ngày trước khi xóa.

**Bảng hẹp hay bảng rộng.** Bảng hẹp `readings` có một dòng cho mỗi số đo (`sensor_id`, `ts`, `temp_c`). Bảng rộng `readings_wide` có một dòng mỗi thời điểm và một cột mỗi cảm biến. Bảng rộng dễ đọc, nhưng cảm biến mới cần cột mới, và cảm biến thiếu số thì để lại ô NULL. Khóa học này dùng bảng hẹp.

Hình cuối mục cho thấy dòng mới vào ở cuối và dòng cũ ra ở đầu.

## Ví dụ

Dòng được ghi theo thứ tự thời gian:

```sql
SELECT sensor_id, ts, temp_c
FROM readings
ORDER BY ts, sensor_id
LIMIT 6;
```

Bảng rộng để lại ô trống khi cảm biến 3 chưa lắp:

```sql
SELECT count(*) AS timestamps,
  count(*) FILTER (WHERE s3 IS NULL)
    AS empty_s3
FROM readings_wide;
```

## Lỗi hay gặp

Lấy "số mới nhất" mà không sắp xếp: PostgreSQL trả dòng nào nó gặp trước, ở đây là số cũ nhất.

```sql
-- WRONG: no order, so no "newest"
SELECT ts, temp_c FROM readings
WHERE sensor_id = 2
LIMIT 1;
```

```sql
-- FIX: newest first, then one row
SELECT ts, temp_c FROM readings
WHERE sensor_id = 2
ORDER BY ts DESC
LIMIT 1;
```

Bảng rộng chưa có cột cho cảm biến mới:

```sql
-- ERROR 42703
INSERT INTO readings_wide (ts, s4)
VALUES ('2026-10-04 00:00+07', -18);
```

## Thực hành

Ba câu: tóm tắt từng cảm biến, lấy số đo mới nhất của một cảm biến, và xóa dữ liệu quá hạn giữ. Bài `e-ts-l3-02` làm việc xóa này bằng partition, không phải xóa từng dòng.

## Tóm tắt

- Chuỗi thời gian: ghi thêm liên tục, đọc theo thời gian, xóa dần dữ liệu cũ.
- Cột thời gian có mặt trong gần như mọi câu lọc, nhóm và sắp xếp.
- Bảng hẹp nhận cảm biến mới bằng dòng mới; bảng rộng cần cột mới.
- "Mới nhất" cần `ORDER BY ts DESC`; thiếu nó thì kết quả là ngẫu nhiên.

# EN

## Opening

The cold store at Tien Sa port has three temperature sensors, each sending one reading every 6 hours. Data like this only grows with time, is read by time range, and is removed when it gets old. This lesson names those three signs, because the whole course builds on them.

## Key idea

**Appended, almost never edited.** Each reading is what was true at one moment, so new rows are always added at the end and old rows are rarely updated. The table grows steadily over time.

**Read by time.** Questions are usually "the newest value", "the hourly average", "what was unusual yesterday". The time column is therefore the most important one: it appears in nearly every filter, grouping and sort.

**Kept for a limited time (retention).** Nobody needs per-minute readings from three years ago. Old data is removed in whole time ranges, or rolled up into hourly or daily figures before it is removed.

**Narrow or wide table.** The narrow table `readings` has one row per reading (`sensor_id`, `ts`, `temp_c`). The wide table `readings_wide` has one row per moment and one column per sensor. The wide table is easy to read, but a new sensor needs a new column, and a sensor with a missing reading leaves a NULL cell. This course uses narrow tables.

The figure at the end of this section shows new rows entering at the end and old rows leaving at the start.

## Example

Rows are written in time order:

```sql
SELECT sensor_id, ts, temp_c
FROM readings
ORDER BY ts, sensor_id
LIMIT 6;
```

The wide table leaves empty cells while sensor 3 was not yet installed:

```sql
SELECT count(*) AS timestamps,
  count(*) FILTER (WHERE s3 IS NULL)
    AS empty_s3
FROM readings_wide;
```

## Common mistakes

Taking "the newest reading" without sorting: PostgreSQL returns whichever row it meets first, here the oldest one.

```sql
-- WRONG: no order, so no "newest"
SELECT ts, temp_c FROM readings
WHERE sensor_id = 2
LIMIT 1;
```

```sql
-- FIX: newest first, then one row
SELECT ts, temp_c FROM readings
WHERE sensor_id = 2
ORDER BY ts DESC
LIMIT 1;
```

The wide table has no column for the new sensor yet:

```sql
-- ERROR 42703
INSERT INTO readings_wide (ts, s4)
VALUES ('2026-10-04 00:00+07', -18);
```

## Practice

Three questions: summarise each sensor, take one sensor's newest reading, and delete the data past its retention. Lesson `e-ts-l3-02` does this deletion with partitions instead of deleting row by row.

## Recap

- Time-series: constant appends, reads by time, old data dropped over time.
- The time column appears in nearly every filter, grouping and sort.
- A narrow table takes a new sensor as new rows; a wide table needs a new column.
- "Newest" needs `ORDER BY ts DESC`; without it the result is arbitrary.
