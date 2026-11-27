---
id: e-ts-l4-05
engine: timeseries
level: L4
module: mongo
title: "Bài tổng kết: đêm của hai container lạnh"
title_en: "Capstone: a night of two reefer containers"
kind: capstone
runtime: browser
minutes: 30
figures: [{ name: ts-reefer-night, at: idea }]
objectives:
  - vi: Ghép `$dateTrunc`, `$densify`, `$fill` và `$group` thành một báo cáo đêm cho hai container.
    en: Combine `$dateTrunc`, `$densify`, `$fill` and `$group` into a night report for two containers.
  - vi: Đếm số mốc được lấp để biết số liệu nào là đo thật.
    en: Count the filled marks to know which numbers were really measured.
  - vi: Đặt `$match` trước `$group` để các stage sau đọc ít tài liệu hơn.
    en: Put `$match` before `$group` so the later stages read fewer documents.
requires: [e-ts-l4-02]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateTrunc/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/
  - https://www.mongodb.com/docs/manual/core/aggregation-pipeline-optimization/
lab:
  setup: |
    {"collections": {"readings": [
     {"ts": {"$date": "2026-10-30T18:00:00Z"}, "box": "CQRU2001", "temp": -18.0},
     {"ts": {"$date": "2026-10-30T18:10:00Z"}, "box": "CQRU2001", "temp": -18.2},
     {"ts": {"$date": "2026-10-30T18:20:00Z"}, "box": "CQRU2001", "temp": -17.9},
     {"ts": {"$date": "2026-10-30T18:30:00Z"}, "box": "CQRU2001", "temp": -18.1},
     {"ts": {"$date": "2026-10-30T18:40:00Z"}, "box": "CQRU2001", "temp": -18.0},
     {"ts": {"$date": "2026-10-30T18:50:00Z"}, "box": "CQRU2001", "temp": -17.8},
     {"ts": {"$date": "2026-10-30T19:00:00Z"}, "box": "CQRU2001", "temp": -17.5},
     {"ts": {"$date": "2026-10-30T19:10:00Z"}, "box": "CQRU2001", "temp": -17.0},
     {"ts": {"$date": "2026-10-30T19:20:00Z"}, "box": "CQRU2001", "temp": -16.4},
     {"ts": {"$date": "2026-10-30T19:30:00Z"}, "box": "CQRU2001", "temp": -15.6},
     {"ts": {"$date": "2026-10-30T19:50:00Z"}, "box": "CQRU2001", "temp": -15.4},
     {"ts": {"$date": "2026-10-30T20:00:00Z"}, "box": "CQRU2001", "temp": -16.2},
     {"ts": {"$date": "2026-10-30T20:20:00Z"}, "box": "CQRU2001", "temp": -17.6},
     {"ts": {"$date": "2026-10-30T20:30:00Z"}, "box": "CQRU2001", "temp": -17.9},
     {"ts": {"$date": "2026-10-30T20:40:00Z"}, "box": "CQRU2001", "temp": -18.0},
     {"ts": {"$date": "2026-10-30T20:50:00Z"}, "box": "CQRU2001", "temp": -18.1},
     {"ts": {"$date": "2026-10-30T18:00:00Z"}, "box": "CQRU2002", "temp": -20.0},
     {"ts": {"$date": "2026-10-30T18:20:00Z"}, "box": "CQRU2002", "temp": -20.1},
     {"ts": {"$date": "2026-10-30T18:30:00Z"}, "box": "CQRU2002", "temp": -19.9},
     {"ts": {"$date": "2026-10-30T18:50:00Z"}, "box": "CQRU2002", "temp": -20.0},
     {"ts": {"$date": "2026-10-30T19:00:00Z"}, "box": "CQRU2002", "temp": -20.2},
     {"ts": {"$date": "2026-10-30T19:10:00Z"}, "box": "CQRU2002", "temp": -20.0},
     {"ts": {"$date": "2026-10-30T19:30:00Z"}, "box": "CQRU2002", "temp": -19.8},
     {"ts": {"$date": "2026-10-30T19:40:00Z"}, "box": "CQRU2002", "temp": -20.0},
     {"ts": {"$date": "2026-10-30T20:00:00Z"}, "box": "CQRU2002", "temp": -20.1},
     {"ts": {"$date": "2026-10-30T20:10:00Z"}, "box": "CQRU2002", "temp": -19.9},
     {"ts": {"$date": "2026-10-30T20:30:00Z"}, "box": "CQRU2002", "temp": -20.0},
     {"ts": {"$date": "2026-10-30T20:50:00Z"}, "box": "CQRU2002", "temp": -20.0}
    ]}}
  steps:
    - name: { vi: "Trung bình theo giờ", en: "Hourly average" }
      task:
        vi: "Nhiệt độ trung bình mỗi giờ (UTC) của từng container. Mỗi tài liệu kết quả có `_id: { box, t }` (`t` = đầu giờ), `avg` và `n` (số tài liệu); xếp theo `_id.box` rồi `_id.t`."
        en: "Each container's average temperature per hour (UTC). Each result document has `_id: { box, t }` (`t` = the start of the hour), `avg` and `n` (documents); sorted by `_id.box`, then `_id.t`."
      solution: |
        db.readings.aggregate([
          { $group: {
              _id: { box: "$box",
                     t: { $dateTrunc: { date: "$ts", unit: "hour" } } },
              avg: { $avg: "$temp" },
              n: { $sum: 1 } } },
          { $sort: { "_id.box": 1, "_id.t": 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$group` theo `{ box: \"$box\", t: { $dateTrunc: { date: \"$ts\", unit: \"hour\" } } }`."
        en: "`$group` by `{ box: \"$box\", t: { $dateTrunc: { date: \"$ts\", unit: \"hour\" } } }`."
    - name: { vi: "Lấp mốc 10 phút", en: "Fill 10-minute marks" }
      task:
        vi: "Mỗi container có đủ mốc 10 phút giữa số đo đầu và cuối của chính nó; mốc mới lấy số đo gần nhất trước đó. Trả `ts`, `box`, `temp` (bỏ `_id`), xếp theo `box` rồi `ts`."
        en: "Give each container every 10-minute mark between its own first and last reading; a new mark takes the latest earlier reading. Return `ts`, `box`, `temp` (drop `_id`), sorted by `box`, then `ts`."
      solution: |
        db.readings.aggregate([
          { $densify: { field: "ts",
              partitionByFields: ["box"],
              range: { step: 10, unit: "minute", bounds: "partition" } } },
          { $fill: { partitionByFields: ["box"],
              sortBy: { ts: 1 },
              output: { temp: { method: "locf" } } } },
          { $sort: { box: 1, ts: 1 } },
          { $project: { _id: 0 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$densify` với `partitionByFields: [\"box\"]` và `bounds: \"partition\"`, rồi `$fill` cùng nhóm với `method: \"locf\"`."
        en: "`$densify` with `partitionByFields: [\"box\"]` and `bounds: \"partition\"`, then `$fill` on the same groups with `method: \"locf\"`."
    - name: { vi: "Đếm mốc được lấp", en: "Count filled marks" }
      task:
        vi: "Mỗi container có bao nhiêu mốc 10 phút được lấp (không phải đo thật)? Trả `_id` = container và `filled`; xếp theo `_id`."
        en: "How many 10-minute marks of each container were filled (not really measured)? Return `_id` = the container and `filled`; sorted by `_id`."
      solution: |
        db.readings.aggregate([
          { $densify: { field: "ts",
              partitionByFields: ["box"],
              range: { step: 10, unit: "minute", bounds: "partition" } } },
          { $group: { _id: "$box",
              filled: { $sum: { $cond: [{ $eq: [{ $type: "$temp" }, "missing"] }, 1, 0] } } } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Sau `$densify`, mốc mới chưa có `temp`: đếm bằng `$sum` của `$cond` với `{ $eq: [{ $type: \"$temp\" }, \"missing\"] }`."
        en: "After `$densify` a new mark has no `temp` yet: count it with a `$sum` of `$cond` on `{ $eq: [{ $type: \"$temp\" }, \"missing\"] }`."
    - name: { vi: "Container nào ấm lên", en: "Which box warmed up" }
      task:
        vi: "Chỉ các container có số đo ấm hơn -16 độ: `_id` = container, `n` = số số đo ấm hơn -16, `max` = nhiệt độ cao nhất; xếp theo `_id`. Lọc trước khi gom."
        en: "Only the containers with readings warmer than -16 degrees: `_id` = the container, `n` = the number of readings warmer than -16, `max` = the highest temperature; sorted by `_id`. Filter before grouping."
      solution: |
        db.readings.aggregate([
          { $match: { temp: { $gt: -16 } } },
          { $group: { _id: "$box",
              n: { $sum: 1 },
              max: { $max: "$temp" } } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      rule: match-first
      slow: |
        db.readings.aggregate([
          { $group: { _id: "$box",
              n: { $sum: { $cond: [{ $gt: ["$temp", -16] }, 1, 0] } },
              max: { $max: "$temp" } } },
          { $match: { n: { $gt: 0 } } },
          { $sort: { _id: 1 } }
        ])
      hint:
        vi: "`$match: { temp: { $gt: -16 } }` đứng đầu pipeline, rồi `$group` với `$sum: 1` và `$max`."
        en: "`$match: { temp: { $gt: -16 } }` goes first in the pipeline, then `$group` with `$sum: 1` and `$max`."
    - name: { vi: "Lần báo đầu tiên", en: "First alert" }
      task:
        vi: "Với mỗi container có số đo ấm hơn -16 độ: thời điểm đầu tiên điều đó xảy ra. Trả `_id` = container và `first`; xếp theo `_id`."
        en: "For each container with a reading warmer than -16 degrees: the first time it happened. Return `_id` = the container and `first`; sorted by `_id`."
      solution: |
        db.readings.aggregate([
          { $match: { temp: { $gt: -16 } } },
          { $sort: { ts: 1 } },
          { $group: { _id: "$box", first: { $first: "$ts" } } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Lọc, xếp `ts` tăng dần, rồi `$group` với `$first: \"$ts\"`."
        en: "Filter, sort `ts` ascending, then `$group` with `$first: \"$ts\"`."
quiz:
  - q:
      vi: "Bạn tính trung bình theo giờ trên dữ liệu đã lấp bằng `locf` thay vì trên số đo thật. Giờ 19:00 của `CQRU2001` thay đổi thế nào?"
      en: "You compute the hourly average on the `locf`-filled data instead of the real readings. How does `CQRU2001`'s 19:00 hour change?"
    options:
      - { vi: "Không đổi, vì `locf` chỉ chép số đã có", en: "No change, since `locf` only copies numbers already there" }
      - { vi: "Có 6 tài liệu thay vì 5, và số đo 19:30 được đếm hai lần", en: "It has 6 documents instead of 5, and the 19:30 reading counts twice" }
      - { vi: "Báo lỗi vì tài liệu được lấp không có `box`", en: "An error, since the filled documents have no `box`" }
    answer: 1
    trap: 0
    why:
      vi: "Chép số đã có nghe vô hại, nhưng mốc 19:40 được lấp bằng số của 19:30 (-15.6), nên giờ 19:00 có 6 tài liệu và -15.6 được tính hai lần. Trung bình đổi từ -81.9 / 5 = -16.38 thành -97.5 / 6 = -16.25. Tính trung bình trên số đo thật, và chỉ dùng số lấp cho màn hình cần một số ở mỗi mốc; ở đây chia nhóm theo `box` nên mốc lấp vẫn có `box`."
      en: "Copying existing numbers sounds harmless, but the 19:40 mark is filled with the 19:30 value (-15.6), so the 19:00 hour has 6 documents and -15.6 counts twice. The average moves from -81.9 / 5 = -16.38 to -97.5 / 6 = -16.25. Average the real readings, and use filled values only for a screen that needs a number at every mark; here the partition is `box`, so the filled marks do have a `box`."
  - q:
      vi: "Hai pipeline cho cùng kết quả: `$match` rồi `$group`, hoặc `$group` rồi `$match` trên số đếm. Vì sao nên viết `$match` trước?"
      en: "Two pipelines give the same result: `$match` then `$group`, or `$group` then `$match` on the count. Why write `$match` first?"
    options:
      - { vi: "Vì `$group` chỉ chạy được sau một `$match`", en: "Because `$group` can only run after a `$match`" }
      - { vi: "Vì `$group` khi đó chỉ đọc 2 tài liệu ấm thay vì cả 28", en: "Because `$group` then reads only the 2 warm documents instead of all 28" }
      - { vi: "Vì kết quả `$match` trước chính xác hơn", en: "Because the `$match`-first result is more accurate" }
    answer: 1
    trap: 2
    why:
      vi: "Hai kết quả giống hệt nhau, nên không bên nào chính xác hơn. Khác nhau là lượng việc: lọc trước thì `$group` chỉ nhận 2 tài liệu ấm hơn -16 độ thay vì cả 28, và trên MongoDB thật, một `$match` đứng đầu còn dùng được index. `$group` không cần `$match` nào đứng trước; bước này chấm theo quy tắc \"lọc trước khi gom\", không đo thời gian."
      en: "The two results are identical, so neither is more accurate. The difference is the work: filtering first hands `$group` only the 2 documents warmer than -16 degrees instead of all 28, and on a real MongoDB a leading `$match` can also use an index. `$group` needs no `$match` before it; this step is graded by the rule \"filter before grouping\", not by timing."
---
## Mở bài

Đêm 30/10, hai container lạnh ở Tiên Sa gửi số đo mỗi 10 phút, có lúc mất tín hiệu. Sáng ra, người trực ca cần một báo cáo: trung bình theo giờ, mốc nào được lấp, container nào ấm lên và từ lúc nào.

## Ý chính

Bài này ghép bốn ý của cấp 4 trên một collection 28 tài liệu. `$dateTrunc` gom thời điểm về đầu giờ. `$densify` với `partitionByFields` cho mỗi container đủ mốc 10 phút, và `$fill` với `locf` điền số; số đếm mốc được lấp cho biết bao nhiêu phần của báo cáo không phải đo thật. Cuối cùng, câu cảnh báo lọc số đo ấm hơn -16 độ rồi mới gom theo container.

**Lọc trước khi gom.** Tài liệu MongoDB về tối ưu pipeline khuyên đặt `$match` càng sớm càng tốt: các stage sau nhận ít tài liệu hơn, và một `$match` đứng đầu dùng được index. Bước 4 chấm theo quy tắc đó: kết quả đúng nhưng `$group` đứng trước `$match` thì chưa qua.

Nhiều người nghĩ trung bình trên dữ liệu đã lấp cũng là trung bình đúng. Thật ra mỗi mốc lấp bằng `locf` là một bản sao số đo trước nó, nên số đó bị đếm thêm lần nữa và kéo trung bình về phía nó.

Lab chạy trên mingo. Hình cuối mục cho thấy đường đi của báo cáo từ số đo thô tới cảnh báo.

## Cú pháp

```javascript
db.readings.aggregate([
  { $match: { temp: { $gt: -16 } } },
  { $sort: { ts: 1 } },
  { $group: {
      _id: "$box",
      first: { $first: "$ts" },
      n: { $sum: 1 } } }
])
```

- `$match` đứng đầu: các stage sau đọc ít tài liệu hơn.
- `$sort` trước `$group` để `$first` là thời điểm sớm nhất.
- `$type: "$temp"` trả `"missing"` cho mốc `$densify` vừa tạo.

## Ví dụ

Mỗi container có bao nhiêu số đo thật:

```javascript
db.readings.aggregate([
  { $group: { _id: "$box",
      n: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

`CQRU2001` có 16, `CQRU2002` có 12; đủ mốc 10 phút từ 18:00 tới 20:50 là 18.

Ba số đo ấm nhất của cả đêm:

```javascript
db.readings.find(
  {}, { _id: 0, box: 1, ts: 1, temp: 1 }
).sort({ temp: -1 }).limit(3)
```

Cả ba thuộc `CQRU2001`: 19:50, 19:30 và 20:00.

## Lỗi hay gặp

Lấy "lần đầu" mà quên xếp theo thời gian:

```javascript
// WRONG: $first without a sort
db.readings.aggregate([
  { $match: { temp: { $gt: -16.5 } } },
  { $sort: { temp: -1 } },
  { $group: { _id: "$box",
      first: { $first: "$ts" } } }
])
```

```javascript
// FIX: sort by time before $first
db.readings.aggregate([
  { $match: { temp: { $gt: -16.5 } } },
  { $sort: { ts: 1 } },
  { $group: { _id: "$box",
      first: { $first: "$ts" } } }
])
```

Câu sai cho 19:50, lúc ấm nhất; câu đúng cho 19:20, lần đầu số đo vượt -16.5 độ.

Gom theo giờ mà quên chia theo container:

```javascript
// WRONG: both boxes in one average
db.readings.aggregate([
  { $group: {
      _id: { $dateTrunc: {
        date: "$ts", unit: "hour" } },
      avg: { $avg: "$temp" } } },
  { $sort: { _id: 1 } }
])
```

```javascript
// FIX: one average per box and hour
db.readings.aggregate([
  { $group: {
      _id: { box: "$box",
        t: { $dateTrunc: {
          date: "$ts",
          unit: "hour" } } },
      avg: { $avg: "$temp" } } },
  { $sort: {
      "_id.box": 1, "_id.t": 1 } }
])
```

Câu sai trộn hai container, nên giờ 19:00 có vẻ ổn (-17.99); câu đúng tách ra và cho thấy `CQRU2001` ấm lên (-16.38).

## Thực hành

Năm bước: trung bình theo giờ, lấp mốc 10 phút, đếm mốc được lấp, container nào ấm lên (lọc trước khi gom), và lần báo đầu tiên.

## Tóm tắt

- `$dateTrunc` gom theo giờ; luôn chia theo container trong `_id`.
- `$densify` + `$fill` cho màn hình đủ mốc; đếm mốc lấp bằng `$type` là `"missing"`.
- Tính trung bình trên số đo thật, không trên số đã lấp.
- `$match` trước `$group`; `$sort` theo thời gian trước `$first`.

# EN

## Opening

On the night of 30 Oct, two reefer containers at Tien Sa sent a reading every 10 minutes, sometimes losing the signal. In the morning the shift lead needs a report: hourly averages, which marks were filled, which container warmed up and since when.

## Key idea

This lesson combines four ideas of level 4 on a collection of 28 documents. `$dateTrunc` moves times to the start of the hour. `$densify` with `partitionByFields` gives each container every 10-minute mark, and `$fill` with `locf` fills the numbers; the count of filled marks tells how much of the report was not really measured. Last, the alert query filters the readings warmer than -16 degrees and only then groups by container.

**Filter before grouping.** The MongoDB docs on pipeline optimization advise placing `$match` as early as possible: later stages receive fewer documents, and a leading `$match` can use an index. Step 4 is graded by that rule: a right result with `$group` before `$match` does not pass yet.

Many people think an average over filled data is still the right average. In fact each `locf` mark is a copy of the reading before it, so that number counts once more and pulls the average towards it.

The lab runs on mingo. The figure at the end of this section shows the report's path from raw readings to the alert.

## Syntax

```javascript
db.readings.aggregate([
  { $match: { temp: { $gt: -16 } } },
  { $sort: { ts: 1 } },
  { $group: {
      _id: "$box",
      first: { $first: "$ts" },
      n: { $sum: 1 } } }
])
```

- A leading `$match`: later stages read fewer documents.
- `$sort` before `$group` so `$first` is the earliest time.
- `$type: "$temp"` returns `"missing"` for a mark `$densify` just made.

## Example

How many real readings each container has:

```javascript
db.readings.aggregate([
  { $group: { _id: "$box",
      n: { $sum: 1 } } },
  { $sort: { _id: 1 } }
])
```

`CQRU2001` has 16, `CQRU2002` has 12; every 10-minute mark from 18:00 to 20:50 would be 18.

The three warmest readings of the night:

```javascript
db.readings.find(
  {}, { _id: 0, box: 1, ts: 1, temp: 1 }
).sort({ temp: -1 }).limit(3)
```

All three belong to `CQRU2001`: 19:50, 19:30 and 20:00.

## Common mistakes

Taking "the first time" without sorting by time:

```javascript
// WRONG: $first without a sort
db.readings.aggregate([
  { $match: { temp: { $gt: -16.5 } } },
  { $sort: { temp: -1 } },
  { $group: { _id: "$box",
      first: { $first: "$ts" } } }
])
```

```javascript
// FIX: sort by time before $first
db.readings.aggregate([
  { $match: { temp: { $gt: -16.5 } } },
  { $sort: { ts: 1 } },
  { $group: { _id: "$box",
      first: { $first: "$ts" } } }
])
```

The wrong query gives 19:50, the warmest moment; the right one gives 19:20, the first reading above -16.5 degrees.

Grouping by hour and forgetting the container:

```javascript
// WRONG: both boxes in one average
db.readings.aggregate([
  { $group: {
      _id: { $dateTrunc: {
        date: "$ts", unit: "hour" } },
      avg: { $avg: "$temp" } } },
  { $sort: { _id: 1 } }
])
```

```javascript
// FIX: one average per box and hour
db.readings.aggregate([
  { $group: {
      _id: { box: "$box",
        t: { $dateTrunc: {
          date: "$ts",
          unit: "hour" } } },
      avg: { $avg: "$temp" } } },
  { $sort: {
      "_id.box": 1, "_id.t": 1 } }
])
```

The wrong query mixes the two containers, so the 19:00 hour looks fine (-17.99); the right one splits them and shows `CQRU2001` warming up (-16.38).

## Practice

Five steps: hourly averages, fill the 10-minute marks, count the filled marks, which container warmed up (filter before grouping), and the first alert.

## Recap

- `$dateTrunc` groups by hour; always split by container in `_id`.
- `$densify` + `$fill` give the screen every mark; count filled marks with `$type` being `"missing"`.
- Average the real readings, not the filled ones.
- `$match` before `$group`; `$sort` by time before `$first`.
