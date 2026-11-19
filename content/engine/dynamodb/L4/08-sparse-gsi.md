---
id: e-dy-l4-08
engine: dynamodb
level: L4
module: patterns
title: "GSI thưa: chỉ mục chỉ chứa thứ bạn cần tìm"
title_en: "Sparse GSI: an index holding only what you look for"
kind: lab
minutes: 10
objectives:
  - { vi: "Giải thích vì sao item thiếu thuộc tính khóa của GSI không có mặt trong GSI", en: "Explain why an item missing a GSI key attribute is absent from the GSI" }
  - { vi: "Tìm một tập nhỏ item (phiếu đang mở) bằng Query trên GSI thưa thay vì Scan", en: "Find a small subset of items (open tickets) with a Query on a sparse GSI instead of a Scan" }
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
    - task: { vi: "Bảng `Tickets` có 120 phiếu hỗ trợ. Chỉ phiếu đang mở mới có `open_queue` và `opened_at`, là khóa của GSI `OpenByQueue`. Đọc mọi phiếu đang mở của hàng `SHIPPING`.", en: "The `Tickets` table holds 120 support tickets. Only open tickets carry `open_queue` and `opened_at`, the keys of the GSI `OpenByQueue`. Read every open ticket of the `SHIPPING` queue." }
      solution: |
        {"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "SHIPPING"}}}}
      check: doc
      expect: { Count: 5, ScannedCount: 5 }
      hint: { vi: "Query trên GSI cần `IndexName`; điều kiện đặt lên partition key của GSI.", en: "A Query on a GSI needs `IndexName`; the condition goes on the GSI's partition key." }
    - task: { vi: "Lấy đúng một phiếu: phiếu đang mở lâu nhất của hàng `ACCOUNT`.", en: "Get exactly one ticket: the longest-open ticket of the `ACCOUNT` queue." }
      solution: |
        {"op": "Query", "input": {"TableName": "Tickets", "IndexName": "OpenByQueue", "KeyConditionExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "ACCOUNT"}}, "ScanIndexForward": true, "Limit": 1}}
      check: doc
      ordered: true
      expect: { Count: 1, ScannedCount: 1 }
      hint: { vi: "Sort key của GSI là `opened_at`, sắp tăng dần sẵn; chỉ cần giới hạn số item.", en: "The GSI's sort key is `opened_at`, already ascending; you only need to limit the number of items." }
predict:
  sql: |
    {"op": "Scan", "input": {"TableName": "Tickets", "FilterExpression": "open_queue = :q", "ExpressionAttributeValues": {":q": {"S": "SHIPPING"}}}}
  q: { vi: "Làm bước 1 bằng Scan bảng gốc với FilterExpression như trên. `ScannedCount` là bao nhiêu?", en: "Do step 1 with a Scan of the base table and the FilterExpression above. What is `ScannedCount`?" }
  options:
    - { vi: "5", en: "5" }
    - { vi: "10, mọi phiếu đang mở", en: "10, every open ticket" }
    - { vi: "120, mọi phiếu", en: "120, every ticket" }
  answer: 2
  why: { vi: "Scan đọc cả 120 item rồi mới lọc. GSI thưa chỉ có 10 item (các phiếu đang mở), nên Query trên nó chỉ đọc 5 item của hàng `SHIPPING`.", en: "The Scan reads all 120 items before filtering. The sparse GSI holds only 10 items (the open tickets), so a Query on it reads just the 5 items of the `SHIPPING` queue." }
---

## Ý chính

DynamoDB chỉ ghi một mục vào GSI **khi item có đủ thuộc tính khóa của GSI**. Thiếu partition key (hoặc sort key, nếu GSI có) thì item không có mặt trong GSI. GSI mà chỉ chứa một phần nhỏ bảng gọi là **GSI thưa**.

- Đặt thuộc tính khóa của GSI khi item vào trạng thái cần tìm (phiếu mở), xóa thuộc tính đó khi item rời trạng thái (phiếu đóng).
- Query trên GSI thưa chỉ đọc vài item, trong khi Scan bảng gốc đọc tất cả.
- Chọn sort key của GSI là thứ có ích để sắp (ngày mở phiếu), để "cũ nhất trước" là một Query có `Limit`.
- GSI ghi ít hơn bảng gốc, nên tốn ít capacity ghi hơn.

## Ví dụ

```text
Tickets (120 items)                       OpenByQueue (10 items)
TCK#0007  queue=SHIPPING  open_queue=SHIPPING  ->  SHIPPING | 2026-11-...
TCK#0008  queue=ACCOUNT   (closed, no open_queue) -> not in the index
```

Đóng phiếu bằng `UpdateItem` với `REMOVE open_queue, opened_at`: item tự rời GSI.

## Thực hành

120 phiếu, 10 phiếu đang mở. Đoán `ScannedCount` của Scan trước, rồi viết hai Query.

# EN

## Key idea

DynamoDB writes an entry into a GSI **only when the item has the GSI's key attributes**. Missing the partition key (or the sort key, if the GSI has one) means the item is absent from the GSI. A GSI holding only a small part of the table is a **sparse GSI**.

- Set the GSI key attribute when the item enters the state you search for (ticket open), remove it when the item leaves that state (ticket closed).
- A Query on a sparse GSI reads a handful of items, while a Scan of the base table reads all of them.
- Pick a GSI sort key that is useful to sort by (the opening date), so "oldest first" is one Query with `Limit`.
- The GSI receives fewer writes than the base table, so it uses less write capacity.

## Example

```text
Tickets (120 items)                       OpenByQueue (10 items)
TCK#0007  queue=SHIPPING  open_queue=SHIPPING  ->  SHIPPING | 2026-11-...
TCK#0008  queue=ACCOUNT   (closed, no open_queue) -> not in the index
```

Closing a ticket is an `UpdateItem` with `REMOVE open_queue, opened_at`: the item leaves the GSI by itself.

## Practice

120 tickets, 10 of them open. Guess the Scan's `ScannedCount` first, then write the two Queries.
