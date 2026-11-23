---
id: e-dy-l4-08
engine: dynamodb
level: L4
module: patterns
title: "Sparse GSI: index chỉ chứa thứ bạn cần tìm"
title_en: "Sparse GSI: an index holding only what you look for"
kind: lab
runtime: browser
minutes: 10
objectives:
  - { vi: "Giải thích vì sao item thiếu thuộc tính khóa của GSI không có mặt trong GSI", en: "Explain why an item missing a GSI key attribute is absent from the GSI" }
  - { vi: "Tìm một tập nhỏ item (phiếu đang mở) bằng Query trên sparse GSI thay vì Scan", en: "Find a small subset of items (open tickets) with a Query on a sparse GSI instead of a Scan" }
  - { vi: "Đưa một item ra khỏi GSI bằng cách xóa thuộc tính khóa của GSI", en: "Take an item out of the GSI by removing the GSI key attributes" }
requires: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
viz: dy-gsi
lab:
  setup: |
    {"tables": [
      {"TableName":"Tickets","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"},{"AttributeName":"open_queue","AttributeType":"S"},{"AttributeName":"opened_at","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST","GlobalSecondaryIndexes":[{"IndexName":"OpenByQueue","KeySchema":[{"AttributeName":"open_queue","KeyType":"HASH"},{"AttributeName":"opened_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]}
    ], "items": {
      "Tickets": [
        {"pk":"TCK#0001","sk":"TICKET","queue":"SHIPPING","subject":"Request 1"},
        {"pk":"TCK#0002","sk":"TICKET","queue":"ACCOUNT","subject":"Request 2"},
        {"pk":"TCK#0003","sk":"TICKET","queue":"BILLING","subject":"Request 3"},
        {"pk":"TCK#0004","sk":"TICKET","queue":"SHIPPING","subject":"Request 4"},
        {"pk":"TCK#0005","sk":"TICKET","queue":"ACCOUNT","subject":"Request 5"},
        {"pk":"TCK#0006","sk":"TICKET","queue":"BILLING","subject":"Request 6"},
        {"pk":"TCK#0007","sk":"TICKET","queue":"SHIPPING","subject":"Request 7","open_queue":"SHIPPING","opened_at":"2026-11-12T15:00"},
        {"pk":"TCK#0008","sk":"TICKET","queue":"ACCOUNT","subject":"Request 8"},
        {"pk":"TCK#0009","sk":"TICKET","queue":"BILLING","subject":"Request 9"},
        {"pk":"TCK#0010","sk":"TICKET","queue":"SHIPPING","subject":"Request 10"},
        {"pk":"TCK#0011","sk":"TICKET","queue":"ACCOUNT","subject":"Request 11"},
        {"pk":"TCK#0012","sk":"TICKET","queue":"BILLING","subject":"Request 12"},
        {"pk":"TCK#0013","sk":"TICKET","queue":"SHIPPING","subject":"Request 13"},
        {"pk":"TCK#0014","sk":"TICKET","queue":"ACCOUNT","subject":"Request 14"},
        {"pk":"TCK#0015","sk":"TICKET","queue":"BILLING","subject":"Request 15"},
        {"pk":"TCK#0016","sk":"TICKET","queue":"SHIPPING","subject":"Request 16"},
        {"pk":"TCK#0017","sk":"TICKET","queue":"ACCOUNT","subject":"Request 17"},
        {"pk":"TCK#0018","sk":"TICKET","queue":"BILLING","subject":"Request 18"},
        {"pk":"TCK#0019","sk":"TICKET","queue":"SHIPPING","subject":"Request 19","open_queue":"SHIPPING","opened_at":"2026-11-01T09:00"},
        {"pk":"TCK#0020","sk":"TICKET","queue":"ACCOUNT","subject":"Request 20"},
        {"pk":"TCK#0021","sk":"TICKET","queue":"BILLING","subject":"Request 21"},
        {"pk":"TCK#0022","sk":"TICKET","queue":"SHIPPING","subject":"Request 22"},
        {"pk":"TCK#0023","sk":"TICKET","queue":"ACCOUNT","subject":"Request 23","open_queue":"ACCOUNT","opened_at":"2026-11-10T13:00"},
        {"pk":"TCK#0024","sk":"TICKET","queue":"BILLING","subject":"Request 24"},
        {"pk":"TCK#0025","sk":"TICKET","queue":"SHIPPING","subject":"Request 25"},
        {"pk":"TCK#0026","sk":"TICKET","queue":"ACCOUNT","subject":"Request 26"},
        {"pk":"TCK#0027","sk":"TICKET","queue":"BILLING","subject":"Request 27"},
        {"pk":"TCK#0028","sk":"TICKET","queue":"SHIPPING","subject":"Request 28"},
        {"pk":"TCK#0029","sk":"TICKET","queue":"ACCOUNT","subject":"Request 29"},
        {"pk":"TCK#0030","sk":"TICKET","queue":"BILLING","subject":"Request 30"},
        {"pk":"TCK#0031","sk":"TICKET","queue":"SHIPPING","subject":"Request 31"},
        {"pk":"TCK#0032","sk":"TICKET","queue":"ACCOUNT","subject":"Request 32"},
        {"pk":"TCK#0033","sk":"TICKET","queue":"BILLING","subject":"Request 33"},
        {"pk":"TCK#0034","sk":"TICKET","queue":"SHIPPING","subject":"Request 34"},
        {"pk":"TCK#0035","sk":"TICKET","queue":"ACCOUNT","subject":"Request 35"},
        {"pk":"TCK#0036","sk":"TICKET","queue":"BILLING","subject":"Request 36"},
        {"pk":"TCK#0037","sk":"TICKET","queue":"SHIPPING","subject":"Request 37"},
        {"pk":"TCK#0038","sk":"TICKET","queue":"ACCOUNT","subject":"Request 38"},
        {"pk":"TCK#0039","sk":"TICKET","queue":"BILLING","subject":"Request 39"},
        {"pk":"TCK#0040","sk":"TICKET","queue":"SHIPPING","subject":"Request 40"},
        {"pk":"TCK#0041","sk":"TICKET","queue":"ACCOUNT","subject":"Request 41","open_queue":"ACCOUNT","opened_at":"2026-11-03T13:00"},
        {"pk":"TCK#0042","sk":"TICKET","queue":"BILLING","subject":"Request 42"},
        {"pk":"TCK#0043","sk":"TICKET","queue":"SHIPPING","subject":"Request 43"},
        {"pk":"TCK#0044","sk":"TICKET","queue":"ACCOUNT","subject":"Request 44"},
        {"pk":"TCK#0045","sk":"TICKET","queue":"BILLING","subject":"Request 45"},
        {"pk":"TCK#0046","sk":"TICKET","queue":"SHIPPING","subject":"Request 46"},
        {"pk":"TCK#0047","sk":"TICKET","queue":"ACCOUNT","subject":"Request 47"},
        {"pk":"TCK#0048","sk":"TICKET","queue":"BILLING","subject":"Request 48"},
        {"pk":"TCK#0049","sk":"TICKET","queue":"SHIPPING","subject":"Request 49"},
        {"pk":"TCK#0050","sk":"TICKET","queue":"ACCOUNT","subject":"Request 50"},
        {"pk":"TCK#0051","sk":"TICKET","queue":"BILLING","subject":"Request 51"},
        {"pk":"TCK#0052","sk":"TICKET","queue":"SHIPPING","subject":"Request 52"},
        {"pk":"TCK#0053","sk":"TICKET","queue":"ACCOUNT","subject":"Request 53"},
        {"pk":"TCK#0054","sk":"TICKET","queue":"BILLING","subject":"Request 54"},
        {"pk":"TCK#0055","sk":"TICKET","queue":"SHIPPING","subject":"Request 55"},
        {"pk":"TCK#0056","sk":"TICKET","queue":"ACCOUNT","subject":"Request 56"},
        {"pk":"TCK#0057","sk":"TICKET","queue":"BILLING","subject":"Request 57"},
        {"pk":"TCK#0058","sk":"TICKET","queue":"SHIPPING","subject":"Request 58","open_queue":"SHIPPING","opened_at":"2026-11-08T12:00"},
        {"pk":"TCK#0059","sk":"TICKET","queue":"ACCOUNT","subject":"Request 59"},
        {"pk":"TCK#0060","sk":"TICKET","queue":"BILLING","subject":"Request 60"},
        {"pk":"TCK#0061","sk":"TICKET","queue":"SHIPPING","subject":"Request 61"},
        {"pk":"TCK#0062","sk":"TICKET","queue":"ACCOUNT","subject":"Request 62"},
        {"pk":"TCK#0063","sk":"TICKET","queue":"BILLING","subject":"Request 63"},
        {"pk":"TCK#0064","sk":"TICKET","queue":"SHIPPING","subject":"Request 64","open_queue":"SHIPPING","opened_at":"2026-11-12T09:00"},
        {"pk":"TCK#0065","sk":"TICKET","queue":"ACCOUNT","subject":"Request 65"},
        {"pk":"TCK#0066","sk":"TICKET","queue":"BILLING","subject":"Request 66"},
        {"pk":"TCK#0067","sk":"TICKET","queue":"SHIPPING","subject":"Request 67"},
        {"pk":"TCK#0068","sk":"TICKET","queue":"ACCOUNT","subject":"Request 68"},
        {"pk":"TCK#0069","sk":"TICKET","queue":"BILLING","subject":"Request 69"},
        {"pk":"TCK#0070","sk":"TICKET","queue":"SHIPPING","subject":"Request 70"},
        {"pk":"TCK#0071","sk":"TICKET","queue":"ACCOUNT","subject":"Request 71"},
        {"pk":"TCK#0072","sk":"TICKET","queue":"BILLING","subject":"Request 72"},
        {"pk":"TCK#0073","sk":"TICKET","queue":"SHIPPING","subject":"Request 73"},
        {"pk":"TCK#0074","sk":"TICKET","queue":"ACCOUNT","subject":"Request 74"},
        {"pk":"TCK#0075","sk":"TICKET","queue":"BILLING","subject":"Request 75"},
        {"pk":"TCK#0076","sk":"TICKET","queue":"SHIPPING","subject":"Request 76"},
        {"pk":"TCK#0077","sk":"TICKET","queue":"ACCOUNT","subject":"Request 77","open_queue":"ACCOUNT","opened_at":"2026-11-08T13:00"},
        {"pk":"TCK#0078","sk":"TICKET","queue":"BILLING","subject":"Request 78"},
        {"pk":"TCK#0079","sk":"TICKET","queue":"SHIPPING","subject":"Request 79"},
        {"pk":"TCK#0080","sk":"TICKET","queue":"ACCOUNT","subject":"Request 80"},
        {"pk":"TCK#0081","sk":"TICKET","queue":"BILLING","subject":"Request 81"},
        {"pk":"TCK#0082","sk":"TICKET","queue":"SHIPPING","subject":"Request 82"},
        {"pk":"TCK#0083","sk":"TICKET","queue":"ACCOUNT","subject":"Request 83"},
        {"pk":"TCK#0084","sk":"TICKET","queue":"BILLING","subject":"Request 84"},
        {"pk":"TCK#0085","sk":"TICKET","queue":"SHIPPING","subject":"Request 85"},
        {"pk":"TCK#0086","sk":"TICKET","queue":"ACCOUNT","subject":"Request 86"},
        {"pk":"TCK#0087","sk":"TICKET","queue":"BILLING","subject":"Request 87"},
        {"pk":"TCK#0088","sk":"TICKET","queue":"SHIPPING","subject":"Request 88"},
        {"pk":"TCK#0089","sk":"TICKET","queue":"ACCOUNT","subject":"Request 89"},
        {"pk":"TCK#0090","sk":"TICKET","queue":"BILLING","subject":"Request 90","open_queue":"BILLING","opened_at":"2026-11-04T08:00"},
        {"pk":"TCK#0091","sk":"TICKET","queue":"SHIPPING","subject":"Request 91"},
        {"pk":"TCK#0092","sk":"TICKET","queue":"ACCOUNT","subject":"Request 92"},
        {"pk":"TCK#0093","sk":"TICKET","queue":"BILLING","subject":"Request 93"},
        {"pk":"TCK#0094","sk":"TICKET","queue":"SHIPPING","subject":"Request 94"},
        {"pk":"TCK#0095","sk":"TICKET","queue":"ACCOUNT","subject":"Request 95"},
        {"pk":"TCK#0096","sk":"TICKET","queue":"BILLING","subject":"Request 96"},
        {"pk":"TCK#0097","sk":"TICKET","queue":"SHIPPING","subject":"Request 97"},
        {"pk":"TCK#0098","sk":"TICKET","queue":"ACCOUNT","subject":"Request 98"},
        {"pk":"TCK#0099","sk":"TICKET","queue":"BILLING","subject":"Request 99"},
        {"pk":"TCK#0100","sk":"TICKET","queue":"SHIPPING","subject":"Request 100"},
        {"pk":"TCK#0101","sk":"TICKET","queue":"ACCOUNT","subject":"Request 101"},
        {"pk":"TCK#0102","sk":"TICKET","queue":"BILLING","subject":"Request 102","open_queue":"BILLING","opened_at":"2026-11-12T11:00"},
        {"pk":"TCK#0103","sk":"TICKET","queue":"SHIPPING","subject":"Request 103"},
        {"pk":"TCK#0104","sk":"TICKET","queue":"ACCOUNT","subject":"Request 104"},
        {"pk":"TCK#0105","sk":"TICKET","queue":"BILLING","subject":"Request 105"},
        {"pk":"TCK#0106","sk":"TICKET","queue":"SHIPPING","subject":"Request 106"},
        {"pk":"TCK#0107","sk":"TICKET","queue":"ACCOUNT","subject":"Request 107"},
        {"pk":"TCK#0108","sk":"TICKET","queue":"BILLING","subject":"Request 108"},
        {"pk":"TCK#0109","sk":"TICKET","queue":"SHIPPING","subject":"Request 109"},
        {"pk":"TCK#0110","sk":"TICKET","queue":"ACCOUNT","subject":"Request 110"},
        {"pk":"TCK#0111","sk":"TICKET","queue":"BILLING","subject":"Request 111"},
        {"pk":"TCK#0112","sk":"TICKET","queue":"SHIPPING","subject":"Request 112"},
        {"pk":"TCK#0113","sk":"TICKET","queue":"ACCOUNT","subject":"Request 113"},
        {"pk":"TCK#0114","sk":"TICKET","queue":"BILLING","subject":"Request 114"},
        {"pk":"TCK#0115","sk":"TICKET","queue":"SHIPPING","subject":"Request 115","open_queue":"SHIPPING","opened_at":"2026-11-08T15:00"},
        {"pk":"TCK#0116","sk":"TICKET","queue":"ACCOUNT","subject":"Request 116"},
        {"pk":"TCK#0117","sk":"TICKET","queue":"BILLING","subject":"Request 117"},
        {"pk":"TCK#0118","sk":"TICKET","queue":"SHIPPING","subject":"Request 118"},
        {"pk":"TCK#0119","sk":"TICKET","queue":"ACCOUNT","subject":"Request 119"},
        {"pk":"TCK#0120","sk":"TICKET","queue":"BILLING","subject":"Request 120"}
      ]
    }}
  steps:
    - task: { vi: "Bảng `Tickets` có 120 phiếu hỗ trợ. Chỉ phiếu đang mở mới có `open_queue` và `opened_at`, là khóa của GSI `OpenByQueue`. Đọc mọi phiếu đang mở của hàng đợi `SHIPPING`.", en: "The `Tickets` table holds 120 support tickets. Only open tickets carry `open_queue` and `opened_at`, the keys of the GSI `OpenByQueue`. Read every open ticket of the `SHIPPING` queue." }
      solution: |
        {"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "SHIPPING"}}}}
      check: doc
      perf: { table: Tickets }
      slow: |
        {"op":"Scan","input":{"TableName":"Tickets","IndexName":"OpenByQueue","ExpressionAttributeValues":{":q":{"S":"SHIPPING"}},"FilterExpression":"(open_queue = :q)"}}
      expect: { Count: 5, ScannedCount: 5 }
      hint: { vi: "Query trên GSI cần `IndexName`; điều kiện đặt lên partition key của GSI.", en: "A Query on a GSI needs `IndexName`; the condition goes on the GSI's partition key." }
    - task: { vi: "Lấy đúng một phiếu: phiếu đang mở lâu nhất của hàng đợi `ACCOUNT`.", en: "Get exactly one ticket: the longest-open ticket of the `ACCOUNT` queue." }
      solution: |
        {"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "ACCOUNT"}}, "ScanIndexForward": true, "Limit": 1}}
      check: doc
      ordered: true
      expect: { Count: 1, ScannedCount: 1 }
      hint: { vi: "Sort key của GSI là `opened_at`, sắp tăng dần sẵn; chỉ cần giới hạn số item.", en: "The GSI's sort key is `opened_at`, already ascending; you only need to limit the number of items." }
    - task: { vi: "Phiếu `TCK#0019` (sort key `TICKET`) vừa được giải quyết. Đóng nó bằng một `UpdateItem` xóa hai thuộc tính khóa của GSI, để nó rời `OpenByQueue`.", en: "Ticket `TCK#0019` (sort key `TICKET`) has just been solved. Close it with one `UpdateItem` that removes both GSI key attributes, so it leaves `OpenByQueue`." }
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Tickets", "Key": {"pk": {"S": "TCK#0019"}, "sk": {"S": "TICKET"}}, "UpdateExpression": "REMOVE open_queue, opened_at"}}
      check: doc
      hint: { vi: "`UpdateExpression` dùng `REMOVE` với tên hai thuộc tính, cách nhau bằng dấu phẩy.", en: "`UpdateExpression` uses `REMOVE` with the two attribute names, separated by a comma." }
quiz:
  - q: { vi: "Phiếu đã đóng nhưng ứng dụng đặt `open_queue` thành `CLOSED` thay vì xóa nó. Chuyện gì xảy ra với GSI?", en: "A ticket is closed, but the application sets `open_queue` to `CLOSED` instead of removing it. What happens to the GSI?" }
    options:
      - { vi: "Phiếu rời GSI vì không còn mở", en: "The ticket leaves the GSI because it is no longer open" }
      - { vi: "Phiếu vẫn ở trong GSI, dưới partition `CLOSED`, và GSI hết thưa dần", en: "The ticket stays in the GSI, under the `CLOSED` partition, and the GSI slowly stops being sparse" }
      - { vi: "DynamoDB báo lỗi vì giá trị không hợp lệ", en: "DynamoDB raises an error because the value is invalid" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì ý nghĩa là \"đã đóng\", nhưng DynamoDB không hiểu ý nghĩa: item có thuộc tính khóa của GSI là có mặt trong GSI. Mọi phiếu đóng dồn vào partition `CLOSED`, GSI phình ra và tốn capacity ghi. Phải `REMOVE` thuộc tính.", en: "It sounds right because the meaning is \"closed\", but DynamoDB does not read meanings: an item with the GSI key attributes is in the GSI. Every closed ticket piles into the `CLOSED` partition, the GSI grows and costs write capacity. You must `REMOVE` the attribute." }
predict:
  sql: |
    {"op": "Scan", "input": {"TableName": "Tickets", "FilterExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "SHIPPING"}}}}
  q: { vi: "Làm bước 1 bằng Scan bảng gốc với FilterExpression như trên. `ScannedCount` là bao nhiêu?", en: "Do step 1 with a Scan of the base table and the FilterExpression above. What is `ScannedCount`?" }
  options:
    - { vi: "5", en: "5" }
    - { vi: "10, mọi phiếu đang mở", en: "10, every open ticket" }
    - { vi: "120, mọi phiếu", en: "120, every ticket" }
  answer: 2
  trap: 0
  why: { vi: "Đáp án 5 nghe hợp lý vì chỉ 5 phiếu được trả về. Nhưng Scan đọc cả 120 item rồi mới lọc. Sparse GSI chỉ có 10 item (các phiếu đang mở), nên Query trên nó chỉ đọc 5 item của hàng đợi `SHIPPING`.", en: "5 sounds right because only 5 tickets come back. But the Scan reads all 120 items before filtering. The sparse GSI holds only 10 items (the open tickets), so a Query on it reads just the 5 items of the `SHIPPING` queue." }
---
## Mở bài

Bàn hỗ trợ có 120 phiếu, chỉ 10 phiếu đang mở, và màn hình chính chỉ hỏi phiếu đang mở theo hàng đợi. Scan cả bảng để tìm 10 phiếu là trả tiền cho 110 phiếu không ai cần. Có cách nào để index chỉ chứa đúng những phiếu đang mở?

## Ý chính

DynamoDB chỉ ghi item vào GSI khi item có đủ thuộc tính khóa của GSI. Thiếu partition key (hoặc sort key, nếu GSI có) thì item không có mặt trong GSI. GSI chỉ chứa một phần nhỏ bảng gọi là sparse GSI (GSI thưa).

Cách dùng: đặt thuộc tính khóa của GSI khi item vào trạng thái cần tìm (phiếu mở), xóa thuộc tính đó khi item rời trạng thái (phiếu đóng). Query trên sparse GSI chỉ đọc vài item, còn Scan bảng gốc đọc tất cả. Chọn sort key của GSI là thứ có ích để sắp (giờ mở phiếu), để "cũ nhất trước" là một Query có `Limit`. GSI cũng nhận ít lần ghi hơn bảng, nên tốn ít capacity ghi hơn.

Nhiều người nghĩ đặt thuộc tính thành một giá trị như `CLOSED` là đủ để "tắt" nó. Thật ra DynamoDB không đọc ý nghĩa: còn thuộc tính là còn trong GSI. Phải `REMOVE` nó.

Lab chạy bằng dynoxide trong trình duyệt.

## Cú pháp

```text
GSI key attributes present  -> item is in the GSI
GSI key attributes missing  -> item is not in the GSI
open:  {"op": "UpdateItem", "input": {..., "UpdateExpression": "SET open_queue = :q, opened_at = :t"}}
close: {"op": "UpdateItem", "input": {..., "UpdateExpression": "REMOVE open_queue, opened_at"}}
read:  {"op": "Query", "input": {"TableName": "<t>", "IndexName": "<gsi>", "KeyConditionExpression": "open_queue = :q", ["Limit": 1]}}
```

- Thuộc tính khóa của GSI phải khai trong `AttributeDefinitions` của bảng.
- `REMOVE` thuộc tính = rời GSI; `SET` lại = vào lại.
- Query trên GSI chỉ đọc nhất quán cuối cùng.

## Ví dụ

Phiếu đang mở của hàng đợi `BILLING`:

```json
{"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "BILLING"}}}}
```

Hai phiếu, `ScannedCount` 2: GSI không chứa phiếu đóng nào.

Phiếu mở mới nhất của `SHIPPING`:

```json
{"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "SHIPPING"}}, "ScanIndexForward": false, "Limit": 1}}
```

`TCK#0007`, mở lúc 2026-11-12T15:00.

Mở lại một phiếu đã đóng: đặt hai thuộc tính, nó vào GSI.

```json
{"op": "UpdateItem", "input": {"TableName": "Tickets", "Key": {"pk": {"S": "TCK#0002"}, "sk": {"S": "TICKET"}}, "UpdateExpression": "SET open_queue = :q, opened_at = :t", "ExpressionAttributeValues": {":q": {"S": "ACCOUNT"}, ":t": {"S": "2026-11-13T10:00"}}}}
```

## Lỗi hay gặp

Tìm phiếu mở bằng Scan bảng gốc:

```json
// WRONG: 2 tickets back, 120 items read
{"op": "Scan", "input": {"TableName": "Tickets", "FilterExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "BILLING"}}}}
```

```json
// FIX: the sparse GSI holds only open tickets
{"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "BILLING"}}}}
```

Cùng 2 phiếu; câu sai có `ScannedCount` 120, câu sửa 2.

Đóng phiếu bằng chuỗi rỗng thay vì xóa thuộc tính:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Tickets", "Key": {"pk": {"S": "TCK#0019"}, "sk": {"S": "TICKET"}}, "UpdateExpression": "SET open_queue = :e", "ExpressionAttributeValues": {":e": {"S": ""}}}}
```

Thuộc tính khóa của index không nhận chuỗi rỗng. Dùng `REMOVE open_queue, opened_at`.

## Thực hành

120 phiếu, 10 phiếu đang mở. Đoán `ScannedCount` của Scan trước, rồi đọc phiếu mở của một hàng đợi, lấy phiếu mở lâu nhất, và đóng một phiếu.

## Tóm tắt

- Item chỉ vào GSI khi có đủ thuộc tính khóa của GSI.
- Sparse GSI = index chỉ chứa phần item đang ở một trạng thái.
- `SET` thuộc tính để vào GSI, `REMOVE` để rời; đặt giá trị khác thì vẫn ở lại.
- Query trên sparse GSI đọc vài item thay vì Scan cả bảng.

# EN

## Opening

The help desk has 120 tickets, only 10 of them open, and the main screen only asks for open tickets by queue. Scanning the whole table to find 10 tickets means paying for 110 tickets nobody needs. Is there a way to have an index holding only the open tickets?

## Key idea

DynamoDB writes an item into a GSI only when the item has the GSI's key attributes. Missing the partition key (or the sort key, if the GSI has one) means the item is absent from the GSI. A GSI holding only a small part of the table is a sparse GSI.

How to use it: set the GSI key attribute when the item enters the state you search for (ticket open), remove it when the item leaves that state (ticket closed). A Query on a sparse GSI reads a handful of items, while a Scan of the base table reads all of them. Pick a GSI sort key that is useful to sort by (the opening time), so "oldest first" is one Query with `Limit`. The GSI also receives fewer writes than the table, so it uses less write capacity.

Many people think setting the attribute to a value such as `CLOSED` is enough to "switch it off". In fact DynamoDB does not read meanings: while the attribute is there, the item is in the GSI. You must `REMOVE` it.

The lab runs on dynoxide in the browser.

## Syntax

```text
GSI key attributes present  -> item is in the GSI
GSI key attributes missing  -> item is not in the GSI
open:  {"op": "UpdateItem", "input": {..., "UpdateExpression": "SET open_queue = :q, opened_at = :t"}}
close: {"op": "UpdateItem", "input": {..., "UpdateExpression": "REMOVE open_queue, opened_at"}}
read:  {"op": "Query", "input": {"TableName": "<t>", "IndexName": "<gsi>", "KeyConditionExpression": "open_queue = :q", ["Limit": 1]}}
```

- The GSI key attributes must be declared in the table's `AttributeDefinitions`.
- `REMOVE` the attribute = leave the GSI; `SET` it again = come back.
- A Query on a GSI reads eventually consistent data only.

## Example

The open tickets of the `BILLING` queue:

```json
{"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "BILLING"}}}}
```

Two tickets, `ScannedCount` 2: the GSI holds no closed ticket.

The newest open ticket of `SHIPPING`:

```json
{"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "SHIPPING"}}, "ScanIndexForward": false, "Limit": 1}}
```

`TCK#0007`, opened at 2026-11-12T15:00.

Reopening a closed ticket: set both attributes and it enters the GSI.

```json
{"op": "UpdateItem", "input": {"TableName": "Tickets", "Key": {"pk": {"S": "TCK#0002"}, "sk": {"S": "TICKET"}}, "UpdateExpression": "SET open_queue = :q, opened_at = :t", "ExpressionAttributeValues": {":q": {"S": "ACCOUNT"}, ":t": {"S": "2026-11-13T10:00"}}}}
```

## Common mistakes

Finding open tickets with a Scan of the base table:

```json
// WRONG: 2 tickets back, 120 items read
{"op": "Scan", "input": {"TableName": "Tickets", "FilterExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "BILLING"}}}}
```

```json
// FIX: the sparse GSI holds only open tickets
{"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "BILLING"}}}}
```

Same 2 tickets; the wrong one has a `ScannedCount` of 120, the fix 2.

Closing a ticket with an empty string instead of removing the attribute:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Tickets", "Key": {"pk": {"S": "TCK#0019"}, "sk": {"S": "TICKET"}}, "UpdateExpression": "SET open_queue = :e", "ExpressionAttributeValues": {":e": {"S": ""}}}}
```

An index key attribute does not accept an empty string. Use `REMOVE open_queue, opened_at`.

## Practice

120 tickets, 10 of them open. Guess the Scan's `ScannedCount` first, then read one queue's open tickets, get the longest-open ticket, and close a ticket.

## Recap

- An item enters a GSI only when it has the GSI's key attributes.
- Sparse GSI = an index holding only the items in one state.
- `SET` the attribute to enter the GSI, `REMOVE` it to leave; another value keeps it there.
- A Query on a sparse GSI reads a few items instead of scanning the whole table.
