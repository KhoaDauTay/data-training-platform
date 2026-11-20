---
id: e-bp-m30
engine: best
track: mongodb
level: L2
module: m
title: "$bucket luôn khai default"
title_en: "Always give $bucket a default"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết `$bucket` trên dữ liệu thật luôn kèm `default`, để giá trị ngoài các khoảng (kể cả null hay kiểu lạ) rơi vào một nhóm riêng thay vì làm hỏng cả báo cáo."
    en: "Write every `$bucket` over real data with a `default`, so values outside the ranges (nulls and odd types included) land in their own group instead of breaking the whole report."
avoid:
  vi: "Một đơn giá bất thường làm cả dashboard báo lỗi."
  en: "One unusual price making the whole dashboard fail."
requires: [e-mg-l2-09]
skills: [case_when]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/bucket/
verified: { version: "mingo 7.2.6", date: "2026-11-20" }
pair:
  runtime: mingo
  check: error
  setup: |
    {"collections": {"products": [
      {"_id": 1, "name": "Tea", "price": 30000},
      {"_id": 2, "name": "Cake", "price": 45000},
      {"_id": 3, "name": "Gift box", "price": 450000}
    ]}}
  bad: |
    db.products.aggregate([{ $bucket: { groupBy: '$price', boundaries: [0, 40000, 200000] } }])
  good: |
    db.products.aggregate([{ $bucket: { groupBy: '$price', boundaries: [0, 40000, 200000], default: 'other' } }])
  expect: { code: "mingo" }
quiz:
  - q:
      vi: "Ranh giới là `[0, 40000, 200000]`, không có `default`. Một sản phẩm giá 450.000 đi qua `$bucket`. Chuyện gì xảy ra?"
      en: "The boundaries are `[0, 40000, 200000]` with no `default`. A product priced 450,000 goes through `$bucket`. What happens?"
    options:
      - { vi: "Sản phẩm đó bị bỏ qua, các nhóm khác vẫn ra", en: "That product is skipped and the other groups still come out" }
      - { vi: "Sản phẩm đó vào nhóm cuối cùng", en: "That product goes into the last group" }
      - { vi: "Cả lệnh `aggregate` báo lỗi, không nhóm nào ra", en: "The whole `aggregate` fails and no group comes out" }
    answer: 2
    why:
      vi: "Không có `default`, mọi tài liệu phải rơi vào một khoảng; một tài liệu nằm ngoài là cả thao tác báo lỗi. Thêm `default: 'other'` thì giá đó vào nhóm `other`."
      en: "Without `default`, every document must fall into a range; one document outside them makes the whole operation throw an error. With `default: 'other'` that price goes into the `other` group."
---

## Ý chính

`$bucket` trên dữ liệu thật luôn có `default` (ví dụ `'other'`), trừ khi ranh giới chắc chắn phủ mọi giá trị, kể cả null và kiểu lạ.

## Vì sao

- Thiếu `default`, mỗi tài liệu phải rơi vào một khoảng của `boundaries`, không thì thao tác báo lỗi.
- Dữ liệu thật luôn có một giá trị ngoài dự tính, và một tài liệu là đủ làm hỏng cả báo cáo.
- `$bucket` cũng chỉ trả nhóm có ít nhất một tài liệu: muốn hiện đủ mọi khoảng thì ghép thêm danh sách khoảng.

## Ví dụ

mingo trả lỗi của chính nó (`$bucket require a default for out of range values`), không phải mã lỗi của máy chủ MongoDB. Bản Nên trả ba nhóm, mỗi nhóm một sản phẩm.

# EN

## Key idea

A `$bucket` over real data always has a `default` (for example `'other'`), unless the boundaries surely cover every value, nulls and odd types included.

## Why

- Without `default`, every document must fall into a range of `boundaries`, or the operation throws an error.
- Real data always has an unexpected value, and one document is enough to break the whole report.
- `$bucket` also returns only groups that hold at least one document: to show every range, join it with a list of ranges.

## Example

mingo returns its own error (`$bucket require a default for out of range values`), not a MongoDB server error code. The good version returns three groups of one product each.
