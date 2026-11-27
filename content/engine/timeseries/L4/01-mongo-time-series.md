---
id: e-ts-l4-01
engine: timeseries
level: L4
module: mongo
title: "Collection time-series của MongoDB"
title_en: "MongoDB time series collections"
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ts-mongo-buckets, at: idea }]
objectives:
  - vi: Đọc lệnh tạo một collection time-series với `timeField`, `metaField` và `granularity`.
    en: Read the command that creates a time series collection with `timeField`, `metaField` and `granularity`.
  - vi: Lọc tài liệu theo khoảng thời gian bằng giá trị ngày (`ISODate`), không bằng chuỗi.
    en: Filter documents by a time range with date values (`ISODate`), not with strings.
  - vi: Gom tài liệu thành ô 30 phút bằng `$dateTrunc` và lấy tài liệu mới nhất của mỗi thiết bị.
    en: Group documents into 30-minute buckets with `$dateTrunc` and take each device's latest document.
requires: [e-ts-l3-04]
sources:
  - https://www.mongodb.com/docs/manual/core/timeseries-collections/
  - https://www.mongodb.com/docs/manual/core/timeseries/timeseries-procedures/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/
  - https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/
lab:
  setup: |
    {"collections": {"readings": [
     {"ts": {"$date": "2026-10-30T00:00:00Z"}, "box": "CQRU1001", "temp": -18.0},
     {"ts": {"$date": "2026-10-30T00:10:00Z"}, "box": "CQRU1001", "temp": -17.5},
     {"ts": {"$date": "2026-10-30T00:20:00Z"}, "box": "CQRU1001", "temp": -17.0},
     {"ts": {"$date": "2026-10-30T00:30:00Z"}, "box": "CQRU1001", "temp": -16.0},
     {"ts": {"$date": "2026-10-30T00:40:00Z"}, "box": "CQRU1001", "temp": -15.5},
     {"ts": {"$date": "2026-10-30T00:50:00Z"}, "box": "CQRU1001", "temp": -15.0},
     {"ts": {"$date": "2026-10-30T01:00:00Z"}, "box": "CQRU1001", "temp": -18.0},
     {"ts": {"$date": "2026-10-30T01:10:00Z"}, "box": "CQRU1001", "temp": -18.5},
     {"ts": {"$date": "2026-10-30T00:00:00Z"}, "box": "CQRU1002", "temp": -20.0},
     {"ts": {"$date": "2026-10-30T00:20:00Z"}, "box": "CQRU1002", "temp": -19.5},
     {"ts": {"$date": "2026-10-30T00:30:00Z"}, "box": "CQRU1002", "temp": -19.0},
     {"ts": {"$date": "2026-10-30T01:00:00Z"}, "box": "CQRU1002", "temp": -19.5}
    ]}}
  steps:
    - task:
        vi: "Container `CQRU1002`, từ 00:00 tới trước 01:00 (UTC) ngày 30/10: trả `ts` và `temp` (bỏ `_id`), xếp theo `ts` tăng dần."
        en: "Container `CQRU1002`, from 00:00 to before 01:00 (UTC) on 30 Oct: return `ts` and `temp` (drop `_id`), sorted by `ts` ascending."
      solution: |
        db.readings.find(
          { box: "CQRU1002",
            ts: { $gte: ISODate("2026-10-30T00:00:00Z"),
                  $lt: ISODate("2026-10-30T01:00:00Z") } },
          { _id: 0, ts: 1, temp: 1 }
        ).sort({ ts: 1 })
      check: doc
      ordered: true
      hint:
        vi: "So `ts` với `ISODate(\"…\")`, không với chuỗi: `{ $gte: ISODate(…), $lt: ISODate(…) }`, rồi `.sort({ ts: 1 })`."
        en: "Compare `ts` with `ISODate(\"…\")`, not with a string: `{ $gte: ISODate(…), $lt: ISODate(…) }`, then `.sort({ ts: 1 })`."
    - task:
        vi: "Nhiệt độ trung bình của mỗi container trong từng ô 30 phút. Mỗi tài liệu kết quả có `_id: { box, t }` (`t` = đầu ô), `avg` và `n` (số tài liệu trong ô); xếp theo `_id.box` rồi `_id.t`."
        en: "Each container's average temperature per 30-minute bucket. Each result document has `_id: { box, t }` (`t` = the bucket start), `avg` and `n` (documents in the bucket); sorted by `_id.box`, then `_id.t`."
      solution: |
        db.readings.aggregate([
          { $group: {
              _id: { box: "$box",
                     t: { $dateTrunc: { date: "$ts", unit: "minute", binSize: 30 } } },
              avg: { $avg: "$temp" },
              n: { $sum: 1 } } },
          { $sort: { "_id.box": 1, "_id.t": 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$dateTrunc: { date: \"$ts\", unit: \"minute\", binSize: 30 }` đưa mỗi `ts` về đầu ô 30 phút của nó; gom theo `{ box, t }`."
        en: "`$dateTrunc: { date: \"$ts\", unit: \"minute\", binSize: 30 }` moves each `ts` to the start of its 30-minute bucket; group by `{ box, t }`."
    - task:
        vi: "Số đo mới nhất của mỗi container: `_id` = container, `ts` và `temp` của tài liệu mới nhất; xếp theo `_id`."
        en: "Each container's latest reading: `_id` = the container, `ts` and `temp` of its newest document; sorted by `_id`."
      solution: |
        db.readings.aggregate([
          { $sort: { ts: -1 } },
          { $group: { _id: "$box",
              ts: { $first: "$ts" },
              temp: { $first: "$temp" } } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Xếp `ts` giảm dần trước, rồi `$group` theo `$box` với `$first` cho `ts` và `temp`."
        en: "Sort `ts` descending first, then `$group` by `$box` with `$first` for `ts` and `temp`."
quiz:
  - q:
      vi: "Bạn lọc `{ ts: { $gte: \"2026-10-30T01:00:00Z\" } }` trên collection mà `ts` là kiểu ngày. Kết quả ra sao?"
      en: "You filter `{ ts: { $gte: \"2026-10-30T01:00:00Z\" } }` on a collection where `ts` is a date. What comes back?"
    options:
      - { vi: "Các tài liệu từ 01:00, vì MongoDB tự đổi chuỗi sang ngày", en: "The documents from 01:00, since MongoDB turns the string into a date" }
      - { vi: "Không tài liệu nào: chuỗi và ngày là hai kiểu khác nhau", en: "No documents: a string and a date are two different types" }
      - { vi: "Lỗi kiểu dữ liệu ngay khi chạy lệnh", en: "A type error as soon as the command runs" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì chuỗi viết đúng định dạng ngày, nhưng MongoDB không đổi kiểu: phép so `$gte` chỉ khớp giá trị cùng kiểu BSON, nên một chuỗi không bao giờ khớp một giá trị ngày và lệnh trả 0 tài liệu mà không báo lỗi. Viết `ISODate(\"2026-10-30T01:00:00Z\")` để hai bên cùng là kiểu ngày."
      en: "It sounds right because the string is written in date format, but MongoDB does not convert types: `$gte` only matches values of the same BSON type, so a string never matches a date value and the command returns 0 documents without an error. Write `ISODate(\"2026-10-30T01:00:00Z\")` so both sides are dates."
  - q:
      vi: "Collection time-series có `metaField: \"box\"`. Trường `box` nên chứa gì?"
      en: "A time series collection has `metaField: \"box\"`. What should the `box` field hold?"
    options:
      - { vi: "Số đo nhiệt độ, vì nó đổi theo từng lần ghi", en: "The temperature reading, since it changes on every write" }
      - { vi: "Mã container: nhãn của chuỗi số đo, gần như không đổi", en: "The container code: the label of the series, almost never changing" }
      - { vi: "Thời điểm ghi, để MongoDB xếp theo thời gian", en: "The time of the write, so MongoDB orders by time" }
    answer: 1
    trap: 2
    why:
      vi: "Thời điểm ghi thuộc về `timeField`, không phải `metaField`; hai trường này không được trùng nhau. `metaField` là nhãn cho biết số đo thuộc chuỗi nào, ở đây là mã container, và tài liệu MongoDB nói nó nên ít khi hoặc không bao giờ đổi. MongoDB dùng nó để xếp các số đo cùng nguồn, gần nhau về thời gian, vào cùng một nhóm lưu trữ; còn nhiệt độ đổi mỗi lần đo nên là trường đo thường."
      en: "The time of the write belongs to `timeField`, not `metaField`; the two fields may not be the same. `metaField` is the label saying which series a reading belongs to, here the container code, and the MongoDB docs say it should rarely, if ever, change. MongoDB uses it to store readings from the same source and close in time together; the temperature changes on every reading, so it is a plain measurement field."
---
## Mở bài

Ba tầng trước, chuỗi số đo container lạnh sống trong bảng PostgreSQL. Nếu đội ứng dụng đã lưu mọi thứ trong MongoDB, câu hỏi vẫn vậy: số đo trong một khoảng giờ, trung bình mỗi 30 phút, số đo mới nhất của mỗi container.

## Ý chính

**Collection time-series.** MongoDB có loại collection riêng cho chuỗi thời gian. Khi tạo, bạn khai `timeField` (bắt buộc, trường giữ thời điểm, phải là kiểu ngày BSON), `metaField` (tùy chọn, nhãn của chuỗi, ví dụ mã container, gần như không đổi) và `granularity` (`seconds`, `minutes` hoặc `hours`, chọn theo khoảng cách giữa hai lần đo). Bên trong, MongoDB gom số đo cùng nguồn và gần nhau về thời gian vào các nhóm (bucket) nén theo cột; khi bạn đọc, nó trả lại một tài liệu cho mỗi số đo.

**Cách hỏi không đổi.** Với người đọc, đây vẫn là `find` và `aggregate`. Lọc theo khoảng thời gian bằng giá trị ngày `ISODate(…)`; gom theo ô bằng `$dateTrunc`, bản tương đương của `date_bin` trong PostgreSQL; số đo mới nhất mỗi thiết bị là `$sort` giảm dần rồi `$group` với `$first`.

**Trong bài này.** Lab chạy trên mingo, một bộ chạy truy vấn MongoDB trong trình duyệt, trên một collection thường chứa đúng các tài liệu đó. mingo không có collection time-series nên lệnh tạo chỉ để đọc; các câu `find` và `aggregate` thì giống hệt trên collection time-series thật.

Nhiều người nghĩ so `ts` với chuỗi `"2026-10-30T01:00:00Z"` là đủ vì chuỗi trông như ngày. Thật ra MongoDB so theo kiểu BSON: chuỗi không bao giờ khớp giá trị ngày, nên lệnh trả 0 tài liệu mà không báo lỗi.

Hình cuối mục cho thấy 12 số đo được gom theo container và thời gian.

## Cú pháp

```text
db.createCollection("readings", {
  timeseries: {
    timeField: "ts",
    metaField: "box",
    granularity: "minutes"
  }
})
```

- `timeField`: bắt buộc; mỗi tài liệu phải có giá trị ngày ở đây.
- `metaField`: nhãn của chuỗi; không trùng `timeField`, không là `_id`.
- `granularity`: mặc định `seconds`; đặt gần với khoảng cách giữa hai lần đo.
- `$dateTrunc: { date, unit, binSize }` gom thời điểm về đầu ô.

## Ví dụ

Mỗi container có bao nhiêu số đo, từ lúc nào tới lúc nào:

```javascript
db.readings.aggregate([
  { $group: {
      _id: "$box",
      n: { $sum: 1 },
      first: { $min: "$ts" },
      last: { $max: "$ts" } } },
  { $sort: { _id: 1 } }
])
```

`CQRU1001` có 8 số đo, `CQRU1002` có 4.

Trung bình theo giờ của cả hai container:

```javascript
db.readings.aggregate([
  { $group: {
      _id: { $dateTrunc: {
        date: "$ts", unit: "hour" } },
      avg: { $avg: "$temp" } } },
  { $sort: { _id: 1 } }
])
```

Hai ô: 00:00 và 01:00 (UTC).

Các số đo ấm hơn -16 độ:

```javascript
db.readings.find(
  { temp: { $gt: -16 } },
  { _id: 0, box: 1, ts: 1, temp: 1 })
```

Hai số đo của `CQRU1001`, lúc 00:40 và 00:50.

## Lỗi hay gặp

So thời điểm với một chuỗi:

```javascript
// WRONG: a string never matches a date
db.readings.find(
  { ts: { $gte:
    "2026-10-30T01:00:00Z" } })
```

```javascript
// FIX: compare with a date
db.readings.find(
  { ts: { $gte:
    ISODate("2026-10-30T01:00:00Z") } })
```

Câu sai trả 0 tài liệu; câu đúng trả 3 số đo từ 01:00.

Gom theo chính thời điểm thay vì theo ô:

```javascript
// WRONG: one group per reading time
db.readings.aggregate([
  { $group: { _id: "$ts",
      avg: { $avg: "$temp" } } },
  { $sort: { _id: 1 } }
])
```

```javascript
// FIX: truncate the time first
db.readings.aggregate([
  { $group: {
      _id: { $dateTrunc: { date: "$ts",
        unit: "minute", binSize: 30 } },
      avg: { $avg: "$temp" } } },
  { $sort: { _id: 1 } }
])
```

Câu sai ra 8 nhóm, mỗi mốc 10 phút một nhóm; câu đúng ra 3 ô 30 phút.

## Thực hành

Ba bước trên cùng 12 tài liệu: lọc một khoảng giờ, gom ô 30 phút, rồi lấy số đo mới nhất của mỗi container.

## Tóm tắt

- Collection time-series khai `timeField` (kiểu ngày, bắt buộc), `metaField` (nhãn chuỗi) và `granularity`.
- Đọc vẫn bằng `find` và `aggregate`, một tài liệu cho mỗi số đo.
- Lọc thời gian bằng `ISODate(…)`: chuỗi không khớp giá trị ngày.
- `$dateTrunc` với `binSize` gom thời điểm thành ô; `$sort` rồi `$first` cho số đo mới nhất.

# EN

## Opening

For three levels the reefer readings lived in a PostgreSQL table. If the app team already keeps everything in MongoDB, the questions stay the same: the readings in an hour range, the average every 30 minutes, each container's latest reading.

## Key idea

**Time series collections.** MongoDB has a collection type for time series. When you create one you declare `timeField` (required, the field holding the time, which must be a BSON date), `metaField` (optional, the label of the series, for example a container code, almost never changing) and `granularity` (`seconds`, `minutes` or `hours`, picked from the time between two readings). Inside, MongoDB groups readings from the same source and close in time into buckets compressed by column; when you read, it gives back one document per reading.

**The questions do not change.** For the reader it is still `find` and `aggregate`. Filter a time range with date values `ISODate(…)`; group into buckets with `$dateTrunc`, the counterpart of PostgreSQL's `date_bin`; the latest reading per device is a descending `$sort` then `$group` with `$first`.

**In this lesson.** The lab runs on mingo, a MongoDB query runner in the browser, over a plain collection holding exactly those documents. mingo has no time series collections, so the create command is to read only; the `find` and `aggregate` queries are the same as on a real time series collection.

Many people think comparing `ts` with the string `"2026-10-30T01:00:00Z"` is enough because the string looks like a date. In fact MongoDB compares by BSON type: a string never matches a date value, so the command returns 0 documents without an error.

The figure at the end of this section shows the 12 readings grouped by container and time.

## Syntax

```text
db.createCollection("readings", {
  timeseries: {
    timeField: "ts",
    metaField: "box",
    granularity: "minutes"
  }
})
```

- `timeField`: required; every document must hold a date here.
- `metaField`: the series label; not the same as `timeField`, not `_id`.
- `granularity`: `seconds` by default; set it close to the time between two readings.
- `$dateTrunc: { date, unit, binSize }` moves a time to the start of its bucket.

## Example

How many readings each container has, and from when to when:

```javascript
db.readings.aggregate([
  { $group: {
      _id: "$box",
      n: { $sum: 1 },
      first: { $min: "$ts" },
      last: { $max: "$ts" } } },
  { $sort: { _id: 1 } }
])
```

`CQRU1001` has 8 readings, `CQRU1002` has 4.

The hourly average of both containers:

```javascript
db.readings.aggregate([
  { $group: {
      _id: { $dateTrunc: {
        date: "$ts", unit: "hour" } },
      avg: { $avg: "$temp" } } },
  { $sort: { _id: 1 } }
])
```

Two buckets: 00:00 and 01:00 (UTC).

The readings warmer than -16 degrees:

```javascript
db.readings.find(
  { temp: { $gt: -16 } },
  { _id: 0, box: 1, ts: 1, temp: 1 })
```

Two readings of `CQRU1001`, at 00:40 and 00:50.

## Common mistakes

Comparing the time with a string:

```javascript
// WRONG: a string never matches a date
db.readings.find(
  { ts: { $gte:
    "2026-10-30T01:00:00Z" } })
```

```javascript
// FIX: compare with a date
db.readings.find(
  { ts: { $gte:
    ISODate("2026-10-30T01:00:00Z") } })
```

The wrong query returns 0 documents; the right one returns the 3 readings from 01:00.

Grouping by the time itself instead of by bucket:

```javascript
// WRONG: one group per reading time
db.readings.aggregate([
  { $group: { _id: "$ts",
      avg: { $avg: "$temp" } } },
  { $sort: { _id: 1 } }
])
```

```javascript
// FIX: truncate the time first
db.readings.aggregate([
  { $group: {
      _id: { $dateTrunc: { date: "$ts",
        unit: "minute", binSize: 30 } },
      avg: { $avg: "$temp" } } },
  { $sort: { _id: 1 } }
])
```

The wrong query gives 8 groups, one per 10-minute mark; the right one gives 3 buckets of 30 minutes.

## Practice

Three steps on the same 12 documents: filter an hour range, group into 30-minute buckets, then take each container's latest reading.

## Recap

- A time series collection declares `timeField` (a date, required), `metaField` (the series label) and `granularity`.
- Reading is still `find` and `aggregate`, one document per reading.
- Filter time with `ISODate(…)`: a string never matches a date value.
- `$dateTrunc` with `binSize` groups times into buckets; `$sort` then `$first` gives the latest reading.
