---
id: e-bp-o01
engine: best
track: olap
level: L1
module: o
title: "Gộp từng bảng fact trước khi nối"
title_en: "Aggregate each fact table before joining"
kind: quiz
minutes: 4
objectives:
  - vi: "Khi một báo cáo cần hai bảng fact (bán, trả hàng), gộp mỗi bảng về cùng độ chi tiết (grain) rồi mới nối."
    en: "When a report needs two fact tables (sales, returns), aggregate each to the same grain first, then join."
avoid:
  vi: "Nối hai bảng fact theo ngày rồi mới `sum`: mỗi dòng bán nhân với số dòng trả, doanh số ra gấp đôi."
  en: "Joining two fact tables on the day before `sum`: each sale row multiplies by the number of return rows, and sales double."
requires: [e-ol-l1-03]
skills: [join_inner, group_by]
adv: []
sources:
  - https://www.postgresql.org/docs/18/queries-table-expressions.html
  - https://clickhouse.com/docs/data-modeling/schema-design
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-27" }
pair:
  runtime: engine
  check: diff
  setup: |
    CREATE TABLE sales (day date, amount int);
    CREATE TABLE returns (day date, amount int);
    INSERT INTO sales VALUES ('2026-10-30', 100), ('2026-10-30', 200), ('2026-10-31', 300);
    INSERT INTO returns VALUES ('2026-10-30', 20), ('2026-10-30', 30), ('2026-10-31', 10);
  bad: |
    SELECT s.day, sum(s.amount) AS sold,
      sum(r.amount) AS returned
    FROM sales s
    JOIN returns r ON r.day = s.day
    GROUP BY s.day
  good: |
    SELECT s.day, s.sold, r.returned
    FROM (SELECT day, sum(amount) AS sold
        FROM sales GROUP BY day) s
    JOIN (SELECT day,
          sum(amount) AS returned
        FROM returns GROUP BY day) r
      ON r.day = s.day
  expect: null
quiz:
  - q:
      vi: "Ngày 30/10 có 2 dòng bán (100, 200) và 2 dòng trả (20, 30). Nối theo ngày rồi `sum(s.amount)` ra bao nhiêu?"
      en: "On 30 Oct there are 2 sale rows (100, 200) and 2 return rows (20, 30). Joined on the day, what does `sum(s.amount)` give?"
    options:
      - { vi: "300", en: "300" }
      - { vi: "600", en: "600" }
      - { vi: "350", en: "350" }
    answer: 1
    why:
      vi: "300 là doanh số thật, chỉ đúng nếu mỗi dòng bán gặp đúng một dòng trả; 350 là cộng lẫn bán với trả. Phép nối theo ngày ghép mỗi dòng bán với cả 2 dòng trả cùng ngày: 2 × 2 = 4 dòng, nên 100 và 200 mỗi số xuất hiện hai lần, `sum` ra (100 + 200) × 2 = 600. Gộp mỗi bảng về một dòng mỗi ngày trước, rồi nối 1–1, thì không còn nhân dòng."
      en: "300 is the real sales total, right only if each sale row met exactly one return row; 350 mixes sales and returns. Joining on the day pairs each sale row with both return rows of that day: 2 × 2 = 4 rows, so 100 and 200 each appear twice and `sum` gives (100 + 200) × 2 = 600. Aggregate each table to one row per day first, then join one to one, and nothing multiplies."
---

## Ý chính

Hai bảng fact (bán, trả hàng, giao hàng) không nối trực tiếp với nhau. Gộp mỗi bảng về cùng độ chi tiết (grain, ví dụ một dòng mỗi ngày) trong subquery hoặc CTE, rồi mới nối.

## Vì sao

- Nối theo một khóa không duy nhất (ngày) ghép mọi dòng bên này với mọi dòng bên kia cùng khóa: n × m dòng (fan-out).
- `sum` sau phép nối cộng mỗi dòng nhiều lần. Không có lỗi nào báo, chỉ có con số lớn hơn sự thật.
- Gộp trước làm mỗi bên có đúng một dòng mỗi ngày, nên phép nối là 1–1.
- Bản Không nên báo ngày 30/10 bán `600`, trả `100`. Bản Nên báo đúng `300` và `50`.

# EN

## Key idea

Two fact tables (sales, returns, shipments) are never joined directly. Aggregate each to the same grain (for example one row per day) in a subquery or CTE, then join.

## Why

- Joining on a key that is not unique (the day) pairs every row on one side with every row on the other with the same key: n × m rows (fan-out).
- A `sum` after that join adds each row several times. No error warns you, the number is just larger than the truth.
- Aggregating first leaves each side with exactly one row per day, so the join is one to one.
- The Avoid version reports `600` sold and `100` returned on 30 Oct. The Prefer version reports the true `300` and `50`.
