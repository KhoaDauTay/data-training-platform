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
requires: [e-dy-l3-02, e-dy-l1-04]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
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
---

## Ý chính

GSI được khai trong `GlobalSecondaryIndexes` của `CreateTable` (hoặc thêm sau bằng `UpdateTable`). Mỗi GSI có:

- `IndexName`;
- `KeySchema` riêng (`HASH`, tùy chọn `RANGE`);
- `Projection`: `KEYS_ONLY`, `ALL`, hoặc `INCLUDE` kèm `NonKeyAttributes`.

Mọi thuộc tính làm khóa cho bảng **hoặc** cho index phải có trong `AttributeDefinitions`, và chỉ chúng.

Item không có thuộc tính khóa của GSI sẽ **không** xuất hiện trong GSI. Bài "sparse index" dùng chính điều này.

## Ví dụ

Thêm GSI vào bảng đang chạy:

```json
{"op": "UpdateTable", "input": {"TableName": "Orders",
  "AttributeDefinitions": [{"AttributeName": "city", "AttributeType": "S"}],
  "GlobalSecondaryIndexUpdates": [{"Create": {"IndexName": "byCity",
    "KeySchema": [{"AttributeName": "city", "KeyType": "HASH"}],
    "Projection": {"ProjectionType": "KEYS_ONLY"}}}]}}
```

## Thực hành

Bài được chấm bằng `DescribeTable`: khóa bảng, khóa và projection của GSI phải khớp. Tên index và thứ tự trong mảng không quan trọng.

# EN

## Key idea

A GSI is declared in the `GlobalSecondaryIndexes` of `CreateTable` (or added later with `UpdateTable`). Each GSI has:

- an `IndexName`;
- its own `KeySchema` (`HASH`, optionally `RANGE`);
- a `Projection`: `KEYS_ONLY`, `ALL`, or `INCLUDE` with `NonKeyAttributes`.

Every attribute used as a key of the table **or** of an index must be in `AttributeDefinitions`, and only those.

An item without the GSI's key attributes does **not** appear in the GSI. The sparse index lesson relies on exactly that.

## Example

Add a GSI to a live table:

```json
{"op": "UpdateTable", "input": {"TableName": "Orders",
  "AttributeDefinitions": [{"AttributeName": "city", "AttributeType": "S"}],
  "GlobalSecondaryIndexUpdates": [{"Create": {"IndexName": "byCity",
    "KeySchema": [{"AttributeName": "city", "KeyType": "HASH"}],
    "Projection": {"ProjectionType": "KEYS_ONLY"}}}]}}
```

## Practice

The step is graded with `DescribeTable`: the table keys and the GSI's keys and projection must match. The index name and array order do not matter.
