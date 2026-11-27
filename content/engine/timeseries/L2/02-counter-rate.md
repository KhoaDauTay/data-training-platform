---
id: e-ts-l2-02
engine: timeseries
level: L2
module: analysis
title: Tốc độ từ bộ đếm cộng dồn với lag
title_en: Rates from cumulative counters with lag
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ts-counter-reset, at: idea }]
objectives:
  - vi: Biến một bộ đếm cộng dồn thành số tăng giữa hai lần đọc bằng `lag`.
    en: Turn a cumulative counter into the increase between two readings with `lag`.
  - vi: Chia cho khoảng thời gian thật giữa hai lần đọc để ra tốc độ mỗi giờ.
    en: Divide by the real time between two readings to get a rate per hour.
  - vi: Xử lý lúc bộ đếm khởi động lại về 0, để tổng không bị âm.
    en: Handle a counter that restarts from 0, so the total does not turn negative.
requires: [e-ts-l2-01]
sources:
  - { url: https://www.postgresql.org/docs/18/functions-window.html, title_vi: "Hàm cửa sổ (window function)" }
  - { url: https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-EXTRACT, title_vi: "Hàm ngày giờ › EXTRACT và date_part" }
  - { url: "https://prometheus.io/docs/prometheus/latest/querying/functions/#rate", title: "Prometheus docs: rate()", title_vi: "Tài liệu Prometheus: rate()" }
lab:
  setup: |
    CREATE TABLE crane_counter (
      crane_id text NOT NULL,
      ts timestamptz NOT NULL,
      moves_total int NOT NULL,
      PRIMARY KEY (crane_id, ts)
    );
    INSERT INTO crane_counter VALUES
      ('QC1', '2026-10-30 06:00+00', 1200),
      ('QC1', '2026-10-30 06:15+00', 1208),
      ('QC1', '2026-10-30 06:30+00', 1219),
      ('QC1', '2026-10-30 06:45+00', 1225),
      ('QC1', '2026-10-30 07:15+00', 1241),
      ('QC1', '2026-10-30 07:30+00', 1250),
      ('QC2', '2026-10-30 06:00+00', 880),
      ('QC2', '2026-10-30 06:15+00', 891),
      ('QC2', '2026-10-30 06:30+00', 4),
      ('QC2', '2026-10-30 06:45+00', 13),
      ('QC2', '2026-10-30 07:00+00', 20),
      ('QC2', '2026-10-30 07:15+00', 31);
  steps:
    - task:
        vi: "Mỗi cẩu bờ gửi tổng số lượt nâng hạ từ khi bật máy (`moves_total`). Với mỗi lần đọc, cẩu đã làm thêm bao nhiêu lượt kể từ lần đọc trước của chính nó? Trả `crane_id`, `ts`, `moves`, xếp theo `crane_id`, `ts` (lần đọc đầu của mỗi cẩu ra NULL)."
        en: "Each quay crane sends its total moves since it was switched on (`moves_total`). For each reading, how many moves did the crane make since its own previous reading? Return `crane_id`, `ts`, `moves`, sorted by `crane_id`, `ts` (each crane's first reading gives NULL)."
      solution: |
        SELECT crane_id, ts,
          moves_total - lag(moves_total)
            OVER (PARTITION BY crane_id
                  ORDER BY ts) AS moves
        FROM crane_counter
        ORDER BY crane_id, ts
      check: rows
      ordered: true
      hint:
        vi: "`lag(moves_total) OVER (PARTITION BY crane_id ORDER BY ts)` là giá trị của lần đọc trước."
        en: "`lag(moves_total) OVER (PARTITION BY crane_id ORDER BY ts)` is the previous reading's value."
    - task:
        vi: "Cẩu `QC1` làm bao nhiêu lượt mỗi giờ giữa hai lần đọc liền nhau? Lần đọc 07:00 bị mất, nên phải chia cho thời gian thật giữa hai lần đọc. Trả `ts`, `per_hour` (làm tròn 1 chữ số), xếp theo `ts`."
        en: "How many moves per hour does crane `QC1` make between two consecutive readings? The 07:00 reading is missing, so divide by the real time between the two readings. Return `ts`, `per_hour` (rounded to 1 decimal), sorted by `ts`."
      solution: |
        SELECT ts,
          round((moves_total - lag(moves_total)
              OVER w)
            / (extract(epoch FROM
                ts - lag(ts) OVER w) / 3600),
            1) AS per_hour
        FROM crane_counter
        WHERE crane_id = 'QC1'
        WINDOW w AS (ORDER BY ts)
        ORDER BY ts
      check: rows
      ordered: true
      hint:
        vi: "Chia số lượt tăng cho `extract(epoch FROM ts - lag(ts) OVER w) / 3600`, tức số giờ giữa hai lần đọc."
        en: "Divide the increase by `extract(epoch FROM ts - lag(ts) OVER w) / 3600`, the hours between the two readings."
    - task:
        vi: "Cẩu `QC2` khởi động lại lúc 06:30 và bộ đếm về 0. Tổng số lượt mỗi cẩu làm trong khoảng dữ liệu: khi số tăng âm (bộ đếm vừa khởi động lại), lấy chính `moves_total` làm số lượt. Trả `crane_id`, `moves`, xếp theo `crane_id`."
        en: "Crane `QC2` restarted at 06:30 and its counter went back to 0. Total moves per crane over the data: when the increase is negative (the counter just restarted), use `moves_total` itself as the moves. Return `crane_id`, `moves`, sorted by `crane_id`."
      solution: |
        SELECT crane_id,
          sum(CASE WHEN d < 0
            THEN moves_total ELSE d END)
            AS moves
        FROM (
          SELECT crane_id, moves_total,
            moves_total - lag(moves_total)
              OVER (PARTITION BY crane_id
                    ORDER BY ts) AS d
          FROM crane_counter) x
        GROUP BY crane_id
        ORDER BY crane_id
      check: rows
      ordered: true
      hint:
        vi: "Tính số tăng `d` trong một câu con, rồi `sum(CASE WHEN d < 0 THEN moves_total ELSE d END)`."
        en: "Compute the increase `d` in a subquery, then `sum(CASE WHEN d < 0 THEN moves_total ELSE d END)`."
quiz:
  - q:
      vi: "Bộ đếm của `QC2` đọc 880, 891, rồi 4 (máy khởi động lại), 13, 20, 31. `max(moves_total) - min(moves_total)` cho bao nhiêu?"
      en: "The counter of `QC2` reads 880, 891, then 4 (the machine restarted), 13, 20, 31. What does `max(moves_total) - min(moves_total)` give?"
    options:
      - { vi: "887, vì tính từ 4 tới 891", en: "887, from 4 up to 891" }
      - { vi: "42, đúng số lượt cẩu đã làm", en: "42, the moves the crane really made" }
      - { vi: "Báo lỗi vì bộ đếm giảm", en: "An error, because the counter went down" }
    answer: 0
    trap: 1
    why:
      vi: "42 là số lượt thật (11 trước khi khởi động lại, rồi 4 + 9 + 7 + 11 sau đó), nên dễ chọn nó, nhưng `max - min` không biết có lần khởi động lại: nó lấy 891 - 4 = 887. Đó là lý do tính số tăng từng đoạn bằng `lag`, và khi số tăng âm thì lấy giá trị mới làm số lượt từ lúc khởi động lại. PostgreSQL không báo lỗi khi số giảm; nó chỉ trừ."
      en: "42 is the real number of moves (11 before the restart, then 4 + 9 + 7 + 11 after it), so it is tempting, but `max - min` does not know about the restart: it computes 891 - 4 = 887. That is why you compute each step's increase with `lag`, and when the increase is negative you take the new value as the moves since the restart. PostgreSQL raises no error when a value goes down; it just subtracts."
  - q:
      vi: "`QC1` đọc 1225 lúc 06:45 và 1241 lúc 07:15 (mất lần đọc 07:00). Tốc độ mỗi giờ của đoạn này là bao nhiêu?"
      en: "`QC1` reads 1225 at 06:45 and 1241 at 07:15 (the 07:00 reading is missing). What is the hourly rate for this step?"
    options:
      - { vi: "64 lượt mỗi giờ: 16 lượt nhân 4", en: "64 moves an hour: 16 moves times 4" }
      - { vi: "16 lượt mỗi giờ, vì tăng 16", en: "16 moves an hour, because it rose by 16" }
      - { vi: "32 lượt mỗi giờ: 16 lượt trong nửa giờ", en: "32 moves an hour: 16 moves in half an hour" }
    answer: 2
    trap: 0
    why:
      vi: "Nhân 4 nghe hợp lý vì cẩu thường được đọc mỗi 15 phút, nhưng ở đây lần đọc 07:00 bị mất, nên 16 lượt là của 30 phút chứ không phải 15. Chia cho thời gian thật: 16 ÷ 0,5 giờ = 32 lượt mỗi giờ. Lấy 16 làm tốc độ thì quên hẳn việc chia cho thời gian. Vì vậy câu tính chia cho `extract(epoch FROM ts - lag(ts) OVER w) / 3600`, không chia cho một khoảng cố định."
      en: "Multiplying by 4 sounds right because the crane is usually read every 15 minutes, but here the 07:00 reading is missing, so the 16 moves took 30 minutes, not 15. Divide by the real time: 16 ÷ 0.5 hours = 32 moves an hour. Taking 16 as the rate forgets to divide by time at all. That is why the query divides by `extract(epoch FROM ts - lag(ts) OVER w) / 3600`, not by a fixed step."
---
## Mở bài

Cẩu bờ ở cảng Tiên Sa không gửi "số lượt trong 15 phút qua", mà gửi tổng số lượt từ khi bật máy. Nhiều thiết bị đo kiểu này (đồng hồ điện, công tơ mét, bộ đếm gói tin), nên tính tốc độ từ bộ đếm cộng dồn là một việc cơ bản.

## Ý chính

**Bộ đếm cộng dồn (counter) chỉ tăng.** Giá trị của nó tự thân ít ý nghĩa; điều cần là số tăng giữa hai lần đọc. `lag(moves_total) OVER (PARTITION BY crane_id ORDER BY ts)` trả giá trị của lần đọc trước của cùng cẩu, và hiệu hai giá trị là số lượt trong đoạn đó. Lần đọc đầu của mỗi cẩu không có lần trước nên ra NULL.

**Tốc độ chia cho thời gian thật.** Số lần đọc có thể không đều: mất một lần thì đoạn dài gấp đôi. `ts - lag(ts) OVER w` là khoảng thời gian thật; `extract(epoch FROM ...)` đổi nó ra giây, chia 3600 ra giờ.

**Khởi động lại (counter reset).** Khi máy khởi động lại, bộ đếm về 0 và số tăng ra âm. Cách xử lý phổ biến (Prometheus làm vậy trong hàm `rate`): số tăng âm nghĩa là có khởi động lại, nên lấy chính giá trị mới làm số lượt từ lúc đó.

Hình cuối mục cho thấy bộ đếm của `QC2` rơi về gần 0 và cách tính lại đoạn đó.

## Cú pháp

```sql
-- increase since the previous reading
moves_total - lag(moves_total)
  OVER (PARTITION BY crane_id
        ORDER BY ts)
-- hours between two readings
extract(epoch FROM
  ts - lag(ts) OVER w) / 3600
-- a reset: take the new value
CASE WHEN d < 0
  THEN moves_total ELSE d END
```

- `lag(x, n)` lùi `n` dòng; mặc định là 1.
- Hàm cửa sổ không dùng được trong `WHERE` hay bên trong `sum()`: tính nó trong một câu con trước.

## Ví dụ

Khoảng thời gian giữa các lần đọc của `QC1`, kể cả đoạn mất lần đọc 07:00:

```sql
SELECT ts,
  ts - lag(ts) OVER (ORDER BY ts)
    AS gap
FROM crane_counter
WHERE crane_id = 'QC1'
ORDER BY ts;
```

Số tăng của `QC2`, với đoạn khởi động lại ra âm:

```sql
SELECT ts, moves_total,
  moves_total - lag(moves_total)
    OVER (ORDER BY ts) AS d
FROM crane_counter
WHERE crane_id = 'QC2'
ORDER BY ts;
```

## Lỗi hay gặp

Quên `PARTITION BY`: lần đọc "trước" có thể thuộc cẩu kia.

```sql
-- WRONG: QC2 minus QC1
SELECT crane_id, ts,
  moves_total - lag(moves_total)
    OVER (ORDER BY ts, crane_id) AS d
FROM crane_counter
WHERE ts = '2026-10-30 06:15+00';
```

```sql
-- FIX: each crane against itself
SELECT crane_id, ts, d FROM (
  SELECT crane_id, ts,
    moves_total - lag(moves_total)
      OVER (PARTITION BY crane_id
            ORDER BY ts) AS d
  FROM crane_counter) x
WHERE ts = '2026-10-30 06:15+00';
```

Lấy `max - min` qua một lần khởi động lại:

```sql
-- WRONG: 891 - 4 across the reset
SELECT crane_id,
  max(moves_total) - min(moves_total)
    AS moves
FROM crane_counter
GROUP BY crane_id;
```

```sql
-- FIX: add up the steps, reset-aware
SELECT crane_id,
  sum(CASE WHEN d < 0
    THEN moves_total ELSE d END)
    AS moves
FROM (SELECT crane_id, moves_total,
    moves_total - lag(moves_total)
      OVER (PARTITION BY crane_id
            ORDER BY ts) AS d
  FROM crane_counter) x
GROUP BY crane_id;
```

`lag` là hàm cửa sổ, nên cần `OVER`:

```sql
-- ERROR 42809
SELECT lag(moves_total)
FROM crane_counter;
```

## Thực hành

Ba câu: số lượt tăng giữa hai lần đọc của mỗi cẩu, số lượt mỗi giờ của `QC1` khi có lần đọc bị mất, và tổng số lượt của mỗi cẩu khi có lần khởi động lại.

## Tóm tắt

- Bộ đếm cộng dồn cần trừ lần đọc trước: `x - lag(x) OVER (PARTITION BY crane_id ORDER BY ts)`.
- Tốc độ chia cho thời gian thật giữa hai lần đọc, không chia cho một bước cố định.
- Số tăng âm nghĩa là bộ đếm khởi động lại: lấy giá trị mới làm số tăng.
- `max - min` sai ngay khi có một lần khởi động lại.

# EN

## Opening

The quay cranes at Tien Sa port do not send "moves in the last 15 minutes"; they send the total moves since the machine was switched on. Many devices measure this way (power meters, odometers, packet counters), so turning a cumulative counter into a rate is a basic skill.

## Key idea

**A cumulative counter only goes up.** Its value on its own means little; what matters is the increase between two readings. `lag(moves_total) OVER (PARTITION BY crane_id ORDER BY ts)` returns the same crane's previous reading, and the difference is the moves in that step. Each crane's first reading has no previous one, so it gives NULL.

**A rate divides by the real time.** Readings can be uneven: one missing reading makes a step twice as long. `ts - lag(ts) OVER w` is the real time between readings; `extract(epoch FROM ...)` turns it into seconds, and dividing by 3600 gives hours.

**A restart (counter reset).** When the machine restarts, the counter goes back to 0 and the increase turns negative. The common fix (Prometheus does it in its `rate` function): a negative increase means a restart, so take the new value itself as the moves since then.

The figure at the end of this section shows the counter of `QC2` dropping to almost 0 and how that step is recomputed.

## Syntax

```sql
-- increase since the previous reading
moves_total - lag(moves_total)
  OVER (PARTITION BY crane_id
        ORDER BY ts)
-- hours between two readings
extract(epoch FROM
  ts - lag(ts) OVER w) / 3600
-- a reset: take the new value
CASE WHEN d < 0
  THEN moves_total ELSE d END
```

- `lag(x, n)` goes back `n` rows; the default is 1.
- A window function cannot be used in `WHERE` or inside `sum()`: compute it in a subquery first.

## Example

The time between `QC1`'s readings, including the step where the 07:00 reading is missing:

```sql
SELECT ts,
  ts - lag(ts) OVER (ORDER BY ts)
    AS gap
FROM crane_counter
WHERE crane_id = 'QC1'
ORDER BY ts;
```

The increases of `QC2`, with the restart step negative:

```sql
SELECT ts, moves_total,
  moves_total - lag(moves_total)
    OVER (ORDER BY ts) AS d
FROM crane_counter
WHERE crane_id = 'QC2'
ORDER BY ts;
```

## Common mistakes

Forgetting `PARTITION BY`: the "previous" reading can belong to the other crane.

```sql
-- WRONG: QC2 minus QC1
SELECT crane_id, ts,
  moves_total - lag(moves_total)
    OVER (ORDER BY ts, crane_id) AS d
FROM crane_counter
WHERE ts = '2026-10-30 06:15+00';
```

```sql
-- FIX: each crane against itself
SELECT crane_id, ts, d FROM (
  SELECT crane_id, ts,
    moves_total - lag(moves_total)
      OVER (PARTITION BY crane_id
            ORDER BY ts) AS d
  FROM crane_counter) x
WHERE ts = '2026-10-30 06:15+00';
```

Taking `max - min` across a restart:

```sql
-- WRONG: 891 - 4 across the reset
SELECT crane_id,
  max(moves_total) - min(moves_total)
    AS moves
FROM crane_counter
GROUP BY crane_id;
```

```sql
-- FIX: add up the steps, reset-aware
SELECT crane_id,
  sum(CASE WHEN d < 0
    THEN moves_total ELSE d END)
    AS moves
FROM (SELECT crane_id, moves_total,
    moves_total - lag(moves_total)
      OVER (PARTITION BY crane_id
            ORDER BY ts) AS d
  FROM crane_counter) x
GROUP BY crane_id;
```

`lag` is a window function, so it needs `OVER`:

```sql
-- ERROR 42809
SELECT lag(moves_total)
FROM crane_counter;
```

## Practice

Three questions: the increase between two readings of each crane, `QC1`'s moves per hour when a reading is missing, and each crane's total moves across a restart.

## Recap

- A cumulative counter needs the previous reading subtracted: `x - lag(x) OVER (PARTITION BY crane_id ORDER BY ts)`.
- A rate divides by the real time between readings, not by a fixed step.
- A negative increase means the counter restarted: take the new value as the increase.
- `max - min` is wrong as soon as there is one restart.
