---
id: e-dy-l1-04
engine: dynamodb
level: L1
module: keys
title: "Tạo bảng cho mẫu truy cập \"mọi đơn của một khách\""
title_en: "Create a table for the access pattern \"every order of one customer\""
kind: lab
runtime: browser
minutes: 8
objectives:
  - vi: Viết `CreateTable` với `KeySchema` và `AttributeDefinitions` khớp nhau.
    en: Write a `CreateTable` with matching `KeySchema` and `AttributeDefinitions`.
  - vi: Chọn khóa kép sao cho một mẫu truy cập đọc được trong một request.
    en: Choose a composite key so that one access pattern is served by one request.
requires: [e-dy-l1-03]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
lab:
  steps:
    - task:
        vi: Cửa hàng cần đọc "mọi đơn của một khách, theo thời gian". Tạo bảng `Orders` với partition key chuỗi `customerId` và sort key chuỗi `orderId` (dạng `2026-10-03#O-108`), tính tiền theo request.
        en: The shop needs to read "every order of one customer, in time order". Create table `Orders` with string partition key `customerId` and string sort key `orderId` (shaped like `2026-10-03#O-108`), billed per request.
      solution: |
        {"op": "CreateTable", "input": {
          "TableName": "Orders",
          "KeySchema": [
            {"AttributeName": "customerId", "KeyType": "HASH"},
            {"AttributeName": "orderId", "KeyType": "RANGE"}],
          "AttributeDefinitions": [
            {"AttributeName": "customerId", "AttributeType": "S"},
            {"AttributeName": "orderId", "AttributeType": "S"}],
          "BillingMode": "PAY_PER_REQUEST"}}
      check: catalog
      hint:
        vi: '`HASH` là partition key, `RANGE` là sort key. Mỗi thuộc tính trong `KeySchema` phải có một dòng trong `AttributeDefinitions` với kiểu `S`.'
        en: '`HASH` is the partition key, `RANGE` is the sort key. Every attribute in `KeySchema` needs a line in `AttributeDefinitions` with type `S`.'
---

## Ý chính

`CreateTable` chỉ mô tả **khóa**, không mô tả cột:

- `KeySchema`: thuộc tính nào là partition key (`HASH`), thuộc tính nào là sort key (`RANGE`).
- `AttributeDefinitions`: kiểu (`S`, `N` hoặc `B`) của **đúng** các thuộc tính dùng làm khóa của bảng hoặc của index. Khai thêm thuộc tính thường ở đây là lỗi `ValidationException`.
- `BillingMode`: `PAY_PER_REQUEST` (on-demand, trả theo request) hoặc `PROVISIONED` (đặt trước RCU/WCU). On-demand là chế độ mặc định và được AWS khuyên dùng.

## Ví dụ

Bảng `Books` chỉ cần khóa đơn:

```json
{"op": "CreateTable", "input": {"TableName": "Books", "KeySchema": [{"AttributeName": "isbn", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "isbn", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

## Thực hành

Mẫu truy cập "mọi đơn của một khách, theo thời gian" cho bạn luôn hai khóa: khách là partition key, đơn là sort key. Đặt ngày ở đầu `orderId` để thứ tự sort key cũng là thứ tự thời gian. Bài được chấm bằng `DescribeTable`: khóa, kiểu khóa và index phải khớp.

# EN

## Key idea

`CreateTable` describes only the **key**, not columns:

- `KeySchema`: which attribute is the partition key (`HASH`) and which is the sort key (`RANGE`).
- `AttributeDefinitions`: the type (`S`, `N` or `B`) of **exactly** the attributes used as keys of the table or of an index. Declaring an ordinary attribute here is a `ValidationException`.
- `BillingMode`: `PAY_PER_REQUEST` (on-demand, pay per request) or `PROVISIONED` (reserve RCU/WCU ahead). On-demand is the default and the mode AWS recommends.

## Example

Table `Books` needs only a simple key:

```json
{"op": "CreateTable", "input": {"TableName": "Books", "KeySchema": [{"AttributeName": "isbn", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "isbn", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

## Practice

The access pattern "every order of one customer, in time order" hands you both keys: the customer is the partition key, the order is the sort key. Put the date at the front of `orderId` so sort key order is also time order. The step is graded with `DescribeTable`: the keys, key types and indexes must match.
