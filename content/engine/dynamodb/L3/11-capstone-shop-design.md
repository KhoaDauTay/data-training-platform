---
id: e-dy-l3-11
engine: dynamodb
level: L3
module: single-table
title: "Kiểm tra cấp L3: thiết kế bảng cho tiệm trà"
title_en: "Level L3 check: design the table for the tea shop"
kind: capstone
runtime: browser
minutes: 25
objectives:
  - vi: Tạo bảng một-bảng có GSI đảo, rồi phục vụ năm mẫu truy cập, mỗi mẫu đúng một request và không Scan.
    en: Create a single table with an inverted GSI, then serve five access patterns, each with exactly one request and no Scan.
requires: [e-dy-l3-06, e-dy-l3-09, e-dy-l3-10]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-adjacency-graphs.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
lab:
  setup: |
    {"tables": [{"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"PK","KeyType":"HASH"},{"AttributeName":"SK","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"PK","AttributeType":"S"},{"AttributeName":"SK","AttributeType":"S"},{"AttributeName":"GSI1PK","AttributeType":"S"},{"AttributeName":"GSI1SK","AttributeType":"S"}],"GlobalSecondaryIndexes":[{"IndexName":"GSI1","KeySchema":[{"AttributeName":"GSI1PK","KeyType":"HASH"},{"AttributeName":"GSI1SK","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]}],
     "items": {"Shop": [
      {"PK":"PRODUCT#P-01","SK":"PRODUCT#P-01","type":"product","name":"Green tea","price":45000},
      {"PK":"PRODUCT#P-02","SK":"PRODUCT#P-02","type":"product","name":"Lotus tea","price":60000},
      {"PK":"PRODUCT#P-03","SK":"PRODUCT#P-03","type":"product","name":"Coffee beans","price":120000},
      {"PK":"PRODUCT#P-04","SK":"PRODUCT#P-04","type":"product","name":"Tea cup","price":80000},
      {"PK":"PRODUCT#P-05","SK":"PRODUCT#P-05","type":"product","name":"Kettle","price":350000},
      {"PK":"CUST#C-01","SK":"PROFILE","type":"customer","name":"An","city":"Da Nang"},
      {"PK":"CUST#C-01","SK":"ORDER#2026-08-26#O-501","type":"order","orderId":"O-501","total":160000},
      {"PK":"ORDER#O-501","SK":"PRODUCT#P-04","type":"line","qty":2,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-501"},
      {"PK":"CUST#C-01","SK":"ORDER#2026-09-08#O-502","type":"order","orderId":"O-502","total":380000},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-03","type":"line","qty":2,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-502"},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-02","type":"line","qty":1,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-502"},
      {"PK":"ORDER#O-502","SK":"PRODUCT#P-04","type":"line","qty":1,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-502"},
      {"PK":"CUST#C-02","SK":"PROFILE","type":"customer","name":"Binh","city":"Hue"},
      {"PK":"CUST#C-02","SK":"ORDER#2026-08-28#O-503","type":"order","orderId":"O-503","total":355000},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-04","type":"line","qty":2,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-503"},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-01","type":"line","qty":3,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-503"},
      {"PK":"ORDER#O-503","SK":"PRODUCT#P-02","type":"line","qty":1,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-503"},
      {"PK":"CUST#C-02","SK":"ORDER#2026-09-05#O-504","type":"order","orderId":"O-504","total":440000},
      {"PK":"ORDER#O-504","SK":"PRODUCT#P-03","type":"line","qty":3,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-504"},
      {"PK":"ORDER#O-504","SK":"PRODUCT#P-04","type":"line","qty":1,"price":80000,"GSI1PK":"PRODUCT#P-04","GSI1SK":"ORDER#O-504"},
      {"PK":"CUST#C-03","SK":"PROFILE","type":"customer","name":"Chi","city":"Hoi An"},
      {"PK":"CUST#C-03","SK":"ORDER#2026-08-12#O-505","type":"order","orderId":"O-505","total":135000},
      {"PK":"ORDER#O-505","SK":"PRODUCT#P-01","type":"line","qty":3,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-505"},
      {"PK":"CUST#C-03","SK":"ORDER#2026-09-12#O-506","type":"order","orderId":"O-506","total":405000},
      {"PK":"ORDER#O-506","SK":"PRODUCT#P-03","type":"line","qty":3,"price":120000,"GSI1PK":"PRODUCT#P-03","GSI1SK":"ORDER#O-506"},
      {"PK":"ORDER#O-506","SK":"PRODUCT#P-01","type":"line","qty":1,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-506"},
      {"PK":"CUST#C-04","SK":"PROFILE","type":"customer","name":"Dung","city":"Da Nang"},
      {"PK":"CUST#C-04","SK":"ORDER#2026-08-08#O-507","type":"order","orderId":"O-507","total":165000},
      {"PK":"ORDER#O-507","SK":"PRODUCT#P-01","type":"line","qty":1,"price":45000,"GSI1PK":"PRODUCT#P-01","GSI1SK":"ORDER#O-507"},
      {"PK":"ORDER#O-507","SK":"PRODUCT#P-02","type":"line","qty":2,"price":60000,"GSI1PK":"PRODUCT#P-02","GSI1SK":"ORDER#O-507"},
      {"PK":"CUST#C-04","SK":"ORDER#2026-09-02#O-508","type":"order","orderId":"O-508","total":700000},
      {"PK":"ORDER#O-508","SK":"PRODUCT#P-05","type":"line","qty":2,"price":350000,"GSI1PK":"PRODUCT#P-05","GSI1SK":"ORDER#O-508"},
      {"PK":"STORE","SK":"VN#DA-NANG#HAI-CHAU#S-01","type":"store","storeId":"S-01"},
      {"PK":"STORE","SK":"VN#DA-NANG#HAI-CHAU#S-02","type":"store","storeId":"S-02"},
      {"PK":"STORE","SK":"VN#DA-NANG#SON-TRA#S-03","type":"store","storeId":"S-03"},
      {"PK":"STORE","SK":"VN#HUE#PHU-HOI#S-04","type":"store","storeId":"S-04"},
      {"PK":"STORE","SK":"VN#QUANG-NAM#HOI-AN#S-05","type":"store","storeId":"S-05"},
      {"PK":"STORE","SK":"VN#DA-NANG#LIEN-CHIEU#S-06","type":"store","storeId":"S-06"}
    ]}}
  steps:
    - task:
        vi: 'Tiệm trà mở thêm chi nhánh và cần một bảng mới cùng thiết kế. Tạo bảng `ShopV2` - khóa chuỗi `PK` + `SK`, tính tiền theo request, và GSI `GSI1` có khóa chuỗi `GSI1PK` + `GSI1SK`, project `ALL`.'
        en: 'The tea shop opens a new branch and needs a new table with the same design. Create table `ShopV2` - string keys `PK` + `SK`, billed per request, and a GSI `GSI1` with string keys `GSI1PK` + `GSI1SK`, projection `ALL`.'
      solution: |
        {"op": "CreateTable", "input": {
          "TableName": "ShopV2",
          "KeySchema": [
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"}],
          "AttributeDefinitions": [
            {"AttributeName": "PK", "AttributeType": "S"},
            {"AttributeName": "SK", "AttributeType": "S"},
            {"AttributeName": "GSI1PK", "AttributeType": "S"},
            {"AttributeName": "GSI1SK", "AttributeType": "S"}],
          "GlobalSecondaryIndexes": [{
            "IndexName": "GSI1",
            "KeySchema": [
              {"AttributeName": "GSI1PK", "KeyType": "HASH"},
              {"AttributeName": "GSI1SK", "KeyType": "RANGE"}],
            "Projection": {"ProjectionType": "ALL"}}],
          "BillingMode": "PAY_PER_REQUEST"}}
      check: catalog
      hint:
        vi: Bốn thuộc tính khóa (hai của bảng, hai của GSI) đều nằm trong `AttributeDefinitions`.
        en: All four key attributes (two for the table, two for the GSI) go into `AttributeDefinitions`.
    - task:
        vi: 'Mẫu 1 (trên bảng `Shop`) - hồ sơ của khách `C-03`.'
        en: 'Pattern 1 (on table `Shop`) - the profile of customer `C-03`.'
      solution: |
        {"op": "GetItem", "input": {"TableName": "Shop", "Key": {"PK": {"S": "CUST#C-03"}, "SK": {"S": "PROFILE"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","FilterExpression":"#k0 = :k0 AND #k1 = :k1","ExpressionAttributeNames":{"#k0":"PK","#k1":"SK"},"ExpressionAttributeValues":{":k0":{"S":"CUST#C-03"},":k1":{"S":"PROFILE"}}}}
      hint:
        vi: Khóa đầy đủ đã biết, nên chỉ cần một item.
        en: The full key is known, so you need just one item.
    - task:
        vi: Mẫu 2 - các đơn tháng 9/2026 của khách `C-04`.
        en: Pattern 2 - the September 2026 orders of customer `C-04`.
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk AND begins_with(SK, :m)",
          "ExpressionAttributeValues": {":pk": {"S": "CUST#C-04"}, ":m": {"S": "ORDER#2026-09"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"CUST#C-04"},":m":{"S":"ORDER#2026-09"}},"FilterExpression":"(PK = :pk AND begins_with(SK, :m))"}}
      ordered: true
      hint:
        vi: Loại item và tháng nằm chung trong một tiền tố sort key.
        en: The item type and the month share one sort key prefix.
    - task:
        vi: Mẫu 3 - các dòng hàng của đơn `O-508`.
        en: Pattern 3 - the lines of order `O-508`.
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk",
          "ExpressionAttributeValues": {":pk": {"S": "ORDER#O-508"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"ORDER#O-508"}},"FilterExpression":"(PK = :pk)"}}
      ordered: true
      hint:
        vi: Item collection của chính đơn đó.
        en: The order's own item collection.
    - task:
        vi: Mẫu 4 - mọi đơn có sản phẩm `P-01` (trà xanh).
        en: Pattern 4 - every order that contains product `P-01` (green tea).
      solution: |
        {"op": "Query", "input": {"TableName": "Shop", "IndexName": "GSI1",
          "KeyConditionExpression": "GSI1PK = :p",
          "ExpressionAttributeValues": {":p": {"S": "PRODUCT#P-01"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","IndexName":"GSI1","ExpressionAttributeValues":{":p":{"S":"PRODUCT#P-01"}},"FilterExpression":"(GSI1PK = :p)"}}
      ordered: true
      hint:
        vi: Chiều ngược của quan hệ đơn-sản phẩm nằm trên GSI.
        en: The reverse side of the order-product relation lives on the GSI.
    - task:
        vi: Mẫu 5 - mọi cửa hàng ở Huế (mã `HUE`).
        en: Pattern 5 - every store in Hue (code `HUE`).
      solution: |
        {"op": "Query", "input": {"TableName": "Shop",
          "KeyConditionExpression": "PK = :pk AND begins_with(SK, :loc)",
          "ExpressionAttributeValues": {":pk": {"S": "STORE"}, ":loc": {"S": "VN#HUE#"}}}}
      check: doc
      perf: { table: Shop }
      slow: |
        {"op":"Scan","input":{"TableName":"Shop","ExpressionAttributeValues":{":pk":{"S":"STORE"},":loc":{"S":"VN#HUE#"}},"FilterExpression":"(PK = :pk AND begins_with(SK, :loc))"}}
      ordered: true
      hint:
        vi: Sort key phân cấp, tiền tố kết thúc bằng `#`.
        en: A hierarchical sort key, with the prefix ending in `#`.
quiz:
  - q:
      vi: Mẫu 4 dùng một Query trên `GSI1`. Vì sao không Scan bảng `Shop` với `FilterExpression` giữ item có `SK = PRODUCT#P-01`?
      en: Pattern 4 uses one Query on `GSI1`. Why not Scan table `Shop` with a `FilterExpression` that keeps items with `SK = PRODUCT#P-01`?
    options:
      - vi: Hai cách tốn như nhau, vì Scan có bộ lọc chỉ tính tiền item khớp.
        en: Both cost the same, because a filtered Scan only charges for the matching items.
      - vi: Scan đọc và tính RCU cho mọi item của bảng rồi mới lọc; Query trên `GSI1` chỉ đọc item cạnh của `P-01`.
        en: The Scan reads and charges RCU for every item of the table before filtering; the Query on `GSI1` reads only the edge items of `P-01`.
      - vi: Scan không đọc được item cạnh, vì chúng chỉ nằm trong GSI.
        en: A Scan cannot read edge items, because they live only in the GSI.
    answer: 1
    why:
      vi: 'Nghe hợp lý vì kết quả trả về ít. Nhưng `FilterExpression` chạy sau khi đọc: `ScannedCount` là cả bảng, RCU tính theo phần đã đọc. Item cạnh vẫn nằm trong bảng; GSI chỉ là bản sao có khóa đảo.'
      en: 'It sounds right because few items come back. But the `FilterExpression` runs after the read: `ScannedCount` is the whole table, and RCU is charged on what was read. The edge items still live in the table; the GSI is only a copy with swapped keys.'
  - q:
      vi: Có nên thêm GSI thứ hai cho mẫu 5 (cửa hàng theo tỉnh) không?
      en: Should you add a second GSI for pattern 5 (stores by city)?
    options:
      - vi: Có, mỗi mẫu truy cập cần một GSI riêng.
        en: Yes, every access pattern needs its own GSI.
      - vi: Không - `PK = STORE` và tiền tố sort key đã trả lời bằng một Query trên bảng; GSI chỉ thêm WCU cho mỗi lần ghi.
        en: No - `PK = STORE` and the sort key prefix already answer it with one Query on the table; a GSI would only add WCU to every write.
      - vi: Có, vì `begins_with` trên bảng gốc tốn hơn Query trên GSI.
        en: Yes, because `begins_with` on the base table costs more than a Query on a GSI.
    answer: 1
    why:
      vi: Nghe hợp lý nếu nghĩ GSI là cách duy nhất để có mẫu truy cập mới. Mẫu nào khóa của bảng đã phục vụ được (ở đây sort key phân cấp) thì không cần index; mỗi GSI có projection riêng và tốn thêm WCU mỗi khi item của nó đổi.
      en: It sounds right if a GSI seems to be the only way to add an access pattern. A pattern the table's own keys already serve (here the hierarchical sort key) needs no index; every GSI has its own projection and costs extra WCU whenever its items change.
---

## Ý chính

Bài kiểm tra cấp L3 đi trọn vòng thiết kế: tạo bảng một-bảng có GSI đảo, rồi chứng minh mỗi mẫu truy cập là đúng **một** `GetItem` hoặc `Query`, không có Scan nào.

## Thực hành

Bước 1 được chấm bằng `DescribeTable` trên bảng mới `ShopV2`. Các bước sau chạy trên bảng `Shop` đã có dữ liệu: 5 sản phẩm, 4 khách, 8 đơn và dòng hàng, 6 cửa hàng.

# EN

## Key idea

The level L3 check runs the full design loop: create a single table with an inverted GSI, then show that each access pattern is exactly **one** `GetItem` or `Query`, with no Scan at all.

## Practice

Step 1 is graded with `DescribeTable` on the new table `ShopV2`. The other steps run on table `Shop`, which already holds data: 5 products, 4 customers, 8 orders with their lines, and 6 stores.
