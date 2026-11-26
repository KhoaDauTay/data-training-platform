---
id: e-st-l3-01
engine: stack
level: L3
module: warehouse
title: "Snowflake: lưu trữ tách khỏi tính toán"
title_en: "Snowflake: storage apart from compute"
kind: concept
runtime: docs
minutes: 15
figures: [{ name: st-warehouse-credits, at: idea }]
objectives:
  - vi: Hiểu warehouse của Snowflake là phần tính toán, tách khỏi dữ liệu, và được tính credit theo cỡ và thời gian chạy.
    en: Understand that a Snowflake warehouse is the compute, separate from the data, billed in credits by size and running time.
  - vi: Tính credit của một lần chạy theo luật trong tài liệu (tính theo giây, tối thiểu 60 giây mỗi lần khởi động).
    en: Compute a run's credits with the documented rule (per second, with a 60-second minimum each time it starts).
  - vi: Biết vì sao một warehouse bị bỏ quên lại tốn, và auto-suspend làm gì.
    en: Know why a forgotten warehouse costs, and what auto-suspend does.
requires: [e-st-l2-08]
sources:
  - { url: "https://docs.snowflake.com/en/user-guide/warehouses-overview", title: "Snowflake docs: Overview of warehouses" }
  - { url: "https://docs.snowflake.com/en/user-guide/warehouses-considerations", title: "Snowflake docs: Warehouse considerations" }
demo_setup: |
  CREATE TABLE wh_sizes (
    size text, credits_per_hour int
  );
  INSERT INTO wh_sizes VALUES
    ('X-Small', 1), ('Small', 2),
    ('Medium', 4), ('Large', 8),
    ('X-Large', 16), ('2X-Large', 32),
    ('3X-Large', 64), ('4X-Large', 128);
  CREATE TABLE wh_runs (
    run_id int, warehouse text, size text,
    started_at timestamp, stopped_at timestamp
  );
  INSERT INTO wh_runs VALUES
    (1, 'bi_wh', 'X-Small', '2026-10-31 08:00:00', '2026-10-31 08:00:20'),
    (2, 'bi_wh', 'X-Small', '2026-10-31 09:00:00', '2026-10-31 09:30:00'),
    (3, 'etl_wh', 'Medium', '2026-10-31 02:00:00', '2026-10-31 02:10:00'),
    (4, 'test_wh', 'Large', '2026-10-30 18:00:00', '2026-10-31 06:00:00');
quiz:
  - q:
      vi: "Một warehouse Medium (4 credit/giờ) khởi động, chạy một câu 30 giây rồi tự tạm dừng. Lần đó bị tính bao nhiêu credit?"
      en: "A Medium warehouse (4 credits/hour) starts, runs one 30-second query and suspends. How many credits does that start cost?"
    options:
      - { vi: "4 × 30/3600 ≈ 0,033 credit", en: "4 × 30/3600 ≈ 0.033 credits" }
      - { vi: "4 × 60/3600 ≈ 0,067 credit", en: "4 × 60/3600 ≈ 0.067 credits" }
      - { vi: "4 credit, tròn một giờ", en: "4 credits, a whole hour" }
    answer: 1
    trap: 0
    why:
      vi: "Tính theo giây nên 30 giây nghe đúng, nhưng tài liệu ghi tối thiểu 60 giây mỗi lần warehouse khởi động. Nên lần này tính 60 giây: 4 × 60 / 3600 = 0,067 credit, gấp đôi con số 30 giây. Cũng không có làm tròn lên cả giờ."
      en: "Billing is per second, so 30 seconds sounds right, but the docs state a 60-second minimum each time a warehouse starts. So this start is billed 60 seconds: 4 × 60 / 3600 = 0.067 credits, twice the 30-second figure. There is no rounding up to a whole hour."
  - q:
      vi: "Một warehouse Large (8 credit/giờ) bị để chạy suốt 12 giờ qua đêm, đã tắt auto-suspend, không câu nào chạy. Tốn bao nhiêu credit?"
      en: "A Large warehouse (8 credits/hour) is left running for 12 hours overnight with auto-suspend off and no queries. How many credits does it use?"
    options:
      - { vi: "96 credit", en: "96 credits" }
      - { vi: "12 credit", en: "12 credits" }
      - { vi: "0, vì không có câu nào chạy", en: "0, because no query ran" }
    answer: 0
    trap: 2
    why:
      vi: "\"Không câu nào chạy thì không tốn\" nghe hợp lý, nhưng credit tính khi warehouse đang chạy, không phải khi có câu. 12 credit là quên nhân cỡ: chỉ đúng với X-Small. Large 8 credit/giờ × 12 giờ = 96 credit. Auto-suspend có để tránh đúng việc này."
      en: "\"No queries, no cost\" sounds reasonable, but credits accrue while the warehouse is running, not while queries run. 12 credits forgets the size: it would only be right for X-Small. Large at 8 credits/hour × 12 hours = 96 credits. Auto-suspend exists to prevent exactly this."
---
## Mở bài

Tháng trước, hóa đơn kho dữ liệu của Chợ Lồng Đèn tăng vọt, và lý do là một warehouse thử nghiệm không ai tắt. Bài này đọc luật tính credit trong tài liệu của Snowflake để bạn tự ước được một lần chạy tốn bao nhiêu.

## Ý chính

Snowflake tách **lưu trữ** (dữ liệu nằm ở đó, tính theo dung lượng) khỏi **tính toán**: một **virtual warehouse** là cụm máy chạy câu lệnh. Nhiều warehouse đọc cùng một dữ liệu, nên nhóm BI và đường ống nạp không giành máy của nhau. Warehouse chạy thì tốn credit; tạm dừng thì không.

Theo tài liệu, warehouse X-Small dùng 1 credit mỗi giờ, và mỗi cỡ lớn hơn gấp đôi: Small 2, Medium 4, Large 8, X-Large 16, tới 4X-Large 128 (bảng còn ghi 5X-Large và 6X-Large). Tiền tính theo giây, với tối thiểu 60 giây mỗi lần warehouse khởi động. Giá một credit tùy hợp đồng và vùng, nên bài này chỉ nói credit.

**Auto-suspend** tạm dừng warehouse sau một khoảng không hoạt động; **auto-resume** bật lại khi có câu cần nó. Cả hai mặc định bật. Một warehouse bị tắt auto-suspend và bỏ quên sẽ tốn credit cả đêm dù không ai hỏi gì. Hình cuối mục xếp các cỡ thành thanh dài gấp đôi nhau.

## Cú pháp

```text
-- Snowflake (read only)
CREATE WAREHOUSE bi_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;
```

```sql
-- credits of one run
SELECT greatest(seconds, 60) / 3600.0
  * credits_per_hour;
```

- `AUTO_SUSPEND` tính bằng giây không hoạt động.
- Cỡ lớn hơn chạy nhanh hơn nhưng mỗi giờ tốn gấp đôi.

## Ví dụ

Các cỡ warehouse và credit mỗi giờ theo tài liệu (tới 4X-Large):

```sql
SELECT size, credits_per_hour
FROM wh_sizes
ORDER BY credits_per_hour;
```

Credit của từng lần chạy, với tối thiểu 60 giây:

```sql
SELECT r.run_id, r.warehouse,
  round(greatest(extract(epoch FROM
    r.stopped_at - r.started_at), 60)
    / 3600 * s.credits_per_hour, 3)
    AS credits
FROM wh_runs r
JOIN wh_sizes s ON s.size = r.size
ORDER BY r.run_id;
```

## Lỗi hay gặp

Quên mức tối thiểu 60 giây: lần chạy 20 giây bị tính thiếu.

```sql
-- WRONG: billed only 20 seconds
SELECT round(extract(epoch FROM
  stopped_at - started_at)
  / 3600 * 1, 4) AS credits
FROM wh_runs WHERE run_id = 1;
```

```sql
-- FIX: at least 60 s per start
SELECT round(greatest(extract(epoch
  FROM stopped_at - started_at), 60)
  / 3600 * 1, 4) AS credits
FROM wh_runs WHERE run_id = 1;
```

Tính theo giờ chạy mà quên cỡ: warehouse Large bỏ quên trông như chỉ tốn 12.

```sql
-- WRONG: hours, as if X-Small
SELECT warehouse, extract(epoch FROM
  stopped_at - started_at) / 3600
  AS credits
FROM wh_runs WHERE run_id = 4;
```

```sql
-- FIX: hours times credits per hour
SELECT r.warehouse, extract(epoch FROM
  r.stopped_at - r.started_at) / 3600
  * s.credits_per_hour AS credits
FROM wh_runs r
JOIN wh_sizes s ON s.size = r.size
WHERE r.run_id = 4;
```

## Tóm tắt

- Lưu trữ và tính toán tách nhau; warehouse là phần tính toán, tốn credit khi đang chạy.
- X-Small 1 credit/giờ, mỗi cỡ gấp đôi; tính theo giây, tối thiểu 60 giây mỗi lần khởi động.
- Auto-suspend tạm dừng warehouse rảnh; tắt nó và bỏ quên là tốn cả đêm.
- Chỉ nói credit; giá tiền tùy hợp đồng và vùng.

# EN

## Opening

Last month Lantern Market's warehouse bill jumped, and the reason was a test warehouse nobody turned off. This lesson reads the credit rule in Snowflake's docs so you can estimate what a run costs yourself.

## Key idea

Snowflake separates **storage** (the data sits there, billed by volume) from **compute**: a **virtual warehouse** is the cluster that runs statements. Several warehouses read the same data, so the BI team and the load pipeline do not fight over machines. A running warehouse uses credits; a suspended one does not.

According to the docs, an X-Small warehouse uses 1 credit per hour, and each larger size doubles it: Small 2, Medium 4, Large 8, X-Large 16, up to 4X-Large 128 (the table also lists 5X-Large and 6X-Large). Billing is per second, with a 60-second minimum each time a warehouse starts. The price of a credit depends on the contract and region, so this lesson speaks only of credits.

**Auto-suspend** suspends a warehouse after a period of inactivity; **auto-resume** starts it again when a statement needs it. Both are on by default. A warehouse with auto-suspend turned off and forgotten uses credits all night even though nobody asks anything. The figure at the end of this section draws the sizes as bars that double.

## Syntax

```text
-- Snowflake (read only)
CREATE WAREHOUSE bi_wh
  WAREHOUSE_SIZE = 'XSMALL'
  AUTO_SUSPEND = 60
  AUTO_RESUME = TRUE;
```

```sql
-- credits of one run
SELECT greatest(seconds, 60) / 3600.0
  * credits_per_hour;
```

- `AUTO_SUSPEND` is in seconds of inactivity.
- A larger size runs faster but costs twice as much per hour.

## Example

The warehouse sizes and credits per hour from the docs (up to 4X-Large):

```sql
SELECT size, credits_per_hour
FROM wh_sizes
ORDER BY credits_per_hour;
```

The credits of each run, with the 60-second minimum:

```sql
SELECT r.run_id, r.warehouse,
  round(greatest(extract(epoch FROM
    r.stopped_at - r.started_at), 60)
    / 3600 * s.credits_per_hour, 3)
    AS credits
FROM wh_runs r
JOIN wh_sizes s ON s.size = r.size
ORDER BY r.run_id;
```

## Common mistakes

Forgetting the 60-second minimum: the 20-second run is under-billed.

```sql
-- WRONG: billed only 20 seconds
SELECT round(extract(epoch FROM
  stopped_at - started_at)
  / 3600 * 1, 4) AS credits
FROM wh_runs WHERE run_id = 1;
```

```sql
-- FIX: at least 60 s per start
SELECT round(greatest(extract(epoch
  FROM stopped_at - started_at), 60)
  / 3600 * 1, 4) AS credits
FROM wh_runs WHERE run_id = 1;
```

Counting running hours and forgetting the size: the forgotten Large warehouse looks like it cost only 12.

```sql
-- WRONG: hours, as if X-Small
SELECT warehouse, extract(epoch FROM
  stopped_at - started_at) / 3600
  AS credits
FROM wh_runs WHERE run_id = 4;
```

```sql
-- FIX: hours times credits per hour
SELECT r.warehouse, extract(epoch FROM
  r.stopped_at - r.started_at) / 3600
  * s.credits_per_hour AS credits
FROM wh_runs r
JOIN wh_sizes s ON s.size = r.size
WHERE r.run_id = 4;
```

## Recap

- Storage and compute are separate; a warehouse is the compute and uses credits while running.
- X-Small 1 credit/hour, each size doubles; billed per second, 60 seconds minimum per start.
- Auto-suspend pauses an idle warehouse; turning it off and forgetting costs a whole night.
- Speak in credits only; the price depends on contract and region.
