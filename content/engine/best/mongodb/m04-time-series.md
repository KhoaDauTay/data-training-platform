---
id: e-bp-m04
engine: best
track: mongodb
level: L3
module: m
title: "Chuỗi thời gian: time series collection hoặc bucket"
title_en: "Time series and the bucket pattern"
kind: quiz
minutes: 4
objectives:
  - vi: "Lưu số đo theo thời gian (cảm biến, giá, log) trong time series collection, hoặc gom các điểm theo nguồn và khung giờ (bucket pattern), và đặt hạn xóa cho dữ liệu cũ."
    en: "Store measurements over time (sensors, prices, logs) in a time series collection, or group points by source and time window (the bucket pattern), and give old data an expiry."
avoid:
  vi: "Mỗi điểm đo một tài liệu, nên số tài liệu và index phình theo từng giây."
  en: "One document per reading, so documents and indexes grow every second."
requires: [e-mg-l4-03, e-mg-l5-08]
skills: [date_bucket]
adv: []
sources:
  - https://www.mongodb.com/docs/manual/core/timeseries-collections/
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/
  - https://www.mongodb.com/docs/manual/core/index-ttl/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.readings.insertOne({ sensorId: 7, at: ISODate('2026-10-31T08:00:00Z'), temp: 31.2 })
  good: |
    db.createCollection('readings', {
      timeseries: { timeField: 'at', metaField: 'sensorId', granularity: 'minutes' },
      expireAfterSeconds: 60 * 60 * 24 * 90
    })
  expect: null
quiz:
  - q:
      vi: "Trong time series collection, trường `metaField` nên giữ gì?"
      en: "In a time series collection, what should the `metaField` hold?"
    options:
      - { vi: "Giá trị đo, ví dụ nhiệt độ", en: "The measured value, such as the temperature" }
      - { vi: "Nhãn ít đổi xác định chuỗi dữ liệu, ví dụ mã cảm biến", en: "A rarely changing label that identifies the series, such as the sensor id" }
      - { vi: "Thời điểm đo", en: "The time of the reading" }
    answer: 1
    why:
      vi: "Docs: metadata là nhãn xác định một chuỗi dữ liệu và hiếm khi đổi, nằm ở `metaField`. Thời điểm nằm ở `timeField`; giá trị đo là các trường còn lại."
      en: "The docs: metadata is a label that identifies a data series and rarely changes, stored in the `metaField`. The time goes in the `timeField`; the measurements are the remaining fields."
---

## Ý chính

Dữ liệu đo theo thời gian dùng time series collection. Nếu không dùng được, áp bucket pattern: gom các điểm của một nguồn trong một khung giờ vào một tài liệu. Dữ liệu chỉ cần giữ một thời gian thì đặt `expireAfterSeconds`.

## Vì sao

- Một tài liệu cho mỗi điểm đo làm số tài liệu và kích thước index tăng rất nhanh.
- Bucket pattern tách chuỗi dài thành các nhóm nhỏ, nên truy vấn theo khoảng thời gian đọc ít tài liệu hơn.
- Time series collection tự gom như vậy bên trong.
- Thẻ này chỉ cú pháp: mingo không có `createCollection` hay tùy chọn `timeseries`.

# EN

## Key idea

Measurements over time go in a time series collection. If you cannot use one, apply the bucket pattern: group one source's points within a time window into one document. Data that only needs to be kept for a while gets `expireAfterSeconds`.

## Why

- One document per reading makes the document count and index size grow very fast.
- The bucket pattern splits a long series into small groups, so a time-range query reads fewer documents.
- A time series collection does this grouping for you internally.
- This card is syntax only: mingo has no `createCollection` and no `timeseries` option.
