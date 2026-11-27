---
id: e-dy-l2-14
engine: dynamodb
level: L2
module: partiql-cost
title: "Đếm và cộng mà không Scan"
title_en: "Counting and summing without a Scan"
kind: lab
runtime: browser
minutes: 14
figures: [{ name: dy-count-three-ways, at: idea }]
objectives:
  - vi: Đếm item của một item collection bằng `Select` `COUNT` trên `Query`, và biết nó tốn RCU như khi đọc cả item.
    en: Count the items of one item collection with `Select` `COUNT` on a `Query`, and know it costs the same RCU as reading the items.
  - vi: Đọc một tổng tính sẵn bằng một `GetItem` thay vì cộng lại mọi item.
    en: Read a precomputed total with one `GetItem` instead of adding up every item.
  - vi: Giữ tổng tính sẵn khớp với dữ liệu bằng một `ExecuteTransaction`, và biết Streams làm việc này ra sao trên AWS.
    en: Keep a precomputed total in step with the data with one `ExecuteTransaction`, and know how Streams do this on AWS.
requires: [e-dy-l2-05, e-dy-l2-07, e-dy-l2-09]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Other.html, title_vi: "Query: các tùy chọn khác" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html, title_vi: "Thao tác đọc và ghi" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.transactions.html, title_vi: "PartiQL: transaction nhiều câu lệnh" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html, title_vi: "DynamoDB Streams" }
lab:
  setup: |
    {"tables": [{"TableName":"Shop","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
     "items": {"Shop": [
      {"pk":"STORE#s1","sk":"ORDER#2026-10-01#0001","total":305000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"ORDER#2026-10-03#0002","total":260000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"ORDER#2026-10-05#0003","total":215000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"ORDER#2026-10-07#0004","total":170000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"ORDER#2026-10-09#0005","total":125000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"ORDER#2026-10-11#0006","total":80000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"ORDER#2026-10-13#0007","total":335000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"ORDER#2026-10-15#0008","total":290000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"ORDER#2026-10-17#0009","total":245000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-01#0010","total":200000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-03#0011","total":155000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-05#0012","total":110000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-07#0013","total":65000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-09#0014","total":320000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-11#0015","total":275000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-13#0016","total":230000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-15#0017","total":185000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-17#0018","total":140000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-19#0019","total":95000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-21#0020","total":50000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s2","sk":"ORDER#2026-10-23#0021","total":305000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s3","sk":"ORDER#2026-10-01#0022","total":260000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s3","sk":"ORDER#2026-10-03#0023","total":215000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s3","sk":"ORDER#2026-10-05#0024","total":170000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s3","sk":"ORDER#2026-10-07#0025","total":125000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s3","sk":"ORDER#2026-10-09#0026","total":80000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s3","sk":"ORDER#2026-10-11#0027","total":335000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s3","sk":"ORDER#2026-10-13#0028","total":290000,"note":"Giao trong gio hanh chinh, goi truoc khi den. Hang de vo, xin nhe tay."},
      {"pk":"STORE#s1","sk":"STATS","orderCount":9,"revenue":2025000},
      {"pk":"STORE#s2","sk":"STATS","orderCount":12,"revenue":2130000},
      {"pk":"STORE#s3","sk":"STATS","orderCount":7,"revenue":1475000}
    ]}}
  steps:
    - task:
        vi: Cửa hàng `STORE#s2` có bao nhiêu đơn? Chỉ cần con số, không cần các item.
        en: How many orders does store `STORE#s2` have? You need the number only, not the items.
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)",
          "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":o": {"S": "ORDER#"}},
          "Select": "COUNT"}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":o": {"S": "ORDER#"}}, "Select": "COUNT"}}
      expect: { Count: 12 }
      hint:
        vi: '`Query` theo partition key, `begins_with` trên sort key để bỏ item `STATS`, và `"Select": "COUNT"`.'
        en: '`Query` on the partition key, `begins_with` on the sort key to leave out the `STATS` item, and `"Select": "COUNT"`.'
    - task:
        vi: Doanh thu và số đơn của `STORE#s2` đã được tính sẵn trong item có sort key `STATS`. Đọc chúng bằng request rẻ nhất.
        en: The revenue and order count of `STORE#s2` are already computed in the item whose sort key is `STATS`. Read them with the cheapest request.
      solution: |
        {"op": "GetItem", "input": {"TableName": "Shop", "Key": {"pk": {"S": "STORE#s2"}, "sk": {"S": "STATS"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "pk = :p AND sk = :s", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":s": {"S": "STATS"}}}}
      hint:
        vi: Biết đủ cả hai phần của khóa thì dùng `GetItem`.
        en: When you know both parts of the key, use `GetItem`.
    - task:
        vi: 'Ghi đơn mới `ORDER#2026-10-30#0029` của `STORE#s2`, tổng 250000, và cùng lúc tăng `orderCount` thêm 1, `revenue` thêm 250000 trong item `STATS`. Hai việc phải cùng thành công hoặc cùng không.'
        en: 'Write the new order `ORDER#2026-10-30#0029` of `STORE#s2` with a total of 250000, and at the same time add 1 to `orderCount` and 250000 to `revenue` in the `STATS` item. Both must succeed together or not at all.'
      solution: |
        {"op": "ExecuteTransaction", "input": {"TransactStatements": [
          {"Statement": "INSERT INTO \"Shop\" VALUE {'pk': 'STORE#s2', 'sk': 'ORDER#2026-10-30#0029', 'total': 250000}"},
          {"Statement": "UPDATE \"Shop\" SET orderCount = orderCount + 1 SET revenue = revenue + 250000 WHERE pk = 'STORE#s2' AND sk = 'STATS'"}]}}
      check: doc
      hint:
        vi: 'Một `ExecuteTransaction` với hai câu: `INSERT INTO "Shop" VALUE {…}` và `UPDATE "Shop" SET … WHERE pk = … AND sk = …`.'
        en: 'One `ExecuteTransaction` with two statements: `INSERT INTO "Shop" VALUE {…}` and `UPDATE "Shop" SET … WHERE pk = … AND sk = …`.'
quiz:
  - q:
      vi: '`Query` một item collection có 40 item, mỗi item 1 KB, đọc nhất quán cuối. Thêm `"Select": "COUNT"` thì tốn bao nhiêu RCU?'
      en: 'A `Query` reads an item collection of 40 items of 1 KB each, eventually consistent. With `"Select": "COUNT"` added, how many RCU does it use?'
    options:
      - { vi: "Gần 0: chỉ trả về một con số", en: "Close to 0: it returns only a number" }
      - { vi: "5 RCU: 40 KB làm tròn lên 4 KB là 10 đơn vị, nhân 0,5 như khi đọc cả item", en: "5 RCU: 40 KB rounded up to 4 KB is 10 units, times 0.5, the same as reading the items" }
      - { vi: "40 RCU: mỗi item một RCU", en: "40 RCU: one RCU per item" }
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý là đếm thì rẻ, vì không có item nào trả về. Nhưng DynamoDB vẫn phải đọc từng item để đếm, nên phí tính như đọc cả item: cộng 40 × 1 KB = 40 KB, chia 4 KB được 10 khối, nhân 0,5 cho đọc nhất quán cuối là 5 RCU (read capacity unit, đơn vị đọc). `COUNT` chỉ bớt dữ liệu gửi về, không bớt phí đọc. Chọn 40 là tính mỗi item một RCU riêng như `GetItem`, trong khi Query cộng cỡ mọi item rồi mới làm tròn theo khối 4 KB.'
      en: 'Counting sounds cheap, since no item comes back. But DynamoDB still reads every item to count it, so it is charged like reading them: 40 × 1 KB = 40 KB, divided by 4 KB gives 10 blocks, times 0.5 for an eventually consistent read is 5 RCU (read capacity unit). `COUNT` only trims the data sent back, not the read charge. Picking 40 charges each item one RCU of its own as `GetItem` would, while a Query adds up all item sizes and then rounds to 4 KB blocks.'
  - q:
      vi: '`Query` với `"KeyConditionExpression": "pk = :p"` và `"Select": "COUNT"` trên `STORE#s2` trả `Count` bao nhiêu?'
      en: 'What `Count` does a `Query` with `"KeyConditionExpression": "pk = :p"` and `"Select": "COUNT"` on `STORE#s2` return?'
    options:
      - { vi: "12, số đơn của cửa hàng", en: "12, the store's order count" }
      - { vi: "13: 12 đơn cộng item `STATS`", en: "13: 12 orders plus the `STATS` item" }
      - { vi: "31, cả bảng", en: "31, the whole table" }
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì cửa hàng có 12 đơn, nhưng item collection `STORE#s2` còn chứa item `STATS`, nên 12 + 1 = 13. Không phải 31, vì `pk = :p` chỉ đọc item collection của `STORE#s2`, không đọc hai cửa hàng kia. Muốn chỉ đếm đơn thì thêm `begins_with(sk, :o)` vào điều kiện khóa.'
      en: 'It sounds right because the store has 12 orders, but the item collection `STORE#s2` also holds the `STATS` item, so 12 + 1 = 13. Not 31, because `pk = :p` reads only the item collection of `STORE#s2`, not the other two stores. To count orders only, add `begins_with(sk, :o)` to the key condition.'
---

## Mở bài

Trang quản lý cần số đơn và doanh thu của mỗi cửa hàng, mỗi lần mở trang. Trong SQL đó là một `COUNT(*)` và một `SUM()`; DynamoDB không có hai thứ đó.

## Ý chính

DynamoDB không có `COUNT(*)` hay `SUM()` chạy trên cả bảng. Có ba cách, giá rất khác nhau:

- **Đếm trên một Query** (`Select` `COUNT` trên `Query`): đếm item của một item collection. Không trả item, nhưng **vẫn tốn RCU như đọc cả item**, và vẫn chia trang ở 1 MB.
- **Quét để đếm hay cộng** (`Scan`): đọc cả bảng mỗi lần hỏi. Bảng lớn lên thì phí lớn theo. Chỉ dùng cho việc nền.
- **Tổng tính sẵn**: giữ một item như `STATS` có `orderCount`, `revenue`, cập nhật mỗi lần ghi đơn. Đọc nó là một `GetItem` 0,5 RCU, bảng lớn bao nhiêu cũng vậy.

Tổng tính sẵn chỉ đáng tin khi mọi lần ghi đều cập nhật nó. Có hai cách giữ nó khớp:

- Ghi đơn và cập nhật tổng trong **cùng một transaction** (`ExecuteTransaction` ở đây): tất cả hoặc không, giá gấp đôi.
- Để **DynamoDB Streams** gửi mỗi thay đổi cho một hàm (ví dụ Lambda) cộng vào tổng. Ghi đơn không chậm đi, nhưng tổng trễ một chút, và hàm phải chịu được việc một bản ghi tới hai lần (bài L5/01). Streams cần AWS thật, bộ máy trong trình duyệt chưa chạy.

Hình từng bước ở cuối mục này so số item mỗi cách phải đọc để đếm đơn của `STORE#s2`.

## Cú pháp

```text
{"op": "Query", "input": {"TableName": "<t>", "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)", "Select": "COUNT", ...}}
{"op": "GetItem", "input": {"TableName": "<t>", "Key": {"pk": ..., "sk": {"S": "STATS"}}}}
```

- `Select` `COUNT`: chỉ trả `Count` và `ScannedCount`, không trả item.
- `begins_with` trên sort key tách đơn khỏi item tổng.

## Ví dụ

Tổng tính sẵn của `STORE#s1`, một `GetItem`:

```json
{"op": "GetItem", "input": {"TableName": "Shop", "Key": {"pk": {"S": "STORE#s1"}, "sk": {"S": "STATS"}}}}
```

Các đơn của `STORE#s3`, chỉ lấy `sk` và `total` (`total` là từ dành riêng nên cần `#t`):

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s3"}, ":o": {"S": "ORDER#"}}, "ProjectionExpression": "sk, #t", "ExpressionAttributeNames": {"#t": "total"}}}
```

So ba cách hỏi "cửa hàng `s2` có bao nhiêu đơn" trên bảng `Shop` (31 item):

```text
Scan + FilterExpression + COUNT   ScannedCount 31
Query + Select COUNT              ScannedCount 12
GetItem STATS                     1 item
```

Bảng "Partition / Chi phí" dưới mỗi lần chạy cho số đo thật của từng cách.

## Lỗi hay gặp

Đếm bằng `Scan`:

```json
// WRONG: right number, but ScannedCount is the whole table
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":o": {"S": "ORDER#"}}, "Select": "COUNT"}}
```

```json
// FIX: Query reads only the store's item collection
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":o": {"S": "ORDER#"}}, "Select": "COUNT"}}
```

Quên rằng item tổng nằm cùng item collection:

```json
// WRONG: Count 13, the STATS item is counted too
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}}, "Select": "COUNT"}}
```

```json
// FIX: Count 12, orders only
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":o": {"S": "ORDER#"}}, "Select": "COUNT"}}
```

## Thực hành

Bước 1 và 2 có thanh chi phí: `Scan` cho đúng con số nhưng đọc cả bảng nên chưa đạt. Bước 3 ghi đơn và tổng trong một transaction; mở bảng chi phí để thấy giá gấp đôi.

## Tóm tắt

- `Select` `COUNT` trên `Query` không trả item nhưng tốn RCU như đọc cả item.
- `Scan` để đếm hay cộng đọc cả bảng mỗi lần.
- Tổng tính sẵn là một `GetItem` rẻ, bảng lớn bao nhiêu cũng vậy.
- Giữ tổng khớp bằng transaction hoặc bằng Streams.

# EN

## Opening

The manager page needs each store's order count and revenue every time it opens. In SQL that is one `COUNT(*)` and one `SUM()`; DynamoDB has neither.

## Key idea

DynamoDB has no `COUNT(*)` or `SUM()` that runs over a whole table. There are three ways, at very different prices:

- **Counting on a Query** (`Select` `COUNT` on a `Query`): counts the items of one item collection. No items come back, but it **still costs RCU like reading the items**, and still pages at 1 MB.
- **A scan to count or sum** (`Scan`): reads the whole table every time you ask. The bigger the table, the bigger the bill. Keep it for background jobs.
- **A precomputed total**: keep an item such as `STATS` with `orderCount` and `revenue`, updated on every order write. Reading it is one `GetItem` of 0.5 RCU, however big the table gets.

A precomputed total can be trusted only when every write updates it. Two ways keep it in step:

- Write the order and update the total in **one transaction** (`ExecuteTransaction` here): all or nothing, at double price.
- Let **DynamoDB Streams** send each change to a function (for example Lambda) that adds it to the total. Order writes do not slow down, but the total lags a little, and the function must cope with one record arriving twice (lesson L5/01). Streams need real AWS; the in-browser engine does not run them yet.

The step-through figure at the end of this section compares how many items each way must read to count the orders of `STORE#s2`.

## Syntax

```text
{"op": "Query", "input": {"TableName": "<t>", "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)", "Select": "COUNT", ...}}
{"op": "GetItem", "input": {"TableName": "<t>", "Key": {"pk": ..., "sk": {"S": "STATS"}}}}
```

- `Select` `COUNT`: returns only `Count` and `ScannedCount`, no items.
- `begins_with` on the sort key separates the orders from the total item.

## Example

The precomputed total of `STORE#s1`, one `GetItem`:

```json
{"op": "GetItem", "input": {"TableName": "Shop", "Key": {"pk": {"S": "STORE#s1"}, "sk": {"S": "STATS"}}}}
```

The orders of `STORE#s3`, returning only `sk` and `total` (`total` is a reserved word, so it needs `#t`):

```json
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s3"}, ":o": {"S": "ORDER#"}}, "ProjectionExpression": "sk, #t", "ExpressionAttributeNames": {"#t": "total"}}}
```

Three ways to ask "how many orders does store `s2` have" on the `Shop` table (31 items):

```text
Scan + FilterExpression + COUNT   ScannedCount 31
Query + Select COUNT              ScannedCount 12
GetItem STATS                     1 item
```

The "Partition / Cost" panel under every run gives the real measured numbers for each way.

## Common mistakes

Counting with a `Scan`:

```json
// WRONG: right number, but ScannedCount is the whole table
{"op": "Scan", "input": {"TableName": "Shop", "FilterExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":o": {"S": "ORDER#"}}, "Select": "COUNT"}}
```

```json
// FIX: Query reads only the store's item collection
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":o": {"S": "ORDER#"}}, "Select": "COUNT"}}
```

Forgetting that the total item sits in the same item collection:

```json
// WRONG: Count 13, the STATS item is counted too
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}}, "Select": "COUNT"}}
```

```json
// FIX: Count 12, orders only
{"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p AND begins_with(sk, :o)", "ExpressionAttributeValues": {":p": {"S": "STORE#s2"}, ":o": {"S": "ORDER#"}}, "Select": "COUNT"}}
```

## Practice

Steps 1 and 2 have a cost bar: a `Scan` gives the right number but reads the whole table, so it does not pass. Step 3 writes the order and the total in one transaction; open the cost panel to see the double price.

## Recap

- `Select` `COUNT` on a `Query` returns no items but costs the same RCU as reading them.
- A `Scan` to count or sum reads the whole table every time.
- A precomputed total is one cheap `GetItem`, however big the table.
- Keep the total in step with a transaction or with Streams.
