---
id: e-dy-l5-07
engine: dynamodb
level: L5
module: ops-case
title: "Kiểm tra cấp L5: vận hành ứng dụng giao đồ ăn"
title_en: "Level L5 check: running a food delivery app"
kind: capstone
runtime: browser
minutes: 25
objectives:
  - { vi: "Đọc đúng dữ liệu còn hiệu lực khi TTL xóa trễ, và tính giá của item đã hết hạn", en: "Read only still-valid data while TTL deletes late, and price the expired items" }
  - { vi: "Trả lời mỗi mẫu truy cập bằng đúng một request: Query, GSI thưa, TransactGetItems", en: "Answer each access pattern with exactly one request: Query, sparse GSI, TransactGetItems" }
  - { vi: "Chọn DAX, Streams và cách sao lưu cho từng phần của ứng dụng", en: "Choose DAX, Streams and the backup method for each part of the app" }
requires: [e-dy-l5-02, e-dy-l4-12, e-dy-l5-06]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ttl-expired-items.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
viz: dy-single-table
lab:
  setup: |
    {"tables": [
      {"TableName":"FoodApp","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"},{"AttributeName":"queue_store","AttributeType":"S"},{"AttributeName":"queue_since","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST","GlobalSecondaryIndexes":[{"IndexName":"KitchenQueue","KeySchema":[{"AttributeName":"queue_store","KeyType":"HASH"},{"AttributeName":"queue_since","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]}
    ], "items": {
      "FoodApp": [
        {"pk":"CUST#c1","sk":"PROFILE","name":"An","city":"Da Nang"},
        {"pk":"CUST#c1","sk":"CART#k1","lines":2,"expires_at":1794873600},
        {"pk":"CUST#c1","sk":"CART#k2","lines":1,"expires_at":1795046400},
        {"pk":"CUST#c1","sk":"CART#k3","lines":4,"expires_at":1795132799},
        {"pk":"CUST#c1","sk":"CART#k4","lines":3,"expires_at":1795140000},
        {"pk":"CUST#c1","sk":"CART#k5","lines":1,"expires_at":1795219200},
        {"pk":"CUST#c1","sk":"ORDER#2026-11-17T12:10#o101","store":"STORE#s2","total":95000},
        {"pk":"CUST#c1","sk":"ORDER#2026-11-18T19:30#o102","store":"STORE#s1","total":240000},
        {"pk":"CUST#c1","sk":"ORDER#2026-11-19T18:05#o103","store":"STORE#s1","total":185000,"queue_store":"STORE#s1","queue_since":"2026-11-19T18:06"},
        {"pk":"CUST#c2","sk":"PROFILE","name":"Binh","city":"Hue"},
        {"pk":"CUST#c2","sk":"CART#k1","lines":2,"expires_at":1795305600},
        {"pk":"CUST#c2","sk":"ORDER#2026-11-19T18:20#o104","store":"STORE#s1","total":120000,"queue_store":"STORE#s1","queue_since":"2026-11-19T18:21"},
        {"pk":"CUST#c2","sk":"ORDER#2026-11-19T18:40#o105","store":"STORE#s2","total":310000,"queue_store":"STORE#s2","queue_since":"2026-11-19T18:41"},
        {"pk":"CUST#c3","sk":"PROFILE","name":"Chi","city":"Da Nang"},
        {"pk":"CUST#c3","sk":"ORDER#2026-11-18T12:00#o107","store":"STORE#s1","total":60000},
        {"pk":"CUST#c3","sk":"ORDER#2026-11-19T18:45#o106","store":"STORE#s1","total":75000,"queue_store":"STORE#s1","queue_since":"2026-11-19T18:46"},
        {"pk":"ORDER#o102","sk":"SUMMARY","status":"DELIVERED","total":240000},
        {"pk":"ORDER#o102","sk":"PAYMENT","state":"CAPTURED","amount":240000},
        {"pk":"ORDER#o103","sk":"SUMMARY","status":"COOKING","total":185000},
        {"pk":"ORDER#o103","sk":"PAYMENT","state":"CAPTURED","amount":185000}
      ]
    }}
  steps:
    - task: { vi: "Mẫu 1, giỏ hàng còn dùng được: giỏ của khách `CUST#c1` có sort key `CART#<id>` và `expires_at` (giây epoch, là thuộc tính TTL). Bây giờ là 1795132800. Đọc các giỏ **chưa hết hạn** của khách này bằng một request.", en: "Pattern 1, carts still usable: the carts of customer `CUST#c1` have sort key `CART#<id>` and `expires_at` (epoch seconds, the TTL attribute). Now is 1795132800. Read this customer's **unexpired** carts with one request." }
      solution: |
        {"op": "Query", "input": {"TableName": "FoodApp", "KeyConditionExpression": "pk = :c AND begins_with(sk, :k)", "FilterExpression": "expires_at > :now", "ExpressionAttributeValues": {":c": {"S": "CUST#c1"}, ":k": {"S": "CART#"}, ":now": {"N": "1795132800"}}}}
      check: doc
      expect: { Count: 2, ScannedCount: 5 }
      hint: { vi: "Phần khóa chọn giỏ của khách; điều kiện thời gian không thuộc khóa nên nằm trong `FilterExpression`.", en: "The key part picks the customer's carts; the time condition is not a key, so it goes in `FilterExpression`." }
    - task: { vi: "Mẫu 2, đơn gần đây: đọc 2 đơn mới nhất của khách `CUST#c1`, mới nhất trước. Sort key của đơn là `ORDER#<time>#<order>`.", en: "Pattern 2, recent orders: read the 2 newest orders of customer `CUST#c1`, newest first. An order's sort key is `ORDER#<time>#<order>`." }
      solution: |
        {"op": "Query", "input": {"TableName": "FoodApp", "KeyConditionExpression": "pk = :c AND begins_with(sk, :o)", "ExpressionAttributeValues": {":c": {"S": "CUST#c1"}, ":o": {"S": "ORDER#"}}, "ScanIndexForward": false, "Limit": 2}}
      check: doc
      ordered: true
      expect: { Count: 2, ScannedCount: 2 }
      hint: { vi: "Đảo chiều sort key bằng `ScanIndexForward` và dừng bằng `Limit`.", en: "Reverse the sort key order with `ScanIndexForward` and stop with `Limit`." }
    - task: { vi: "Mẫu 3, hàng chờ bếp: chỉ đơn đang nấu mới có `queue_store` và `queue_since`, là khóa của GSI `KitchenQueue`. Đọc mọi đơn đang nấu của cửa hàng `STORE#s1`, đơn chờ lâu nhất trước.", en: "Pattern 3, kitchen queue: only orders being cooked carry `queue_store` and `queue_since`, the keys of the GSI `KitchenQueue`. Read every order being cooked at store `STORE#s1`, the longest-waiting first." }
      solution: |
        {"op": "Query", "input": {"TableName": "FoodApp", "IndexName": "KitchenQueue", "KeyConditionExpression": "queue_store = :s", "ExpressionAttributeValues": {":s": {"S": "STORE#s1"}}}}
      check: doc
      ordered: true
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "GSI thưa: Query trên chỉ mục; thứ tự tăng dần của `queue_since` là mặc định.", en: "A sparse GSI: Query the index; ascending `queue_since` order is the default." }
    - task: { vi: "Mẫu 4, màn hình xác nhận đơn: đọc `SUMMARY` rồi `PAYMENT` của đơn `o103` (`pk` = `ORDER#o103`) trong một lần đọc tất-cả-hoặc-không, theo thứ tự đó, và xin trả về `ConsumedCapacity`.", en: "Pattern 4, the order confirmation screen: read `SUMMARY` then `PAYMENT` of order `o103` (`pk` = `ORDER#o103`) in one all-or-nothing read, in that order, and ask for `ConsumedCapacity`." }
      solution: |
        {"op": "TransactGetItems", "input": {"TransactItems": [{"Get": {"TableName": "FoodApp", "Key": {"pk": {"S": "ORDER#o103"}, "sk": {"S": "SUMMARY"}}}}, {"Get": {"TableName": "FoodApp", "Key": {"pk": {"S": "ORDER#o103"}, "sk": {"S": "PAYMENT"}}}}], "ReturnConsumedCapacity": "TOTAL"}}
      check: doc
      ordered: true
      expect: { Count: 2 }
      hint: { vi: "Hai `Get` trong `TransactItems`; kết quả theo đúng thứ tự các `Get`.", en: "Two `Get` in `TransactItems`; the result follows the order of the `Get` actions." }
quiz:
  - q: { vi: "Bước 1 trả `Count` 2, `ScannedCount` 5. Một khách khác để lại 40 giỏ, 38 giỏ đã hết hạn nhưng TTL chưa xóa, mỗi giỏ 1 KB. Query bước 1 (đọc cuối cùng) cho khách này tốn bao nhiêu RCU?", en: "Step 1 returns `Count` 2, `ScannedCount` 5. Another customer left 40 carts, 38 of them expired but not yet deleted by TTL, 1 KB each. How many RCU does the step 1 Query (eventually consistent) cost for this customer?" }
    options:
      - { vi: "0,5 RCU, vì chỉ 2 giỏ được trả về", en: "0.5 RCU, because only 2 carts are returned" }
      - { vi: "5 RCU: 40 KB đã đọc = 10 khối 4 KB, × 0,5", en: "5 RCU: 40 KB read = 10 blocks of 4 KB, × 0.5" }
      - { vi: "0 RCU, vì item hết hạn được đọc miễn phí", en: "0 RCU, because expired items are read for free" }
    answer: 1
    why: { vi: "Bộ lọc chạy sau khi đọc, nên giá tính trên mọi item đã quét. Item hết hạn vẫn tốn đọc tới khi TTL xóa nó (có thể vài ngày).", en: "The filter runs after the read, so the price counts every scanned item. Expired items still cost reads until TTL deletes them (possibly days later)." }
  - q: { vi: "Màn hình xác nhận (bước 4) được mở 200 lần mỗi giây, mỗi item dưới 4 KB. Cần bao nhiêu RCU?", en: "The confirmation screen (step 4) opens 200 times per second, each item under 4 KB. How many RCU are needed?" }
    options:
      - { vi: "200 RCU", en: "200 RCU" }
      - { vi: "400 RCU", en: "400 RCU" }
      - { vi: "800 RCU: 2 item × 2 RCU giao dịch × 200", en: "800 RCU: 2 items × 2 transactional RCU × 200" }
    answer: 2
    why: { vi: "Đọc giao dịch tốn 2 RCU mỗi item tới 4 KB, gấp đôi đọc mạnh. `ConsumedCapacity` ở bước 4 cho thấy 4 RCU một lần mở.", en: "A transactional read costs 2 RCU per item up to 4 KB, double a strong read. `ConsumedCapacity` in step 4 shows 4 RCU per open." }
  - q: { vi: "Thực đơn của cửa hàng nổi tiếng bị đọc 5000 lần mỗi giây, chấp nhận trễ vài phút. Thanh toán (bước 4) phải luôn đúng. Đặt DAX thế nào?", en: "A popular store's menu is read 5000 times per second, a few minutes of staleness accepted. Payments (step 4) must always be right. Where does DAX go?" }
    options:
      - { vi: "Đọc thực đơn qua DAX; bước 4 là `TransactGetItems` nên DAX chuyển thẳng sang DynamoDB, không lưu", en: "Read the menu through DAX; step 4 is a `TransactGetItems`, so DAX passes it straight to DynamoDB, uncached" }
      - { vi: "Đưa mọi thứ qua DAX để thanh toán cũng nhanh hơn", en: "Put everything through DAX so payments get faster too" }
      - { vi: "Không dùng DAX, vì DAX không đọc được GSI", en: "Do not use DAX, because DAX cannot read a GSI" }
    answer: 0
    why: { vi: "DAX hợp với đọc lặp lại trên khóa nóng khi chấp nhận đọc cuối cùng. Đọc mạnh và `TransactGetItems` qua DAX chỉ đi thẳng sang bảng, không được lợi gì từ bộ đệm.", en: "DAX suits repeated reads of a hot key when eventual reads are fine. Strong reads and `TransactGetItems` through DAX just go straight to the table and gain nothing from the cache." }
  - q: { vi: "Một bộ xử lý Streams cộng doanh thu theo cửa hàng. Giỏ hàng bị TTL xóa cũng sinh bản ghi `REMOVE`. Bộ xử lý nên làm gì?", en: "A Streams consumer adds up revenue per store. Carts deleted by TTL also produce `REMOVE` records. What should the consumer do?" }
    options:
      - { vi: "Trừ doanh thu cho mọi bản ghi `REMOVE`", en: "Subtract revenue for every `REMOVE` record" }
      - { vi: "Bỏ qua bản ghi xóa do dịch vụ (`userIdentity` loại `Service`, `principalId` là `dynamodb.amazonaws.com`) và mọi item không phải đơn", en: "Skip service deletions (`userIdentity` of type `Service`, `principalId` is `dynamodb.amazonaws.com`) and every item that is not an order" }
      - { vi: "Tắt TTL để Streams sạch hơn", en: "Turn TTL off to keep Streams clean" }
    answer: 1
    why: { vi: "Xóa do TTL có `userIdentity` riêng, nên bộ xử lý tách được nó khỏi xóa của người dùng. Phép cộng theo từng đơn không cần thứ tự giữa các item.", en: "TTL deletes carry their own `userIdentity`, so the consumer can tell them from user deletes. A sum per order does not need ordering across items." }
  - q: { vi: "Một lần triển khai lỗi ghi sai `total` của nhiều đơn lúc 14:02. Phát hiện lúc 14:30. Khôi phục thế nào?", en: "A bad deployment writes the wrong `total` on many orders at 14:02. It is found at 14:30. How do you recover?" }
    options:
      - { vi: "PITR: khôi phục về giây trước 14:02 vào một bảng mới, rồi chép lại các đơn bị sai", en: "PITR: restore to the second before 14:02 into a new table, then copy the damaged orders back" }
      - { vi: "Khôi phục đè lên bảng đang chạy", en: "Restore over the live table" }
      - { vi: "Đọc lại từ Streams của 7 ngày trước", en: "Replay Streams from 7 days ago" }
    answer: 0
    why: { vi: "PITR khôi phục về bất kỳ giây nào trong tối đa 35 ngày, luôn vào bảng mới. Streams chỉ giữ 24 giờ và không phải bản sao lưu.", en: "PITR restores to any second within up to 35 days, always into a new table. Streams keep only 24 hours and are not a backup." }
---

## Ý chính

Bạn vận hành bảng `FoodApp` của một ứng dụng giao đồ ăn. Đi đủ vòng của cấp L5: thiết kế, truy vấn, giá và vận hành.

- **Thiết kế**: `pk = CUST#<id>` gom hồ sơ, giỏ (`CART#…`) và đơn (`ORDER#<time>#<id>`) của một khách. `pk = ORDER#<id>` giữ `SUMMARY` và `PAYMENT` của một đơn. GSI thưa `KitchenQueue` chỉ chứa đơn đang nấu.
- **TTL**: giỏ có `expires_at`; TTL xóa trễ nên mọi lần đọc giỏ phải lọc theo thời gian.
- **Ảnh chụp nhất quán**: màn hình xác nhận đọc `SUMMARY` và `PAYMENT` bằng `TransactGetItems`.
- **Giá**: item bị lọc vẫn tính tiền; đọc giao dịch tốn gấp đôi.
- **Vận hành**: DAX cho đọc nóng chấp nhận trễ, Streams cho doanh thu, PITR cho lỗi ghi.

## Ví dụ

```text
#  access pattern               request                        key / index
1  usable carts of a customer   Query + FilterExpression       CUST#c1 | begins_with CART#
2  2 newest orders              Query, newest first, Limit 2   CUST#c1 | begins_with ORDER#
3  kitchen queue of a store     Query on GSI KitchenQueue      queue_store = STORE#s1
4  order confirmation           TransactGetItems               ORDER#o103 | SUMMARY, PAYMENT
```

## Thực hành

Bảng có 20 item: 3 khách, 6 giỏ, 7 đơn (4 đơn đang nấu) và 4 item chi tiết đơn. Làm 4 bước, đọc `ScannedCount` và `ConsumedCapacity` trong kết quả, rồi trả lời 5 câu hỏi về giá và vận hành. `TransactWriteItems` không có trong bộ máy trình duyệt, nên bài chỉ dùng đọc.

# EN

## Key idea

You run the `FoodApp` table of a food delivery app. Go round the whole of level L5: design, queries, price and operations.

- **Design**: `pk = CUST#<id>` groups a customer's profile, carts (`CART#…`) and orders (`ORDER#<time>#<id>`). `pk = ORDER#<id>` holds an order's `SUMMARY` and `PAYMENT`. The sparse GSI `KitchenQueue` holds only orders being cooked.
- **TTL**: carts carry `expires_at`; TTL deletes late, so every cart read must filter on time.
- **Consistent snapshot**: the confirmation screen reads `SUMMARY` and `PAYMENT` with `TransactGetItems`.
- **Price**: filtered items are still billed; transactional reads cost double.
- **Operations**: DAX for hot reads that accept staleness, Streams for revenue, PITR for bad writes.

## Example

```text
#  access pattern               request                        key / index
1  usable carts of a customer   Query + FilterExpression       CUST#c1 | begins_with CART#
2  2 newest orders              Query, newest first, Limit 2   CUST#c1 | begins_with ORDER#
3  kitchen queue of a store     Query on GSI KitchenQueue      queue_store = STORE#s1
4  order confirmation           TransactGetItems               ORDER#o103 | SUMMARY, PAYMENT
```

## Practice

The table holds 20 items: 3 customers, 6 carts, 7 orders (4 being cooked) and 4 order detail items. Do the 4 steps, read `ScannedCount` and `ConsumedCapacity` in the results, then answer 5 questions on price and operations. `TransactWriteItems` is not in the browser engine, so the lesson only reads.
