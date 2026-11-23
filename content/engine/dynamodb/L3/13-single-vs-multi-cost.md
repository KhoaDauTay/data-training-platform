---
id: e-dy-l3-13
engine: dynamodb
level: L3
module: single-table
title: "Một bảng hay hai bảng: đếm RCU"
title_en: "One table or two: count the RCU"
kind: predict
runtime: browser
minutes: 14
objectives:
  - vi: So RCU của "khách và các đơn của khách" khi đọc từ một bảng và từ hai bảng, bằng `ConsumedCapacity`.
    en: Compare the RCU of "a customer and their orders" read from one table and from two tables, using `ConsumedCapacity`.
  - vi: Tính RCU cho đọc nhất quán cuối (eventually consistent) và nhất quán mạnh (strongly consistent), theo luật làm tròn 4 KB.
    en: Work out RCU for eventually consistent and strongly consistent reads, with the 4 KB rounding rule.
  - vi: Biết khi nào nhiều bảng là lựa chọn đúng.
    en: Know when several tables are the right choice.
requires: [e-dy-l3-07, e-dy-l2-09]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/data-modeling-foundations.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
predict:
  sql: |
    {"op": "Query", "input": {"TableName": "Shop",
      "KeyConditionExpression": "PK = :p",
      "ExpressionAttributeValues": {":p": {"S": "CUST#C-02"}},
      "ReturnConsumedCapacity": "TOTAL"}}
  q:
    vi: 'Trong bảng `Shop`, khách `C-02` có 1 item hồ sơ và 3 item đơn, mỗi item dưới 200 byte. Query này (đọc nhất quán cuối) tốn bao nhiêu RCU?'
    en: 'In table `Shop`, customer `C-02` has 1 profile item and 3 order items, each under 200 bytes. How many RCU does this Query (eventually consistent) consume?'
  options:
    - vi: "0,5"
      en: "0.5"
    - vi: "1"
      en: "1"
    - vi: "2"
      en: "2"
  answer: 0
  trap: 2
  why:
    vi: 'Query cộng cỡ mọi item đã đọc rồi làm tròn một lần: 4 item nhỏ, tổng dưới 4 KB, thành 4 KB, tức 1 RCU mạnh, 0,5 RCU cuối. Chọn 2 là tính 0,5 cho từng item, như đọc 4 lần `GetItem`. Đây đúng là ví dụ của AWS: "A single query for two items totalling less than 4KB is 0.5 RCU".'
    en: 'A Query adds up the size of every item read and rounds once: 4 small items, under 4 KB in total, become 4 KB, which is 1 RCU strong, 0.5 RCU eventual. Picking 2 means paying 0.5 per item, as 4 separate `GetItem` calls would. This is the AWS example: "A single query for two items totalling less than 4KB is 0.5 RCU".'
quiz:
  - q:
      vi: 'Hồ sơ của `C-02` phình lên 5 KB (thêm ghi chú), 3 đơn vẫn nhỏ (tổng 0,5 KB). Đọc nhất quán cuối. Một Query trên `Shop` so với `GetItem` `Customers` + Query `Orders` tốn bao nhiêu?'
      en: 'The profile of `C-02` grows to 5 KB (notes added), the 3 orders stay small (0.5 KB in total). Eventually consistent. What does one Query on `Shop` cost, compared with `GetItem` on `Customers` + a Query on `Orders`?'
    options:
      - vi: 1 RCU so với 1,5 RCU
        en: 1 RCU versus 1.5 RCU
      - vi: 1 RCU so với 1 RCU
        en: 1 RCU versus 1 RCU
      - vi: 0,5 RCU so với 1 RCU
        en: 0.5 RCU versus 1 RCU
    answer: 0
    why:
      vi: 'Một bảng: 5 + 0,5 = 5,5 KB, làm tròn lên 8 KB = 2 RCU mạnh, 1 RCU cuối. Hai bảng: `GetItem` 5 KB làm tròn lên 8 KB = 1 RCU cuối, cộng Query 0,5 KB = 0,5 RCU cuối, tổng 1,5. Một bảng vẫn rẻ hơn, nhưng khoảng cách tùy cỡ item, không cố định là "một nửa".'
      en: 'One table: 5 + 0.5 = 5.5 KB, rounded up to 8 KB = 2 RCU strong, 1 RCU eventual. Two tables: the 5 KB `GetItem` rounds up to 8 KB = 1 RCU eventual, plus the 0.5 KB Query = 0.5 RCU eventual, 1.5 in total. One table is still cheaper, but the gap depends on item size; it is not always "half".'
  - q:
      vi: 'Bạn cần lưu thêm nhật ký đăng nhập: ghi rất nhiều, không bao giờ đọc cùng đơn hàng, và cần sao lưu theo lịch riêng. Đặt ở đâu?'
      en: 'You also need to store login logs: written a lot, never read together with orders, and backed up on their own schedule. Where do they go?'
    options:
      - vi: Vào `Shop`, với tiền tố `LOGIN#`, vì single-table luôn rẻ hơn
        en: Into `Shop`, with a `LOGIN#` prefix, because single-table is always cheaper
      - vi: Một bảng riêng
        en: A table of their own
    answer: 1
    why:
      vi: 'Single-table rẻ hơn **chỉ khi** các item được đọc cùng nhau trong một Query. Nhật ký không bao giờ đọc cùng đơn nên không được lợi gì, lại mất cách quản lý riêng: AWS ghi "Backups are all or nothing" cho một bảng, và lớp lưu trữ Standard-IA áp cho cả bảng. Khi ứng dụng không truy vấn nhiều loại thực thể cùng lúc, AWS viết "multiple table design is a good and sufficient approach".'
      en: 'Single-table is cheaper **only when** the items are read together in one Query. The logs are never read with orders, so they gain nothing and lose separate management: AWS writes "Backups are all or nothing" for one table, and the Standard-IA table class applies to the whole table. When an app does not query several entity types together, AWS writes "multiple table design is a good and sufficient approach".'
lab:
  setup: |
    {"tables": [
      {"TableName":"Shop","KeySchema":[{"AttributeName":"PK","KeyType":"HASH"},{"AttributeName":"SK","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"PK","AttributeType":"S"},{"AttributeName":"SK","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"},
      {"TableName":"Customers","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"}],"AttributeDefinitions":[{"AttributeName":"customerId","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"},
      {"TableName":"Orders","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"customerId","AttributeType":"S"},{"AttributeName":"orderId","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
     "items": {
      "Shop": [
       {"PK":"CUST#C-01","SK":"PROFILE","name":"An","city":"Da Nang"},
       {"PK":"CUST#C-01","SK":"ORDER#2026-09-12#O-301","total":250000,"status":"DELIVERED"},
       {"PK":"CUST#C-02","SK":"PROFILE","name":"Binh","city":"Hue"},
       {"PK":"CUST#C-02","SK":"ORDER#2026-08-03#O-302","total":410000,"status":"DELIVERED"},
       {"PK":"CUST#C-02","SK":"ORDER#2026-09-21#O-303","total":95000,"status":"SHIPPED"},
       {"PK":"CUST#C-02","SK":"ORDER#2026-10-17#O-304","total":620000,"status":"NEW"}
      ],
      "Customers": [
       {"customerId":"C-01","name":"An","city":"Da Nang"},
       {"customerId":"C-02","name":"Binh","city":"Hue"}
      ],
      "Orders": [
       {"customerId":"C-01","orderId":"2026-09-12#O-301","total":250000,"status":"DELIVERED"},
       {"customerId":"C-02","orderId":"2026-08-03#O-302","total":410000,"status":"DELIVERED"},
       {"customerId":"C-02","orderId":"2026-09-21#O-303","total":95000,"status":"SHIPPED"},
       {"customerId":"C-02","orderId":"2026-10-17#O-304","total":620000,"status":"NEW"}
      ]}}
  steps:
    - task:
        vi: 'Màn hình "khách và đơn" đọc từ bảng `Shop`. Chạy request ở câu đoán và đọc `ConsumedCapacity`.'
        en: 'The "customer and orders" screen reads from table `Shop`. Run the request from the prediction and read `ConsumedCapacity`.'
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :p",
          "ExpressionAttributeValues": {":p": {"S": "CUST#C-02"}},
          "ReturnConsumedCapacity": "TOTAL"}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":p":{"S":"CUST#C-02"}},"FilterExpression":"(PK = :p)"}}
      ordered: true
      expect: { Count: 4 }
      hint:
        vi: 'Một Query trên `PK = CUST#C-02` trả cả hồ sơ lẫn 3 đơn.'
        en: 'One Query on `PK = CUST#C-02` returns the profile and the 3 orders.'
    - task:
        vi: 'Cùng màn hình đó, thiết kế hai bảng, phần 1: lấy hồ sơ của `C-02` từ bảng `Customers`. Giữ `"ReturnConsumedCapacity": "TOTAL"`.'
        en: 'Same screen, two-table design, part 1: get the profile of `C-02` from table `Customers`. Keep `"ReturnConsumedCapacity": "TOTAL"`.'
      solution: |
        {"op": "GetItem", "input": {"TableName": "Customers",
          "Key": {"customerId": {"S": "C-02"}},
          "ReturnConsumedCapacity": "TOTAL"}}
      check: doc
      perf: { table: Customers }
      slow: |
        {"op":"Scan","input":{"TableName":"Customers","FilterExpression":"#k0 = :k0","ExpressionAttributeNames":{"#k0":"customerId"},"ExpressionAttributeValues":{":k0":{"S":"C-02"}}}}
      hint:
        vi: '`GetItem` theo `customerId`. Một item nhỏ, đọc nhất quán cuối: 0,5 RCU.'
        en: '`GetItem` by `customerId`. One small item, eventually consistent: 0.5 RCU.'
    - task:
        vi: 'Phần 2: lấy mọi đơn của `C-02` từ bảng `Orders`, đơn cũ trước. Cộng RCU của bước 2 và bước 3, rồi so với bước 1.'
        en: 'Part 2: get every order of `C-02` from table `Orders`, oldest first. Add the RCU of steps 2 and 3, then compare with step 1.'
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-02"}},
          "ReturnConsumedCapacity": "TOTAL"}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeValues":{":c":{"S":"C-02"}},"FilterExpression":"(customerId = :c)"}}
      ordered: true
      expect: { Count: 3 }
      hint:
        vi: 'Query `customerId = :c`. Hai bảng: 0,5 + 0,5 = 1 RCU, gấp đôi một Query trên `Shop`.'
        en: 'Query `customerId = :c`. Two tables: 0.5 + 0.5 = 1 RCU, twice one Query on `Shop`.'
    - task:
        vi: 'Màn hình thanh toán cần bản mới nhất. Đọc lại khách và đơn của `C-02` từ `Shop` bằng đọc nhất quán mạnh, và xem RCU tăng thế nào.'
        en: 'The checkout screen needs the latest version. Read the customer and orders of `C-02` from `Shop` again with a strongly consistent read, and see how the RCU changes.'
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :p",
          "ExpressionAttributeValues": {":p": {"S": "CUST#C-02"}},
          "ConsistentRead": true,
          "ReturnConsumedCapacity": "TOTAL"}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":p":{"S":"CUST#C-02"}},"ConsistentRead":true,"FilterExpression":"(PK = :p)"}}
      ordered: true
      expect: { Count: 4 }
      hint:
        vi: 'Thêm `"ConsistentRead": true`. Cùng 4 KB đã làm tròn, đọc mạnh tốn 1 RCU thay vì 0,5.'
        en: 'Add `"ConsistentRead": true`. The same rounded 4 KB costs 1 RCU for a strong read instead of 0.5.'
---

## Mở bài

Màn hình "khách và đơn" mở hàng nghìn lần mỗi giờ. Một bảng `Shop` hay hai bảng `Customers` và `Orders`: hóa đơn đọc chênh nhau bao nhiêu, và khi nào nên tách bảng?

## Ý chính

Nhiều người nghĩ single-table design luôn tốt hơn nhiều bảng. Thật ra nó rẻ hơn ở **một** chỗ: các item hay đọc cùng nhau nằm chung một item collection, nên một Query lấy hết, và RCU được tính trên tổng cỡ rồi làm tròn **một lần**.

Đếm cho màn hình "khách và đơn" của `C-02` (đọc nhất quán cuối):

- một bảng `Shop`: 1 Query, 4 item nhỏ → 0,5 RCU;
- hai bảng: `GetItem` `Customers` (0,5) + Query `Orders` (0,5) → 1 RCU.

Đọc nhất quán mạnh thì mọi số nhân đôi. Item lớn thì làm tròn lên bội 4 KB, nên khoảng cách giữa hai cách đổi theo cỡ item.

Single-table cũng có giá. AWS liệt kê: sao lưu cả bảng hoặc không gì ("Backups are all or nothing"), một lớp lưu trữ cho cả bảng, khó học. Dữ liệu không bao giờ đọc chung thì để bảng riêng.

## Ví dụ

```text
Shop      Query PK = CUST#C-02         -> Count 4, 0.5 RCU
Customers GetItem C-02                 -> 0.5 RCU
Orders    Query customerId = C-02      -> Count 3, 0.5 RCU
Shop      Query, ConsistentRead true   -> 1 RCU
```

## Thực hành

Các số RCU ở đây do dynoxide trả trong `ConsumedCapacity`, và khớp luật tính của AWS cho các lần đọc thành công. Bước nào cũng chấm theo item trả về; số RCU là để bạn đọc và so. Mọi item ở đây đều nhỏ, nên phần làm tròn 4 KB với item lớn chỉ có trong câu hỏi cuối bài.

## Tóm tắt

- Query tính RCU trên tổng cỡ item đã đọc, làm tròn một lần lên bội 4 KB.
- Single-table rẻ hơn khi các item được đọc cùng nhau trong một Query.
- Đọc mạnh tốn gấp đôi đọc nhất quán cuối.
- Dữ liệu không bao giờ đọc chung, hoặc cần backup hay lớp lưu trữ riêng, thì để bảng riêng.

# EN

## Opening

The "customer and orders" screen opens thousands of times an hour. One table `Shop` or two tables `Customers` and `Orders`: how far apart are the read bills, and when should you split?

## Key idea

Many people think single-table design always beats several tables. In fact it is cheaper in **one** place: items that are read together share one item collection, so one Query gets them all, and RCU is charged on the total size, rounded **once**.

Counting for the "customer and orders" screen of `C-02` (eventually consistent):

- one table `Shop`: 1 Query, 4 small items → 0.5 RCU;
- two tables: `GetItem` on `Customers` (0.5) + Query on `Orders` (0.5) → 1 RCU.

With strongly consistent reads every number doubles. Large items round up to a multiple of 4 KB, so the gap between the two designs changes with item size.

Single-table has a price too. AWS lists: backups cover the whole table or nothing ("Backups are all or nothing"), one table class for the whole table, a steep learning curve. Data that is never read together belongs in its own table.

## Example

```text
Shop      Query PK = CUST#C-02         -> Count 4, 0.5 RCU
Customers GetItem C-02                 -> 0.5 RCU
Orders    Query customerId = C-02      -> Count 3, 0.5 RCU
Shop      Query, ConsistentRead true   -> 1 RCU
```

## Practice

The RCU numbers here are what dynoxide returns in `ConsumedCapacity`, and they match the AWS rules for successful reads. Every step is graded on the items returned; the RCU numbers are for you to read and compare. Every item here is small, so 4 KB rounding with large items is only in the questions at the end.

## Recap

- A Query charges RCU on the total size of the items read, rounded once up to a multiple of 4 KB.
- A single table is cheaper when items are read together in one Query.
- A strong read costs twice an eventually consistent one.
- Data never read together, or needing its own backups or table class, gets its own table.
