---
id: e-ts-l4-02
engine: timeseries
level: L4
module: mongo
title: "Lấp khoảng trống bằng $densify và $fill"
title_en: "Filling gaps with $densify and $fill"
kind: lab
runtime: browser
minutes: 22
figures: [{ name: ts-densify-fill, at: idea }]
objectives:
  - vi: Thêm tài liệu cho các mốc 10 phút bị thiếu bằng `$densify`, riêng cho từng container với `partitionByFields`.
    en: Add documents for the missing 10-minute marks with `$densify`, per container with `partitionByFields`.
  - vi: Lấp giá trị thiếu bằng `$fill` với `locf` (giữ số đo trước) hoặc `linear` (nội suy).
    en: Fill the missing values with `$fill` using `locf` (carry the last reading) or `linear` (interpolate).
  - vi: Đánh dấu tài liệu nào là số đo thật, tài liệu nào được lấp.
    en: Mark which documents are real readings and which were filled.
requires: [e-ts-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/type/
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
        vi: "Container `CQRU1002`: thêm tài liệu cho mọi mốc 10 phút còn thiếu giữa số đo đầu và cuối của nó. Trả `ts` và `temp` (bỏ `_id`), xếp theo `ts`."
        en: "Container `CQRU1002`: add a document for every missing 10-minute mark between its first and last reading. Return `ts` and `temp` (drop `_id`), sorted by `ts`."
      solution: |
        db.readings.aggregate([
          { $match: { box: "CQRU1002" } },
          { $densify: { field: "ts",
              range: { step: 10, unit: "minute", bounds: "full" } } },
          { $sort: { ts: 1 } },
          { $project: { _id: 0, ts: 1, temp: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Lọc container trước bằng `$match`, rồi `$densify: { field: \"ts\", range: { step: 10, unit: \"minute\", bounds: \"full\" } }`. `$densify` không hứa thứ tự: thêm `$sort`."
        en: "Filter the container first with `$match`, then `$densify: { field: \"ts\", range: { step: 10, unit: \"minute\", bounds: \"full\" } }`. `$densify` promises no order: add a `$sort`."
    - task:
        vi: "Như bước trước, nhưng mỗi mốc mới lấy nhiệt độ của số đo gần nhất trước nó. Trả `ts` và `temp` (bỏ `_id`), xếp theo `ts`."
        en: "As in the step before, but each new mark takes the temperature of the latest reading before it. Return `ts` and `temp` (drop `_id`), sorted by `ts`."
      solution: |
        db.readings.aggregate([
          { $match: { box: "CQRU1002" } },
          { $densify: { field: "ts",
              range: { step: 10, unit: "minute", bounds: "full" } } },
          { $fill: { sortBy: { ts: 1 },
              output: { temp: { method: "locf" } } } },
          { $sort: { ts: 1 } },
          { $project: { _id: 0, ts: 1, temp: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Thêm `$fill: { sortBy: { ts: 1 }, output: { temp: { method: \"locf\" } } }` sau `$densify`."
        en: "Add `$fill: { sortBy: { ts: 1 }, output: { temp: { method: \"locf\" } } }` after `$densify`."
    - task:
        vi: "Cả hai container: thêm mốc 10 phút còn thiếu của từng container (giữa số đo đầu và cuối của chính nó) và nội suy tuyến tính `temp` trong từng container. Trả `ts`, `box`, `temp` (bỏ `_id`), xếp theo `box` rồi `ts`."
        en: "Both containers: add each container's missing 10-minute marks (between its own first and last reading) and interpolate `temp` linearly within each container. Return `ts`, `box`, `temp` (drop `_id`), sorted by `box`, then `ts`."
      solution: |
        db.readings.aggregate([
          { $densify: { field: "ts",
              partitionByFields: ["box"],
              range: { step: 10, unit: "minute", bounds: "partition" } } },
          { $fill: { partitionByFields: ["box"],
              sortBy: { ts: 1 },
              output: { temp: { method: "linear" } } } },
          { $sort: { box: 1, ts: 1 } },
          { $project: { _id: 0 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`partitionByFields: [\"box\"]` ở cả `$densify` (với `bounds: \"partition\"`) và `$fill` (với `method: \"linear\"`)."
        en: "`partitionByFields: [\"box\"]` in both `$densify` (with `bounds: \"partition\"`) and `$fill` (with `method: \"linear\"`)."
    - task:
        vi: "Container `CQRU1002`, lấp như bước 2, nhưng thêm trường `measured`: `true` cho số đo thật, `false` cho mốc được lấp. Trả `ts`, `temp`, `measured` (bỏ `_id`), xếp theo `ts`."
        en: "Container `CQRU1002`, filled as in step 2, but add a field `measured`: `true` for a real reading, `false` for a filled mark. Return `ts`, `temp`, `measured` (drop `_id`), sorted by `ts`."
      solution: |
        db.readings.aggregate([
          { $match: { box: "CQRU1002" } },
          { $densify: { field: "ts",
              range: { step: 10, unit: "minute", bounds: "full" } } },
          { $set: { measured: { $ne: [{ $type: "$temp" }, "missing"] } } },
          { $fill: { sortBy: { ts: 1 },
              output: { temp: { method: "locf" } } } },
          { $sort: { ts: 1 } },
          { $project: { _id: 0, ts: 1, temp: 1, measured: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "Đặt cờ trước khi lấp: `{ $set: { measured: { $ne: [{ $type: \"$temp\" }, \"missing\"] } } }` nằm giữa `$densify` và `$fill`."
        en: "Set the flag before filling: `{ $set: { measured: { $ne: [{ $type: \"$temp\" }, \"missing\"] } } }` goes between `$densify` and `$fill`."
quiz:
  - q:
      vi: "Chạy `$densify` trên cả collection, không có `partitionByFields`. `CQRU1001` có đủ mọi mốc 10 phút, `CQRU1002` thiếu ba mốc. Có bao nhiêu tài liệu mới?"
      en: "You run `$densify` on the whole collection, without `partitionByFields`. `CQRU1001` has every 10-minute mark, `CQRU1002` misses three. How many new documents appear?"
    options:
      - { vi: "Ba, một cho mỗi mốc `CQRU1002` thiếu", en: "Three, one for each mark `CQRU1002` misses" }
      - { vi: "Sáu, ba cho mỗi container", en: "Six, three for each container" }
      - { vi: "Không cái nào", en: "None at all" }
    answer: 2
    trap: 0
    why:
      vi: "Nghe như ba, vì `CQRU1002` thiếu ba mốc, nhưng không có `partitionByFields` thì cả collection là một nhóm: `$densify` chỉ hỏi \"mốc này có tài liệu nào chưa\", và mọi mốc đều đã có tài liệu của `CQRU1001`. Vì vậy không mốc nào được thêm. Muốn mỗi container có đủ mốc riêng, khai `partitionByFields: [\"box\"]`."
      en: "It sounds like three, because `CQRU1002` misses three marks, but without `partitionByFields` the whole collection is one group: `$densify` only asks \"does any document exist at this mark\", and every mark already has a `CQRU1001` document. So no mark is added. To give each container its own full set of marks, declare `partitionByFields: [\"box\"]`."
  - q:
      vi: "Sau `$densify` không chia nhóm, mốc mới 00:10 của `CQRU1002` có những trường nào?"
      en: "After an unpartitioned `$densify`, which fields does the new 00:10 mark of `CQRU1002` hold?"
    options:
      - { vi: "`ts`, `box` và `temp` bằng `null`", en: "`ts`, `box` and `temp` set to `null`" }
      - { vi: "Chỉ `ts`", en: "Only `ts`" }
      - { vi: "Bản sao của số đo liền trước, đổi `ts`", en: "A copy of the reading before it, with a new `ts`" }
    answer: 1
    trap: 2
    why:
      vi: "Bản sao số đo trước là việc của `$fill` với `locf`, không phải của `$densify`. Tài liệu `$densify` tạo ra chỉ có trường đang lấp (`ts`) và các trường chia nhóm; ở đây không chia nhóm nên chỉ có `ts`, không có cả `box`. Vì vậy sau một `$match` theo container, hãy lấp lại `box` bằng `$fill` với `value`, hoặc chia nhóm theo `box`."
      en: "Copying the reading before is the job of `$fill` with `locf`, not of `$densify`. A document made by `$densify` holds only the field being densified (`ts`) and the partition fields; here there is no partition, so it holds only `ts`, not even `box`. So after a `$match` on a container, fill `box` back with `$fill` and `value`, or partition by `box`."
---
## Mở bài

`CQRU1002` mất tín hiệu ba lần trong một giờ, và màn hình theo dõi cần một số cho mỗi mốc 10 phút. Ở PostgreSQL bạn dựng mốc bằng `generate_series` rồi lấp bằng `LATERAL`; MongoDB có hai stage làm đúng hai việc đó.

## Ý chính

**`$densify` thêm tài liệu cho mốc thiếu.** Bạn chọn trường (`field`, toàn số hoặc toàn ngày), bước (`step` và `unit`) và phạm vi (`bounds`): `"full"` là từ giá trị nhỏ nhất tới lớn nhất của trường, `"partition"` là như thế nhưng trong từng nhóm, còn một mảng `[lower, upper]` thì lấy cận dưới, bỏ cận trên. Tài liệu mới chỉ có trường đang lấp và các trường chia nhóm (`partitionByFields`); mọi trường khác bị thiếu. `$densify` không hứa thứ tự đầu ra, nên luôn thêm `$sort`.

**`$fill` điền giá trị thiếu hoặc `null`.** `method: "locf"` giữ số đo gần nhất trước nó (last observation carried forward); `method: "linear"` nội suy giữa hai số đo hai bên; `value` điền một giá trị cố định. Hai `method` cần `sortBy`, và chia nhóm bằng `partitionBy` hoặc `partitionByFields`. Theo tài liệu MongoDB, `linear` để nguyên giá trị thiếu nằm ở đầu hoặc cuối, vì không có số đo hai bên.

Nhiều người nghĩ `$densify` trên cả collection sẽ lấp mốc thiếu của từng container. Thật ra không chia nhóm thì cả collection là một chuỗi: một mốc đã có tài liệu của container nào đó thì không được thêm.

Lab chạy trên mingo; bài chỉ dùng `bounds` `"full"` sau một `$match` và `"partition"` khi chia nhóm, hai cách mingo cho kết quả như tài liệu MongoDB mô tả. Hình cuối mục cho thấy ba mốc của `CQRU1002` trước và sau khi lấp.

## Cú pháp

```text
{ $densify: {
    field: "ts",
    partitionByFields: ["box"],
    range: { step: 10, unit: "minute",
             bounds: "partition" } } }
{ $fill: {
    partitionByFields: ["box"],
    sortBy: { ts: 1 },
    output: {
      temp: { method: "linear" },
      note: { value: "filled" } } } }
```

- `bounds`: `"full"`, `"partition"` hoặc `[lower, upper)`.
- `method`: `"locf"` hoặc `"linear"`, cần `sortBy`; `linear` chỉ nhận đúng một trường trong `sortBy`.
- `$densify` có từ MongoDB 5.1, `$fill` từ 5.3.

## Ví dụ

Mốc 20 phút cho `CQRU1002`: `$densify` chỉ thêm mốc thiếu, không bỏ số đo lệch bước như 00:30:

```javascript
db.readings.aggregate([
  { $match: { box: "CQRU1002" } },
  { $densify: { field: "ts",
      range: { step: 20,
        unit: "minute",
        bounds: "full" } } },
  { $sort: { ts: 1 } }
])
```

Mốc 00:40 được thêm; 00:00, 00:20, 00:30 và 01:00 giữ nguyên.

Mốc mới không có `box`: điền lại bằng một giá trị cố định:

```javascript
db.readings.aggregate([
  { $match: { box: "CQRU1002" } },
  { $densify: { field: "ts",
      range: { step: 10,
        unit: "minute",
        bounds: "full" } } },
  { $fill: { output: {
      box: { value: "CQRU1002" } } } },
  { $sort: { ts: 1 } }
])
```

Bảy tài liệu, tất cả có `box`; ba mốc mới vẫn chưa có `temp`.

## Lỗi hay gặp

Lấp trên cả collection mà quên chia nhóm:

```javascript
// WRONG: one series for both boxes
db.readings.aggregate([
  { $densify: { field: "ts",
      range: { step: 10,
        unit: "minute",
        bounds: "full" } } },
  { $sort: { box: 1, ts: 1 } }
])
```

```javascript
// FIX: one series per box
db.readings.aggregate([
  { $densify: { field: "ts",
      partitionByFields: ["box"],
      range: { step: 10,
        unit: "minute",
        bounds: "partition" } } },
  { $sort: { box: 1, ts: 1 } }
])
```

Câu sai vẫn ra 12 tài liệu; câu đúng ra 15, thêm ba mốc của `CQRU1002`.

Xếp ngược khi dùng `locf`:

```javascript
// WRONG: carries the next reading back
db.readings.aggregate([
  { $match: { box: "CQRU1002" } },
  { $densify: { field: "ts",
      range: { step: 10,
        unit: "minute",
        bounds: "full" } } },
  { $fill: { sortBy: { ts: -1 },
      output: { temp:
        { method: "locf" } } } },
  { $sort: { ts: 1 } }
])
```

```javascript
// FIX: sort by time ascending
db.readings.aggregate([
  { $match: { box: "CQRU1002" } },
  { $densify: { field: "ts",
      range: { step: 10,
        unit: "minute",
        bounds: "full" } } },
  { $fill: { sortBy: { ts: 1 },
      output: { temp:
        { method: "locf" } } } },
  { $sort: { ts: 1 } }
])
```

Câu sai cho mốc 00:10 số của 00:20 (-19.5), tức một số đo chưa xảy ra; câu đúng cho số của 00:00 (-20).

## Thực hành

Bốn bước trên cùng 12 tài liệu: thêm mốc cho một container, lấp bằng `locf`, làm cho cả hai container bằng `linear`, rồi đánh dấu mốc được lấp.

## Tóm tắt

- `$densify` thêm tài liệu cho mốc thiếu; tài liệu mới chỉ có trường thời gian và trường chia nhóm.
- Không chia nhóm thì cả collection là một chuỗi: khai `partitionByFields` cho mỗi thiết bị.
- `$fill` với `locf` giữ số trước, `linear` nội suy, `value` điền hằng; `method` cần `sortBy` tăng dần theo thời gian.
- Đặt cờ `measured` trước `$fill` để biết số nào là đo thật.

# EN

## Opening

`CQRU1002` lost its signal three times in an hour, and the monitoring screen needs a number for every 10-minute mark. In PostgreSQL you build the marks with `generate_series` and fill them with `LATERAL`; MongoDB has two stages that do exactly those two jobs.

## Key idea

**`$densify` adds documents for missing marks.** You pick the field (`field`, all numbers or all dates), the step (`step` and `unit`) and the range (`bounds`): `"full"` runs from the field's smallest to largest value, `"partition"` does the same inside each group, and an array `[lower, upper]` includes the lower bound and excludes the upper one. A new document holds only the field being densified and the partition fields (`partitionByFields`); every other field is missing. `$densify` promises no output order, so always add a `$sort`.

**`$fill` fills missing or `null` values.** `method: "locf"` keeps the latest reading before it (last observation carried forward); `method: "linear"` interpolates between the readings on both sides; `value` fills a fixed value. Both `method` options need `sortBy`, and you group with `partitionBy` or `partitionByFields`. Per the MongoDB docs, `linear` leaves a missing value at the start or the end as it is, since it has no reading on both sides.

Many people think a `$densify` over the whole collection fills each container's missing marks. In fact, without a partition the whole collection is one series: a mark that already has a document of any container is not added.

The lab runs on mingo; the lesson uses only `bounds` `"full"` after a `$match` and `"partition"` with a partition, the two ways mingo gives the results the MongoDB docs describe. The figure at the end of this section shows the three marks of `CQRU1002` before and after filling.

## Syntax

```text
{ $densify: {
    field: "ts",
    partitionByFields: ["box"],
    range: { step: 10, unit: "minute",
             bounds: "partition" } } }
{ $fill: {
    partitionByFields: ["box"],
    sortBy: { ts: 1 },
    output: {
      temp: { method: "linear" },
      note: { value: "filled" } } } }
```

- `bounds`: `"full"`, `"partition"` or `[lower, upper)`.
- `method`: `"locf"` or `"linear"`, needs `sortBy`; `linear` takes exactly one field in `sortBy`.
- `$densify` exists since MongoDB 5.1, `$fill` since 5.3.

## Example

20-minute marks for `CQRU1002`: `$densify` only adds missing marks, it does not drop an off-step reading such as 00:30:

```javascript
db.readings.aggregate([
  { $match: { box: "CQRU1002" } },
  { $densify: { field: "ts",
      range: { step: 20,
        unit: "minute",
        bounds: "full" } } },
  { $sort: { ts: 1 } }
])
```

The 00:40 mark is added; 00:00, 00:20, 00:30 and 01:00 stay as they are.

The new marks have no `box`: fill it back with a fixed value:

```javascript
db.readings.aggregate([
  { $match: { box: "CQRU1002" } },
  { $densify: { field: "ts",
      range: { step: 10,
        unit: "minute",
        bounds: "full" } } },
  { $fill: { output: {
      box: { value: "CQRU1002" } } } },
  { $sort: { ts: 1 } }
])
```

Seven documents, all with a `box`; the three new marks still have no `temp`.

## Common mistakes

Filling the whole collection and forgetting the partition:

```javascript
// WRONG: one series for both boxes
db.readings.aggregate([
  { $densify: { field: "ts",
      range: { step: 10,
        unit: "minute",
        bounds: "full" } } },
  { $sort: { box: 1, ts: 1 } }
])
```

```javascript
// FIX: one series per box
db.readings.aggregate([
  { $densify: { field: "ts",
      partitionByFields: ["box"],
      range: { step: 10,
        unit: "minute",
        bounds: "partition" } } },
  { $sort: { box: 1, ts: 1 } }
])
```

The wrong query still gives 12 documents; the right one gives 15, adding the three marks of `CQRU1002`.

Sorting backwards with `locf`:

```javascript
// WRONG: carries the next reading back
db.readings.aggregate([
  { $match: { box: "CQRU1002" } },
  { $densify: { field: "ts",
      range: { step: 10,
        unit: "minute",
        bounds: "full" } } },
  { $fill: { sortBy: { ts: -1 },
      output: { temp:
        { method: "locf" } } } },
  { $sort: { ts: 1 } }
])
```

```javascript
// FIX: sort by time ascending
db.readings.aggregate([
  { $match: { box: "CQRU1002" } },
  { $densify: { field: "ts",
      range: { step: 10,
        unit: "minute",
        bounds: "full" } } },
  { $fill: { sortBy: { ts: 1 },
      output: { temp:
        { method: "locf" } } } },
  { $sort: { ts: 1 } }
])
```

The wrong query gives the 00:10 mark the 00:20 value (-19.5), a reading that had not happened yet; the right one gives it the 00:00 value (-20).

## Practice

Four steps on the same 12 documents: add marks for one container, fill with `locf`, do both containers with `linear`, then mark the filled ones.

## Recap

- `$densify` adds documents for missing marks; a new document holds only the time field and the partition fields.
- Without a partition the whole collection is one series: declare `partitionByFields` per device.
- `$fill` with `locf` keeps the value before, `linear` interpolates, `value` fills a constant; a `method` needs `sortBy` ascending in time.
- Set a `measured` flag before `$fill` to know which numbers were really measured.
