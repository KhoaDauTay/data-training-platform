---
id: e-bp-p17
engine: best
track: postgres
level: L4
module: p
title: "Lọc partition bằng khoảng trên chính khóa, không bọc hàm"
title_en: "Prune partitions with plain ranges on the key"
kind: quiz
minutes: 4
objectives:
  - vi: "Viết điều kiện trên khóa partition dạng `key >= a AND key < b`, để planner chỉ đọc partition cần."
    en: "Write conditions on the partition key as `key >= a AND key < b`, so the planner reads only the partitions it needs."
avoid:
  vi: "Báo cáo một tháng đọc mọi partition của bảng sự kiện, chỉ vì khóa bị bọc trong `date_trunc`."
  en: "A one-month report that reads every partition of the events table, only because the key is wrapped in `date_trunc`."
requires: [e-pg-l4-07]
skills: [sargable, explain_read]
adv: []
sources:
  - https://www.postgresql.org/docs/18/ddl-partitioning.html#DDL-PARTITION-PRUNING
  - https://www.postgresql.org/docs/18/functions-datetime.html#FUNCTIONS-DATETIME-TRUNC
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: engine
  check: runs
  setup: |
    CREATE TABLE events (id bigint NOT NULL, at date NOT NULL, kind text NOT NULL, PRIMARY KEY (id, at)) PARTITION BY RANGE (at);
    CREATE TABLE events_2026_08 PARTITION OF events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
    CREATE TABLE events_2026_09 PARTITION OF events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
    CREATE TABLE events_2026_10 PARTITION OF events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
    INSERT INTO events SELECT i, DATE '2026-08-01' + i % 92, 'view' FROM generate_series(1, 9200) AS i;
    ANALYZE events;
  bad: |
    SELECT count(*) AS october_events
    FROM events
    WHERE date_trunc('month', at) = DATE '2026-10-01'
  good: |
    SELECT count(*) AS october_events
    FROM events
    WHERE at >= DATE '2026-10-01' AND at < DATE '2026-11-01'
  expect: { compare: cost }
quiz:
  - q:
      vi: "Bảng `events` chia partition theo tháng của cột `at`. Điều kiện nào cho phép planner chỉ đọc partition tháng 10?"
      en: "Table `events` is partitioned by month on column `at`. Which condition lets the planner read only the October partition?"
    options:
      - { vi: "`date_trunc('month', at) = DATE '2026-10-01'`", en: "`date_trunc('month', at) = DATE '2026-10-01'`" }
      - { vi: "`at >= DATE '2026-10-01' AND at < DATE '2026-11-01'`", en: "`at >= DATE '2026-10-01' AND at < DATE '2026-11-01'`" }
      - { vi: "`extract(month FROM at) = 10`", en: "`extract(month FROM at) = 10`" }
    answer: 1
    why:
      vi: "Partition pruning so điều kiện với biên của từng partition. Chỉ khi khóa đứng một mình, so với hằng số, planner mới biết partition nào không thể chứa dòng cần."
      en: "Partition pruning compares the condition with each partition's bounds. Only when the key stands alone against constants can the planner tell which partitions cannot hold matching rows."
---

## Ý chính

Điều kiện trên khóa partition viết dạng `key >= a AND key < b`. Không bọc khóa trong hàm (`date_trunc`, `extract`, ép kiểu).

## Vì sao

- Planner chỉ bỏ được partition (partition pruning) khi so được điều kiện với biên của partition.
- `date_trunc('month', at) = …` là một biểu thức khác, nên mọi partition đều bị quét.
- Kết quả hai cách như nhau; khác ở số partition phải đọc. Đây là luật sargable áp cho partition.

# EN

## Key idea

Write conditions on the partition key as `key >= a AND key < b`. Do not wrap the key in a function (`date_trunc`, `extract`, a cast).

## Why

- The planner can skip partitions (partition pruning) only when it can compare the condition with the partitions' bounds.
- `date_trunc('month', at) = …` is a different expression, so every partition gets scanned.
- Both versions return the same result; they differ in how many partitions are read. This is the sargable rule applied to partitions.

