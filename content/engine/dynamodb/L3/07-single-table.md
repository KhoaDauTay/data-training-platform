---
id: e-dy-l3-07
engine: dynamodb
level: L3
module: single-table
title: "Thiết kế một bảng: nhiều loại item, một item collection"
title_en: "Single-table design: many item types, one item collection"
kind: concept
runtime: docs
minutes: 10
viz: dy-single-table
objectives:
  - vi: Đặt nhiều loại thực thể vào một bảng bằng khóa chung `PK`/`SK` và tiền tố như `CUST#`, `ORDER#`.
    en: Put several entity types in one table with generic `PK`/`SK` keys and prefixes such as `CUST#`, `ORDER#`.
  - vi: Giải thích vì sao một Query lấy được "khách và các đơn của khách" thay cho JOIN.
    en: Explain why one Query can return "a customer and their orders" in place of a JOIN.
  - vi: Biết khi nào nên tách một thực thể ra bảng riêng.
    en: Know when an entity belongs in a table of its own.
requires: [e-dy-l3-01]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html, title_vi: "Thực hành tốt: thiết kế NoSQL" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html, title_vi: "Thực hành tốt: sort key" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-adjacency-graphs.html, title_vi: "Thực hành tốt: danh sách kề cho quan hệ nhiều-nhiều" }
demo_setup: |
  {"tables": [{"TableName": "Shop", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}, {"AttributeName": "SK", "AttributeType": "S"}]}],
   "items": {"Shop": [
    {"PK": "CUST#C-02", "SK": "PROFILE", "type": "customer", "name": "Binh"},
    {"PK": "CUST#C-02", "SK": "ORDER#2026-08-28#O-503", "type": "order", "total": 355000},
    {"PK": "CUST#C-02", "SK": "ORDER#2026-09-05#O-504", "type": "order", "total": 440000},
    {"PK": "ORDER#O-503", "SK": "PRODUCT#P-01", "type": "line", "qty": 3},
    {"PK": "ORDER#O-503", "SK": "PRODUCT#P-02", "type": "line", "qty": 1},
    {"PK": "ORDER#O-503", "SK": "PRODUCT#P-04", "type": "line", "qty": 2}
  ]}}
quiz:
  - q:
      vi: 'Trong bảng `Shop`, item `{PK: "CUST#C-02", SK: "PROFILE"}` và các item `{PK: "CUST#C-02", SK: "ORDER#…"}` nằm cùng nhau. Query `PK = CUST#C-02` trả về gì?'
      en: 'In table `Shop`, the item `{PK: "CUST#C-02", SK: "PROFILE"}` and the items `{PK: "CUST#C-02", SK: "ORDER#…"}` sit together. What does the Query `PK = CUST#C-02` return?'
    options:
      - vi: Chỉ hồ sơ khách.
        en: Only the customer profile.
      - vi: Hồ sơ và mọi đơn của khách, trong một request, sắp theo `SK`.
        en: The profile and every order of the customer, in one request, sorted by `SK`.
      - vi: Lỗi, vì các item khác loại.
        en: An error, because the items are of different types.
    answer: 1
    why:
      vi: 'Query chỉ đặt điều kiện trên `PK`, không có điều kiện nào trên `SK`, nên không dừng ở hồ sơ: nó trả mọi item có `PK` đó. Các item này là một item collection (mọi item chung một giá trị partition key), và DynamoDB không có schema theo loại item, nên trộn hồ sơ với đơn không gây lỗi. `SK` sắp chúng: "ORDER#…" đứng trước "PROFILE" theo thứ tự byte, nên hai đơn ra trước rồi mới tới hồ sơ.'
      en: 'The Query sets a condition only on `PK`, none on `SK`, so it does not stop at the profile: it returns every item with that `PK`. Those items form one item collection (every item sharing one partition key value), and DynamoDB has no per-type schema, so mixing a profile with orders is no error. `SK` sorts them: "ORDER#..." comes before "PROFILE" in byte order, so the two orders come first, then the profile.'
  - q:
      vi: Vì sao bảng một-bảng thường đặt tên khóa là `PK`, `SK` thay vì `customerId`, `orderId`?
      en: Why does a single table usually name its keys `PK`, `SK` rather than `customerId`, `orderId`?
    options:
      - vi: Vì DynamoDB bắt buộc tên đó.
        en: Because DynamoDB requires those names.
      - vi: Vì mỗi loại item đặt một thứ khác vào khóa (khách, đơn, cửa hàng), nên tên chung mô tả đúng hơn.
        en: Because each item type puts something different in the key (customer, order, store), so a generic name fits better.
      - vi: Vì tên ngắn làm Query nhanh hơn.
        en: Because short names make Queries faster.
    answer: 1
    why:
      vi: 'DynamoDB nhận tên khóa nào cũng được, nên không có tên bắt buộc. Trong bảng `Shop`, cùng thuộc tính `PK` chứa mã khách ở hồ sơ và mã đơn ở dòng hàng; gọi nó là `customerId` sẽ sai với một nửa số item. Tên chung còn cho nhiều loại dùng chung một GSI (GSI overloading: một index phục vụ nhiều loại item). Tên ngắn chỉ làm item nhẹ đi vài byte, không làm Query nhanh hơn: tốc độ phụ thuộc vào khóa, không vào độ dài tên.'
      en: 'DynamoDB accepts any key name, so no name is required. In table `Shop`, the same `PK` attribute holds a customer id on a profile and an order id on an order line; calling it `customerId` would be wrong for half the items. Generic names also let many types share one GSI (GSI overloading: one index serving several item types). Short names only make items a few bytes lighter, not Queries faster: speed depends on the key, not on the name''s length.'
  - q:
      vi: Tiệm muốn lưu thêm nhật ký đăng nhập. Nhật ký chỉ ghi, không bao giờ được đọc cùng khách hay đơn, và cần lớp lưu trữ rẻ (Standard-IA) với lịch backup riêng. Đặt nó ở đâu?
      en: The shop wants to store a login log as well. The log is write-only, never read together with customers or orders, and needs a cheap table class (Standard-IA) and its own backup schedule. Where should it go?
    options:
      - vi: Vào bảng `Shop` - single-table luôn tốt hơn nhiều bảng.
        en: Into table `Shop` - a single table is always better than several tables.
      - vi: Một bảng riêng - nó không được đọc cùng thực thể nào, còn table class và backup đặt theo từng bảng.
        en: A separate table - it is never read with any other entity, and table class and backups are set per table.
      - vi: Vào bảng `Shop`, kèm một GSI riêng cho nhật ký.
        en: Into table `Shop`, with a GSI of its own for the log.
    answer: 1
    trap: 0
    why:
      vi: 'Single-table có lợi chỉ khi các thực thể được đọc cùng nhau trong một Query; nhật ký đăng nhập không bao giờ đọc cùng khách hay đơn, nên đặt vào `Shop` không được gì. Ngược lại, table class (Standard-IA) và lịch backup đặt theo từng bảng: để nhật ký trong `Shop` thì cả bảng phải theo một cài đặt. Thêm GSI riêng cũng không tách được, vì GSI dùng table class và backup của bảng gốc. AWS ghi rõ: ứng dụng không truy vấn nhiều thực thể cùng lúc thì nhiều bảng là đủ.'
      en: 'A single table pays off only when entities are read together in one Query; the login log is never read with customers or orders, so putting it in `Shop` gains nothing. Meanwhile table class (Standard-IA) and the backup schedule are set per table: keeping the log in `Shop` forces one setting on the whole table. A GSI of its own does not separate it either, because a GSI follows the base table''s table class and backups. AWS says it plainly: if the app does not query several entities together, multiple tables are good enough.'
---

## Mở bài

Trang khách hàng cần hồ sơ và mọi đơn của khách. Trong SQL đó là một JOIN; DynamoDB không có JOIN. Vậy dữ liệu phải được đặt sao để một request là đủ?

## Ý chính

DynamoDB không có JOIN, nên thay vì nối lúc đọc, ta đặt sẵn dữ liệu cạnh nhau lúc ghi. Bảng một-bảng (single-table) chứa nhiều loại item, phân biệt bằng tiền tố trong khóa chung `PK`/`SK`: `CUST#C-02` + `PROFILE` là hồ sơ khách, `CUST#C-02` + `ORDER#2026-08-28#O-503` là một đơn của khách đó, `ORDER#O-503` + `PRODUCT#P-04` là một dòng hàng. Mỗi `PK` là một item collection, và một Query trên `CUST#C-02` trả cả hồ sơ lẫn đơn.

Tên khóa chung (`PK`, `SK`) vì mỗi loại item đặt một thứ khác vào khóa; nó cũng cho nhiều loại dùng chung một GSI (GSI overloading). Một thuộc tính `type` giúp code ứng dụng biết item thuộc loại nào; `type` là từ dành riêng nên trong biểu thức phải viết qua `ExpressionAttributeNames`.

Nhiều người nghĩ single-table luôn tốt hơn nhiều bảng. Thật ra lợi ích chỉ có khi các thực thể được đọc cùng nhau trong một Query. Thực thể không bao giờ đọc cùng ai, hoặc cần table class, backup, Streams riêng (các thứ đặt theo bảng), thì để ở bảng riêng. Cái giá của single-table là mẫu truy cập phải biết trước và dữ liệu đôi khi phải nhân bản.

## Cú pháp

```text
PK = <ENTITY>#<id>            SK = <ENTITY>#<sort fields>#<id> | PROFILE
Query  PK = :pk                               -> the whole collection (every type)
Query  PK = :pk AND begins_with(SK, :type)    -> one type inside the collection
"ExpressionAttributeNames": {"#t": "type"}    -> reserved words in expressions
```

- Tiền tố trong khóa cho biết loại item.
- Một item collection = một trang của ứng dụng.
- `type` là thuộc tính thường, không làm khóa.

## Ví dụ

Bảng nhỏ `Shop`, chạy bằng dynoxide. Trang của khách `C-02`:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}}}}
```

Ba item hai loại: hai đơn rồi hồ sơ, vì `ORDER#…` đứng trước `PROFILE` theo byte.

Trang của đơn `O-503`:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "ORDER#O-503"}}}}
```

Ba dòng hàng. Sơ đồ của bài xếp các item thành từng item collection, mỗi màu một loại.

## Lỗi hay gặp

Viết thẳng `type` trong biểu thức:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "FilterExpression": "type = :t", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}, ":t": {"S": "order"}}}}
```

`type` là từ dành riêng. Viết `#t = :t` kèm `"ExpressionAttributeNames": {"#t": "type"}`, hoặc tốt hơn là chọn loại bằng tiền tố sort key (`begins_with(SK, :type)`): bộ lọc chạy sau khi đọc nên vẫn tính capacity cho cả collection, còn điều kiện khóa chỉ đọc đúng loại cần.

Thiết kế theo bảng SQL:

```text
// WRONG: one table per entity, the page needs two requests
Customers  PK = C-02                 -> GetItem
Orders     PK = C-02, SK = O-503     -> Query
// FIX: one collection holds the whole page
Shop       PK = CUST#C-02            -> one Query: PROFILE + ORDER#...
```

Hai bảng nghĩa là hai request, và ứng dụng tự ghép kết quả, đúng việc DynamoDB không làm hộ.

## Tóm tắt

- Single-table đặt sẵn dữ liệu đọc cùng nhau vào cùng item collection.
- Khóa chung `PK`/`SK` với tiền tố phân biệt loại item.
- Một Query trên `PK` thay cho một JOIN.
- Thực thể không đọc cùng ai, hoặc cần cài đặt bảng riêng, thì để bảng riêng.

# EN

## Opening

The customer page needs the profile and every order of the customer. In SQL that is a JOIN; DynamoDB has no JOIN. So how must the data be placed for one request to be enough?

## Key idea

DynamoDB has no JOIN, so instead of joining at read time we place data together at write time. A single table holds many item types, told apart by prefixes in generic `PK`/`SK` keys: `CUST#C-02` + `PROFILE` is the customer profile, `CUST#C-02` + `ORDER#2026-08-28#O-503` is one order of that customer, `ORDER#O-503` + `PRODUCT#P-04` is one order line. Each `PK` is one item collection, and one Query on `CUST#C-02` returns both the profile and the orders.

Generic key names (`PK`, `SK`) because each item type puts something different in the key; they also let many types share one GSI (GSI overloading). A `type` attribute tells application code what kind of item it is reading; `type` is a reserved word, so expressions must name it through `ExpressionAttributeNames`.

Many people think a single table is always better than several. In fact the benefit exists only when entities are read together in one Query. An entity never read with anything else, or needing its own table class, backups or Streams (all set per table), belongs in its own table. The price of a single table is that access patterns must be known up front and some data gets duplicated.

## Syntax

```text
PK = <ENTITY>#<id>            SK = <ENTITY>#<sort fields>#<id> | PROFILE
Query  PK = :pk                               -> the whole collection (every type)
Query  PK = :pk AND begins_with(SK, :type)    -> one type inside the collection
"ExpressionAttributeNames": {"#t": "type"}    -> reserved words in expressions
```

- The prefix in the key tells the item type.
- One item collection = one page of the application.
- `type` is an ordinary attribute, not a key.

## Example

A small table `Shop`, run on dynoxide. The page of customer `C-02`:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}}}}
```

Three items of two types: the two orders, then the profile, because `ORDER#…` comes before `PROFILE` in byte order.

The page of order `O-503`:

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "ExpressionAttributeValues": {":pk": {"S": "ORDER#O-503"}}}}
```

Three order lines. The lesson's diagram lines the items up into item collections, one colour per type.

## Common mistakes

Writing `type` straight into an expression:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "PK = :pk", "FilterExpression": "type = :t", "ExpressionAttributeValues": {":pk": {"S": "CUST#C-02"}, ":t": {"S": "order"}}}}
```

`type` is a reserved word. Write `#t = :t` with `"ExpressionAttributeNames": {"#t": "type"}`, or better, pick the type by sort key prefix (`begins_with(SK, :type)`): a filter runs after the read, so the whole collection is still charged, while a key condition reads only the type you need.

Designing like SQL tables:

```text
// WRONG: one table per entity, the page needs two requests
Customers  PK = C-02                 -> GetItem
Orders     PK = C-02, SK = O-503     -> Query
// FIX: one collection holds the whole page
Shop       PK = CUST#C-02            -> one Query: PROFILE + ORDER#...
```

Two tables mean two requests, and the application joins the results itself, the very job DynamoDB does not do for you.

## Recap

- A single table places data read together in the same item collection.
- Generic `PK`/`SK` keys with prefixes that tell item types apart.
- One Query on `PK` replaces a JOIN.
- An entity never read with others, or needing its own table settings, gets its own table.
