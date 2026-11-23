---
id: e-dy-l1-02
engine: dynamodb
level: L1
module: keys
title: "Khóa chính: partition key và sort key"
title_en: "Primary key: partition key and sort key"
kind: concept
runtime: docs
minutes: 8
viz: dy-partitions
objectives:
  - vi: Phân biệt khóa đơn (chỉ partition key) và khóa kép (partition key + sort key).
    en: Tell a simple key (partition key only) from a composite key (partition key + sort key).
  - vi: Mô tả cách DynamoDB băm partition key để chọn partition, và vì sao item cùng partition key nằm cạnh nhau theo thứ tự sort key.
    en: Describe how DynamoDB hashes the partition key to pick a partition, and why items with the same partition key sit together in sort key order.
requires: [e-dy-l1-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html
quiz:
  - q:
      vi: Bảng `Orders` có khóa (`customerId`, `orderId`). Hai item nào không thể cùng tồn tại?
      en: Table `Orders` has the key (`customerId`, `orderId`). Which two items cannot both exist?
    options:
      - vi: Cùng `customerId`, khác `orderId`.
        en: Same `customerId`, different `orderId`.
      - vi: Khác `customerId`, cùng `orderId`.
        en: Different `customerId`, same `orderId`.
      - vi: Cùng `customerId` và cùng `orderId`.
        en: Same `customerId` and same `orderId`.
    answer: 2
    trap: 1
    why:
      vi: Nghe hợp lý nếu coi `orderId` là khóa riêng như cột `id` của SQL, nhưng với khóa kép, cặp (partition key, sort key) phải duy nhất. Ghi item thứ hai cùng cặp khóa sẽ thay item cũ.
      en: It sounds right if `orderId` is a key on its own like an SQL `id` column, but with a composite key the pair (partition key, sort key) must be unique. Writing a second item with the same pair replaces the old one.
  - q:
      vi: Vì sao mọi đơn của khách `C-07` đọc được trong một request, theo thứ tự `orderId`?
      en: Why can every order of customer `C-07` be read in one request, in `orderId` order?
    options:
      - vi: Vì DynamoDB sắp cả bảng theo `orderId`.
        en: Because DynamoDB sorts the whole table by `orderId`.
      - vi: Vì item cùng partition key được lưu cùng nhau, sắp theo sort key.
        en: Because items with the same partition key are stored together, sorted by sort key.
      - vi: Vì DynamoDB tự tạo index trên mọi thuộc tính.
        en: Because DynamoDB indexes every attribute automatically.
    answer: 1
    trap: 0
    why:
      vi: Nghe hợp lý vì kết quả ra đúng thứ tự, nhưng cả bảng không được sắp. Hàm băm trên partition key chọn partition. Trong partition, các item cùng partition key (một item collection) được sắp theo sort key. Cả bảng không có thứ tự chung.
      en: It sounds right because the result comes back in order, but the table as a whole is not sorted. The hash of the partition key picks the partition. Inside it, items with the same partition key (one item collection) are sorted by sort key. The table as a whole has no order.
demo_setup: |
  {"tables": [{"TableName":"Orders","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"customerId","AttributeType":"S"},{"AttributeName":"orderId","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
   "items": {"Orders": [
    {"customerId":"C-01","orderId":"2026-08-28#O-102","total":770000},
    {"customerId":"C-02","orderId":"2026-09-17#O-107","total":210000},
    {"customerId":"C-02","orderId":"2026-07-25#O-105","total":640000},
    {"customerId":"C-02","orderId":"2026-10-03#O-108","total":820000},
    {"customerId":"C-02","orderId":"2026-08-26#O-106","total":910000},
    {"customerId":"C-03","orderId":"2026-07-05#O-109","total":560000}
  ]}}
---
## Mở bài

Một khách có bốn đơn, và màn hình cần chúng theo thứ tự ngày. Bảng `Orders` không có `ORDER BY` hay index nào khác. Khóa chính phải chọn thế nào để chỉ một request là đủ?

## Ý chính

Mỗi bảng có một **khóa chính** (primary key), chọn lúc tạo bảng và không đổi được nữa. Có hai loại:

- **Khóa đơn** (simple key): chỉ có **partition key** (khóa phân vùng). Bảng `Books` dùng `isbn`, mỗi `isbn` là một item.
- **Khóa kép** (composite key): **partition key + sort key** (khóa sắp xếp). Bảng `Orders` dùng `customerId` + `orderId`. Một khách có nhiều đơn, mỗi đơn một `orderId`.

Thuộc tính khóa chỉ được là chuỗi, số hoặc nhị phân. Với khóa kép, cặp hai giá trị phải duy nhất; ghi item cùng cặp khóa sẽ thay item cũ.

**Partition key chọn chỗ ở.** DynamoDB đưa giá trị partition key qua một hàm băm nội bộ. Kết quả băm quyết định item nằm ở **partition** (phân vùng vật lý) nào. Partition là một đơn vị lưu trữ, được nhân bản sang nhiều Availability Zone.

**Sort key chọn thứ tự.** Các item cùng partition key được lưu cạnh nhau, sắp theo sort key. Nhóm đó gọi là một **item collection**. Cả bảng không có thứ tự chung, và không có "tìm theo thuộc tính bất kỳ" rẻ: muốn đọc nhanh, câu hỏi phải bắt đầu bằng partition key.

## Cú pháp

```text
"KeySchema": [{"AttributeName": "customerId", "KeyType": "HASH"},
              {"AttributeName": "orderId",    "KeyType": "RANGE"}]
```

- `HASH` là partition key, `RANGE` là sort key.
- Khóa đơn chỉ có dòng `HASH`.
- Khóa kép: mỗi item được xác định bởi cặp (partition key, sort key).

## Ví dụ

Bấm "Tiếp" trên sơ đồ: `C-01`, `C-02`, `C-03` đi qua hàm băm và rơi vào các partition khác nhau. Bốn đơn của `C-02` được ghi lộn xộn, nhưng đọc ra theo `orderId`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

Vì `orderId` bắt đầu bằng ngày, thứ tự sort key cũng là thứ tự thời gian. Đây là mẹo thiết kế đầu tiên: đặt thứ bạn muốn sắp vào đầu sort key.

Một đơn cụ thể cần cả hai phần khóa:

```json
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-08-26#O-106"}}}}
```

## Lỗi hay gặp

Đọc một item chỉ bằng partition key trên bảng khóa kép:

```json
// ERROR ValidationException
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}}}}
```

`GetItem` cần khóa đầy đủ; muốn mọi đơn của khách thì dùng `Query`.

Ghi đơn mới nhưng dùng lại một `orderId` đã có của khách:

```json
// WRONG: same (customerId, orderId) pair, so the old order is replaced
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}, "total": {"N": "150000"}}}}
```

```json
// FIX: a new sort key value, so a new item is added
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-30#O-109"}, "total": {"N": "150000"}}}}
```

Bản sai không báo lỗi; bảng vẫn còn 6 đơn và đơn `O-108` mất giá trị cũ.

## Tóm tắt

- Khóa đơn: chỉ partition key; khóa kép: partition key + sort key.
- Partition key qua hàm băm chọn partition; cả bảng không có thứ tự chung.
- Item cùng partition key là một item collection, sắp theo sort key.
- Cặp khóa phải duy nhất; ghi cùng cặp là thay item cũ.

# EN

## Opening

A customer has four orders, and the screen needs them in date order. Table `Orders` has no `ORDER BY` and no other index. How must you choose the primary key so one request is enough?

## Key idea

Every table has a **primary key**, chosen when the table is created and never changed. There are two kinds:

- **Simple key**: only a **partition key**. Table `Books` uses `isbn`, each `isbn` is one item.
- **Composite key**: **partition key + sort key**. Table `Orders` uses `customerId` + `orderId`. One customer has many orders, each with its own `orderId`.

Key attributes can only be strings, numbers or binary. With a composite key the pair of values must be unique; writing an item with the same pair replaces the old one.

**The partition key picks the home.** DynamoDB passes the partition key value through an internal hash function. The hash decides which **partition** the item lives in. A partition is a unit of storage, replicated across several Availability Zones.

**The sort key picks the order.** Items with the same partition key are stored next to each other, sorted by sort key. That group is called an **item collection**. The table as a whole has no order, and there is no cheap "find by any attribute": to read fast, a question must start with the partition key.

## Syntax

```text
"KeySchema": [{"AttributeName": "customerId", "KeyType": "HASH"},
              {"AttributeName": "orderId",    "KeyType": "RANGE"}]
```

- `HASH` is the partition key, `RANGE` the sort key.
- A simple key has only the `HASH` line.
- With a composite key, each item is identified by the pair (partition key, sort key).

## Example

Press "Next" on the diagram: `C-01`, `C-02`, `C-03` go through the hash and land in different partitions. The four orders of `C-02` were written out of order, but they come back in `orderId` order:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

Because `orderId` starts with the date, sort key order is also time order. That is the first design trick: put what you want to sort by at the front of the sort key.

One specific order needs both parts of the key:

```json
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-08-26#O-106"}}}}
```

## Common mistakes

Reading one item with only the partition key on a composite-key table:

```json
// ERROR ValidationException
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}}}}
```

`GetItem` needs the full key; for every order of a customer, use `Query`.

Writing a new order that reuses one of the customer's existing `orderId` values:

```json
// WRONG: same (customerId, orderId) pair, so the old order is replaced
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}, "total": {"N": "150000"}}}}
```

```json
// FIX: a new sort key value, so a new item is added
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-30#O-109"}, "total": {"N": "150000"}}}}
```

The wrong version raises no error; the table still holds 6 orders and order `O-108` has lost its old values.

## Recap

- Simple key: partition key only; composite key: partition key + sort key.
- The hash of the partition key picks the partition; the table has no overall order.
- Items with one partition key form an item collection, sorted by sort key.
- The key pair must be unique; writing the same pair replaces the old item.
