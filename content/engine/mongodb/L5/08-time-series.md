---
id: e-mg-l5-08
engine: mongodb
level: L5
module: sharding-ts
title: "Collection time series"
title_en: "Time series collections"
kind: concept
minutes: 10
runtime: docs
objectives:
  - vi: "Chọn `timeField` và `metaField` cho dữ liệu đo theo thời gian"
    en: "Choose `timeField` and `metaField` for measurements over time"
  - vi: "Biết collection time series lưu thành bucket và các giới hạn khi cập nhật, khi shard"
    en: "Know that time series collections store buckets, and their limits for updates and sharding"
requires: [e-mg-l4-03, e-mg-l5-05]
sources:
  - https://www.mongodb.com/docs/manual/core/timeseries-collections/
  - https://www.mongodb.com/docs/manual/core/timeseries/timeseries-limitations/
  - https://www.mongodb.com/docs/manual/core/wiredtiger/
quiz:
  - q:
      vi: "Bạn muốn sửa nhiệt độ sai của một phép đo trong collection time series bằng bộ lọc trên `temperature`. Được không?"
      en: "You want to fix a wrong temperature in a time series collection with a filter on `temperature`. Is that allowed?"
    options:
      - { vi: "Được, như collection thường", en: "Yes, like a normal collection" }
      - { vi: "Không, lệnh update chỉ được khớp và sửa `metaField`", en: "No, an update can only match and modify the `metaField`" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì khi đọc nó trông như collection thường, nhưng bên dưới mỗi tài liệu lưu là một bucket gom nhiều phép đo của cùng nguồn, ở dạng cột. Trang giới hạn của time series ghi: lệnh update chỉ được khớp theo giá trị `metaField` và chỉ được sửa `metaField`, nên bộ lọc trên `temperature` bị từ chối. Phép đo sai thường được xóa theo `metaField` rồi chèn lại."
      en: "It sounds right because on reads it looks like a normal collection, but underneath each stored document is a bucket packing many measurements of one source in columns. The time series limitations page says an update can only match on the `metaField` value and only modify the `metaField`, so a filter on `temperature` is refused. A wrong measurement is usually deleted by `metaField` and inserted again."
  - q:
      vi: "Shard một collection time series mới trên MongoDB 8.0. Shard key nên dựa vào trường nào?"
      en: "Sharding a new time series collection on MongoDB 8.0. Which field should the shard key be based on?"
    options:
      - { vi: "`timeField`", en: "`timeField`" }
      - { vi: "`metaField`", en: "`metaField`" }
    answer: 1
    trap: 0
    why:
      vi: "`timeField` nghe hợp lý vì dữ liệu xếp theo thời gian, nhưng nó tăng đơn điệu: mọi phép đo mới có thời điểm lớn nhất, nên dồn vào chunk cuối của một shard. Docs cũng ghi từ 8.0 shard key chứa `timeField` bị deprecated cho collection time series. `metaField` (ví dụ mã cảm biến) có nhiều giá trị và không tăng dần, nên lượt ghi của các cảm biến chia ra nhiều shard."
      en: "`timeField` sounds right because the data is ordered by time, but it grows monotonically: every new measurement has the latest time, so it piles into the last chunk on one shard. The docs also say that from 8.0 shard keys containing the `timeField` are deprecated for time series collections. The `metaField` (for example the sensor id) has many values and does not keep increasing, so the sensors' writes spread over many shards."
---
## Mở bài

Mỗi cảm biến trong kho lạnh gửi nhiệt độ mỗi phút, và sau một năm collection có hàng trăm triệu tài liệu nhỏ. Lưu từng phép đo thành một tài liệu riêng tốn đĩa và tốn index; MongoDB có một loại collection làm sẵn việc gom chúng lại.

## Ý chính

Dữ liệu time series gồm thời điểm, metadata (nhãn của nguồn, hiếm khi đổi) và các số đo. Collection time series (từ 5.0) ghi dữ liệu cùng nguồn và gần thời điểm cạnh nhau, ở dạng cột theo thứ tự thời gian: ít đĩa hơn, truy vấn và I/O hiệu quả hơn. Nó áp dụng mẫu bucket tự động, và khi truy vấn vẫn trả một tài liệu cho mỗi phép đo.

`timeField` bắt buộc; `metaField` là nhãn nguồn, nên chọn trường xác định một chuỗi đo (ví dụ mã cảm biến). Từ 6.3, MongoDB tự tạo index kép trên `metaField` và `timeField`. Nén khối mặc định là zstd.

Nhiều người nghĩ đây chỉ là collection thường được nén. Thật ra nó có luật riêng: lệnh update chỉ được khớp và sửa `metaField`, không được `upsert`, phải sửa nhiều tài liệu (`updateMany`); shard key chứa `timeField` bị deprecated từ 8.0; zone sharding không hỗ trợ time series. Dữ liệu không có thứ tự thời gian không hợp với nó.

mingo không có collection time series: bài này dùng lệnh từ docs. Lab bucket ở L4 cho thấy cùng ý tưởng gom phép đo.

## Cú pháp

```text
db.createCollection("<name>", {
  timeseries: { timeField: "<field>", metaField: "<field>", granularity: "seconds" | "minutes" | "hours" },
  expireAfterSeconds: <number>
})
```

- `timeField`: bắt buộc, kiểu ngày.
- `metaField`: nhãn của nguồn; là trường duy nhất update được khớp và sửa.
- `granularity`: khoảng thời gian thường gặp giữa hai phép đo của cùng nguồn.
- `expireAfterSeconds`: tự xóa dữ liệu cũ (TTL).

## Ví dụ

Collection cho cảm biến kho lạnh, giữ 30 ngày:

```text
db.createCollection("weather", {
  timeseries: { timeField: "timestamp", metaField: "sensor", granularity: "minutes" },
  expireAfterSeconds: 2592000
})
```

Chèn và đọc như collection thường:

```text
db.weather.insertOne({ timestamp: ISODate("2026-11-01T08:00:00Z"), sensor: { id: "K1", room: "cold-1" }, temp: -18.2 })
db.weather.find({ "sensor.id": "K1", timestamp: { $gte: ISODate("2026-11-01") } })
```

Truy vấn lọc theo `metaField` rồi theo thời gian đi đúng index kép mà MongoDB tạo sẵn.

## Lỗi hay gặp

Sửa một số đo bằng bộ lọc trên số đo:

```text
// WRONG: matches on a measurement field, refused on a time series collection
db.weather.updateMany({ temp: { $lt: -50 } }, { $set: { temp: null } })
```

```text
// FIX: match and modify only the metaField, e.g. mark the faulty sensor
db.weather.updateMany({ "sensor.id": "K1" }, { $set: { "sensor.faulty": true } })
```

Shard theo thời gian:

```text
// WRONG: timeField in the shard key is deprecated from 8.0 and monotonic
sh.shardCollection("shop.weather", { timestamp: 1 })
```

```text
// FIX: shard on the metaField
sh.shardCollection("shop.weather", { "sensor.id": 1 })
```

Chọn `metaField` hay đổi, như nhiệt độ: dữ liệu bị chia vào quá nhiều bucket nhỏ và mất lợi ích nén.

## Tóm tắt

- Collection time series = mẫu bucket tự động, nén cột theo thời gian.
- `timeField` bắt buộc; `metaField` = nhãn nguồn, hiếm khi đổi.
- Update chỉ khớp và sửa `metaField`; dùng `expireAfterSeconds` để xóa dữ liệu cũ.
- Shard theo `metaField`; shard key chứa `timeField` bị deprecated từ 8.0.

# EN

## Opening

Every sensor in the cold store sends a temperature each minute, and after a year the collection holds hundreds of millions of small documents. Storing each measurement as its own document costs disk and index space; MongoDB has a kind of collection that groups them for you.

## Key idea

Time series data is made of a time, metadata (a label for the source that rarely changes) and measurements. A time series collection (from 5.0) stores data from the same source and close in time side by side, in a columnar format ordered by time: less disk, more efficient queries and I/O. It applies the bucket pattern automatically, and a query still returns one document per measurement.

`timeField` is required; `metaField` is the source label, so pick a field that identifies one series (for example the sensor id). From 6.3, MongoDB creates a compound index on the `metaField` and the `timeField` automatically. The default block compression is zstd.

Many people think this is just a normal collection, compressed. In fact it has its own rules: an update can only match and modify the `metaField`, cannot `upsert`, and must change many documents (`updateMany`); shard keys containing the `timeField` are deprecated from 8.0; zone sharding does not support time series. Data with no time order does not suit it.

mingo has no time series collections: this lesson uses commands from the docs. The bucket lab in L4 shows the same idea of grouping measurements.

## Syntax

```text
db.createCollection("<name>", {
  timeseries: { timeField: "<field>", metaField: "<field>", granularity: "seconds" | "minutes" | "hours" },
  expireAfterSeconds: <number>
})
```

- `timeField`: required, a date.
- `metaField`: the source label; the only field an update may match and modify.
- `granularity`: the usual time between two measurements from the same source.
- `expireAfterSeconds`: removes old data automatically (TTL).

## Example

A collection for the cold store sensors, kept for 30 days:

```text
db.createCollection("weather", {
  timeseries: { timeField: "timestamp", metaField: "sensor", granularity: "minutes" },
  expireAfterSeconds: 2592000
})
```

Insert and read as with a normal collection:

```text
db.weather.insertOne({ timestamp: ISODate("2026-11-01T08:00:00Z"), sensor: { id: "K1", room: "cold-1" }, temp: -18.2 })
db.weather.find({ "sensor.id": "K1", timestamp: { $gte: ISODate("2026-11-01") } })
```

A query that filters on the `metaField` and then on time uses the compound index MongoDB created.

## Common mistakes

Fixing a measurement with a filter on a measurement:

```text
// WRONG: matches on a measurement field, refused on a time series collection
db.weather.updateMany({ temp: { $lt: -50 } }, { $set: { temp: null } })
```

```text
// FIX: match and modify only the metaField, e.g. mark the faulty sensor
db.weather.updateMany({ "sensor.id": "K1" }, { $set: { "sensor.faulty": true } })
```

Sharding on time:

```text
// WRONG: timeField in the shard key is deprecated from 8.0 and monotonic
sh.shardCollection("shop.weather", { timestamp: 1 })
```

```text
// FIX: shard on the metaField
sh.shardCollection("shop.weather", { "sensor.id": 1 })
```

Picking a `metaField` that changes often, such as the temperature: the data is split into too many small buckets and loses the compression benefit.

## Recap

- A time series collection = the bucket pattern done for you, columnar compression by time.
- `timeField` is required; `metaField` = the source label, rarely changing.
- Updates only match and modify the `metaField`; use `expireAfterSeconds` to remove old data.
- Shard on the `metaField`; shard keys containing the `timeField` are deprecated from 8.0.
