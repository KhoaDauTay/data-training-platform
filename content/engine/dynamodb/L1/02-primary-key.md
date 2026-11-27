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
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html, title_vi: "Cách hoạt động: các thành phần chính" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html, title_vi: "Cách hoạt động: partition" }
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
      vi: Nghe hợp lý nếu coi `orderId` là khóa riêng như cột `id` của SQL, nhưng với khóa kép, chỉ cặp (partition key, sort key) phải duy nhất. Hai khách khác nhau có cùng `orderId` là hai cặp khác nhau, nên cùng tồn tại được; một khách có nhiều `orderId` cũng vậy, đó chính là item collection của khách đó. Chỉ khi trùng cả hai phần thì ghi item thứ hai sẽ thay item cũ.
      en: It sounds right if `orderId` is a key on its own like an SQL `id` column, but with a composite key only the pair (partition key, sort key) must be unique. Two customers with the same `orderId` are two different pairs, so both can exist; one customer with many `orderId` values is fine too, that is the customer's item collection. Only when both parts match does writing a second item replace the old one.
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
      vi: 'Nghe hợp lý vì kết quả ra đúng thứ tự, nhưng cả bảng không được sắp. Hàm băm trên partition key chọn partition (phân vùng vật lý). Trong partition, các item cùng partition key `C-07` (một item collection) được lưu cạnh nhau và sắp theo sort key `orderId`, nên một Query đọc liền một mạch. DynamoDB cũng không tự tạo index trên mọi thuộc tính: ngoài khóa chính, chỉ có index bạn tự khai báo.'
      en: 'It sounds right because the result comes back in order, but the table as a whole is not sorted. The hash of the partition key picks the partition. Inside it, the items with partition key `C-07` (one item collection) are stored next to each other and sorted by the sort key `orderId`, so one Query reads them in one run. DynamoDB does not index every attribute either: beyond the primary key, there are only the indexes you declare yourself.'
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

Chọn partition key có nhiều giá trị khác nhau, như mã khách, để request rải đều trên các partition. Một thuộc tính chỉ có vài giá trị, như trạng thái đơn, sẽ dồn mọi đơn cùng trạng thái vào một chỗ; các bài sau quay lại chuyện "partition nóng" này.

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

Bốn đơn về theo `orderId` tăng dần, từ `2026-07-25#O-105` tới `2026-10-03#O-108`, và `ScannedCount` là 4: chỉ item collection của `C-02` được đọc. Vì `orderId` bắt đầu bằng ngày, thứ tự sort key cũng là thứ tự thời gian. Đây là mẹo thiết kế đầu tiên: đặt thứ bạn muốn sắp vào đầu sort key.

Một đơn cụ thể cần cả hai phần khóa:

```json
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-08-26#O-106"}}}}
```

Kết quả là đúng một item, đơn `O-106`, với giá 0.5 RCU: cặp khóa đầy đủ chỉ tới một item duy nhất.

## Lỗi hay gặp

Đọc một item chỉ bằng partition key trên bảng khóa kép:

```json
// ERROR ValidationException
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}}}}
```

`GetItem` cần khóa đầy đủ; muốn mọi đơn của khách thì dùng `Query`. Thông báo ở đây là "The provided key element does not match the schema": khóa gửi lên không khớp `KeySchema` của bảng.

Ghi đơn mới nhưng dùng lại một `orderId` đã có của khách:

```json
// WRONG: same (customerId, orderId) pair, so the old order is replaced
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}, "total": {"N": "150000"}}}}
```

```json
// FIX: a new sort key value, so a new item is added
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-30#O-109"}, "total": {"N": "150000"}}}}
```

Bản sai không báo lỗi; bảng vẫn còn 6 đơn và đơn `O-108` mất giá trị cũ. Bản sửa thêm đơn thứ bảy. Muốn DynamoDB từ chối thay vì ghi đè, dùng conditional write (ghi kèm điều kiện, chẳng hạn "chỉ ghi khi khóa này chưa có"), học ở L2.

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

Pick a partition key with many distinct values, such as the customer id, so requests spread evenly across partitions. An attribute with only a few values, such as the order status, would pile every order with the same status into one place; later lessons come back to this "hot partition".

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

The four orders come back in ascending `orderId`, from `2026-07-25#O-105` to `2026-10-03#O-108`, and `ScannedCount` is 4: only the item collection of `C-02` is read. Because `orderId` starts with the date, sort key order is also time order. That is the first design trick: put what you want to sort by at the front of the sort key.

One specific order needs both parts of the key:

```json
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-08-26#O-106"}}}}
```

The result is exactly one item, order `O-106`, at 0.5 RCU: the full key pair points to a single item.

## Common mistakes

Reading one item with only the partition key on a composite-key table:

```json
// ERROR ValidationException
{"op": "GetItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}}}}
```

`GetItem` needs the full key; for every order of a customer, use `Query`. The message here is "The provided key element does not match the schema": the key sent does not match the table's `KeySchema`.

Writing a new order that reuses one of the customer's existing `orderId` values:

```json
// WRONG: same (customerId, orderId) pair, so the old order is replaced
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}, "total": {"N": "150000"}}}}
```

```json
// FIX: a new sort key value, so a new item is added
{"op": "PutItem", "input": {"TableName": "Orders", "Item": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-30#O-109"}, "total": {"N": "150000"}}}}
```

The wrong version raises no error; the table still holds 6 orders and order `O-108` has lost its old values. The fix adds a seventh order. To make DynamoDB refuse instead of overwrite, use a conditional write (a write with a condition, such as "only if this key does not exist yet"), taught in L2.

## Recap

- Simple key: partition key only; composite key: partition key + sort key.
- The hash of the partition key picks the partition; the table has no overall order.
- Items with one partition key form an item collection, sorted by sort key.
- The key pair must be unique; writing the same pair replaces the old item.
