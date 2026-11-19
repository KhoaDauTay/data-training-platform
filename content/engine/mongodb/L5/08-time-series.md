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
  - https://www.mongodb.com/docs/manual/core/wiredtiger/
quiz:
  - q:
      vi: "Bạn muốn sửa nhiệt độ sai của một phép đo trong collection time series bằng bộ lọc trên `temperature`. Được không?"
      en: "You want to fix a wrong temperature in a time series collection with a filter on `temperature`. Is that allowed?"
    options:
      - { vi: "Được, như collection thường", en: "Yes, like a normal collection" }
      - { vi: "Không, biểu thức khớp trong lệnh update chỉ được dùng `metaField`", en: "No, the match expression of an update can use only the `metaField`" }
    answer: 1
    why:
      vi: "Docs chính thức: biểu thức khớp trong lệnh update chỉ được chỉ định `metaField`; không cập nhật được các trường khác của tài liệu time series."
      en: "The docs: match expressions in update commands can only specify the `metaField`; other fields of a time series document cannot be updated."
  - q:
      vi: "Shard một collection time series mới trên MongoDB 8.0. Shard key nên dựa vào trường nào?"
      en: "Sharding a new time series collection on MongoDB 8.0. Which field should the shard key be based on?"
    options:
      - { vi: "`timeField`", en: "`timeField`" }
      - { vi: "`metaField`", en: "`metaField`" }
    answer: 1
    why:
      vi: "Từ 8.0, shard key chứa `timeField` bị deprecated cho collection time series, và docs chính thức yêu cầu reshard theo `metaField`."
      en: "From 8.0, shard keys containing the `timeField` are deprecated for time series collections, and the docs ask you to reshard on the `metaField`."
---

## Ý chính

Dữ liệu time series gồm thời điểm, metadata (nhãn của nguồn, hiếm khi đổi) và các số đo. Collection time series (từ 5.0) ghi dữ liệu cùng nguồn và gần thời điểm cạnh nhau, ở dạng cột theo thứ tự thời gian: ít đĩa hơn, truy vấn và I/O hiệu quả hơn. Nó áp dụng mẫu bucket tự động.

- `timeField` bắt buộc; `metaField` là nhãn nguồn và không thêm được sau khi tạo tài liệu.
- Từ 6.3, MongoDB tự tạo index (chỉ mục) kép trên `metaField` và `timeField`.
- Nén khối mặc định của collection time series là zstd.
- Từ 9.0, dữ liệu nằm trong một namespace, gom thành bucket đã nén; khi truy vấn, MongoDB trả lại dạng một tài liệu cho mỗi phép đo.
- Lệnh update chỉ được khớp theo `metaField`. Shard key chứa `timeField` bị deprecated từ 8.0. Zone sharding không hỗ trợ time series.
- Không hợp với dữ liệu không có thứ tự thời gian.

## Ví dụ

```javascript
db.createCollection("weather", {
  timeseries: { timeField: "timestamp", metaField: "sensor" }
})
```

Đúng với docs chính thức của MongoDB hiện hành (có ghi chú 6.3, 8.0, 9.0), kiểm ngày 2026-11-20. mingo không có collection time series; lab bucket ở L4 cho thấy cùng ý tưởng.

# EN

## Key idea

Time series data is made of a time, metadata (a label for the source that rarely changes) and measurements. A time series collection (from 5.0) stores data from the same source and close in time side by side, in a columnar format ordered by time: less disk, more efficient queries and I/O. It applies the bucket pattern automatically.

- `timeField` is required; `metaField` is the source label and cannot be added to a document after it is created.
- From 6.3, MongoDB creates a compound index on the `metaField` and the `timeField` automatically.
- The default block compression for time series collections is zstd.
- From 9.0 the data lives in one namespace, grouped into compressed buckets; when you query, MongoDB returns one document per measurement.
- Updates can match only on the `metaField`. Shard keys containing the `timeField` are deprecated from 8.0. Zone sharding does not support time series.
- Not suited to data with no time order.

## Example

```javascript
db.createCollection("weather", {
  timeseries: { timeField: "timestamp", metaField: "sensor" }
})
```

Matches the current MongoDB manual (with its 6.3, 8.0 and 9.0 notes), checked 2026-11-20. mingo has no time series collections; the bucket lab in L4 shows the same idea.
