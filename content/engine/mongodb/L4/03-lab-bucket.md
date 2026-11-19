---
id: e-mg-l4-03
engine: mongodb
level: L4
module: patterns
title: "Lab: mẫu Bucket cho số đo cảm biến"
title_en: "Lab: the Bucket pattern for sensor readings"
kind: lab
minutes: 14
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Gom nhiều tài liệu nhỏ thành một bucket theo nguồn và theo giờ"
    en: "Group many small documents into one bucket per source and hour"
  - vi: "Giữ thứ tự trong mảng bằng `$sort` trước `$push`"
    en: "Keep the array order with a `$sort` before `$push`"
requires: [e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/
  - https://www.mongodb.com/docs/manual/core/timeseries-collections/
lab:
  setup: |
    {"collections": {"readings": [
      {"_id": 1, "sensor": "s1", "ts": "2026-10-01T08:05:00Z", "temp": 21.0},
      {"_id": 2, "sensor": "s1", "ts": "2026-10-01T08:35:00Z", "temp": 21.6},
      {"_id": 3, "sensor": "s2", "ts": "2026-10-01T08:10:00Z", "temp": 19.4},
      {"_id": 4, "sensor": "s1", "ts": "2026-10-01T09:02:00Z", "temp": 22.3},
      {"_id": 5, "sensor": "s1", "ts": "2026-10-01T08:20:00Z", "temp": 21.2},
      {"_id": 6, "sensor": "s2", "ts": "2026-10-01T08:50:00Z", "temp": 19.8},
      {"_id": 7, "sensor": "s2", "ts": "2026-10-01T09:40:00Z", "temp": 20.5}
    ]}}
  steps:
    - task:
        vi: "Gom `readings` thành bucket theo cảm biến và theo giờ (giờ UTC của `ts`, đổi chuỗi sang ngày). Mỗi bucket: `_id` là `{ sensor, hour }`, `count` số phép đo, `avgTemp` trung bình `temp` làm tròn 2 chữ số, `temps` mảng các `temp` theo thời gian tăng dần. Xếp theo `sensor` rồi `hour` tăng dần."
        en: "Group `readings` into buckets per sensor and per hour (the UTC hour of `ts`, converting the string to a date). Each bucket: `_id` is `{ sensor, hour }`, `count` the number of readings, `avgTemp` the average `temp` rounded to 2 decimals, `temps` the array of `temp` values in ascending time order. Order by `sensor` then `hour` ascending."
      solution: |
        db.readings.aggregate([
          { $addFields: { t: { $toDate: "$ts" } } },
          { $sort: { t: 1, _id: 1 } },
          { $group: {
              _id: { sensor: "$sensor", hour: { $dateTrunc: { date: "$t", unit: "hour" } } },
              count: { $sum: 1 },
              avgTemp: { $avg: "$temp" },
              temps: { $push: "$temp" }
          } },
          { $set: { avgTemp: { $round: [ "$avgTemp", 2 ] } } },
          { $sort: { "_id.sensor": 1, "_id.hour": 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$toDate` đổi chuỗi sang ngày, `$dateTrunc` với `unit: \"hour\"` cắt về đầu giờ. Sắp theo thời gian trước `$group` để `$push` giữ đúng thứ tự."
        en: "`$toDate` turns the string into a date, `$dateTrunc` with `unit: \"hour\"` cuts it to the start of the hour. Sort by time before `$group` so `$push` keeps the right order."
---

## Ý chính

Lab chạy bằng mingo trong trình duyệt. Mẫu Bucket gom một chuỗi dài thành nhiều nhóm nhỏ: thay vì một tài liệu cho mỗi phép đo, ta có một tài liệu cho mỗi cảm biến mỗi giờ, kèm số liệu tóm tắt (`count`, trung bình) và mảng các giá trị. Đọc một giờ của một cảm biến chỉ còn mở một tài liệu.

Docs chính thức của MongoDB nhắc: collection time series áp dụng mẫu bucket tự động và hợp với hầu hết trường hợp. Tự làm bucket khi bạn cần hình dạng riêng, ví dụ phân trang đánh giá theo nhóm 10.

## Ví dụ

```javascript
{ $dateTrunc: { date: "$t", unit: "hour" } }
```

Mảng trong tài liệu có thứ tự, và bộ chấm so mảng theo thứ tự, nên `$sort` trước `$group` là một phần của đáp án.

## Thực hành

Viết pipeline tạo bucket theo giờ cho từng cảm biến.

# EN

## Key idea

This lab runs on mingo in the browser. The Bucket pattern groups a long series into many small groups: instead of one document per reading, there is one document per sensor per hour, with summary numbers (`count`, average) and an array of values. Reading one hour of one sensor opens a single document.

The MongoDB docs note that time series collections apply the bucket pattern automatically and suit most cases. Build buckets yourself when you need your own shape, for example paging reviews in groups of 10.

## Example

```javascript
{ $dateTrunc: { date: "$t", unit: "hour" } }
```

Arrays in a document are ordered, and the grader compares arrays in order, so the `$sort` before `$group` is part of the answer.

## Practice

Write the pipeline that builds hourly buckets per sensor.
