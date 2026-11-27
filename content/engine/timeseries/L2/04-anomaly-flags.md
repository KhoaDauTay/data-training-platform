---
id: e-ts-l2-04
engine: timeseries
level: L2
module: analysis
title: Đánh dấu số đo bất thường
title_en: Flagging anomalous readings
kind: lab
runtime: browser
minutes: 22
figures: [{ name: ts-anomaly-band, at: idea }]
objectives:
  - vi: Đánh dấu số đo vượt một ngưỡng cố định.
    en: Flag readings above a fixed threshold.
  - vi: Đánh dấu số đo lệch xa so với các số đo ngay trước nó (trung bình và độ lệch chuẩn trượt), không tính chính nó.
    en: Flag readings far from the readings just before them (rolling mean and standard deviation), not counting themselves.
  - vi: Gom các số đo vượt ngưỡng liên tiếp thành một đợt (đảo và khoảng trống, gaps and islands) để báo một lần.
    en: Merge consecutive readings above the threshold into one episode (gaps and islands) to raise one alert.
requires: [e-ts-l2-03]
sources:
  - { url: https://www.postgresql.org/docs/18/functions-window.html, title_vi: "Hàm cửa sổ (window function)" }
  - { url: https://www.postgresql.org/docs/18/functions-aggregate.html#FUNCTIONS-AGGREGATE-STATISTICS-TABLE, title_vi: "Hàm gộp › hàm gộp thống kê" }
lab:
  setup: |
    CREATE TABLE temps (
      container_id text NOT NULL,
      ts timestamptz NOT NULL,
      temp_c numeric(4,1) NOT NULL,
      PRIMARY KEY (container_id, ts)
    );
    INSERT INTO temps
    SELECT c, timestamptz '2026-10-30 00:00+00'
        + h * interval '30 minutes',
      CASE
        WHEN c = 'CQRU1002'
          AND h BETWEEN 20 AND 23
          THEN -12 + (h % 2)
        WHEN c = 'CQRU1001' AND h = 30
          THEN -9
        ELSE -18 + ((h * 3 + n) % 5) / 2.0
      END
    FROM generate_series(0, 47) h,
      (VALUES ('CQRU1001', 1),
        ('CQRU1002', 2)) v(c, n);
  steps:
    - task:
        vi: "Container lạnh đặt -18 °C; trên -15 °C là phải xem. Liệt kê các số đo trên -15 °C: trả `container_id`, `ts`, `temp_c`, xếp theo `container_id`, `ts`."
        en: "The reefers are set to -18 °C; above -15 °C needs a look. List the readings above -15 °C: return `container_id`, `ts`, `temp_c`, sorted by `container_id`, `ts`."
      solution: |
        SELECT container_id, ts, temp_c
        FROM temps
        WHERE temp_c > -15
        ORDER BY container_id, ts
      check: rows
      ordered: true
      hint:
        vi: "`WHERE temp_c > -15`."
        en: "`WHERE temp_c > -15`."
    - task:
        vi: "Đánh dấu số đo lệch khỏi trung bình của 6 số đo ngay trước nó (cùng container, không tính chính nó) hơn 3 lần độ lệch chuẩn của 6 số đo đó. Trả `container_id`, `ts`, `temp_c`, xếp theo `container_id`, `ts`."
        en: "Flag the readings that differ from the average of the 6 readings just before them (same container, not counting themselves) by more than 3 times those 6 readings' standard deviation. Return `container_id`, `ts`, `temp_c`, sorted by `container_id`, `ts`."
      solution: |
        SELECT container_id, ts, temp_c
        FROM (
          SELECT container_id, ts, temp_c,
            avg(temp_c) OVER w AS m,
            stddev_samp(temp_c) OVER w AS sd
          FROM temps
          WINDOW w AS (
            PARTITION BY container_id
            ORDER BY ts
            ROWS BETWEEN 6 PRECEDING
              AND 1 PRECEDING)) x
        WHERE abs(temp_c - m) > 3 * sd
        ORDER BY container_id, ts
      check: rows
      ordered: true
      hint:
        vi: "Khung `ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING` bỏ chính dòng hiện tại; tính `avg` và `stddev_samp` trong câu con, lọc bên ngoài."
        en: "The frame `ROWS BETWEEN 6 PRECEDING AND 1 PRECEDING` leaves out the current row; compute `avg` and `stddev_samp` in a subquery, filter outside it."
    - task:
        vi: "Gom các số đo trên -15 °C nối tiếp nhau (mỗi 30 phút một số) thành một đợt; chỉ giữ đợt có từ 3 số đo trở lên. Trả `container_id`, `started`, `ended`, `readings`, xếp theo `container_id`, `started`."
        en: "Merge consecutive readings above -15 °C (one every 30 minutes) into one episode; keep only episodes with 3 or more readings. Return `container_id`, `started`, `ended`, `readings`, sorted by `container_id`, `started`."
      solution: |
        SELECT container_id,
          min(ts) AS started,
          max(ts) AS ended,
          count(*) AS readings
        FROM (
          SELECT container_id, ts,
            ts - row_number() OVER (
                PARTITION BY container_id
                ORDER BY ts)
              * interval '30 minutes' AS grp
          FROM temps
          WHERE temp_c > -15) x
        GROUP BY container_id, grp
        HAVING count(*) >= 3
        ORDER BY container_id, started
      check: rows
      ordered: true
      hint:
        vi: "Trong các dòng vượt ngưỡng, `ts - row_number() OVER (...) * interval '30 minutes'` giữ nguyên trong một đợt liền mạch; nhóm theo giá trị đó."
        en: "Among the rows above the threshold, `ts - row_number() OVER (...) * interval '30 minutes'` stays the same within one unbroken episode; group by that value."
quiz:
  - q:
      vi: "Một số đo -9 °C giữa các số quanh -17 °C. Nếu khung trung bình gồm cả chính nó (`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`), quy tắc 3 độ lệch chuẩn có bắt được nó không?"
      en: "One reading of -9 °C sits among readings around -17 °C. If the averaging frame includes the reading itself (`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW`), does the 3-standard-deviation rule catch it?"
    options:
      - { vi: "Có, vì -9 vẫn xa trung bình", en: "Yes, because -9 is still far from the average" }
      - { vi: "Không, vì nó kéo trung bình và độ lệch chuẩn theo mình", en: "No, it drags the average and the deviation with it" }
      - { vi: "Báo lỗi vì khung chồng lên dòng hiện tại", en: "An error, because the frame overlaps the current row" }
    answer: 1
    trap: 0
    why:
      vi: "Trông như -9 vẫn xa hẳn mức -17, nhưng khi chính nó nằm trong khung, nó kéo trung bình lên -15,79 và đẩy độ lệch chuẩn lên 3,07, nên khoảng cách chỉ còn (-9 + 15,79) ÷ 3,07 ≈ 2,2 lần độ lệch chuẩn, dưới mức 3. Không có nó, 6 số đo trước có trung bình -16,92 và độ lệch chuẩn 0,74, và -9 cách xa hơn 10 lần. Vì vậy số đo bất thường che chính nó. Khung `6 PRECEDING AND 1 PRECEDING` chỉ so số đo với những gì đã xảy ra trước nó. PostgreSQL không báo lỗi nào ở đây; câu chỉ ra 0 dòng."
      en: "It looks like -9 is still far from the -17 level, but with the reading inside its own frame it pulls the average up to -15.79 and pushes the standard deviation up to 3.07, so the gap is only (-9 + 15.79) ÷ 3.07 ≈ 2.2 standard deviations, under the limit of 3. Without it, the 6 earlier readings have an average of -16.92 and a standard deviation of 0.74, and -9 is more than 10 of them away. The odd reading hides itself. The frame `6 PRECEDING AND 1 PRECEDING` compares a reading only with what came before it. PostgreSQL raises no error here; the query just returns 0 rows."
  - q:
      vi: "Container `CQRU1002` vượt -15 °C ở 4 số đo liền nhau, từ 10:00 tới 11:30. Báo động theo đợt gửi mấy cảnh báo?"
      en: "Container `CQRU1002` is above -15 °C on 4 consecutive readings, from 10:00 to 11:30. How many alerts does an episode-based alarm send?"
    options:
      - { vi: "4, mỗi số đo vượt ngưỡng một cảnh báo", en: "4, one per reading above the threshold" }
      - { vi: "1, một đợt từ 10:00 tới 11:30", en: "1, one episode from 10:00 to 11:30" }
      - { vi: "0, vì đợt ngắn hơn 3 giờ", en: "0, because the episode is shorter than 3 hours" }
    answer: 1
    trap: 0
    why:
      vi: "Báo theo từng số đo nghe chắc chắn hơn, nhưng 4 cảnh báo cho cùng một sự cố làm người trực ca quen bỏ qua chúng. Cách đảo và khoảng trống (gaps and islands) gom các số đo liên tiếp: trong một đợt liền mạch, `ts` trừ `row_number()` nhân 30 phút cho cùng một giá trị, nên 4 số đo thành một nhóm, một cảnh báo với giờ bắt đầu và kết thúc. Quy tắc ở đây là \"từ 3 số đo\", không phải \"từ 3 giờ\", nên đợt này vẫn được báo."
      en: "Alerting per reading sounds safer, but 4 alerts for one incident teach the duty officer to ignore them. The gaps-and-islands method merges consecutive readings: within one unbroken episode, `ts` minus `row_number()` times 30 minutes gives the same value, so the 4 readings form one group, one alert with a start and an end. The rule here is \"3 readings or more\", not \"3 hours or more\", so this episode is still reported."
---
## Mở bài

Một container lạnh ấm lên vài độ có thể làm hỏng cả lô hàng thủy sản. Bài này đi từ quy tắc đơn giản nhất (một ngưỡng cố định) tới quy tắc theo ngữ cảnh (lệch xa so với chính chuỗi của nó), rồi gom số đo thành đợt để báo một lần.

## Ý chính

**Ngưỡng cố định.** `temp_c > -15` dễ hiểu và dễ giải thích với khách hàng. Nhưng một ngưỡng chung không hợp cho mọi container: hàng mát đặt 2 °C cần ngưỡng khác hàng đông đặt -18 °C.

**Lệch khỏi chính chuỗi đó.** So mỗi số đo với trung bình và độ lệch chuẩn (standard deviation) của vài số đo ngay trước nó: lệch hơn 3 lần độ lệch chuẩn là lạ. Khung phải dừng ở dòng trước (`6 PRECEDING AND 1 PRECEDING`): nếu gồm chính nó, số đo lạ kéo trung bình và phình độ lệch chuẩn, rồi tự che mình.

**Đợt, không phải từng dòng.** Bốn số đo vượt ngưỡng liên tiếp là một sự cố. Cách "đảo và khoảng trống" (gaps and islands): trong các dòng vượt ngưỡng, lấy `ts` trừ `row_number()` nhân bước đo. Dòng liền nhau cho cùng một giá trị, nên nhóm theo nó là có một dòng cho mỗi đợt, với giờ bắt đầu, kết thúc và số số đo.

Hình cuối mục cho thấy một số đo lạ nằm ngoài dải trung bình ± 3 độ lệch chuẩn của các số đo trước nó.

## Cú pháp

```sql
-- the 6 readings before this one
WINDOW w AS (
  PARTITION BY container_id
  ORDER BY ts
  ROWS BETWEEN 6 PRECEDING
    AND 1 PRECEDING)
-- far from them
WHERE abs(temp_c - m) > 3 * sd
-- one key per unbroken episode
ts - row_number() OVER (
    PARTITION BY container_id
    ORDER BY ts)
  * interval '30 minutes'
```

- `stddev_samp` cần ít nhất hai giá trị; với ít hơn nó trả NULL, và phép so sánh với NULL không giữ dòng nào.
- Hàm cửa sổ không dùng được trong `WHERE`: tính nó trong một câu con.

## Ví dụ

Trung bình và độ lệch chuẩn của 6 số đo trước mỗi số đo của `CQRU1001`, quanh số đo lạ lúc 15:00:

```sql
SELECT ts, temp_c,
  round(avg(temp_c) OVER w, 2) AS m,
  round(stddev_samp(temp_c) OVER w, 2)
    AS sd
FROM temps
WHERE container_id = 'CQRU1001'
WINDOW w AS (ORDER BY ts
  ROWS BETWEEN 6 PRECEDING
    AND 1 PRECEDING)
ORDER BY ts
OFFSET 28 LIMIT 4;
```

Khóa của từng đợt: bốn dòng liền nhau cho cùng một giá trị `grp`:

```sql
SELECT container_id, ts,
  ts - row_number() OVER (
      PARTITION BY container_id
      ORDER BY ts)
    * interval '30 minutes' AS grp
FROM temps
WHERE temp_c > -15
ORDER BY container_id, ts;
```

## Lỗi hay gặp

Khung gồm chính số đo đang xét: số đo lạ tự che mình, không dòng nào bị đánh dấu.

```sql
-- WRONG: the reading hides itself
SELECT container_id, ts FROM (
  SELECT container_id, ts, temp_c,
    avg(temp_c) OVER w AS m,
    stddev_samp(temp_c) OVER w AS sd
  FROM temps
  WINDOW w AS (
    PARTITION BY container_id
    ORDER BY ts ROWS BETWEEN
    6 PRECEDING AND CURRENT ROW)) x
WHERE abs(temp_c - m) > 3 * sd;
```

```sql
-- FIX: compare with the past only
SELECT container_id, ts FROM (
  SELECT container_id, ts, temp_c,
    avg(temp_c) OVER w AS m,
    stddev_samp(temp_c) OVER w AS sd
  FROM temps
  WINDOW w AS (
    PARTITION BY container_id
    ORDER BY ts ROWS BETWEEN
    6 PRECEDING AND 1 PRECEDING)) x
WHERE abs(temp_c - m) > 3 * sd;
```

Đặt hàm cửa sổ thẳng vào `WHERE`:

```sql
-- ERROR 42P20
SELECT ts FROM temps
WHERE temp_c > avg(temp_c) OVER (
  ORDER BY ts) + 3;
```

## Thực hành

Ba câu: số đo vượt ngưỡng cố định, số đo lệch xa so với các số đo trước nó, và các đợt vượt ngưỡng từ 3 số đo trở lên.

## Tóm tắt

- Ngưỡng cố định dễ giải thích nhưng không hợp cho mọi thiết bị.
- So số đo với trung bình và độ lệch chuẩn của các số đo trước nó, không tính chính nó.
- Gom dòng vượt ngưỡng liên tiếp thành đợt bằng `ts` trừ `row_number()` nhân bước đo.
- Một đợt là một cảnh báo, với giờ bắt đầu và kết thúc.

# EN

## Opening

A reefer that warms up a few degrees can spoil a whole load of frozen seafood. This lesson goes from the simplest rule (a fixed threshold) to a rule in context (far from the series' own recent values), then merges readings into episodes to alert once.

## Key idea

**A fixed threshold.** `temp_c > -15` is easy to understand and to explain to a customer. But one shared threshold does not fit every container: chilled cargo set to 2 °C needs another threshold than frozen cargo set to -18 °C.

**Far from its own series.** Compare each reading with the mean and standard deviation of the few readings just before it: more than 3 standard deviations away is odd. The frame must stop at the previous row (`6 PRECEDING AND 1 PRECEDING`): if it includes the reading itself, the odd value pulls the mean and inflates the standard deviation, and hides itself.

**Episodes, not rows.** Four consecutive readings above the threshold are one incident. The gaps-and-islands method: among the rows above the threshold, take `ts` minus `row_number()` times the reading step. Consecutive rows give the same value, so grouping by it gives one row per episode, with its start, end and number of readings.

The figure at the end of this section shows one odd reading outside the mean ± 3 standard deviations band of the readings before it.

## Syntax

```sql
-- the 6 readings before this one
WINDOW w AS (
  PARTITION BY container_id
  ORDER BY ts
  ROWS BETWEEN 6 PRECEDING
    AND 1 PRECEDING)
-- far from them
WHERE abs(temp_c - m) > 3 * sd
-- one key per unbroken episode
ts - row_number() OVER (
    PARTITION BY container_id
    ORDER BY ts)
  * interval '30 minutes'
```

- `stddev_samp` needs at least two values; with fewer it returns NULL, and a comparison with NULL keeps no row.
- A window function cannot be used in `WHERE`: compute it in a subquery.

## Example

The mean and standard deviation of the 6 readings before each reading of `CQRU1001`, around the odd reading at 15:00:

```sql
SELECT ts, temp_c,
  round(avg(temp_c) OVER w, 2) AS m,
  round(stddev_samp(temp_c) OVER w, 2)
    AS sd
FROM temps
WHERE container_id = 'CQRU1001'
WINDOW w AS (ORDER BY ts
  ROWS BETWEEN 6 PRECEDING
    AND 1 PRECEDING)
ORDER BY ts
OFFSET 28 LIMIT 4;
```

The key of each episode: four consecutive rows give the same `grp` value:

```sql
SELECT container_id, ts,
  ts - row_number() OVER (
      PARTITION BY container_id
      ORDER BY ts)
    * interval '30 minutes' AS grp
FROM temps
WHERE temp_c > -15
ORDER BY container_id, ts;
```

## Common mistakes

A frame that includes the reading itself: the odd reading hides itself and no row is flagged.

```sql
-- WRONG: the reading hides itself
SELECT container_id, ts FROM (
  SELECT container_id, ts, temp_c,
    avg(temp_c) OVER w AS m,
    stddev_samp(temp_c) OVER w AS sd
  FROM temps
  WINDOW w AS (
    PARTITION BY container_id
    ORDER BY ts ROWS BETWEEN
    6 PRECEDING AND CURRENT ROW)) x
WHERE abs(temp_c - m) > 3 * sd;
```

```sql
-- FIX: compare with the past only
SELECT container_id, ts FROM (
  SELECT container_id, ts, temp_c,
    avg(temp_c) OVER w AS m,
    stddev_samp(temp_c) OVER w AS sd
  FROM temps
  WINDOW w AS (
    PARTITION BY container_id
    ORDER BY ts ROWS BETWEEN
    6 PRECEDING AND 1 PRECEDING)) x
WHERE abs(temp_c - m) > 3 * sd;
```

Putting a window function straight into `WHERE`:

```sql
-- ERROR 42P20
SELECT ts FROM temps
WHERE temp_c > avg(temp_c) OVER (
  ORDER BY ts) + 3;
```

## Practice

Three questions: readings above a fixed threshold, readings far from the readings before them, and the episodes above the threshold with 3 readings or more.

## Recap

- A fixed threshold is easy to explain but does not fit every device.
- Compare a reading with the mean and standard deviation of the readings before it, not counting itself.
- Merge consecutive rows above the threshold into episodes with `ts` minus `row_number()` times the step.
- One episode is one alert, with a start and an end.
