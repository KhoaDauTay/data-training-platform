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
objectives:
  - vi: Đếm item của một item collection bằng `Select` `COUNT` trên `Query`, và biết nó tốn RCU như khi đọc cả item.
    en: Count the items of one item collection with `Select` `COUNT` on a `Query`, and know it costs the same RCU as reading the items.
  - vi: Đọc một tổng tính sẵn bằng một `GetItem` thay vì cộng lại mọi item.
    en: Read a precomputed total with one `GetItem` instead of adding up every item.
  - vi: Giữ tổng tính sẵn khớp với dữ liệu bằng một `ExecuteTransaction`, và biết Streams làm việc này ra sao trên AWS.
    en: Keep a precomputed total in step with the data with one `ExecuteTransaction`, and know how Streams do this on AWS.
requires: [e-dy-l2-05, e-dy-l2-09]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Other.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.multiplestatements.transactions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
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
    why:
      vi: 'Nghe hợp lý là đếm thì rẻ, vì không có item nào trả về. Nhưng DynamoDB vẫn phải đọc từng item để đếm, nên phí tính như đọc cả item: cộng 40 KB, làm tròn lên bội 4 KB được 10, nhân 0,5 cho đọc nhất quán cuối là 5 RCU. `COUNT` chỉ bớt dữ liệu gửi về, không bớt phí đọc.'
      en: 'Counting sounds cheap, since no item comes back. But DynamoDB still reads every item to count it, so it is charged like reading them: 40 KB added up, rounded up to a multiple of 4 KB gives 10, times 0.5 for an eventually consistent read is 5 RCU. `COUNT` only trims the data sent back, not the read charge.'
---

## Ý chính

DynamoDB không có `COUNT(*)` hay `SUM()` chạy trên cả bảng. Có ba cách, giá rất khác nhau:

- **`Select` `COUNT` trên `Query`**: đếm item của một item collection. Không trả item, nhưng **vẫn tốn RCU như đọc cả item**, và vẫn chia trang ở 1 MB.
- **`Scan` để đếm hay cộng**: đọc cả bảng mỗi lần hỏi. Bảng lớn lên thì phí lớn theo. Chỉ dùng cho việc nền.
- **Tổng tính sẵn**: giữ một item như `STATS` có `orderCount`, `revenue`, cập nhật mỗi lần ghi đơn. Đọc nó là một `GetItem` 0,5 RCU, bảng lớn bao nhiêu cũng vậy.

Tổng tính sẵn chỉ đáng tin khi mọi lần ghi đều cập nhật nó. Có hai cách giữ nó khớp:

- Ghi đơn và cập nhật tổng trong **cùng một transaction** (`ExecuteTransaction` ở đây): tất cả hoặc không, giá gấp đôi.
- Để **DynamoDB Streams** gửi mỗi thay đổi cho một hàm (ví dụ Lambda) cộng vào tổng. Ghi đơn không chậm đi, nhưng tổng trễ một chút, và hàm phải chịu được việc một bản ghi tới hai lần (bài L5/01). Streams cần AWS thật, bộ máy trong trình duyệt chưa chạy.

## Ví dụ

So ba cách hỏi "cửa hàng `s2` có bao nhiêu đơn" trên bảng `Shop` (31 item):

```text
Scan + FilterExpression + COUNT   ScannedCount 31
Query + Select COUNT              ScannedCount 12
GetItem STATS                     1 item
```

Bảng "Partition / Chi phí" dưới mỗi lần chạy cho số đo thật của từng cách.

## Thực hành

Bước 1 và 2 có thanh chi phí: `Scan` cho đúng con số nhưng đọc cả bảng nên chưa đạt. Bước 3 ghi đơn và tổng trong một transaction; mở bảng chi phí để thấy giá gấp đôi.

# EN

## Key idea

DynamoDB has no `COUNT(*)` or `SUM()` that runs over a whole table. There are three ways, at very different prices:

- **`Select` `COUNT` on a `Query`**: counts the items of one item collection. No items come back, but it **still costs RCU like reading the items**, and still pages at 1 MB.
- **A `Scan` to count or sum**: reads the whole table every time you ask. The bigger the table, the bigger the bill. Keep it for background jobs.
- **A precomputed total**: keep an item such as `STATS` with `orderCount` and `revenue`, updated on every order write. Reading it is one `GetItem` of 0.5 RCU, however big the table gets.

A precomputed total can be trusted only when every write updates it. Two ways keep it in step:

- Write the order and update the total in **one transaction** (`ExecuteTransaction` here): all or nothing, at double price.
- Let **DynamoDB Streams** send each change to a function (for example Lambda) that adds it to the total. Order writes do not slow down, but the total lags a little, and the function must cope with one record arriving twice (lesson L5/01). Streams need real AWS; the in-browser engine does not run them yet.

## Example

Three ways to ask "how many orders does store `s2` have" on the `Shop` table (31 items):

```text
Scan + FilterExpression + COUNT   ScannedCount 31
Query + Select COUNT              ScannedCount 12
GetItem STATS                     1 item
```

The "Partition / Cost" panel under every run gives the real measured numbers for each way.

## Practice

Steps 1 and 2 have a cost bar: a `Scan` gives the right number but reads the whole table, so it does not pass. Step 3 writes the order and the total in one transaction; open the cost panel to see the double price.
