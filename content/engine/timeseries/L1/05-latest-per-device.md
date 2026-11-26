---
id: e-ts-l1-05
engine: timeseries
level: L1
module: basics
title: Giá trị mới nhất của từng thiết bị
title_en: The latest value per device
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ts-latest-lateral, at: idea }]
objectives:
  - vi: Lấy dòng mới nhất của mỗi thiết bị bằng `DISTINCT ON`.
    en: Take each device's newest row with `DISTINCT ON`.
  - vi: Dùng `CROSS JOIN LATERAL` với index `(truck_id, ts)` để mỗi xe chỉ đọc một dòng của index.
    en: Use `CROSS JOIN LATERAL` with an index on `(truck_id, ts)` so each truck reads one index entry.
  - vi: Tìm thiết bị đã im lặng quá lâu.
    en: Find devices that have been silent for too long.
requires: [e-ts-l1-04]
sources:
  - https://www.postgresql.org/docs/18/sql-select.html#SQL-DISTINCT
  - https://www.postgresql.org/docs/18/queries-table-expressions.html#QUERIES-LATERAL
  - https://www.postgresql.org/docs/18/indexes-ordering.html
lab:
  setup: |
    CREATE TABLE trucks (
      truck_id int PRIMARY KEY,
      plate text NOT NULL
    );
    INSERT INTO trucks
    SELECT t, '43C-' || (10000 + t * 137)
    FROM generate_series(1, 20) t;
    CREATE TABLE positions (
      truck_id int NOT NULL,
      ts timestamptz NOT NULL,
      speed_kmh int NOT NULL,
      PRIMARY KEY (truck_id, ts)
    );
    INSERT INTO positions
    SELECT 1 + g % 20,
      timestamptz '2026-10-30 00:00+00'
        + (g / 20) * interval '1 minute',
      (g * 13) % 70
    FROM generate_series(0, 29999) g
    WHERE NOT (g % 20 = 7 AND g >= 24000);
    ANALYZE trucks;
    ANALYZE positions;
  steps:
    - task:
        vi: "Vị trí mới nhất của mỗi xe: trả `truck_id`, `ts`, `speed_kmh`, xếp theo `truck_id`."
        en: "Each truck's newest position: return `truck_id`, `ts`, `speed_kmh`, sorted by `truck_id`."
      solution: |
        SELECT DISTINCT ON (truck_id)
          truck_id, ts, speed_kmh
        FROM positions
        ORDER BY truck_id, ts DESC
      check: rows
      ordered: true
      hint:
        vi: "`DISTINCT ON (truck_id)` giữ dòng đầu của mỗi xe theo `ORDER BY truck_id, ts DESC`."
        en: "`DISTINCT ON (truck_id)` keeps each truck's first row in the order `ORDER BY truck_id, ts DESC`."
    - task:
        vi: "Màn hình điều độ cần biển số, giờ và tốc độ mới nhất của từng xe trong `trucks`: trả `plate`, `ts`, `speed_kmh`. Bài chấm cả tốc độ: câu phải đi qua index `positions_pkey`, không đọc cả bảng `positions`."
        en: "The dispatch screen needs each truck's plate, newest time and speed for every truck in `trucks`: return `plate`, `ts`, `speed_kmh`. Speed is graded too: the query must go through the index `positions_pkey`, not read the whole `positions` table."
      solution: |
        SELECT t.plate, p.ts, p.speed_kmh
        FROM trucks t
        CROSS JOIN LATERAL (
          SELECT ts, speed_kmh
          FROM positions x
          WHERE x.truck_id = t.truck_id
          ORDER BY x.ts DESC
          LIMIT 1) p
      check: rows
      perf: { table: positions }
      slow: |
        SELECT t.plate, p.ts, p.speed_kmh
        FROM trucks t
        JOIN (SELECT DISTINCT ON (truck_id)
            truck_id, ts, speed_kmh
          FROM positions
          ORDER BY truck_id, ts DESC) p
          USING (truck_id)
      hint:
        vi: "Đi từ `trucks`, và với mỗi xe chạy một câu con `LATERAL`: `WHERE x.truck_id = t.truck_id ORDER BY x.ts DESC LIMIT 1`."
        en: "Start from `trucks`, and for each truck run a `LATERAL` subquery: `WHERE x.truck_id = t.truck_id ORDER BY x.ts DESC LIMIT 1`."
    - task:
        vi: "Lúc 01:00 (UTC) ngày 31/10, xe nào đã im lặng hơn 30 phút (vị trí mới nhất trước 00:30)? Trả `plate`, `last_ts`."
        en: "At 01:00 (UTC) on 31 Oct, which trucks have been silent for more than 30 minutes (newest position before 00:30)? Return `plate`, `last_ts`."
      solution: |
        SELECT t.plate, p.ts AS last_ts
        FROM trucks t
        CROSS JOIN LATERAL (
          SELECT ts FROM positions x
          WHERE x.truck_id = t.truck_id
          ORDER BY x.ts DESC
          LIMIT 1) p
        WHERE p.ts < '2026-10-31 00:30+00'
      check: rows
      hint:
        vi: "Lấy vị trí mới nhất như câu trước, rồi lọc `WHERE p.ts < '2026-10-31 00:30+00'` bên ngoài câu con."
        en: "Take the newest position as in the previous step, then filter `WHERE p.ts < '2026-10-31 00:30+00'` outside the subquery."
quiz:
  - q:
      vi: "Viết `SELECT truck_id, max(ts), max(speed_kmh) FROM positions GROUP BY truck_id`. Cột thứ ba là gì?"
      en: "You write `SELECT truck_id, max(ts), max(speed_kmh) FROM positions GROUP BY truck_id`. What is the third column?"
    options:
      - { vi: "Tốc độ ở vị trí mới nhất của xe", en: "The speed at the truck's newest position" }
      - { vi: "Tốc độ lớn nhất xe từng chạy", en: "The highest speed the truck ever had" }
      - { vi: "Báo lỗi vì hai hàm `max` khác cột", en: "An error, because the two `max` calls use different columns" }
    answer: 1
    trap: 0
    why:
      vi: "Đặt `max(ts)` cạnh `max(speed_kmh)` trông như cùng một dòng, nhưng mỗi hàm gộp chạy riêng trên cột của nó: `max(speed_kmh)` là tốc độ lớn nhất trong cả nhóm, thường thuộc một vị trí khác. Câu không lỗi, nên cái sai rất khó thấy. Để lấy cả dòng mới nhất, dùng `DISTINCT ON (truck_id) ... ORDER BY truck_id, ts DESC` hoặc một câu con `LATERAL`."
      en: "Putting `max(ts)` next to `max(speed_kmh)` looks like one row, but each aggregate runs on its own column: `max(speed_kmh)` is the highest speed in the whole group, usually from another position. The query does not fail, so the mistake is hard to see. To take the whole newest row, use `DISTINCT ON (truck_id) ... ORDER BY truck_id, ts DESC` or a `LATERAL` subquery."
  - q:
      vi: "Bảng có 29.700 vị trí của 20 xe và index khóa chính `(truck_id, ts)`. Vì sao câu `LATERAL` nhanh hơn `DISTINCT ON` ở đây?"
      en: "The table holds 29,700 positions of 20 trucks and the primary key index `(truck_id, ts)`. Why is the `LATERAL` query faster than `DISTINCT ON` here?"
    options:
      - { vi: "`DISTINCT ON` sắp mọi dòng; `LATERAL` đọc 20 mục index", en: "`DISTINCT ON` sorts every row; `LATERAL` reads 20 index entries" }
      - { vi: "`LATERAL` chạy song song trên nhiều lõi", en: "`LATERAL` runs in parallel on several cores" }
      - { vi: "`DISTINCT ON` không dùng được index nào", en: "`DISTINCT ON` can never use any index" }
    answer: 0
    trap: 2
    why:
      vi: "`DISTINCT ON` có thể dùng index khi thứ tự khớp, nên câu \"không dùng được index nào\" là sai; nhưng nó vẫn phải đi qua cả 29.700 dòng để bỏ đi tất cả trừ 20 dòng (ở lab này planner chọn đọc cả bảng rồi sắp xếp). `LATERAL` chạy một câu con cho mỗi xe trong `trucks`, và với `ORDER BY ts DESC LIMIT 1` trên index `(truck_id, ts)` mỗi lần chỉ đọc một mục index: 20 lần đọc thay vì 29.700 dòng. Không có gì chạy song song ở đây."
      en: "`DISTINCT ON` can use an index when the order matches, so \"can never use any index\" is wrong; but it still has to walk all 29,700 rows to drop all but 20 (in this lab the planner reads the whole table and sorts). `LATERAL` runs one subquery per truck in `trucks`, and with `ORDER BY ts DESC LIMIT 1` on the index `(truck_id, ts)` each run reads one index entry: 20 reads instead of 29,700 rows. Nothing runs in parallel here."
---
## Mở bài

Màn hình điều độ ở Đà Nẵng hiện 20 xe tải, mỗi xe gửi vị trí mỗi phút. Câu hỏi hay gặp nhất của dữ liệu chuỗi thời gian là "mỗi thiết bị đang ở đâu, lúc nào": dòng mới nhất của từng nhóm.

## Ý chính

**`DISTINCT ON (truck_id)` giữ dòng đầu của mỗi nhóm** theo thứ tự `ORDER BY`. Với `ORDER BY truck_id, ts DESC`, dòng đầu của mỗi xe là dòng mới nhất. Biểu thức trong `DISTINCT ON` phải đứng đầu `ORDER BY`. Câu ngắn và rõ, nhưng nó đi qua mọi dòng của bảng.

**`CROSS JOIN LATERAL` hỏi từng thiết bị một.** Đi từ bảng `trucks`, và với mỗi xe chạy một câu con được nhìn thấy cột của xe đó: `WHERE x.truck_id = t.truck_id ORDER BY x.ts DESC LIMIT 1`. Với index `(truck_id, ts)`, PostgreSQL nhảy tới cuối phần của xe trong index và đọc đúng một mục. 20 xe là 20 lần đọc, dù bảng có bao nhiêu triệu dòng.

**Thiết bị im lặng.** Dòng mới nhất cũng trả lời câu "xe nào mất tín hiệu": lọc giờ mới nhất cũ hơn một ngưỡng. Đi từ `trucks` (không phải từ `positions`) còn giữ được xe chưa từng gửi gì, nếu dùng `LEFT JOIN LATERAL ... ON true`.

Hình cuối mục cho thấy mỗi xe đọc một mục ở cuối phần của nó trong index.

## Cú pháp

```sql
-- newest row per group
SELECT DISTINCT ON (truck_id)
  truck_id, ts, speed_kmh
FROM positions
ORDER BY truck_id, ts DESC;
-- one index lookup per device
FROM trucks t
CROSS JOIN LATERAL (
  SELECT ts, speed_kmh
  FROM positions x
  WHERE x.truck_id = t.truck_id
  ORDER BY x.ts DESC
  LIMIT 1) p
```

- `LEFT JOIN LATERAL (...) p ON true` giữ cả thiết bị không có dòng nào.
- Index cần bắt đầu bằng cột thiết bị rồi tới cột thời gian.

## Ví dụ

Ba xe đầu theo biển số, với vị trí mới nhất:

```sql
SELECT t.plate, p.ts, p.speed_kmh
FROM trucks t
CROSS JOIN LATERAL (
  SELECT ts, speed_kmh
  FROM positions x
  WHERE x.truck_id = t.truck_id
  ORDER BY x.ts DESC LIMIT 1) p
ORDER BY t.plate
LIMIT 3;
```

Xe 8 ngừng gửi từ 19:59 (UTC) ngày 30/10:

```sql
SELECT truck_id, max(ts) AS last_ts
FROM positions
WHERE truck_id IN (7, 8, 9)
GROUP BY truck_id
ORDER BY truck_id;
```

## Lỗi hay gặp

Hai hàm `max` lấy giá trị từ hai dòng khác nhau:

```sql
-- WRONG: max speed, not the newest
SELECT truck_id, max(ts) AS ts,
  max(speed_kmh) AS speed_kmh
FROM positions
WHERE truck_id IN (1, 2)
GROUP BY truck_id;
```

```sql
-- FIX: the whole newest row
SELECT DISTINCT ON (truck_id)
  truck_id, ts, speed_kmh
FROM positions
WHERE truck_id IN (1, 2)
ORDER BY truck_id, ts DESC;
```

`DISTINCT ON` cần biểu thức của nó đứng đầu `ORDER BY`:

```sql
-- ERROR 42P10
SELECT DISTINCT ON (truck_id)
  truck_id, ts
FROM positions
ORDER BY ts DESC;
```

## Thực hành

Ba câu: vị trí mới nhất của mỗi xe bằng `DISTINCT ON`, màn hình điều độ vừa đúng vừa nhanh bằng `LATERAL`, và các xe đã im lặng quá 30 phút.

## Tóm tắt

- "Mới nhất mỗi thiết bị" là dòng đầu của mỗi nhóm theo `ts DESC`.
- `DISTINCT ON` ngắn gọn nhưng đi qua mọi dòng.
- `CROSS JOIN LATERAL` cùng một index bắt đầu bằng cột thiết bị rồi `ts` đọc một mục index cho mỗi thiết bị.
- Đừng ghép nhiều `max()` để dựng một dòng: mỗi hàm lấy từ một dòng khác.

# EN

## Opening

The dispatch screen in Da Nang shows 20 trucks, each sending its position every minute. The most common time-series question is "where is each device, and since when": the newest row of each group.

## Key idea

**`DISTINCT ON (truck_id)` keeps the first row of each group** in the `ORDER BY` order. With `ORDER BY truck_id, ts DESC`, each truck's first row is its newest. The expressions in `DISTINCT ON` must lead the `ORDER BY`. The query is short and clear, but it walks every row of the table.

**`CROSS JOIN LATERAL` asks one device at a time.** Start from the table `trucks`, and for each truck run a subquery that can see that truck's columns: `WHERE x.truck_id = t.truck_id ORDER BY x.ts DESC LIMIT 1`. With an index on `(truck_id, ts)`, PostgreSQL jumps to the end of that truck's part of the index and reads exactly one entry. 20 trucks are 20 reads, however many millions of rows the table holds.

**Silent devices.** The newest row also answers "which truck lost its signal": filter the newest time older than a threshold. Starting from `trucks` (not from `positions`) can even keep a truck that never sent anything, with `LEFT JOIN LATERAL ... ON true`.

The figure at the end of this section shows each truck reading one entry at the end of its part of the index.

## Syntax

```sql
-- newest row per group
SELECT DISTINCT ON (truck_id)
  truck_id, ts, speed_kmh
FROM positions
ORDER BY truck_id, ts DESC;
-- one index lookup per device
FROM trucks t
CROSS JOIN LATERAL (
  SELECT ts, speed_kmh
  FROM positions x
  WHERE x.truck_id = t.truck_id
  ORDER BY x.ts DESC
  LIMIT 1) p
```

- `LEFT JOIN LATERAL (...) p ON true` also keeps devices that have no row.
- The index must start with the device column, then the time column.

## Example

The first three trucks by plate, with their newest position:

```sql
SELECT t.plate, p.ts, p.speed_kmh
FROM trucks t
CROSS JOIN LATERAL (
  SELECT ts, speed_kmh
  FROM positions x
  WHERE x.truck_id = t.truck_id
  ORDER BY x.ts DESC LIMIT 1) p
ORDER BY t.plate
LIMIT 3;
```

Truck 8 stopped reporting at 19:59 (UTC) on 30 Oct:

```sql
SELECT truck_id, max(ts) AS last_ts
FROM positions
WHERE truck_id IN (7, 8, 9)
GROUP BY truck_id
ORDER BY truck_id;
```

## Common mistakes

Two `max` calls take their values from two different rows:

```sql
-- WRONG: max speed, not the newest
SELECT truck_id, max(ts) AS ts,
  max(speed_kmh) AS speed_kmh
FROM positions
WHERE truck_id IN (1, 2)
GROUP BY truck_id;
```

```sql
-- FIX: the whole newest row
SELECT DISTINCT ON (truck_id)
  truck_id, ts, speed_kmh
FROM positions
WHERE truck_id IN (1, 2)
ORDER BY truck_id, ts DESC;
```

`DISTINCT ON` needs its expressions to lead the `ORDER BY`:

```sql
-- ERROR 42P10
SELECT DISTINCT ON (truck_id)
  truck_id, ts
FROM positions
ORDER BY ts DESC;
```

## Practice

Three questions: each truck's newest position with `DISTINCT ON`, a dispatch screen that is both right and fast with `LATERAL`, and the trucks silent for more than 30 minutes.

## Recap

- "Newest per device" is the first row of each group by `ts DESC`.
- `DISTINCT ON` is short but walks every row.
- `CROSS JOIN LATERAL` with an index that starts with the device column, then `ts`, reads one index entry per device.
- Do not build one row from several `max()` calls: each one comes from a different row.
