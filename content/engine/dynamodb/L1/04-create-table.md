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
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html, title_vi: "API CreateTable" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.CoreComponents.html, title_vi: "Cách hoạt động: các thành phần chính" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html, title_vi: "Chế độ capacity" }
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
    - task:
        vi: Cửa hàng còn cần tra sách theo mã. Tạo bảng `Books` với khóa đơn là chuỗi `isbn`, tính tiền theo request.
        en: The shop also needs to look books up by code. Create table `Books` with the simple string key `isbn`, billed per request.
      solution: |
        {"op": "CreateTable", "input": {
          "TableName": "Books",
          "KeySchema": [{"AttributeName": "isbn", "KeyType": "HASH"}],
          "AttributeDefinitions": [{"AttributeName": "isbn", "AttributeType": "S"}],
          "BillingMode": "PAY_PER_REQUEST"}}
      check: catalog
      hint:
        vi: Khóa đơn chỉ có một dòng `HASH` trong `KeySchema` và một dòng trong `AttributeDefinitions`.
        en: A simple key has one `HASH` line in `KeySchema` and one line in `AttributeDefinitions`.
    - task:
        vi: Máy đo nhiệt trong kho gửi số đo liên tục. Tạo bảng `Readings` với partition key chuỗi `deviceId` và sort key **số** `ts` (giây Unix), tính tiền theo request, để đọc "mọi số đo của một máy theo thời gian".
        en: The warehouse thermometers send readings all the time. Create table `Readings` with string partition key `deviceId` and **number** sort key `ts` (Unix seconds), billed per request, to read "every reading of one device in time order".
      solution: |
        {"op": "CreateTable", "input": {
          "TableName": "Readings",
          "KeySchema": [
            {"AttributeName": "deviceId", "KeyType": "HASH"},
            {"AttributeName": "ts", "KeyType": "RANGE"}],
          "AttributeDefinitions": [
            {"AttributeName": "deviceId", "AttributeType": "S"},
            {"AttributeName": "ts", "AttributeType": "N"}],
          "BillingMode": "PAY_PER_REQUEST"}}
      check: catalog
      hint:
        vi: Kiểu của `ts` là `N`. Sort key số được sắp theo giá trị số.
        en: The type of `ts` is `N`. A number sort key sorts by numeric value.
quiz:
  - q:
      vi: 'Bảng `Books` có thêm `title` và `price`. Phải khai chúng trong `AttributeDefinitions` không?'
      en: 'Table `Books` also holds `title` and `price`. Must they be declared in `AttributeDefinitions`?'
    options:
      - vi: Có, mọi thuộc tính phải được khai như cột
        en: Yes, every attribute must be declared like a column
      - vi: Không, chỉ khai thuộc tính dùng làm khóa của bảng hoặc của index
        en: No, only the attributes used as keys of the table or of an index
      - vi: Không, `AttributeDefinitions` là tùy chọn
        en: No, `AttributeDefinitions` is optional
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì `CREATE TABLE` của SQL khai mọi cột, nhưng DynamoDB chỉ cần kiểu của thuộc tính khóa, vì chỉ khóa mới được kiểm kiểu và dùng để xếp item. Khai thêm `title` làm `AttributeDefinitions` có hai dòng trong khi `KeySchema` chỉ có `isbn`, nên bị từ chối bằng `ValidationException`. `AttributeDefinitions` cũng không tùy chọn: thiếu nó, DynamoDB không biết `isbn` là `S`, `N` hay `B`.'
      en: 'It sounds right because SQL `CREATE TABLE` declares every column, but DynamoDB needs only the types of key attributes, since only keys are type-checked and used to place items. Declaring `title` gives `AttributeDefinitions` two lines while `KeySchema` holds only `isbn`, so it is refused with a `ValidationException`. `AttributeDefinitions` is not optional either: without it, DynamoDB does not know whether `isbn` is `S`, `N` or `B`.'
  - q:
      vi: 'Sort key `ts` lưu giây Unix. Nên khai kiểu `S` hay `N`?'
      en: 'Sort key `ts` holds Unix seconds. Should it be declared as `S` or `N`?'
    options:
      - vi: '`S`, vì DynamoDB gửi số bằng chuỗi'
        en: '`S`, because DynamoDB sends numbers as strings'
      - vi: '`N`, để item được sắp theo giá trị số'
        en: '`N`, so items sort by numeric value'
      - vi: Không quan trọng, thứ tự như nhau
        en: It does not matter, the order is the same
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì số đi trong request bằng chuỗi, nhưng nhãn `N` mới cho DynamoDB biết đó là số. Sort key `S` so theo byte từ trái sang, ký tự `9` lớn hơn `1`, nên `"999"` đứng sau `"1000"` và số đo sẽ ra sai thứ tự thời gian. Vì vậy thứ tự không như nhau: chỉ `N` sắp 999 trước 1000.'
      en: 'It sounds right because numbers travel as strings in a request, but the `N` tag is what tells DynamoDB it is a number. An `S` sort key compares bytes from the left, and the character `9` is greater than `1`, so `"999"` sorts after `"1000"` and the readings come back out of time order. So the order is not the same: only `N` puts 999 before 1000.'
demo_setup: |
  {"tables": [{"TableName":"Books","KeySchema":[{"AttributeName":"isbn","KeyType":"HASH"}],"AttributeDefinitions":[{"AttributeName":"isbn","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
   "items": {"Books": [{"isbn":"978-0-01","title":"Data at Rest"}]}}
---
## Mở bài

Cửa hàng cần đọc "mọi đơn của một khách, theo thời gian" thật nhanh. Trước khi ghi item nào, bạn phải tạo bảng. Bạn khai những gì, khi DynamoDB không có cột?

## Ý chính

`CreateTable` chỉ mô tả **khóa**, không mô tả cột:

- `KeySchema`: thuộc tính nào là partition key (khóa phân vùng, `HASH`), thuộc tính nào là sort key (khóa sắp xếp, `RANGE`).
- `AttributeDefinitions`: kiểu (`S`, `N` hoặc `B`) của **đúng** các thuộc tính dùng làm khóa của bảng hoặc của index. Khai thêm thuộc tính thường ở đây là lỗi `ValidationException`.
- `BillingMode`: `PAY_PER_REQUEST` (on-demand, trả theo request) hoặc `PROVISIONED` (đặt trước RCU/WCU, đơn vị năng lực đọc/ghi mỗi giây). On-demand là chế độ mặc định và được AWS khuyên dùng.

Mẫu truy cập "mọi đơn của một khách, theo thời gian" cho bạn luôn hai khóa: khách là partition key, đơn là sort key. Đặt ngày ở đầu `orderId` để thứ tự sort key cũng là thứ tự thời gian.

## Cú pháp

```text
{"op": "CreateTable", "input": {"TableName": "<table>",
  "KeySchema": [{"AttributeName": "<pk>", "KeyType": "HASH"},
                {"AttributeName": "<sk>", "KeyType": "RANGE"}],
  "AttributeDefinitions": [{"AttributeName": "<pk>", "AttributeType": "S"},
                           {"AttributeName": "<sk>", "AttributeType": "N"}],
  "BillingMode": "PAY_PER_REQUEST"}}
```

- Mỗi thuộc tính trong `KeySchema` có đúng một dòng trong `AttributeDefinitions`, và ngược lại.
- Khóa đơn: bỏ dòng `RANGE`.

## Ví dụ

Bảng `Authors` chỉ cần khóa đơn:

```json
{"op": "CreateTable", "input": {"TableName": "Authors", "KeySchema": [{"AttributeName": "authorId", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "authorId", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

Phản hồi là một `TableDescription`: `KeySchema` có đúng một dòng `HASH`, chế độ tính tiền là `PAY_PER_REQUEST`, và `TableStatus` là `CREATING`. Trên AWS, bạn chờ bảng chuyển sang `ACTIVE` rồi mới đọc ghi.

Bảng `Reviews` cần mọi đánh giá của một cuốn sách, mới nhất trước, nên dùng khóa kép:

```json
{"op": "CreateTable", "input": {"TableName": "Reviews", "KeySchema": [{"AttributeName": "isbn", "KeyType": "HASH"}, {"AttributeName": "reviewedAt", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "isbn", "AttributeType": "S"}, {"AttributeName": "reviewedAt", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

Lần này `KeySchema` có hai dòng, và `AttributeDefinitions` khai đúng hai thuộc tính khóa, cả hai kiểu `S`. Một chuỗi thời gian dạng ISO 8601 sắp theo byte cũng là sắp theo thời gian, nên sort key chuỗi là đủ.

## Lỗi hay gặp

Khai một thuộc tính thường trong `AttributeDefinitions`, như khai cột:

```json
// ERROR ValidationException
{"op": "CreateTable", "input": {"TableName": "Authors", "KeySchema": [{"AttributeName": "authorId", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "authorId", "AttributeType": "S"}, {"AttributeName": "name", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

Thông báo nói số thuộc tính trong `KeySchema` không khớp số thuộc tính trong `AttributeDefinitions`. Bỏ dòng `name`: thuộc tính thường chỉ xuất hiện khi bạn ghi item.

Tạo lại một bảng đã có:

```json
// ERROR ResourceInUseException
{"op": "CreateTable", "input": {"TableName": "Books", "KeySchema": [{"AttributeName": "isbn", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "isbn", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

Tên bảng là duy nhất trong một Region của một tài khoản; khóa chính cũng không đổi được sau khi tạo. Trong lab, `Books` đã có sẵn nên lệnh bị từ chối; muốn đổi khóa, bạn phải tạo bảng mới rồi chép dữ liệu sang.

## Thực hành

Ba bước, mỗi bước tạo một bảng. Bài được chấm bằng `DescribeTable`: khóa, kiểu khóa và index phải khớp. Bước 1 là khóa kép cho "mọi đơn của một khách", bước 2 là khóa đơn cho tra sách theo mã. Bước 3 dễ sai nhất: `ts` là số giây, nên kiểu là `N`. Nếu khai `S`, các giá trị sẽ sắp như chuỗi, và chuỗi `"1000"` đứng trước `"999"`.

## Tóm tắt

- `CreateTable` chỉ khai khóa, không khai cột.
- `HASH` là partition key, `RANGE` là sort key.
- `AttributeDefinitions` chỉ chứa thuộc tính khóa của bảng hoặc index.
- Chọn khóa theo mẫu truy cập; khóa chính không đổi được sau khi tạo.

# EN

## Opening

The shop needs to read "every order of one customer, in time order" fast. Before writing any item you must create the table. What do you declare, when DynamoDB has no columns?

## Key idea

`CreateTable` describes only the **key**, not columns:

- `KeySchema`: which attribute is the partition key (`HASH`) and which is the sort key (`RANGE`).
- `AttributeDefinitions`: the type (`S`, `N` or `B`) of **exactly** the attributes used as keys of the table or of an index. Declaring an ordinary attribute here is a `ValidationException`.
- `BillingMode`: `PAY_PER_REQUEST` (on-demand, pay per request) or `PROVISIONED` (reserve RCU/WCU, read/write capacity units per second, ahead). On-demand is the default and the mode AWS recommends.

The access pattern "every order of one customer, in time order" hands you both keys: the customer is the partition key, the order is the sort key. Put the date at the front of `orderId` so sort key order is also time order.

## Syntax

```text
{"op": "CreateTable", "input": {"TableName": "<table>",
  "KeySchema": [{"AttributeName": "<pk>", "KeyType": "HASH"},
                {"AttributeName": "<sk>", "KeyType": "RANGE"}],
  "AttributeDefinitions": [{"AttributeName": "<pk>", "AttributeType": "S"},
                           {"AttributeName": "<sk>", "AttributeType": "N"}],
  "BillingMode": "PAY_PER_REQUEST"}}
```

- Every attribute in `KeySchema` has exactly one line in `AttributeDefinitions`, and the other way round.
- A simple key: drop the `RANGE` line.

## Example

Table `Authors` needs only a simple key:

```json
{"op": "CreateTable", "input": {"TableName": "Authors", "KeySchema": [{"AttributeName": "authorId", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "authorId", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

The response is a `TableDescription`: `KeySchema` has exactly one `HASH` line, the billing mode is `PAY_PER_REQUEST`, and `TableStatus` is `CREATING`. On AWS you wait until the table turns `ACTIVE` before reading or writing.

Table `Reviews` needs every review of one book, newest first, so it uses a composite key:

```json
{"op": "CreateTable", "input": {"TableName": "Reviews", "KeySchema": [{"AttributeName": "isbn", "KeyType": "HASH"}, {"AttributeName": "reviewedAt", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "isbn", "AttributeType": "S"}, {"AttributeName": "reviewedAt", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

This time `KeySchema` has two lines, and `AttributeDefinitions` declares exactly the two key attributes, both of type `S`. An ISO 8601 time string sorted by bytes is also sorted by time, so a string sort key is enough.

## Common mistakes

Declaring an ordinary attribute in `AttributeDefinitions`, as if it were a column:

```json
// ERROR ValidationException
{"op": "CreateTable", "input": {"TableName": "Authors", "KeySchema": [{"AttributeName": "authorId", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "authorId", "AttributeType": "S"}, {"AttributeName": "name", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

The message says the number of attributes in `KeySchema` does not match the number in `AttributeDefinitions`. Drop the `name` line: ordinary attributes only appear when you write items.

Creating a table that already exists:

```json
// ERROR ResourceInUseException
{"op": "CreateTable", "input": {"TableName": "Books", "KeySchema": [{"AttributeName": "isbn", "KeyType": "HASH"}], "AttributeDefinitions": [{"AttributeName": "isbn", "AttributeType": "S"}], "BillingMode": "PAY_PER_REQUEST"}}
```

A table name is unique within one Region of an account; the primary key cannot change after creation either. In the lab, `Books` already exists so the command is refused; to change a key you create a new table and copy the data over.

## Practice

Three steps, each creates one table. Each step is graded with `DescribeTable`: the keys, key types and indexes must match. Step 1 is a composite key for "every order of one customer", step 2 a simple key for looking books up by code. Step 3 is the easiest to get wrong: `ts` is a number of seconds, so its type is `N`. Declared as `S`, the values would sort as strings, and the string `"1000"` comes before `"999"`.

## Recap

- `CreateTable` declares only the key, not columns.
- `HASH` is the partition key, `RANGE` the sort key.
- `AttributeDefinitions` holds only the key attributes of the table or an index.
- Choose the key from the access pattern; the primary key cannot change after creation.
