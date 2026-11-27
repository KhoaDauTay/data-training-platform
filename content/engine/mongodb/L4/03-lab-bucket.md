---
id: e-mg-l4-03
engine: mongodb
level: L4
module: patterns
title: "Lab: mẫu Bucket cho số đo cảm biến"
title_en: "Lab: the Bucket pattern for sensor readings"
kind: lab
minutes: 16
runtime: browser
viz: mg-pipeline
figures: [{ name: mg-computed-bucket, at: idea, variant: bucket }]
objectives:
  - vi: "Gom nhiều tài liệu nhỏ thành một bucket theo nguồn và theo giờ"
    en: "Group many small documents into one bucket per source and hour"
  - vi: "Giữ thứ tự trong mảng bằng `$sort` trước `$push`"
    en: "Keep the array order with a `$sort` before `$push`"
  - vi: "Lưu bucket bằng `$merge` và thêm một phép đo mới bằng upsert"
    en: "Store buckets with `$merge` and add a new reading with an upsert"
requires: [e-mg-l4-01]
sources:
  - { url: https://www.mongodb.com/docs/manual/data-modeling/design-patterns/group-data/bucket-pattern/, title_vi: "Mẫu bucket" }
  - { url: https://www.mongodb.com/docs/manual/core/timeseries-collections/, title_vi: "Collection chuỗi thời gian" }
  - { url: https://www.mongodb.com/docs/manual/reference/operator/aggregation/merge/, title_vi: "$merge" }
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
    ],
    "buckets": [
      {"_id": {"sensor": "s3", "hour": {"$date": "2026-10-01T10:00:00Z"}}, "count": 2, "temps": [18.5, 18.9]}
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
    - task:
        vi: "Lưu bucket vào collection `buckets` (đã có một bucket của cảm biến `s3`): cùng pipeline gom theo `{ sensor, hour }` với `count` và `temps` theo thời gian, kết thúc bằng `$merge` vào `buckets`."
        en: "Store the buckets in the `buckets` collection (it already holds one bucket of sensor `s3`): the same pipeline grouping by `{ sensor, hour }` with `count` and `temps` in time order, ending with a `$merge` into `buckets`."
      solution: |
        db.readings.aggregate([
          { $addFields: { t: { $toDate: "$ts" } } },
          { $sort: { t: 1, _id: 1 } },
          { $group: {
              _id: { sensor: "$sensor", hour: { $dateTrunc: { date: "$t", unit: "hour" } } },
              count: { $sum: 1 },
              temps: { $push: "$temp" }
          } },
          { $merge: { into: "buckets" } }
        ])
      check: doc
      hint:
        vi: "`$merge` là stage cuối; với mặc định, bucket mới được thêm, bucket cũ của `s3` vẫn ở đó."
        en: "`$merge` is the last stage; with its defaults new buckets are inserted and the old `s3` bucket stays."
    - task:
        vi: "Cảm biến mới `s4` đo 17.0 độ lúc 10:15. Thêm phép đo vào bucket `{ sensor: \"s4\", hour: 10:00 on 2026-10-01 UTC }` (10:00 ngày 2026-10-01 UTC) bằng một `updateOne`: đẩy giá trị vào `temps`, tăng `count`, và tạo bucket nếu nó chưa có."
        en: "New sensor `s4` reads 17.0 degrees at 10:15. Add the reading to the bucket `{ sensor: \"s4\", hour: 10:00 on 2026-10-01 UTC }` with one `updateOne`: push the value into `temps`, raise `count`, and create the bucket if it does not exist."
      solution: 'db.buckets.updateOne({ _id: { sensor: "s4", hour: ISODate("2026-10-01T10:00:00Z") } }, { $push: { temps: 17.0 }, $inc: { count: 1 } }, { upsert: true })'
      check: doc
      hint:
        vi: "Tùy chọn thứ ba `{ upsert: true }`: không có tài liệu khớp thì tạo mới từ bộ lọc rồi áp `$push` và `$inc`."
        en: "Third argument `{ upsert: true }`: when nothing matches, a new document is built from the filter and then `$push` and `$inc` apply."
quiz:
  - q:
      vi: "Bạn tự làm bucket cho số đo mỗi giây. Mỗi bucket nên chứa bao nhiêu phép đo?"
      en: "You hand-build buckets for readings every second. How many readings should each bucket hold?"
    options:
      - { vi: "Tất cả phép đo của cảm biến, mãi mãi, để chỉ một tài liệu mỗi cảm biến", en: "Every reading of the sensor, forever, so there is one document per sensor" }
      - { vi: "Có giới hạn, theo khoảng thời gian hoặc theo số phần tử, để tài liệu không lớn mãi", en: "A bounded number, by time window or by element count, so the document never grows forever" }
      - { vi: "Đúng một phép đo", en: "Exactly one reading" }
    answer: 1
    trap: 0
    why:
      vi: "Một tài liệu cho mỗi cảm biến nghe gọn vì ít tài liệu hơn, nhưng đo mỗi giây thì mảng thêm 60 × 60 × 24 = 86.400 giá trị mỗi ngày: tài liệu to dần tới giới hạn 16 MiB, và mỗi lần thêm một phép đo phải viết lại cả tài liệu lớn. Đúng một phép đo thì không còn là bucket, mà quay lại dạng một tài liệu cho mỗi phép đo mà mẫu này muốn bỏ. Bucket cần một trần, theo khoảng thời gian (một phút = 60 phép đo) hoặc theo số phần tử, để mỗi tài liệu gom đủ nhiều mà không lớn mãi."
      en: "One document per sensor sounds neat because there are fewer documents, but at one reading a second the array gains 60 × 60 × 24 = 86,400 values a day: the document grows towards the 16 MiB limit, and adding each reading rewrites the whole big document. Exactly one reading is no bucket at all, just the one-document-per-reading shape this pattern wants to drop. A bucket needs a cap, by time window (one minute = 60 readings) or by element count, so each document groups enough without growing forever."
  - q:
      vi: "Vì sao bước 1 có `$sort` theo thời gian trước `$group`?"
      en: "Why does step 1 have a `$sort` by time before `$group`?"
    options:
      - { vi: "`$group` tự sắp theo `_id`", en: "`$group` sorts by `_id` on its own" }
      - { vi: "`$push` giữ thứ tự tài liệu đi vào, nên phải sắp trước để `temps` theo thời gian", en: "`$push` keeps the order documents arrive in, so sorting first puts `temps` in time order" }
      - { vi: "Để `$avg` đúng", en: "So that `$avg` is right" }
    answer: 1
    why:
      vi: "`$group` không sắp gì cả: nó không hứa thứ tự các nhóm đầu ra, càng không sắp bên trong mảng. `$push` chỉ nối giá trị theo thứ tự tài liệu đi vào, mà `readings` lưu phép đo 08:20 của `s1` sau phép đo 08:35, nên thiếu `$sort` thì `temps` giờ 08 ra 21, 21.6, 21.2 thay vì 21, 21.2, 21.6. `$avg` không phụ thuộc thứ tự: cộng theo thứ tự nào cũng ra cùng trung bình."
      en: "`$group` sorts nothing: it promises no order of the output groups, let alone inside arrays. `$push` only appends values in the order documents arrive, and `readings` stores the 08:20 reading of `s1` after the 08:35 one, so without the `$sort` the hour-08 `temps` come out 21, 21.6, 21.2 instead of 21, 21.2, 21.6. `$avg` does not depend on order: any order of adding gives the same average."
---
## Mở bài

Một cảm biến đo mỗi phút sinh 1.440 tài liệu mỗi ngày, và màn hình biểu đồ luôn đọc theo từng giờ. Mở 60 tài liệu nhỏ cho mỗi điểm trên biểu đồ là phí. Gom chúng thành một tài liệu mỗi giờ thì sao?

## Ý chính

Mẫu Bucket gom một chuỗi dài thành nhiều nhóm nhỏ: thay vì một tài liệu cho mỗi phép đo, ta có một tài liệu cho mỗi cảm biến mỗi giờ, kèm số liệu tóm tắt (`count`, trung bình) và mảng các giá trị. Đọc một giờ của một cảm biến chỉ còn mở một tài liệu, và index nhỏ hơn vì ít tài liệu hơn.

Bucket cần một trần. Ở đây trần là khoảng thời gian: `_id` gồm cảm biến và giờ, nên phép đo giờ sau rơi vào bucket mới. Thêm phép đo mới là một `updateOne` có upsert: nếu bucket đã có thì đẩy vào mảng, chưa có thì tạo.

Nhiều người nghĩ một tài liệu cho mỗi cảm biến là gọn nhất. Thật ra mảng không có trần làm tài liệu to dần tới giới hạn 16 MiB, và mỗi lần ghi phải viết lại cả tài liệu lớn. Docs chính thức nhắc thêm: collection time series áp dụng mẫu bucket tự động và hợp với hầu hết trường hợp; tự làm bucket khi bạn cần hình dạng riêng.

Lab chạy bằng mingo trong trình duyệt; mỗi lần chạy bắt đầu lại từ dữ liệu gốc.

## Cú pháp

```text
{ $dateTrunc: { date: <date expression>, unit: "hour" | "day" | ... } }
{ $group: { _id: { sensor: "$sensor", hour: <truncated date> }, count: { $sum: 1 }, temps: { $push: "$temp" } } }
{ $merge: { into: "<collection>" } }
db.<coll>.updateOne(<bucket _id>, { $push: { temps: <value> }, $inc: { count: 1 } }, { upsert: true })
```

- `$dateTrunc` cắt ngày về đầu đơn vị (giờ, ngày, ...); đầu vào phải là ngày, không phải chuỗi.
- `$push` trong `$group` nối theo thứ tự tài liệu đi vào.
- `$merge` là stage cuối, ghi kết quả vào một collection khác.
- `upsert: true` tạo bucket khi chưa có tài liệu khớp.

## Ví dụ

Các phép đo của `s1`, đọc theo thời gian:

```javascript
db.readings.find({ sensor: "s1" }).sort({ ts: 1 })
```

Bốn tài liệu: ba trong giờ 08, một trong giờ 09. Chuỗi ISO cùng độ dài nên sắp chuỗi cũng là sắp thời gian.

Gom theo cảm biến, chưa theo giờ:

```javascript
db.readings.aggregate([{ $group: { _id: "$sensor", temps: { $push: "$temp" } } }, { $sort: { _id: 1 } }])
```

Thiếu `$sort` trước `$group`, `temps` của `s1` ra theo thứ tự lưu (21, 21.6, 22.3, 21.2), không theo thời gian.

Thêm một phép đo vào bucket đã có của `s3`:

```javascript
db.buckets.updateOne({ _id: { sensor: "s3", hour: ISODate("2026-10-01T10:00:00Z") } }, { $push: { temps: 19.1 }, $inc: { count: 1 } })
```

Bucket `s3` giờ có `count: 3` và ba giá trị.

## Lỗi hay gặp

Đưa chuỗi thẳng vào `$dateTrunc`:

```javascript
// ERROR mingo
db.readings.aggregate([{ $group: { _id: { sensor: "$sensor", hour: { $dateTrunc: { date: "$ts", unit: "hour" } } }, n: { $sum: 1 } } }])
```

`ts` là chuỗi; `$dateTrunc` cần ngày. MongoDB cũng từ chối. Đổi trước bằng `$toDate`, hoặc lưu `ts` là ngày ngay từ đầu.

Quên upsert khi bucket chưa có:

```javascript
// WRONG: no bucket for s4 yet, so nothing is written
db.buckets.updateOne({ _id: { sensor: "s4", hour: ISODate("2026-10-01T10:00:00Z") } }, { $push: { temps: 17.0 }, $inc: { count: 1 } })
```

```javascript
// FIX: create the bucket when it is missing
db.buckets.updateOne({ _id: { sensor: "s4", hour: ISODate("2026-10-01T10:00:00Z") } }, { $push: { temps: 17.0 }, $inc: { count: 1 } }, { upsert: true })
```

Câu sai không báo lỗi: `matchedCount` là 0 và phép đo mất lặng lẽ.

## Thực hành

Ba bước: gom bucket theo giờ bằng pipeline đọc, lưu chúng vào `buckets` bằng `$merge`, rồi thêm một phép đo của cảm biến mới bằng upsert.

## Tóm tắt

- Bucket: một tài liệu cho mỗi nguồn và mỗi khoảng thời gian, kèm tóm tắt và mảng giá trị.
- Bucket cần trần (thời gian hoặc số phần tử) để tài liệu không lớn mãi.
- `$sort` trước `$group` quyết định thứ tự trong mảng `$push`.
- Thêm phép đo bằng `updateOne` có `upsert: true`; collection time series làm việc này tự động.

# EN

## Opening

A sensor that reads every minute produces 1,440 documents a day, and the chart screen always reads by the hour. Opening 60 small documents for each point on the chart is wasteful. What if they were grouped into one document per hour?

## Key idea

The Bucket pattern groups a long series into many small groups: instead of one document per reading, there is one document per sensor per hour, with summary numbers (`count`, average) and an array of values. Reading one hour of one sensor opens a single document, and indexes are smaller because there are fewer documents.

A bucket needs a cap. Here the cap is a time window: `_id` holds the sensor and the hour, so a reading in the next hour falls into a new bucket. Adding a new reading is an `updateOne` with upsert: push into the array if the bucket exists, create it if it does not.

Many people think one document per sensor is the neatest. In fact an unbounded array grows the document towards the 16 MiB limit, and every write rewrites the whole big document. The docs add: time series collections apply the bucket pattern automatically and suit most cases; build buckets yourself when you need your own shape.

The lab runs on mingo in the browser; every run starts again from the original data.

## Syntax

```text
{ $dateTrunc: { date: <date expression>, unit: "hour" | "day" | ... } }
{ $group: { _id: { sensor: "$sensor", hour: <truncated date> }, count: { $sum: 1 }, temps: { $push: "$temp" } } }
{ $merge: { into: "<collection>" } }
db.<coll>.updateOne(<bucket _id>, { $push: { temps: <value> }, $inc: { count: 1 } }, { upsert: true })
```

- `$dateTrunc` cuts a date to the start of a unit (hour, day, ...); its input must be a date, not a string.
- `$push` inside `$group` appends in the order documents arrive.
- `$merge` is the last stage and writes the result into another collection.
- `upsert: true` creates the bucket when no document matches.

## Example

The readings of `s1`, read in time order:

```javascript
db.readings.find({ sensor: "s1" }).sort({ ts: 1 })
```

Four documents: three in hour 08, one in hour 09. ISO strings have the same length, so sorting the strings also sorts by time.

Grouping by sensor, not yet by hour:

```javascript
db.readings.aggregate([{ $group: { _id: "$sensor", temps: { $push: "$temp" } } }, { $sort: { _id: 1 } }])
```

Without a `$sort` before `$group`, the `temps` of `s1` come out in stored order (21, 21.6, 22.3, 21.2), not in time order.

Adding a reading to the existing bucket of `s3`:

```javascript
db.buckets.updateOne({ _id: { sensor: "s3", hour: ISODate("2026-10-01T10:00:00Z") } }, { $push: { temps: 19.1 }, $inc: { count: 1 } })
```

Bucket `s3` now has `count: 3` and three values.

## Common mistakes

Passing a string straight into `$dateTrunc`:

```javascript
// ERROR mingo
db.readings.aggregate([{ $group: { _id: { sensor: "$sensor", hour: { $dateTrunc: { date: "$ts", unit: "hour" } } }, n: { $sum: 1 } } }])
```

`ts` is a string; `$dateTrunc` needs a date. MongoDB refuses it too. Convert first with `$toDate`, or store `ts` as a date from the start.

Forgetting the upsert when the bucket does not exist yet:

```javascript
// WRONG: no bucket for s4 yet, so nothing is written
db.buckets.updateOne({ _id: { sensor: "s4", hour: ISODate("2026-10-01T10:00:00Z") } }, { $push: { temps: 17.0 }, $inc: { count: 1 } })
```

```javascript
// FIX: create the bucket when it is missing
db.buckets.updateOne({ _id: { sensor: "s4", hour: ISODate("2026-10-01T10:00:00Z") } }, { $push: { temps: 17.0 }, $inc: { count: 1 } }, { upsert: true })
```

The wrong command raises no error: `matchedCount` is 0 and the reading is silently lost.

## Practice

Three steps: build hourly buckets with a read pipeline, store them in `buckets` with `$merge`, then add a reading of a new sensor with an upsert.

## Recap

- Bucket: one document per source and per time window, with a summary and an array of values.
- A bucket needs a cap (time or element count) so the document never grows forever.
- The `$sort` before `$group` decides the order inside a `$push` array.
- Add readings with an `updateOne` and `upsert: true`; a time series collection does this for you.
