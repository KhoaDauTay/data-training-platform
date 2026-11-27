---
id: e-ts-l4-03
engine: timeseries
level: L4
module: dynamo
title: "DynamoDB: mỗi kỳ một bảng"
title_en: "DynamoDB: one table per period"
kind: lab
runtime: browser
minutes: 20
figures: [{ name: ts-dynamo-periods, at: idea }]
objectives:
  - vi: Giải thích vì sao với chuỗi thời gian, AWS khuyên mỗi kỳ (ngày, tháng) một bảng thay vì một bảng chung.
    en: Explain why, for time series, AWS recommends one table per period (day, month) instead of one shared table.
  - vi: Đọc một khoảng thời gian của một thiết bị bằng `Query` trên khóa `box` + `ts`, không bằng `Scan`.
    en: Read one device's time range with a `Query` on the `box` + `ts` key, not with a `Scan`.
  - vi: Tạo sẵn bảng của kỳ sau với cùng khóa.
    en: Prebuild the next period's table with the same key.
requires: [e-ts-l4-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-time-series.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.TableClasses.html
lab:
  setup: |
    {"tables": [
      {"TableName": "Readings_2026_10", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "box", "KeyType": "HASH"}, {"AttributeName": "ts", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "box", "AttributeType": "S"}, {"AttributeName": "ts", "AttributeType": "S"}]},
      {"TableName": "Readings_2026_09", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "box", "KeyType": "HASH"}, {"AttributeName": "ts", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "box", "AttributeType": "S"}, {"AttributeName": "ts", "AttributeType": "S"}]}
    ],
    "items": {
      "Readings_2026_10": [
        {"box": "CQRU1001", "ts": "2026-10-01T00:00:00Z", "temp": -18.0},
        {"box": "CQRU1001", "ts": "2026-10-15T00:00:00Z", "temp": -17.0},
        {"box": "CQRU1001", "ts": "2026-10-30T00:00:00Z", "temp": -18.0},
        {"box": "CQRU1001", "ts": "2026-10-30T06:00:00Z", "temp": -17.5},
        {"box": "CQRU1001", "ts": "2026-10-30T12:00:00Z", "temp": -16.0},
        {"box": "CQRU1001", "ts": "2026-10-30T18:00:00Z", "temp": -17.0},
        {"box": "CQRU1001", "ts": "2026-10-31T00:00:00Z", "temp": -18.0},
        {"box": "CQRU1002", "ts": "2026-10-01T00:00:00Z", "temp": -20.0},
        {"box": "CQRU1002", "ts": "2026-10-30T00:00:00Z", "temp": -20.0},
        {"box": "CQRU1002", "ts": "2026-10-30T12:00:00Z", "temp": -19.5},
        {"box": "CQRU1002", "ts": "2026-10-31T00:00:00Z", "temp": -19.0}
      ],
      "Readings_2026_09": [
        {"box": "CQRU1001", "ts": "2026-09-29T12:00:00Z", "temp": -18.5},
        {"box": "CQRU1001", "ts": "2026-09-30T12:00:00Z", "temp": -17.5},
        {"box": "CQRU1001", "ts": "2026-09-30T18:00:00Z", "temp": -18.0},
        {"box": "CQRU1002", "ts": "2026-09-30T12:00:00Z", "temp": -20.5}
      ]
    }}
  steps:
    - task:
        vi: "Bảng tháng 10: mọi số đo của `CQRU1001` trong ngày 30/10 (UTC), tức `ts` từ `2026-10-30T00:00:00Z` tới `2026-10-30T23:59:59Z`. Đọc bằng khóa, không quét cả bảng."
        en: "The October table: every `CQRU1001` reading on 30 Oct (UTC), that is `ts` from `2026-10-30T00:00:00Z` to `2026-10-30T23:59:59Z`. Read through the key, not by scanning the whole table."
      solution: |
        {"op": "Query", "input": {
          "TableName": "Readings_2026_10",
          "KeyConditionExpression": "box = :b AND ts BETWEEN :a AND :z",
          "ExpressionAttributeValues": {
            ":b": {"S": "CQRU1001"},
            ":a": {"S": "2026-10-30T00:00:00Z"},
            ":z": {"S": "2026-10-30T23:59:59Z"}}}}
      check: doc
      ordered: false
      perf: { table: Readings_2026_10 }
      slow: |
        {"op": "Scan", "input": {
          "TableName": "Readings_2026_10",
          "FilterExpression": "box = :b AND ts BETWEEN :a AND :z",
          "ExpressionAttributeValues": {
            ":b": {"S": "CQRU1001"},
            ":a": {"S": "2026-10-30T00:00:00Z"},
            ":z": {"S": "2026-10-30T23:59:59Z"}}}}
      hint:
        vi: "`Query` với `KeyConditionExpression` `box = :b AND ts BETWEEN :a AND :z`; giá trị viết kiểu DynamoDB, ví dụ `{\"S\": \"CQRU1001\"}`."
        en: "`Query` with `KeyConditionExpression` `box = :b AND ts BETWEEN :a AND :z`; values in DynamoDB form, for example `{\"S\": \"CQRU1001\"}`."
    - task:
        vi: "Bảng tháng 9: số đo cuối cùng của `CQRU1001` trong tháng đó (một item, mới nhất)."
        en: "The September table: the last `CQRU1001` reading of that month (one item, the newest)."
      solution: |
        {"op": "Query", "input": {
          "TableName": "Readings_2026_09",
          "KeyConditionExpression": "box = :b",
          "ExpressionAttributeValues": {":b": {"S": "CQRU1001"}},
          "ScanIndexForward": false,
          "Limit": 1}}
      check: doc
      ordered: true
      hint:
        vi: "`\"ScanIndexForward\": false` đọc sort key từ lớn xuống nhỏ; `\"Limit\": 1` dừng sau item đầu tiên."
        en: "`\"ScanIndexForward\": false` reads the sort key from largest to smallest; `\"Limit\": 1` stops after the first item."
    - task:
        vi: "Tạo sẵn bảng `Readings_2026_11` cho tháng 11, cùng khóa với bảng tháng 10 (`box` là partition key, `ts` là sort key, cả hai kiểu chuỗi), trả tiền theo request."
        en: "Prebuild the table `Readings_2026_11` for November, with the same key as the October table (`box` as the partition key, `ts` as the sort key, both strings), paid per request."
      solution: |
        {"op": "CreateTable", "input": {
          "TableName": "Readings_2026_11",
          "BillingMode": "PAY_PER_REQUEST",
          "KeySchema": [
            {"AttributeName": "box", "KeyType": "HASH"},
            {"AttributeName": "ts", "KeyType": "RANGE"}],
          "AttributeDefinitions": [
            {"AttributeName": "box", "AttributeType": "S"},
            {"AttributeName": "ts", "AttributeType": "S"}]}}
      check: doc
      ordered: false
      hint:
        vi: "`CreateTable` với `KeySchema` (`HASH` cho `box`, `RANGE` cho `ts`) và `AttributeDefinitions` khai cả hai là `S`."
        en: "`CreateTable` with `KeySchema` (`HASH` for `box`, `RANGE` for `ts`) and `AttributeDefinitions` declaring both as `S`."
quiz:
  - q:
      vi: "Tháng 9 đã qua và không ai còn ghi vào `Readings_2026_09`. Theo hướng dẫn của AWS, nên làm gì với bảng đó?"
      en: "September is over and nobody writes to `Readings_2026_09` any more. Per the AWS guidance, what should you do with that table?"
    options:
      - { vi: "Giảm capacity ghi (ví dụ 1 WCU), cân nhắc lớp Standard-IA, lưu trữ hoặc xóa khi không cần", en: "Lower its write capacity (say 1 WCU), consider Standard-IA, archive or delete it when unneeded" }
      - { vi: "Chép mọi item sang bảng tháng 10 để chỉ còn một bảng", en: "Copy every item into the October table so only one table remains" }
      - { vi: "Xóa từng item bằng `DeleteItem` rồi giữ bảng rỗng cho năm sau", en: "Delete each item with `DeleteItem`, then keep the empty table for next year" }
    answer: 0
    trap: 1
    why:
      vi: "Gộp về một bảng nghe gọn, nhưng nó trộn lại kỳ đang ghi nhiều với kỳ gần như không ai đọc, đúng điều thiết kế mỗi kỳ một bảng muốn tách. AWS khuyên bảng không còn ghi thì giảm capacity ghi xuống thấp (ví dụ 1 WCU, tức đơn vị capacity ghi), giảm dần capacity đọc, có thể chuyển sang lớp Standard-IA khi lưu trữ là phần tốn chính, và lưu trữ hoặc xóa cả bảng khi không cần. Xóa từng item thì tốn một lần ghi cho mỗi item, còn xóa bảng là một thao tác."
      en: "Merging into one table sounds tidy, but it mixes the period that takes heavy writes with periods almost nobody reads, the very thing one table per period wants to separate. AWS advises that a table no longer written to gets a low write capacity (say 1 WCU, a write capacity unit), a read capacity lowered as it ages, possibly the Standard-IA class when storage is the main cost, and is archived or deleted when not needed. Deleting item by item costs one write per item, while dropping the table is one operation."
  - q:
      vi: "Vì sao AWS khuyên tạo bảng của kỳ sau trước khi kỳ hiện tại kết thúc?"
      en: "Why does AWS advise building the next period's table before the current period ends?"
    options:
      - { vi: "Để lưu lượng chuyển sang bảng mới đúng lúc kỳ mới bắt đầu", en: "So traffic can switch to the new table right when the new period starts" }
      - { vi: "Vì DynamoDB tự chép item sang bảng mới khi bảng đã có", en: "Because DynamoDB copies items into the new table once it exists" }
      - { vi: "Vì một bảng chỉ tạo được vào ngày đầu tháng", en: "Because a table can only be created on the first day of a month" }
    answer: 0
    trap: 1
    why:
      vi: "DynamoDB không tự chép item giữa các bảng; ứng dụng chọn bảng để ghi theo thời điểm của số đo. Tạo bảng cần thời gian, nên AWS khuyên dựng sẵn bảng kỳ sau, đủ capacity và index, rồi chuyển lưu lượng sang đúng lúc kỳ hiện tại hết. Không có quy định ngày nào mới được tạo bảng."
      en: "DynamoDB does not copy items between tables; the application picks the table to write to from the reading's time. Creating a table takes time, so AWS advises prebuilding the next period's table, with its capacity and indexes, and switching traffic to it right as the current period ends. There is no rule about which day a table may be created."
---
## Mở bài

Container lạnh gửi số đo suốt ngày, gần như chỉ ai đó hỏi về hôm nay hoặc hôm qua, còn tháng trước hầu như không ai đọc. Trong DynamoDB, bạn trả tiền theo capacity đọc ghi, nên cách chia bảng ảnh hưởng thẳng tới chi phí.

## Ý chính

**Mỗi kỳ một bảng.** Quy tắc chung của DynamoDB là dùng càng ít bảng càng tốt, nhưng với chuỗi thời gian AWS khuyên một bảng cho mỗi kỳ (ngày, tuần, tháng). Bảng kỳ hiện tại nhận gần như mọi lượt ghi, nên cấp capacity cao; bảng cũ không còn ghi thì giảm capacity ghi xuống thấp, giảm dần capacity đọc, có thể chuyển sang lớp Standard-IA, rồi lưu trữ hoặc xóa cả bảng khi không cần. Trước khi kỳ hiện tại hết, dựng sẵn bảng kỳ sau và chuyển lưu lượng sang đúng lúc.

**Khóa trong mỗi bảng.** Partition key là thiết bị (`box`), sort key là thời điểm (`ts`) dạng chuỗi ISO 8601, nên thứ tự chữ trùng thứ tự thời gian. Một khoảng giờ của một thiết bị là một `Query` với `BETWEEN` trên sort key: chỉ đọc đúng các item đó. `ScanIndexForward: false` đọc ngược, cho số đo mới nhất trước.

Nhiều người nghĩ `Scan` với `FilterExpression` cũng rẻ như `Query` vì trả về cùng item. Thật ra `Scan` đọc cả bảng rồi mới lọc, và capacity tính theo lượng đã đọc; `Query` chỉ đọc item của khóa đã chọn.

Lab chạy trên dynoxide, một bản DynamoDB trong trình duyệt. Hình cuối mục cho thấy ba bảng của ba tháng và việc của mỗi bảng.

## Cú pháp

```json
{"op": "Query", "input": {
  "TableName": "Readings_2026_10",
  "KeyConditionExpression":
  "box = :b AND ts BETWEEN :a AND :z",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":a": {"S": "2026-10-30"},
    ":z": {"S": "2026-10-31"}},
  "ScanIndexForward": false,
  "Limit": 10}}
```

- `KeyConditionExpression`: so bằng trên partition key, `BETWEEN`, `<`, `>=` hoặc `begins_with` trên sort key.
- Giá trị viết kiểu DynamoDB: `{"S": …}`, `{"N": …}`.
- `ScanIndexForward: false` đọc từ sort key lớn nhất; `Limit` dừng sau n item.

## Ví dụ

Số đo của `CQRU1002` từ 06:00 ngày 30/10, trên bảng tháng 10:

```json
{"op": "Query", "input": {
  "TableName": "Readings_2026_10",
  "KeyConditionExpression":
    "box = :b AND ts > :t",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1002"},
    ":t": {"S": "2026-10-30T06"}}}}
```

Hai item: 12:00 ngày 30/10 và 00:00 ngày 31/10.

Mọi số đo của ngày 30/9 trên bảng tháng 9, bằng `begins_with`:

```json
{"op": "Query", "input": {
  "TableName": "Readings_2026_09",
  "KeyConditionExpression":
    "box = :b AND begins_with(ts, :d)",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":d": {"S": "2026-09-30"}}}}
```

Hai item, 12:00 và 18:00.

## Lỗi hay gặp

`Query` thiếu partition key:

```json
// ERROR ValidationException
{"op": "Query", "input": {
  "TableName": "Readings_2026_10",
  "KeyConditionExpression":
    "ts > :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "2026-10-30"}}}}
```

`Query` luôn cần so bằng trên partition key; muốn mọi container thì phải hỏi từng `box`.

Hỏi tháng 9 trên bảng tháng 10:

```json
// WRONG: September has its own table
{"op": "Query", "input": {
  "TableName": "Readings_2026_10",
  "KeyConditionExpression":
    "box = :b AND begins_with(ts, :d)",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":d": {"S": "2026-09-30"}}}}
```

```json
// FIX: pick the table from the date
{"op": "Query", "input": {
  "TableName": "Readings_2026_09",
  "KeyConditionExpression":
    "box = :b AND begins_with(ts, :d)",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":d": {"S": "2026-09-30"}}}}
```

Câu sai trả 0 item mà không báo lỗi; câu đúng trả 2. Với mỗi kỳ một bảng, ứng dụng phải chọn bảng theo ngày của câu hỏi, và một khoảng vắt qua hai tháng là hai `Query`.

Xóa cả bảng tháng cũ là `DeleteTable`, không có trong lab này (chỉ để đọc):

```text
{"op": "DeleteTable", "input": {
  "TableName": "Readings_2026_09"}}
```

## Thực hành

Ba bước: đọc một ngày trên bảng tháng hiện tại bằng khóa, đọc số đo cuối của tháng trước, rồi dựng sẵn bảng tháng sau.

## Tóm tắt

- Với chuỗi thời gian, AWS khuyên mỗi kỳ một bảng: kỳ hiện tại capacity cao, kỳ cũ giảm dần rồi lưu trữ hoặc xóa.
- Dựng sẵn bảng kỳ sau trước khi kỳ hiện tại hết.
- Khóa `box` + `ts` (chuỗi ISO 8601): một khoảng giờ là một `Query` với `BETWEEN`.
- Ứng dụng chọn bảng theo ngày; khoảng qua hai kỳ là hai `Query`.

# EN

## Opening

Reefer containers send readings all day, someone almost always asks about today or yesterday, and last month is hardly ever read. In DynamoDB you pay for read and write capacity, so how you split tables drives the cost directly.

## Key idea

**One table per period.** DynamoDB's general rule is to use as few tables as possible, but for time series AWS recommends one table per period (day, week, month). The current period's table takes almost every write, so it gets high capacity; an old table no longer written to gets a low write capacity, a read capacity lowered as it ages, possibly the Standard-IA class, and is archived or deleted when not needed. Before the current period ends, prebuild the next period's table and switch traffic to it right on time.

**The key in each table.** The partition key is the device (`box`), the sort key is the time (`ts`) as an ISO 8601 string, so text order matches time order. An hour range of one device is a `Query` with `BETWEEN` on the sort key: it reads only those items. `ScanIndexForward: false` reads backwards, newest first.

Many people think a `Scan` with a `FilterExpression` is as cheap as a `Query` because it returns the same items. In fact a `Scan` reads the whole table before filtering, and capacity counts what was read; a `Query` reads only the items of the chosen key.

The lab runs on dynoxide, a DynamoDB build in the browser. The figure at the end of this section shows the three tables of three months and the job of each.

## Syntax

```json
{"op": "Query", "input": {
  "TableName": "Readings_2026_10",
  "KeyConditionExpression":
  "box = :b AND ts BETWEEN :a AND :z",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":a": {"S": "2026-10-30"},
    ":z": {"S": "2026-10-31"}},
  "ScanIndexForward": false,
  "Limit": 10}}
```

- `KeyConditionExpression`: equality on the partition key, `BETWEEN`, `<`, `>=` or `begins_with` on the sort key.
- Values in DynamoDB form: `{"S": …}`, `{"N": …}`.
- `ScanIndexForward: false` reads from the largest sort key; `Limit` stops after n items.

## Example

`CQRU1002`'s readings from 06:00 on 30 Oct, on the October table:

```json
{"op": "Query", "input": {
  "TableName": "Readings_2026_10",
  "KeyConditionExpression":
    "box = :b AND ts > :t",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1002"},
    ":t": {"S": "2026-10-30T06"}}}}
```

Two items: 12:00 on 30 Oct and 00:00 on 31 Oct.

Every reading of 30 Sep on the September table, with `begins_with`:

```json
{"op": "Query", "input": {
  "TableName": "Readings_2026_09",
  "KeyConditionExpression":
    "box = :b AND begins_with(ts, :d)",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":d": {"S": "2026-09-30"}}}}
```

Two items, 12:00 and 18:00.

## Common mistakes

A `Query` without the partition key:

```json
// ERROR ValidationException
{"op": "Query", "input": {
  "TableName": "Readings_2026_10",
  "KeyConditionExpression":
    "ts > :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "2026-10-30"}}}}
```

A `Query` always needs equality on the partition key; for every container you must ask each `box`.

Asking for September on the October table:

```json
// WRONG: September has its own table
{"op": "Query", "input": {
  "TableName": "Readings_2026_10",
  "KeyConditionExpression":
    "box = :b AND begins_with(ts, :d)",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":d": {"S": "2026-09-30"}}}}
```

```json
// FIX: pick the table from the date
{"op": "Query", "input": {
  "TableName": "Readings_2026_09",
  "KeyConditionExpression":
    "box = :b AND begins_with(ts, :d)",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":d": {"S": "2026-09-30"}}}}
```

The wrong query returns 0 items without an error; the right one returns 2. With one table per period the application must pick the table from the question's date, and a range across two months is two `Query` calls.

Dropping a whole old month is `DeleteTable`, which this lab does not have (to read only):

```text
{"op": "DeleteTable", "input": {
  "TableName": "Readings_2026_09"}}
```

## Practice

Three steps: read one day on the current month's table through the key, read last month's final reading, then prebuild next month's table.

## Recap

- For time series, AWS recommends one table per period: high capacity for the current one, lowered for old ones, then archived or deleted.
- Prebuild the next period's table before the current one ends.
- Key `box` + `ts` (an ISO 8601 string): an hour range is a `Query` with `BETWEEN`.
- The application picks the table from the date; a range across two periods is two `Query` calls.
