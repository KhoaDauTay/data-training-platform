---
id: e-bp-a18
engine: best
track: sql
level: L2
module: a
title: "Đừng lấy trung bình của trung bình"
title_en: "Don't average averages"
kind: quiz
minutes: 3
objectives:
  - vi: "Tính trung bình tổng thể từ dữ liệu chi tiết, hoặc giữ cả tử số và mẫu số khi gộp từ bảng tổng hợp."
    en: "Compute an overall average from the detail rows, or keep both numerator and denominator when rolling up a summary table."
avoid:
  vi: "Nhóm nhỏ kéo lệch con số chung vì mỗi nhóm có trọng số bằng nhau."
  en: "Small groups skewing the overall number because every group weighs the same."
requires: []
skills: [aggregate, group_by]
adv: [b1]
sources:
  - https://www.postgresql.org/docs/18/functions-aggregate.html
verified: { version: "PostgreSQL 18.6 (PGlite 0.5.16)", date: "2026-11-20" }
pair:
  runtime: lab
  check: diff
  setup: null
  bad: |
    SELECT round(avg(store_avg)) AS avg_order_vnd
    FROM (
      SELECT o.store_id, avg(t.total) AS store_avg
      FROM orders o
      JOIN (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t
        ON t.order_id = o.id
      GROUP BY o.store_id
    ) s
  good: |
    SELECT round(avg(t.total)) AS avg_order_vnd
    FROM (SELECT order_id, sum(qty * unit_price_vnd) AS total FROM order_items GROUP BY order_id) t
  expect: null
quiz:
  - q:
      vi: "Cửa hàng A có 1.000 đơn trung bình 500.000, cửa hàng B có 10 đơn trung bình 100.000. Giá trị đơn trung bình của cả chuỗi gần số nào nhất?"
      en: "Store A has 1,000 orders averaging 500,000; store B has 10 orders averaging 100,000. Which is closest to the chain's average order value?"
    options:
      - { vi: "300.000", en: "300,000" }
      - { vi: "496.000", en: "496,000" }
      - { vi: "100.000", en: "100,000" }
    answer: 1
    why:
      vi: "Trung bình thật là tổng tiền chia tổng số đơn: (500.000.000 + 1.000.000) / 1.010 ≈ 496.000. Lấy trung bình hai con số (300.000) cho 10 đơn của B nặng bằng 1.000 đơn của A."
      en: "The real average is total money over total orders: (500,000,000 + 1,000,000) / 1,010 ≈ 496,000. Averaging the two averages (300,000) makes B's 10 orders weigh as much as A's 1,000."
---

## Ý chính

Tỷ lệ và trung bình tổng thể tính từ dữ liệu chi tiết (`sum(x) / count(*)` trên toàn tập), không lấy trung bình của các trung bình nhóm. Gộp từ bảng tổng hợp thì giữ cả tử số và mẫu số.

## Vì sao

- Trung bình của trung bình cho mỗi nhóm trọng số bằng nhau, bất kể nhóm lớn hay nhỏ.
- Nhóm ít dòng kéo lệch con số chung.

## Ví dụ

Trên `lab`, giá trị đơn trung bình: bản trung bình của 5 cửa hàng cho 474.919, bản tính trên mọi đơn cho 477.959.

# EN

## Key idea

Compute overall ratios and averages from the detail rows (`sum(x) / count(*)` over the whole set), never as the average of group averages. When rolling up a summary table, keep both numerator and denominator.

## Why

- An average of averages gives every group the same weight, whatever its size.
- Groups with few rows skew the overall number.

## Example

On `lab`, the average order value: averaging the 5 stores gives 474,919, computing over every order gives 477,959.
