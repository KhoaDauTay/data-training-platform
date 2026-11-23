---
id: e-dy-l3-03
engine: dynamodb
level: L3
module: secondary
title: "Tạo bảng có GSI cho mẫu truy cập mới"
title_en: "Create a table with a GSI for a new access pattern"
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Khai một GSI trong `CreateTable` với khóa, projection `INCLUDE` và `AttributeDefinitions` đủ cho khóa index.
    en: Declare a GSI in `CreateTable` with its keys, an `INCLUDE` projection and `AttributeDefinitions` covering the index keys.
  - vi: Khai một LSI, thứ chỉ tạo được cùng lúc tạo bảng.
    en: Declare an LSI, which can only be created together with the table.
  - vi: Nhận ra lỗi `ValidationException` khi khóa index thiếu trong `AttributeDefinitions`.
    en: Recognise the `ValidationException` when an index key is missing from `AttributeDefinitions`.
requires: [e-dy-l3-02, e-dy-l1-04]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
demo_setup: |
  {"tables": [{"TableName": "Seed", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "id", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "id", "AttributeType": "S"}]}], "items": {"Seed": [{"id": "x"}]}}
lab:
  steps:
    - task:
        vi: 'Kho cần trang "mọi đơn theo trạng thái, theo thời gian", hiện `orderId` và `total`. Tạo bảng `Orders` (khóa `customerId` + `orderId`, tính tiền theo request) kèm GSI `byStatus` có partition key `status`, sort key `orderId`, chỉ project thêm `total`.'
        en: 'The warehouse needs a page "every order by status, in time order" showing `orderId` and `total`. Create table `Orders` (key `customerId` + `orderId`, billed per request) with a GSI `byStatus` whose partition key is `status`, sort key `orderId`, projecting only `total` besides the keys.'
      solution: |
        {"op": "CreateTable", "input": {
          "TableName": "Orders",
          "KeySchema": [
            {"AttributeName": "customerId", "KeyType": "HASH"},
            {"AttributeName": "orderId", "KeyType": "RANGE"}],
          "AttributeDefinitions": [
            {"AttributeName": "customerId", "AttributeType": "S"},
            {"AttributeName": "orderId", "AttributeType": "S"},
            {"AttributeName": "status", "AttributeType": "S"}],
          "GlobalSecondaryIndexes": [{
            "IndexName": "byStatus",
            "KeySchema": [
              {"AttributeName": "status", "KeyType": "HASH"},
              {"AttributeName": "orderId", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "INCLUDE", "NonKeyAttributes": ["total"]}}],
          "BillingMode": "PAY_PER_REQUEST"}}
      check: catalog
      hint:
        vi: '`status` là khóa của index nên phải có trong `AttributeDefinitions`; `total` thì không, nó chỉ nằm trong `NonKeyAttributes`.'
        en: '`status` is an index key, so it must be in `AttributeDefinitions`; `total` is not, it only goes into `NonKeyAttributes`.'
    - task:
        vi: 'Kế toán cần "đơn của một khách theo số tiền". Tạo bảng `Payments` (khóa `customerId` + `orderId`, tính tiền theo request) kèm LSI `byTotal` có sort key `total` (số), project `KEYS_ONLY`.'
        en: 'Accounting needs "a customer''s orders by amount". Create table `Payments` (key `customerId` + `orderId`, billed per request) with an LSI `byTotal` whose sort key is `total` (a number), projecting `KEYS_ONLY`.'
      solution: |
        {"op": "CreateTable", "input": {
          "TableName": "Payments",
          "KeySchema": [
            {"AttributeName": "customerId", "KeyType": "HASH"},
            {"AttributeName": "orderId", "KeyType": "RANGE"}],
          "AttributeDefinitions": [
            {"AttributeName": "customerId", "AttributeType": "S"},
            {"AttributeName": "orderId", "AttributeType": "S"},
            {"AttributeName": "total", "AttributeType": "N"}],
          "LocalSecondaryIndexes": [{
            "IndexName": "byTotal",
            "KeySchema": [
              {"AttributeName": "customerId", "KeyType": "HASH"},
              {"AttributeName": "total", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "KEYS_ONLY"}}],
          "BillingMode": "PAY_PER_REQUEST"}}
      check: catalog
      hint:
        vi: 'LSI dùng lại partition key của bảng (`customerId`), chỉ đổi sort key; `total` có kiểu `N`.'
        en: 'An LSI reuses the table partition key (`customerId`) and only changes the sort key; `total` has type `N`.'
    - task:
        vi: 'Một đồng nghiệp tạo bảng `Returns` (khóa `orderId`) kèm GSI `byReason` trên `reason`, nhưng quên khai `reason` trong `AttributeDefinitions`. Gửi đúng request đó. Bước này đạt khi DynamoDB từ chối nó.'
        en: 'A colleague creates table `Returns` (key `orderId`) with a GSI `byReason` on `reason`, but forgets to declare `reason` in `AttributeDefinitions`. Send exactly that request. This step passes when DynamoDB refuses it.'
      solution: |
        {"op": "CreateTable", "input": {
          "TableName": "Returns",
          "KeySchema": [{"AttributeName": "orderId", "KeyType": "HASH"}],
          "AttributeDefinitions": [{"AttributeName": "orderId", "AttributeType": "S"}],
          "GlobalSecondaryIndexes": [{
            "IndexName": "byReason",
            "KeySchema": [{"AttributeName": "reason", "KeyType": "HASH"}],
            "Projection": {"ProjectionType": "KEYS_ONLY"}}],
          "BillingMode": "PAY_PER_REQUEST"}}
      check: catalog
      error: ValidationException
      hint:
        vi: 'Khai GSI trên `reason` mà `AttributeDefinitions` chỉ có `orderId`. Lỗi chính là kết quả bước này cần.'
        en: 'Declare the GSI on `reason` while `AttributeDefinitions` has only `orderId`. The error is the result this step wants.'
quiz:
  - q:
      vi: 'GSI `byStatus` project `INCLUDE` với `NonKeyAttributes: ["total"]`. Có cần khai `total` trong `AttributeDefinitions` không?'
      en: 'GSI `byStatus` projects `INCLUDE` with `NonKeyAttributes: ["total"]`. Must `total` be declared in `AttributeDefinitions`?'
    options:
      - { vi: "Có, mọi thuộc tính index mang theo đều phải khai kiểu", en: "Yes, every attribute an index carries must have a declared type" }
      - { vi: "Không, `AttributeDefinitions` chỉ dành cho thuộc tính làm khóa của bảng hoặc index", en: "No, `AttributeDefinitions` is only for attributes used as keys of the table or an index" }
      - { vi: "Chỉ khi `total` là số", en: "Only when `total` is a number" }
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì SQL khai kiểu cho mọi cột, nhưng DynamoDB không có schema cho thuộc tính thường. `AttributeDefinitions` chỉ chứa khóa; khai thêm một thuộc tính không làm khóa cũng bị `ValidationException`.'
      en: 'It sounds right because SQL declares a type for every column, but DynamoDB has no schema for ordinary attributes. `AttributeDefinitions` holds only keys; declaring an attribute that is not a key is also a `ValidationException`.'
  - q:
      vi: Bảng đã chạy, bạn cần thêm một cách sắp đơn theo `total` trong mỗi khách. Thêm gì được?
      en: The table is live and you need another way to sort each customer's orders by `total`. What can you add?
    options:
      - { vi: "Một LSI qua `UpdateTable`", en: "An LSI through `UpdateTable`" }
      - { vi: "Một GSI có partition key `customerId`, sort key `total`, qua `UpdateTable`", en: "A GSI with partition key `customerId` and sort key `total`, through `UpdateTable`" }
      - { vi: "Không gì cả, phải tạo bảng mới", en: "Nothing, you must create a new table" }
    answer: 1
    why:
      vi: LSI chỉ tạo cùng lúc tạo bảng. GSI thì thêm được bất cứ lúc nào, và được phép dùng chính partition key của bảng; đổi lại nó chỉ đọc eventually consistent.
      en: An LSI can only be created with the table. A GSI can be added at any time and may reuse the table's own partition key; in exchange it only allows eventually consistent reads.
---
## Mở bài

Trang kho cần "mọi đơn theo trạng thái", mà bảng `Orders` chỉ có khóa theo khách. Bạn sắp viết request tạo index, và một dòng thiếu trong `AttributeDefinitions` là đủ để DynamoDB từ chối cả bảng.

## Ý chính

GSI được khai trong `GlobalSecondaryIndexes` của `CreateTable`, hoặc thêm sau bằng `UpdateTable`. Mỗi GSI có `IndexName`, `KeySchema` riêng (`HASH`, tùy chọn `RANGE`) và `Projection`: `KEYS_ONLY`, `ALL`, hoặc `INCLUDE` kèm `NonKeyAttributes`. LSI khai trong `LocalSecondaryIndexes`, dùng lại partition key của bảng, và chỉ khai được trong `CreateTable`.

`AttributeDefinitions` chứa đúng các thuộc tính làm khóa cho bảng hoặc cho index, không hơn không kém. Thiếu một khóa index, hoặc thừa một thuộc tính không làm khóa, đều là `ValidationException`.

Nhiều người nghĩ `AttributeDefinitions` là schema của item, như danh sách cột trong SQL. Thật ra item vẫn tự do thuộc tính; danh sách này chỉ cho DynamoDB biết kiểu của các khóa. Item không có thuộc tính khóa của một GSI thì không vào GSI đó: bài "sparse index" dùng chính điều này.

Lab chạy bằng dynoxide trong trình duyệt và được chấm bằng mô tả bảng: khóa, khóa index và loại projection phải khớp; thứ tự trong mảng không quan trọng.

## Cú pháp

```text
{"op": "CreateTable", "input": {"TableName": "<t>", "BillingMode": "PAY_PER_REQUEST",
  "KeySchema": [{"AttributeName": "<pk>", "KeyType": "HASH"}, [{"AttributeName": "<sk>", "KeyType": "RANGE"}]],
  "AttributeDefinitions": [{"AttributeName": "<every key attribute>", "AttributeType": "S" | "N" | "B"}],
  ["GlobalSecondaryIndexes": [{"IndexName": "<i>", "KeySchema": [...], "Projection": {...}}]],
  ["LocalSecondaryIndexes": [{"IndexName": "<i>", "KeySchema": [<pk HASH>, <other RANGE>], "Projection": {...}}]]}}
{"op": "UpdateTable", "input": {"TableName": "<t>", "AttributeDefinitions": [...],
  "GlobalSecondaryIndexUpdates": [{"Create": {"IndexName": "<i>", "KeySchema": [...], "Projection": {...}}}]}}
```

- `AttributeDefinitions`: mọi khóa của bảng và index, và chỉ chúng.
- `NonKeyAttributes`: chỉ đi với `INCLUDE`, không cần khai kiểu.
- LSI: chỉ trong `CreateTable`; GSI: `CreateTable` hoặc `UpdateTable`.

## Ví dụ

Bảng có GSI `byStatus` project thêm `total`:

```json
{"op": "CreateTable", "input": {"TableName": "Shipments", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "customerId", "KeyType": "HASH"}, {"AttributeName": "orderId", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "customerId", "AttributeType": "S"}, {"AttributeName": "orderId", "AttributeType": "S"}, {"AttributeName": "status", "AttributeType": "S"}], "GlobalSecondaryIndexes": [{"IndexName": "byStatus", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "orderId", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "INCLUDE", "NonKeyAttributes": ["total"]}}]}}
```

Mô tả bảng trả về có `GlobalSecondaryIndexes` với khóa `status` + `orderId`; `total` không có trong `AttributeDefinitions`.

Một bảng có LSI `byDue`: cùng partition key `storeId`, sort key khác:

```json
{"op": "CreateTable", "input": {"TableName": "Invoices", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "storeId", "KeyType": "HASH"}, {"AttributeName": "invoiceId", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "storeId", "AttributeType": "S"}, {"AttributeName": "invoiceId", "AttributeType": "S"}, {"AttributeName": "dueDate", "AttributeType": "S"}], "LocalSecondaryIndexes": [{"IndexName": "byDue", "KeySchema": [{"AttributeName": "storeId", "KeyType": "HASH"}, {"AttributeName": "dueDate", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}]}}
```

Thêm GSI vào bảng `Orders` đang chạy:

```text
{"op": "UpdateTable", "input": {"TableName": "Orders", "AttributeDefinitions": [{"AttributeName": "city", "AttributeType": "S"}], "GlobalSecondaryIndexUpdates": [{"Create": {"IndexName": "byCity", "KeySchema": [{"AttributeName": "city", "KeyType": "HASH"}], "Projection": {"ProjectionType": "KEYS_ONLY"}}}]}}
```

Lab trong trình duyệt chưa chạy `UpdateTable`, nên khối này chỉ để đọc. Trên AWS, index mới được dựng dần từ dữ liệu sẵn có (backfill) và chỉ Query được khi trạng thái của nó là `ACTIVE`.

## Lỗi hay gặp

Quên khai khóa của index:

```json
// ERROR ValidationException
{"op": "CreateTable", "input": {"TableName": "Returns", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "orderId", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "orderId", "AttributeType": "S"}], "GlobalSecondaryIndexes": [{"IndexName": "byReason", "KeySchema": [{"AttributeName": "reason", "KeyType": "HASH"}], "Projection": {"ProjectionType": "KEYS_ONLY"}}]}}
```

`reason` là khóa của `byReason` nên phải có trong `AttributeDefinitions`.

Khai thêm một thuộc tính không làm khóa:

```json
// ERROR ValidationException
{"op": "CreateTable", "input": {"TableName": "Returns", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "orderId", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "orderId", "AttributeType": "S"}, {"AttributeName": "total", "AttributeType": "N"}]}}
```

`total` chỉ là dữ liệu: bỏ nó khỏi `AttributeDefinitions` (hoặc chỉ đưa vào `NonKeyAttributes` của một index).

## Thực hành

Ba bước: tạo bảng `Orders` có GSI `byStatus`, tạo bảng `Payments` có LSI `byTotal`, rồi gửi một request thiếu khóa index để thấy DynamoDB từ chối.

## Tóm tắt

- GSI khai trong `CreateTable` hoặc thêm sau bằng `UpdateTable`; LSI chỉ trong `CreateTable`.
- `AttributeDefinitions` chứa đúng các khóa của bảng và index.
- `INCLUDE` mang thêm thuộc tính qua `NonKeyAttributes`, không cần khai kiểu.
- Item thiếu khóa của GSI thì không vào GSI.

# EN

## Opening

The warehouse page needs "every order by status", but table `Orders` is keyed only by customer. You are about to write the request that creates the index, and one missing line in `AttributeDefinitions` is enough for DynamoDB to refuse the whole table.

## Key idea

A GSI is declared in the `GlobalSecondaryIndexes` of `CreateTable`, or added later with `UpdateTable`. Each GSI has an `IndexName`, its own `KeySchema` (`HASH`, optionally `RANGE`) and a `Projection`: `KEYS_ONLY`, `ALL`, or `INCLUDE` with `NonKeyAttributes`. An LSI is declared in `LocalSecondaryIndexes`, reuses the table's partition key, and can only be declared in `CreateTable`.

`AttributeDefinitions` holds exactly the attributes used as keys of the table or of an index, no more and no less. A missing index key, or an extra attribute that is not a key, is a `ValidationException`.

Many people think `AttributeDefinitions` is the item schema, like a column list in SQL. In fact items stay free-form; this list only tells DynamoDB the types of the keys. An item without a GSI's key attributes does not enter that GSI: the sparse index lesson relies on exactly that.

The lab runs on dynoxide in the browser and is graded on the table description: keys, index keys and projection type must match; array order does not matter.

## Syntax

```text
{"op": "CreateTable", "input": {"TableName": "<t>", "BillingMode": "PAY_PER_REQUEST",
  "KeySchema": [{"AttributeName": "<pk>", "KeyType": "HASH"}, [{"AttributeName": "<sk>", "KeyType": "RANGE"}]],
  "AttributeDefinitions": [{"AttributeName": "<every key attribute>", "AttributeType": "S" | "N" | "B"}],
  ["GlobalSecondaryIndexes": [{"IndexName": "<i>", "KeySchema": [...], "Projection": {...}}]],
  ["LocalSecondaryIndexes": [{"IndexName": "<i>", "KeySchema": [<pk HASH>, <other RANGE>], "Projection": {...}}]]}}
{"op": "UpdateTable", "input": {"TableName": "<t>", "AttributeDefinitions": [...],
  "GlobalSecondaryIndexUpdates": [{"Create": {"IndexName": "<i>", "KeySchema": [...], "Projection": {...}}}]}}
```

- `AttributeDefinitions`: every key of the table and its indexes, and only those.
- `NonKeyAttributes`: only with `INCLUDE`, no type needed.
- LSI: only in `CreateTable`; GSI: `CreateTable` or `UpdateTable`.

## Example

A table with GSI `byStatus` that also projects `total`:

```json
{"op": "CreateTable", "input": {"TableName": "Shipments", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "customerId", "KeyType": "HASH"}, {"AttributeName": "orderId", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "customerId", "AttributeType": "S"}, {"AttributeName": "orderId", "AttributeType": "S"}, {"AttributeName": "status", "AttributeType": "S"}], "GlobalSecondaryIndexes": [{"IndexName": "byStatus", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "orderId", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "INCLUDE", "NonKeyAttributes": ["total"]}}]}}
```

The returned table description has `GlobalSecondaryIndexes` keyed on `status` + `orderId`; `total` is not in `AttributeDefinitions`.

A table with LSI `byDue`: the same partition key `storeId`, another sort key:

```json
{"op": "CreateTable", "input": {"TableName": "Invoices", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "storeId", "KeyType": "HASH"}, {"AttributeName": "invoiceId", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "storeId", "AttributeType": "S"}, {"AttributeName": "invoiceId", "AttributeType": "S"}, {"AttributeName": "dueDate", "AttributeType": "S"}], "LocalSecondaryIndexes": [{"IndexName": "byDue", "KeySchema": [{"AttributeName": "storeId", "KeyType": "HASH"}, {"AttributeName": "dueDate", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}]}}
```

Adding a GSI to the live table `Orders`:

```text
{"op": "UpdateTable", "input": {"TableName": "Orders", "AttributeDefinitions": [{"AttributeName": "city", "AttributeType": "S"}], "GlobalSecondaryIndexUpdates": [{"Create": {"IndexName": "byCity", "KeySchema": [{"AttributeName": "city", "KeyType": "HASH"}], "Projection": {"ProjectionType": "KEYS_ONLY"}}}]}}
```

The browser lab does not run `UpdateTable` yet, so this block is for reading only. On AWS the new index is built from the existing data (backfill) and can be queried only once its status is `ACTIVE`.

## Common mistakes

Forgetting to declare an index key:

```json
// ERROR ValidationException
{"op": "CreateTable", "input": {"TableName": "Returns", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "orderId", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "orderId", "AttributeType": "S"}], "GlobalSecondaryIndexes": [{"IndexName": "byReason", "KeySchema": [{"AttributeName": "reason", "KeyType": "HASH"}], "Projection": {"ProjectionType": "KEYS_ONLY"}}]}}
```

`reason` is a key of `byReason`, so it must be in `AttributeDefinitions`.

Declaring an attribute that is not a key:

```json
// ERROR ValidationException
{"op": "CreateTable", "input": {"TableName": "Returns", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "orderId", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "orderId", "AttributeType": "S"}, {"AttributeName": "total", "AttributeType": "N"}]}}
```

`total` is only data: drop it from `AttributeDefinitions` (or only list it in an index's `NonKeyAttributes`).

## Practice

Three steps: create table `Orders` with GSI `byStatus`, create table `Payments` with LSI `byTotal`, then send a request missing an index key to see DynamoDB refuse it.

## Recap

- A GSI is declared in `CreateTable` or added later with `UpdateTable`; an LSI only in `CreateTable`.
- `AttributeDefinitions` holds exactly the keys of the table and its indexes.
- `INCLUDE` carries extra attributes through `NonKeyAttributes`, with no declared type.
- An item missing a GSI's key does not enter that GSI.
