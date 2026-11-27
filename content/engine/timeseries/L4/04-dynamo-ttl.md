---
id: e-ts-l4-04
engine: timeseries
level: L4
module: dynamo
title: "DynamoDB TTL: tự xóa số đo cũ"
title_en: "DynamoDB TTL: old readings delete themselves"
kind: concept
runtime: browser
minutes: 16
figures: [{ name: ts-ttl-window, at: idea }]
objectives:
  - vi: Giải thích TTL của DynamoDB - thuộc tính hết hạn kiểu số, giây Unix, xóa trong vài ngày, không tốn capacity ghi.
    en: Explain DynamoDB TTL - a numeric expiry attribute in Unix seconds, deleted within a few days, no write capacity used.
  - vi: Bỏ item đã hết hạn nhưng chưa bị xóa khỏi kết quả bằng `FilterExpression`.
    en: Drop items that expired but are not deleted yet from results with a `FilterExpression`.
  - vi: Gia hạn một item đã hết hạn trước khi nó bị xóa.
    en: Extend an expired item before it is deleted.
requires: [e-ts-l4-03]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/howitworks-ttl.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ttl-expired-items.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html
lab:
  setup: |
    {"tables": [
      {"TableName": "Readings", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "box", "KeyType": "HASH"}, {"AttributeName": "ts", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "box", "AttributeType": "S"}, {"AttributeName": "ts", "AttributeType": "S"}]}
    ],
    "items": {
      "Readings": [
        {"box": "CQRU1001", "ts": "2026-10-27T00:00:00Z", "temp": -18.0, "expires_at": 1793318400},
        {"box": "CQRU1001", "ts": "2026-10-27T12:00:00Z", "temp": -14.5, "expires_at": 1793361600},
        {"box": "CQRU1001", "ts": "2026-10-28T06:00:00Z", "temp": -17.5, "expires_at": 1793426400},
        {"box": "CQRU1001", "ts": "2026-10-29T00:00:00Z", "temp": -18.0, "expires_at": 1793491200},
        {"box": "CQRU1001", "ts": "2026-10-30T00:00:00Z", "temp": -17.0, "expires_at": 1793577600},
        {"box": "CQRU1002", "ts": "2026-10-27T06:00:00Z", "temp": -20.0, "expires_at": 1793340000},
        {"box": "CQRU1002", "ts": "2026-10-30T06:00:00Z", "temp": -19.5, "expires_at": 1793599200}
      ]
    }}
  steps:
    - task:
        vi: "Mọi item của `CQRU1001` trong bảng `Readings`, kể cả item đã quá hạn mà chưa bị xóa."
        en: "Every `CQRU1001` item in the table `Readings`, including items past their expiry that are not deleted yet."
      solution: |
        {"op": "Query", "input": {
          "TableName": "Readings",
          "KeyConditionExpression": "box = :b",
          "ExpressionAttributeValues": {":b": {"S": "CQRU1001"}}}}
      check: doc
      ordered: false
      hint:
        vi: "Một `Query` với `KeyConditionExpression` `box = :b`."
        en: "A `Query` with `KeyConditionExpression` `box = :b`."
    - task:
        vi: "Bây giờ là 00:00 UTC ngày 31/10, tức `1793404800` giây Unix. Chỉ trả item còn hạn của `CQRU1001` (`expires_at` lớn hơn bây giờ)."
        en: "It is now 00:00 UTC on 31 Oct, that is `1793404800` Unix seconds. Return only the `CQRU1001` items still valid (`expires_at` greater than now)."
      solution: |
        {"op": "Query", "input": {
          "TableName": "Readings",
          "KeyConditionExpression": "box = :b",
          "FilterExpression": "expires_at > :now",
          "ExpressionAttributeValues": {
            ":b": {"S": "CQRU1001"},
            ":now": {"N": "1793404800"}}}}
      check: doc
      ordered: false
      expect: { Count: 3, ScannedCount: 5 }
      hint:
        vi: "Thêm `\"FilterExpression\": \"expires_at > :now\"` và `\":now\": {\"N\": \"1793404800\"}` - giá trị kiểu số `N`, tính bằng giây."
        en: "Add `\"FilterExpression\": \"expires_at > :now\"` and `\":now\": {\"N\": \"1793404800\"}` - a number `N`, in seconds."
    - task:
        vi: "Số đo `CQRU1001` lúc `2026-10-27T12:00:00Z` (-14.5 độ) cần giữ lại để điều tra. Đặt `expires_at` của nó thành `1795996800` (00:00 UTC ngày 30/11), chỉ khi item vẫn còn trong bảng."
        en: "The `CQRU1001` reading at `2026-10-27T12:00:00Z` (-14.5 degrees) must be kept for an investigation. Set its `expires_at` to `1795996800` (00:00 UTC on 30 Nov), only if the item is still in the table."
      solution: |
        {"op": "UpdateItem", "input": {
          "TableName": "Readings",
          "Key": {"box": {"S": "CQRU1001"}, "ts": {"S": "2026-10-27T12:00:00Z"}},
          "UpdateExpression": "SET expires_at = :e",
          "ConditionExpression": "attribute_exists(box)",
          "ExpressionAttributeValues": {":e": {"N": "1795996800"}}}}
      check: doc
      ordered: false
      hint:
        vi: "`UpdateItem` với `Key` gồm `box` và `ts`, `\"UpdateExpression\": \"SET expires_at = :e\"` và `\"ConditionExpression\": \"attribute_exists(box)\"`."
        en: "`UpdateItem` with a `Key` of `box` and `ts`, `\"UpdateExpression\": \"SET expires_at = :e\"` and `\"ConditionExpression\": \"attribute_exists(box)\"`."
quiz:
  - q:
      vi: "TTL đã bật trên `expires_at`. Một item hết hạn từ hôm qua. Một `Query` hôm nay có trả item đó không?"
      en: "TTL is on for `expires_at`. An item expired yesterday. Does a `Query` today return it?"
    options:
      - { vi: "Không bao giờ: DynamoDB xóa item đúng giây hết hạn", en: "Never: DynamoDB deletes the item at the second it expires" }
      - { vi: "Có thể có: item hết hạn chỉ bị xóa trong vòng vài ngày", en: "Possibly: an expired item is only deleted within a few days" }
      - { vi: "Không, vì `Query` tự bỏ item đã hết hạn", en: "No, because `Query` skips expired items on its own" }
    answer: 1
    trap: 0
    why:
      vi: "Xóa đúng giây hết hạn nghe hợp lý, nhưng tài liệu AWS nói TTL xóa item hết hạn \"trong vòng vài ngày\" sau thời điểm hết hạn, vào lúc nào cũng được. Trong lúc chờ, item vẫn hiện trong `Query` và `Scan`, và `Query` không tự bỏ nó. Muốn kết quả chỉ có item còn hạn, thêm `FilterExpression` so `expires_at` với thời điểm hiện tại."
      en: "Deleting at the exact second sounds right, but the AWS docs say TTL deletes expired items \"within a few days\" of their expiry, at any time. Meanwhile the item still shows up in `Query` and `Scan`, and `Query` does not skip it on its own. For results with only valid items, add a `FilterExpression` comparing `expires_at` with the current time."
  - q:
      vi: "Ứng dụng ghi `expires_at` dạng chuỗi `\"2026-11-30T00:00:00Z\"`. TTL làm gì với item đó?"
      en: "The app writes `expires_at` as the string `\"2026-11-30T00:00:00Z\"`. What does TTL do with that item?"
    options:
      - { vi: "Xóa nó sau 30/11, vì chuỗi đúng định dạng ngày", en: "Deletes it after 30 Nov, since the string is a valid date" }
      - { vi: "Bỏ qua, không bao giờ xóa nó", en: "Ignores it and never deletes it" }
      - { vi: "Xóa ngay vì không đọc được ngày", en: "Deletes it at once, since it cannot read the date" }
    answer: 1
    trap: 0
    why:
      vi: "Chuỗi ISO 8601 đọc được bằng mắt, nhưng TTL chỉ hiểu thuộc tính kiểu số (`N`) chứa thời điểm Unix tính bằng giây. Theo tài liệu AWS, item có thuộc tính TTL không phải kiểu số bị tiến trình TTL bỏ qua, nên nó nằm mãi trong bảng. Ghi `expires_at` là số giây, ví dụ `1795996800` cho 00:00 UTC ngày 30/11."
      en: "An ISO 8601 string is easy to read, but TTL only understands a number attribute (`N`) holding Unix time in seconds. Per the AWS docs, an item whose TTL attribute is not a number is ignored by the TTL process, so it stays in the table forever. Write `expires_at` as seconds, for example `1795996800` for 00:00 UTC on 30 Nov."
---
## Mở bài

Bảng số đo container lạnh chỉ cần giữ ba ngày gần nhất. Xóa từng item bằng `DeleteItem` thì tốn một lần ghi cho mỗi item; DynamoDB có cách để item tự hết hạn.

## Ý chính

**TTL (time to live).** Bạn bật TTL cho một bảng và chọn một thuộc tính, ví dụ `expires_at`. Mỗi item ghi vào đó thời điểm hết hạn, kiểu số (`N`), là thời điểm Unix tính bằng giây. DynamoDB tự xóa item đã hết hạn trong vòng vài ngày sau thời điểm đó, và việc xóa không tốn capacity ghi. Item có thuộc tính TTL không phải kiểu số thì bị bỏ qua. Item bị TTL xóa vẫn rời khỏi các index phụ như một lần xóa thường, và hiện trong DynamoDB Streams là lần xóa của dịch vụ.

**Trong lúc chờ xóa.** Item hết hạn mà chưa bị xóa vẫn hiện trong `Query` và `Scan`. AWS khuyên dùng `FilterExpression` để bỏ chúng khỏi kết quả. Bạn vẫn sửa được item đó: đặt `expires_at` về tương lai (hoặc bỏ thuộc tính) trước khi nó bị xóa thì nó không còn bị coi là hết hạn; khi sửa, dùng `ConditionExpression` để chắc item chưa bị xóa trong lúc đó.

Nhiều người nghĩ TTL xóa đúng giây hết hạn, nên không cần lọc. Thật ra việc xóa có thể trễ vài ngày; kết quả đúng nghiệp vụ phải tự lọc.

Lab chạy trên dynoxide; lệnh bật TTL (`UpdateTimeToLive`) không chạy trong trình duyệt nên chỉ để đọc, và các bước lab chỉ đọc và sửa thuộc tính `expires_at`. Hình cuối mục cho thấy ba nhóm item theo thời điểm hết hạn so với bây giờ.

## Cú pháp

```text
{"op": "UpdateTimeToLive", "input": {
  "TableName": "Readings",
  "TimeToLiveSpecification": {
    "Enabled": true,
    "AttributeName": "expires_at"}}}
```

- `expires_at`: kiểu `N`, giây Unix (không phải mili giây).
- Hết hạn: `expires_at` nhỏ hơn thời điểm hiện tại.
- Lọc lúc đọc: `"FilterExpression": "expires_at > :now"`.

## Ví dụ

Cả bảng có bao nhiêu item, kể cả item đã quá hạn:

```json
{"op": "Scan", "input": {
  "TableName": "Readings",
  "Select": "COUNT"}}
```

`Count` là 7: TTL chưa xóa gì, nên ba item đã quá hạn vẫn được đếm.

Item còn hạn của `CQRU1002`, viết bằng PartiQL:

```partiql
SELECT ts, temp, expires_at
FROM Readings
WHERE box = 'CQRU1002'
  AND expires_at > 1793404800
```

Một item, số đo lúc 06:00 ngày 30/10.

## Lỗi hay gặp

Tính bây giờ bằng mili giây:

```json
// WRONG: milliseconds, not seconds
{"op": "Query", "input": {
  "TableName": "Readings",
  "KeyConditionExpression": "box = :b",
  "FilterExpression": "expires_at > :n",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":n": {"N": "1793404800000"}}}}
```

```json
// FIX: Unix time in seconds
{"op": "Query", "input": {
  "TableName": "Readings",
  "KeyConditionExpression": "box = :b",
  "FilterExpression": "expires_at > :n",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":n": {"N": "1793404800"}}}}
```

Câu sai trả 0 item, vì mọi `expires_at` (giây) nhỏ hơn con số mili giây gấp nghìn lần; câu đúng trả 3.

So số với chuỗi:

```json
// WRONG: a string is not a number
{"op": "Query", "input": {
  "TableName": "Readings",
  "KeyConditionExpression": "box = :b",
  "FilterExpression": "expires_at > :n",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1002"},
    ":n": {"S": "1793404800"}}}}
```

```json
// FIX: compare a number with a number
{"op": "Query", "input": {
  "TableName": "Readings",
  "KeyConditionExpression": "box = :b",
  "FilterExpression": "expires_at > :n",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1002"},
    ":n": {"N": "1793404800"}}}}
```

Câu sai trả 0 item vì `expires_at` là kiểu `N` còn `:n` là `S`, khác kiểu thì phép so không đúng; câu đúng trả 1.

## Tóm tắt

- TTL đọc một thuộc tính kiểu số chứa giây Unix; kiểu khác bị bỏ qua.
- Item hết hạn bị xóa trong vòng vài ngày, không tốn capacity ghi.
- Trong lúc chờ, item vẫn hiện trong `Query` và `Scan`: lọc bằng `FilterExpression`.
- Gia hạn được item đã hết hạn nếu nó chưa bị xóa; dùng `ConditionExpression`.

# EN

## Opening

The reefer readings table only needs the last three days. Deleting item by item with `DeleteItem` costs one write per item; DynamoDB has a way for items to expire on their own.

## Key idea

**TTL (time to live).** You turn TTL on for a table and pick an attribute, say `expires_at`. Each item stores its expiry time there, as a number (`N`), in Unix time in seconds. DynamoDB deletes expired items on its own within a few days of that time, and the deletes use no write capacity. An item whose TTL attribute is not a number is ignored. An item deleted by TTL still leaves the secondary indexes like a normal delete, and shows up in DynamoDB Streams as a service delete.

**While waiting for deletion.** An expired item that is not deleted yet still shows up in `Query` and `Scan`. AWS advises a `FilterExpression` to drop such items from results. You can still update that item: set `expires_at` to the future (or remove the attribute) before it is deleted and it no longer counts as expired; when updating, use a `ConditionExpression` to make sure the item was not deleted meanwhile.

Many people think TTL deletes at the exact second of expiry, so no filter is needed. In fact the delete can lag by a few days; a result that must be right for the business has to filter on its own.

The lab runs on dynoxide; the command that turns TTL on (`UpdateTimeToLive`) does not run in the browser, so it is to read only, and the lab steps only read and update the `expires_at` attribute. The figure at the end of this section shows three groups of items by their expiry compared with now.

## Syntax

```text
{"op": "UpdateTimeToLive", "input": {
  "TableName": "Readings",
  "TimeToLiveSpecification": {
    "Enabled": true,
    "AttributeName": "expires_at"}}}
```

- `expires_at`: type `N`, Unix seconds (not milliseconds).
- Expired: `expires_at` is less than the current time.
- Filter at read time: `"FilterExpression": "expires_at > :now"`.

## Example

How many items the table holds, expired ones included:

```json
{"op": "Scan", "input": {
  "TableName": "Readings",
  "Select": "COUNT"}}
```

`Count` is 7: TTL has deleted nothing, so the three expired items are still counted.

`CQRU1002`'s valid items, written in PartiQL:

```partiql
SELECT ts, temp, expires_at
FROM Readings
WHERE box = 'CQRU1002'
  AND expires_at > 1793404800
```

One item, the reading at 06:00 on 30 Oct.

## Common mistakes

Taking now in milliseconds:

```json
// WRONG: milliseconds, not seconds
{"op": "Query", "input": {
  "TableName": "Readings",
  "KeyConditionExpression": "box = :b",
  "FilterExpression": "expires_at > :n",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":n": {"N": "1793404800000"}}}}
```

```json
// FIX: Unix time in seconds
{"op": "Query", "input": {
  "TableName": "Readings",
  "KeyConditionExpression": "box = :b",
  "FilterExpression": "expires_at > :n",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1001"},
    ":n": {"N": "1793404800"}}}}
```

The wrong query returns 0 items, because every `expires_at` (in seconds) is a thousand times smaller than the millisecond number; the right one returns 3.

Comparing a number with a string:

```json
// WRONG: a string is not a number
{"op": "Query", "input": {
  "TableName": "Readings",
  "KeyConditionExpression": "box = :b",
  "FilterExpression": "expires_at > :n",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1002"},
    ":n": {"S": "1793404800"}}}}
```

```json
// FIX: compare a number with a number
{"op": "Query", "input": {
  "TableName": "Readings",
  "KeyConditionExpression": "box = :b",
  "FilterExpression": "expires_at > :n",
  "ExpressionAttributeValues": {
    ":b": {"S": "CQRU1002"},
    ":n": {"N": "1793404800"}}}}
```

The wrong query returns 0 items because `expires_at` is type `N` and `:n` is `S`, and a comparison between different types is not true; the right one returns 1.

## Recap

- TTL reads a number attribute holding Unix seconds; any other type is ignored.
- Expired items are deleted within a few days, using no write capacity.
- Meanwhile they still show up in `Query` and `Scan`: filter with a `FilterExpression`.
- An expired item can be extended while it is not deleted yet; use a `ConditionExpression`.
