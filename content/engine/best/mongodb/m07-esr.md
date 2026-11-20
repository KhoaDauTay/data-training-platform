---
id: e-bp-m07
engine: best
track: mongodb
level: L3
module: m
title: "Index kép theo ESR: Equality, Sort, Range"
title_en: "Compound indexes follow ESR"
kind: quiz
minutes: 4
objectives:
  - vi: "Xếp trường trong compound index theo ESR: trường so bằng trước, rồi trường sắp xếp, rồi trường khoảng; và biết khi nào đổi chỗ sort và range."
    en: "Order the fields of a compound index by ESR: equality fields first, then sort fields, then range fields; and know when to swap sort and range."
avoid:
  vi: "Một index có đủ trường nhưng sai thứ tự, nên truy vấn vẫn phải sắp xếp trong bộ nhớ."
  en: "An index with all the right fields in the wrong order, so the query still sorts in memory."
requires: [e-mg-l3-05]
skills: [index_design]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-compound/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.orders.createIndex({ createdAt: 1, status: 1, total: -1 })
  good: |
    db.orders.createIndex({ status: 1, total: -1, createdAt: 1 })
    db.orders.find({ status: 'PAID', createdAt: { $gte: ISODate('2026-10-01') } }).sort({ total: -1 })
  expect: null
quiz:
  - q:
      vi: "Truy vấn lọc `status` bằng một giá trị, lọc `createdAt` theo khoảng, sắp xếp theo `total`. Theo ESR, index nào hợp nhất?"
      en: "A query filters `status` on one value, filters `createdAt` on a range, and sorts by `total`. By ESR, which index fits best?"
    options:
      - { vi: "`{ createdAt: 1, status: 1, total: -1 }`", en: "`{ createdAt: 1, status: 1, total: -1 }`" }
      - { vi: "`{ status: 1, total: -1, createdAt: 1 }`", en: "`{ status: 1, total: -1, createdAt: 1 }`" }
      - { vi: "`{ total: -1, createdAt: 1, status: 1 }`", en: "`{ total: -1, createdAt: 1, status: 1 }`" }
    answer: 1
    why:
      vi: "Trường so bằng đứng đầu để phần còn lại của index đã sắp sẵn; trường sắp xếp đứng trước trường khoảng để tránh sort trong bộ nhớ. Docs ghi đây là hướng dẫn cho đa số trường hợp: khoảng rất chọn lọc thì có thể đặt trước sort."
      en: "The equality field comes first so the rest of the index is already in order; the sort field comes before the range field to avoid an in-memory sort. The docs call this a guideline for most cases: a very selective range may go before the sort."
---

## Ý chính

Trong compound index, xếp trường theo thứ tự: so **bằng** (Equality), **sắp xếp** (Sort), **khoảng** (Range: `$gt`, `$lt`…). Index đúng thứ tự vừa thu hẹp phạm vi đọc vừa trả kết quả đã sắp xếp.

## Vì sao

- Trường so bằng đứng đầu thì phần còn lại của index giữ đúng thứ tự.
- Trường sắp xếp đứng trước trường khoảng thì MongoDB không phải sort trong bộ nhớ.
- Đây là hướng dẫn, không phải luật cứng: khi điều kiện khoảng rất chọn lọc, docs cho đặt range trước sort.
- Cùng ý với index nhiều cột trong Postgres. Thẻ này chỉ cú pháp: mingo không có index, nên thứ tự index không đo được.

# EN

## Key idea

In a compound index, order the fields as **Equality**, **Sort**, **Range** (`$gt`, `$lt`…). An index in the right order both narrows what is read and returns results already sorted.

## Why

- With equality fields first, the rest of the index stays in order.
- With the sort field before the range field, MongoDB does not have to sort in memory.
- It is a guideline, not a hard rule: when the range condition is very selective, the docs allow range before sort.
- The same idea applies to multicolumn indexes in Postgres. This card is syntax only: mingo has no indexes, so index order cannot be measured.
