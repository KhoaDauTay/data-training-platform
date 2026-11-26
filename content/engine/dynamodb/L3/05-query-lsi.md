---
id: e-dy-l3-05
engine: dynamodb
level: L3
module: secondary
title: "LSI: sắp lại một item collection theo thuộc tính khác"
title_en: "LSI: re-sort an item collection by another attribute"
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Query một LSI để sắp đơn của một khách theo `total` thay vì theo thời gian.
    en: Query an LSI to sort one customer's orders by `total` instead of by time.
  - vi: Dùng điều kiện khoảng trên sort key của LSI và đọc strongly consistent.
    en: Use a range condition on the LSI sort key, with a strongly consistent read.
  - vi: Thấy vì sao lọc `total` trên bảng gốc đọc cả item collection còn LSI thì không.
    en: See why filtering `total` on the base table reads the whole item collection while the LSI does not.
requires: [e-dy-l3-02]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
lab:
  setup: |
    {"tables": [{"TableName":"Orders","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"customerId","AttributeType":"S"},{"AttributeName":"orderId","AttributeType":"S"},{"AttributeName":"total","AttributeType":"N"},{"AttributeName":"status","AttributeType":"S"},{"AttributeName":"openSince","AttributeType":"S"},{"AttributeName":"city","AttributeType":"S"}],"LocalSecondaryIndexes":[{"IndexName":"byTotal","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"total","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}],"GlobalSecondaryIndexes":[{"IndexName":"byStatus","KeySchema":[{"AttributeName":"status","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"Projection":{"ProjectionType":"INCLUDE","NonKeyAttributes":["total"]}},{"IndexName":"openOrders","KeySchema":[{"AttributeName":"city","KeyType":"HASH"},{"AttributeName":"openSince","KeyType":"RANGE"}],"Projection":{"ProjectionType":"KEYS_ONLY"}}]}],
     "items": {"Orders": [
      {"customerId":"C-01","orderId":"2026-07-28#O-101","status":"DELIVERED","total":770000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-08-28#O-102","status":"DELIVERED","total":770000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-09-17#O-103","status":"SHIPPED","total":800000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-10-19#O-104","status":"DELIVERED","total":120000,"city":"Quy Nhon"},
      {"customerId":"C-02","orderId":"2026-07-25#O-105","status":"SHIPPED","total":640000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-08-26#O-106","status":"PAID","total":910000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-09-17#O-107","status":"DELIVERED","total":210000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-10-03#O-108","status":"NEW","total":820000,"city":"Da Nang","openSince":"2026-10-03"},
      {"customerId":"C-03","orderId":"2026-07-05#O-109","status":"SHIPPED","total":560000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-08-03#O-110","status":"PAID","total":310000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-09-28#O-111","status":"DELIVERED","total":750000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-10-13#O-112","status":"NEW","total":580000,"city":"Da Nang","openSince":"2026-10-13"},
      {"customerId":"C-04","orderId":"2026-07-15#O-113","status":"SHIPPED","total":420000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-08-16#O-114","status":"DELIVERED","total":900000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-09-02#O-115","status":"SHIPPED","total":120000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-10-15#O-116","status":"SHIPPED","total":130000,"city":"Hue"},
      {"customerId":"C-05","orderId":"2026-07-24#O-117","status":"DELIVERED","total":440000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-08-02#O-118","status":"DELIVERED","total":260000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-09-09#O-119","status":"DELIVERED","total":670000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-10-20#O-120","status":"NEW","total":680000,"city":"Hoi An","openSince":"2026-10-20"},
      {"customerId":"C-06","orderId":"2026-07-18#O-121","status":"PAID","total":280000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-08-25#O-122","status":"SHIPPED","total":440000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-09-22#O-123","status":"DELIVERED","total":80000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-10-18#O-124","status":"NEW","total":690000,"city":"Hue","openSince":"2026-10-18"},
      {"customerId":"C-07","orderId":"2026-07-23#O-125","status":"PAID","total":210000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-08-08#O-126","status":"DELIVERED","total":790000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-09-02#O-127","status":"DELIVERED","total":690000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-10-05#O-128","status":"PAID","total":680000,"city":"Hoi An"},
      {"customerId":"C-08","orderId":"2026-07-17#O-129","status":"SHIPPED","total":680000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-08-20#O-130","status":"SHIPPED","total":440000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-09-07#O-131","status":"SHIPPED","total":660000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-10-06#O-132","status":"NEW","total":590000,"city":"Da Nang","openSince":"2026-10-06"},
      {"customerId":"C-09","orderId":"2026-07-23#O-133","status":"PAID","total":280000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-08-26#O-134","status":"DELIVERED","total":790000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-09-18#O-135","status":"SHIPPED","total":710000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-10-01#O-136","status":"NEW","total":140000,"city":"Hoi An","openSince":"2026-10-01"},
      {"customerId":"C-10","orderId":"2026-07-24#O-137","status":"SHIPPED","total":90000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-08-01#O-138","status":"PAID","total":910000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-09-12#O-139","status":"PAID","total":490000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-10-04#O-140","status":"NEW","total":400000,"city":"Quy Nhon","openSince":"2026-10-04"},
      {"customerId":"C-11","orderId":"2026-07-05#O-141","status":"SHIPPED","total":500000,"city":"Hoi An"},
      {"customerId":"C-11","orderId":"2026-08-12#O-142","status":"SHIPPED","total":930000,"city":"Hoi An"},
      {"customerId":"C-11","orderId":"2026-09-22#O-143","status":"PAID","total":350000,"city":"Hoi An"},
      {"customerId":"C-11","orderId":"2026-10-21#O-144","status":"SHIPPED","total":90000,"city":"Hoi An"},
      {"customerId":"C-12","orderId":"2026-07-27#O-145","status":"SHIPPED","total":110000,"city":"Hoi An"},
      {"customerId":"C-12","orderId":"2026-08-28#O-146","status":"DELIVERED","total":900000,"city":"Hoi An"},
      {"customerId":"C-12","orderId":"2026-09-28#O-147","status":"SHIPPED","total":160000,"city":"Hoi An"},
      {"customerId":"C-12","orderId":"2026-10-18#O-148","status":"SHIPPED","total":560000,"city":"Hoi An"},
      {"customerId":"C-13","orderId":"2026-07-26#O-149","status":"DELIVERED","total":930000,"city":"Quy Nhon"},
      {"customerId":"C-13","orderId":"2026-08-01#O-150","status":"PAID","total":920000,"city":"Quy Nhon"},
      {"customerId":"C-13","orderId":"2026-09-28#O-151","status":"PAID","total":150000,"city":"Quy Nhon"},
      {"customerId":"C-13","orderId":"2026-10-25#O-152","status":"NEW","total":170000,"city":"Quy Nhon","openSince":"2026-10-25"},
      {"customerId":"C-14","orderId":"2026-07-27#O-153","status":"SHIPPED","total":620000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-08-06#O-154","status":"SHIPPED","total":640000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-09-06#O-155","status":"SHIPPED","total":480000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-10-17#O-156","status":"NEW","total":440000,"city":"Hue","openSince":"2026-10-17"},
      {"customerId":"C-15","orderId":"2026-07-07#O-157","status":"SHIPPED","total":740000,"city":"Da Nang"},
      {"customerId":"C-15","orderId":"2026-08-06#O-158","status":"SHIPPED","total":400000,"city":"Da Nang"},
      {"customerId":"C-15","orderId":"2026-09-28#O-159","status":"DELIVERED","total":790000,"city":"Da Nang"},
      {"customerId":"C-15","orderId":"2026-10-28#O-160","status":"SHIPPED","total":220000,"city":"Da Nang"},
      {"customerId":"C-16","orderId":"2026-07-08#O-161","status":"SHIPPED","total":590000,"city":"Da Nang"},
      {"customerId":"C-16","orderId":"2026-08-21#O-162","status":"PAID","total":640000,"city":"Da Nang"},
      {"customerId":"C-16","orderId":"2026-09-26#O-163","status":"SHIPPED","total":490000,"city":"Da Nang"},
      {"customerId":"C-16","orderId":"2026-10-07#O-164","status":"DELIVERED","total":670000,"city":"Da Nang"},
      {"customerId":"C-17","orderId":"2026-07-25#O-165","status":"PAID","total":360000,"city":"Da Nang"},
      {"customerId":"C-17","orderId":"2026-08-26#O-166","status":"DELIVERED","total":100000,"city":"Da Nang"},
      {"customerId":"C-17","orderId":"2026-09-17#O-167","status":"SHIPPED","total":170000,"city":"Da Nang"},
      {"customerId":"C-17","orderId":"2026-10-08#O-168","status":"NEW","total":400000,"city":"Da Nang","openSince":"2026-10-08"},
      {"customerId":"C-18","orderId":"2026-07-21#O-169","status":"SHIPPED","total":710000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-08-01#O-170","status":"SHIPPED","total":700000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-09-05#O-171","status":"PAID","total":910000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-10-01#O-172","status":"NEW","total":160000,"city":"Quy Nhon","openSince":"2026-10-01"},
      {"customerId":"C-19","orderId":"2026-07-20#O-173","status":"SHIPPED","total":940000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-08-17#O-174","status":"PAID","total":370000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-09-06#O-175","status":"PAID","total":850000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-10-06#O-176","status":"NEW","total":260000,"city":"Da Nang","openSince":"2026-10-06"},
      {"customerId":"C-20","orderId":"2026-07-13#O-177","status":"PAID","total":780000,"city":"Hue"},
      {"customerId":"C-20","orderId":"2026-08-06#O-178","status":"PAID","total":780000,"city":"Hue"},
      {"customerId":"C-20","orderId":"2026-09-19#O-179","status":"SHIPPED","total":910000,"city":"Hue"},
      {"customerId":"C-20","orderId":"2026-10-09#O-180","status":"SHIPPED","total":910000,"city":"Hue"},
      {"customerId":"C-21","orderId":"2026-07-15#O-181","status":"PAID","total":630000,"city":"Da Nang"},
      {"customerId":"C-21","orderId":"2026-08-20#O-182","status":"DELIVERED","total":840000,"city":"Da Nang"},
      {"customerId":"C-21","orderId":"2026-09-25#O-183","status":"DELIVERED","total":530000,"city":"Da Nang"},
      {"customerId":"C-21","orderId":"2026-10-10#O-184","status":"SHIPPED","total":830000,"city":"Da Nang"},
      {"customerId":"C-22","orderId":"2026-07-01#O-185","status":"PAID","total":380000,"city":"Da Nang"},
      {"customerId":"C-22","orderId":"2026-08-12#O-186","status":"DELIVERED","total":580000,"city":"Da Nang"},
      {"customerId":"C-22","orderId":"2026-09-24#O-187","status":"SHIPPED","total":920000,"city":"Da Nang"},
      {"customerId":"C-22","orderId":"2026-10-04#O-188","status":"SHIPPED","total":400000,"city":"Da Nang"},
      {"customerId":"C-23","orderId":"2026-07-22#O-189","status":"PAID","total":510000,"city":"Quy Nhon"},
      {"customerId":"C-23","orderId":"2026-08-22#O-190","status":"DELIVERED","total":510000,"city":"Quy Nhon"},
      {"customerId":"C-23","orderId":"2026-09-26#O-191","status":"DELIVERED","total":520000,"city":"Quy Nhon"},
      {"customerId":"C-23","orderId":"2026-10-28#O-192","status":"NEW","total":440000,"city":"Quy Nhon","openSince":"2026-10-28"},
      {"customerId":"C-24","orderId":"2026-07-20#O-193","status":"DELIVERED","total":720000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-08-10#O-194","status":"DELIVERED","total":160000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-09-22#O-195","status":"DELIVERED","total":800000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-10-08#O-196","status":"NEW","total":440000,"city":"Hue","openSince":"2026-10-08"},
      {"customerId":"C-25","orderId":"2026-07-16#O-197","status":"DELIVERED","total":690000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-08-06#O-198","status":"PAID","total":590000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-09-11#O-199","status":"DELIVERED","total":870000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-10-03#O-200","status":"NEW","total":460000,"city":"Da Nang","openSince":"2026-10-03"},
      {"customerId":"C-26","orderId":"2026-07-28#O-201","status":"SHIPPED","total":280000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-08-11#O-202","status":"SHIPPED","total":170000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-09-08#O-203","status":"SHIPPED","total":850000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-10-12#O-204","status":"NEW","total":370000,"city":"Hoi An","openSince":"2026-10-12"},
      {"customerId":"C-27","orderId":"2026-07-27#O-205","status":"DELIVERED","total":730000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-08-06#O-206","status":"SHIPPED","total":480000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-09-02#O-207","status":"SHIPPED","total":810000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-10-24#O-208","status":"NEW","total":260000,"city":"Hue","openSince":"2026-10-24"},
      {"customerId":"C-28","orderId":"2026-07-04#O-209","status":"SHIPPED","total":260000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-08-04#O-210","status":"PAID","total":550000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-09-20#O-211","status":"SHIPPED","total":530000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-10-18#O-212","status":"PAID","total":850000,"city":"Hoi An"},
      {"customerId":"C-29","orderId":"2026-07-17#O-213","status":"SHIPPED","total":210000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-08-11#O-214","status":"SHIPPED","total":890000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-09-04#O-215","status":"SHIPPED","total":740000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-10-18#O-216","status":"NEW","total":410000,"city":"Quy Nhon","openSince":"2026-10-18"},
      {"customerId":"C-30","orderId":"2026-07-25#O-217","status":"DELIVERED","total":410000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-08-18#O-218","status":"DELIVERED","total":250000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-09-14#O-219","status":"SHIPPED","total":520000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-10-18#O-220","status":"DELIVERED","total":240000,"city":"Quy Nhon"}
    ]}}
  steps:
    - task:
        vi: Lấy các đơn của `C-07` có `total` trên 500.000, từ nhỏ tới lớn, bằng LSI `byTotal` (khóa `customerId`, `total`; project `ALL`), đọc bản mới nhất.
        en: Get the orders of `C-07` with `total` above 500,000, smallest first, using LSI `byTotal` (keys `customerId`, `total`; projection `ALL`), reading the latest version.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal",
          "KeyConditionExpression": "customerId = :c AND #t > :x",
          "ExpressionAttributeNames": {"#t": "total"},
          "ExpressionAttributeValues": {":c": {"S": "C-07"}, ":x": {"N": "500000"}},
          "ConsistentRead": true}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","IndexName":"byTotal","ExpressionAttributeNames":{"#t":"total"},"ExpressionAttributeValues":{":c":{"S":"C-07"},":x":{"N":"500000"}},"ConsistentRead":true,"FilterExpression":"(customerId = :c AND #t > :x)"}}
      ordered: true
      expect: { ScannedCount: 3 }
      hint:
        vi: Trên LSI, `total` là sort key nên điều kiện thuộc `KeyConditionExpression`, không phải bộ lọc. LSI cho phép `ConsistentRead`.
        en: On the LSI, `total` is the sort key, so the condition belongs in the `KeyConditionExpression`, not a filter. An LSI allows `ConsistentRead`.
    - task:
        vi: Lấy đúng một đơn có `total` lớn nhất của khách `C-12`.
        en: Get exactly one order, the one with the largest `total`, of customer `C-12`.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal",
          "KeyConditionExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-12"}},
          "ScanIndexForward": false, "Limit": 1}}
      check: doc
      ordered: true
      expect: { Count: 1, ScannedCount: 1 }
      hint:
        vi: Đọc ngược theo sort key của LSI và dừng sau 1 item.
        en: Read backwards on the LSI sort key and stop after 1 item.
    - task:
        vi: Lấy các đơn của `C-20` có `total` từ 800.000 tới 950.000 qua LSI `byTotal`. Bước này có thanh chi phí.
        en: Get the orders of `C-20` with `total` from 800,000 to 950,000 through LSI `byTotal`. This step has a cost bar.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal",
          "KeyConditionExpression": "customerId = :c AND #t BETWEEN :a AND :b",
          "ExpressionAttributeNames": {"#t": "total"},
          "ExpressionAttributeValues": {":c": {"S": "C-20"}, ":a": {"N": "800000"}, ":b": {"N": "950000"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Query","input":{"TableName":"Orders","KeyConditionExpression":"customerId = :c","FilterExpression":"#t BETWEEN :a AND :b","ExpressionAttributeNames":{"#t":"total"},"ExpressionAttributeValues":{":c":{"S":"C-20"},":a":{"N":"800000"},":b":{"N":"950000"}}}}
      expect: { Count: 2, ScannedCount: 2 }
      hint:
        vi: '`BETWEEN` trên sort key của LSI thuộc `KeyConditionExpression`; `total` là từ dành riêng nên viết `#t`.'
        en: '`BETWEEN` on the LSI sort key belongs in the `KeyConditionExpression`; `total` is a reserved word, so write `#t`.'
quiz:
  - q:
      vi: Bảng `Orders` đã chạy một năm, chưa có LSI. Bạn muốn sắp đơn mỗi khách theo `total` và vẫn đọc strong. Làm được gì?
      en: Table `Orders` has been live for a year with no LSI. You want each customer's orders sorted by `total` with strong reads. What can you do?
    options:
      - { vi: "Thêm LSI `byTotal` bằng `UpdateTable`", en: "Add LSI `byTotal` with `UpdateTable`" }
      - { vi: "Tạo bảng mới có LSI rồi chép dữ liệu sang; một GSI thì thêm được nhưng không đọc strong", en: "Create a new table with the LSI and copy the data; a GSI can be added but has no strong reads" }
      - { vi: "Thêm GSI rồi bật `ConsistentRead` trên nó", en: "Add a GSI and turn on `ConsistentRead` for it" }
    answer: 1
    trap: 0
    why:
      vi: 'GSI (global secondary index) thêm được bằng `UpdateTable`, nên dễ nghĩ LSI (local secondary index) cũng vậy; nhưng LSI chỉ khai được lúc tạo bảng. Bạn cần đọc nhất quán mạnh, nên chỉ còn cách tạo bảng mới có LSI `byTotal` rồi chép dữ liệu sang. Thêm GSI rồi bật `ConsistentRead` không được: GSI chỉ cho đọc nhất quán cuối và từ chối request đó.'
      en: 'A GSI (global secondary index) can be added with `UpdateTable`, so it is easy to think an LSI (local secondary index) can too; but an LSI can only be declared when the table is created. You need strongly consistent reads, so the only way is a new table with LSI `byTotal`, then copying the data over. Adding a GSI and turning on `ConsistentRead` does not work: a GSI allows only eventually consistent reads and refuses that request.'
  - q:
      vi: Bảng có LSI. Một khách lớn có rất nhiều đơn. Giới hạn nào có thể chạm tới?
      en: The table has an LSI. One big customer has a huge number of orders. Which limit can it reach?
    options:
      - { vi: "Item collection của khách đó tối đa 10 GB (bảng cộng mọi LSI)", en: "That customer's item collection is capped at 10 GB (table plus every LSI)" }
      - { vi: "Mỗi khách tối đa 1.000 đơn", en: "At most 1,000 orders per customer" }
      - { vi: "Không giới hạn gì, LSI tự tách ra nhiều partition", en: "No limit at all, the LSI splits itself across partitions" }
    answer: 0
    why:
      vi: 'LSI (local secondary index) nằm cùng partition với item gốc, nên khi bảng có LSI, item collection của một khách (mọi item cùng partition key, cộng bản sao của chúng trong mọi LSI) phải vừa 10 GB. Chạm trần thì ghi thêm vào collection đó bị từ chối. Không có trần 1.000 đơn, và LSI không tự tách sang nhiều partition, chính vì nó phải đi cùng item gốc.'
      en: 'An LSI (local secondary index) lives in the same partition as the base items, so when a table has an LSI, one customer''s item collection (every item with that partition key, plus their copies in every LSI) must fit in 10 GB. At the cap, more writes to that collection are refused. There is no 1,000-order cap, and an LSI does not split itself across partitions, precisely because it must stay with the base items.'
---

## Mở bài

Bảng `Orders` sắp đơn của mỗi khách theo thời gian. Kế toán lại muốn đơn của một khách theo số tiền: lớn nhất trước, hoặc trong một khoảng tiền. Lọc sau khi đọc thì phải đọc mọi đơn của khách; có cách nào đọc đúng phần cần không?

## Ý chính

LSI giữ cùng partition key với bảng nhưng sắp item collection theo sort key khác. Bảng `Orders` sắp đơn của một khách theo `orderId` (bắt đầu bằng ngày); LSI `byTotal` sắp chính các đơn đó theo `total`. Query LSI là Query bảng thêm `IndexName`, và điều kiện khoảng (`>`, `BETWEEN`, …) trên `total` giờ là điều kiện khóa: chỉ phần trong khoảng bị đọc.

LSI đọc strongly consistent được, và có thể lấy thuộc tính chưa project từ bảng (tốn thêm lượt đọc). Cái giá: LSI chỉ tạo cùng lúc tạo bảng, dùng chung throughput với bảng, và mỗi item collection (bảng cộng các LSI) tối đa 10 GB.

Nhiều người nghĩ Query bảng rồi `FilterExpression` trên `total` cũng tốt như LSI vì kết quả giống nhau. Thật ra bộ lọc chạy sau khi đọc: `ScannedCount` là mọi đơn của khách, và capacity tính theo phần đã đọc. Với khách có hàng nghìn đơn, chênh lệch đó là hóa đơn.

Lab chạy bằng dynoxide. Bộ mô phỏng hỗ trợ LSI với `ConsistentRead`; khi LSI không project thuộc tính bạn xin bằng `ProjectionExpression`, nó chưa tự lấy từ bảng như DynamoDB thật, nên LSI trong bài dùng projection `ALL`.

## Cú pháp

```text
{"op": "Query", "input": {"TableName": "<table>", "IndexName": "<lsi>",
  "KeyConditionExpression": "<table pk> = :p [AND <lsi sk> (= | < | <= | > | >= | BETWEEN :a AND :b) :v]",
  "ExpressionAttributeValues": {...},
  ["ScanIndexForward": false,] ["Limit": <n>,] ["ConsistentRead": true]}}
```

- Partition key là của bảng; sort key là của LSI.
- `ConsistentRead: true` được phép trên LSI.
- `ScanIndexForward: false` + `Limit: 1`: giá trị lớn nhất, đọc đúng 1 item.

## Ví dụ

Các đơn của `C-02` theo số tiền, nhỏ trước:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

Bốn đơn, từ 210.000 tới 910.000, không cần sắp thêm.

Đơn lớn nhất của `C-10`, đọc strong:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-10"}}, "ScanIndexForward": false, "Limit": 1, "ConsistentRead": true}}
```

Một item (910.000), `ScannedCount` 1.

## Lỗi hay gặp

Query bảng rồi lọc theo tiền:

```json
// WRONG: reads every order of C-07, then filters
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":c": {"S": "C-07"}, ":x": {"N": "500000"}}}}
```

```json
// FIX: the LSI sort key is total, so the range is a key condition
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "customerId = :c AND #t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":c": {"S": "C-07"}, ":x": {"N": "500000"}}}}
```

Cùng 3 đơn, nhưng câu sai có `ScannedCount` 4 và thứ tự theo ngày; câu sửa đọc 3 và đã sắp theo tiền.

Bỏ partition key, chỉ đặt điều kiện trên `total`:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "#t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":x": {"N": "900000"}}}}
```

LSI vẫn chia theo `customerId`: một Query phải có bằng trên partition key. "Mọi đơn trên 900.000 của mọi khách" cần một GSI khác.

## Thực hành

Ba bước trên LSI `byTotal`: các đơn trên 500.000 của một khách (đọc strong), đơn lớn nhất của một khách, rồi các đơn trong một khoảng tiền. Bước 1 và 3 có thanh chi phí.

## Tóm tắt

- LSI: cùng partition key với bảng, sort key khác, sắp lại item collection.
- Điều kiện khoảng trên sort key của LSI là điều kiện khóa, chỉ đọc phần trong khoảng.
- LSI đọc strong được; chỉ tạo cùng bảng; item collection tối đa 10 GB.
- Query vẫn cần bằng trên partition key, kể cả trên LSI.

# EN

## Opening

Table `Orders` sorts each customer's orders by time. Accounting wants one customer's orders by amount instead: the largest first, or within a price range. Filtering after the read means reading every order of the customer; is there a way to read only the part you need?

## Key idea

An LSI keeps the same partition key as the table but sorts the item collection by a different sort key. Table `Orders` sorts a customer's orders by `orderId` (which starts with the date); LSI `byTotal` sorts the same orders by `total`. Querying an LSI is querying the table plus `IndexName`, and a range condition (`>`, `BETWEEN`, …) on `total` is now a key condition: only the part in range is read.

An LSI supports strongly consistent reads and can fetch unprojected attributes from the table (at an extra read cost). The price: an LSI is created only together with the table, shares the table's throughput, and each item collection (table plus LSIs) is capped at 10 GB.

Many people think a table Query with a `FilterExpression` on `total` is as good as the LSI because the result is the same. In fact the filter runs after the read: `ScannedCount` is every order of the customer, and capacity is charged on what was read. For a customer with thousands of orders, that difference is the bill.

The lab runs on dynoxide. The emulator supports LSIs with `ConsistentRead`; when an LSI does not project an attribute you request with `ProjectionExpression`, it does not yet fetch it from the table the way real DynamoDB does, so the LSI in this lesson uses an `ALL` projection.

## Syntax

```text
{"op": "Query", "input": {"TableName": "<table>", "IndexName": "<lsi>",
  "KeyConditionExpression": "<table pk> = :p [AND <lsi sk> (= | < | <= | > | >= | BETWEEN :a AND :b) :v]",
  "ExpressionAttributeValues": {...},
  ["ScanIndexForward": false,] ["Limit": <n>,] ["ConsistentRead": true]}}
```

- The partition key is the table's; the sort key is the LSI's.
- `ConsistentRead: true` is allowed on an LSI.
- `ScanIndexForward: false` + `Limit: 1`: the largest value, reading exactly 1 item.

## Example

The orders of `C-02` by amount, smallest first:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

Four orders, from 210,000 to 910,000, with no extra sort.

The largest order of `C-10`, read strongly:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-10"}}, "ScanIndexForward": false, "Limit": 1, "ConsistentRead": true}}
```

One item (910,000), `ScannedCount` 1.

## Common mistakes

Querying the table, then filtering on the amount:

```json
// WRONG: reads every order of C-07, then filters
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":c": {"S": "C-07"}, ":x": {"N": "500000"}}}}
```

```json
// FIX: the LSI sort key is total, so the range is a key condition
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "customerId = :c AND #t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":c": {"S": "C-07"}, ":x": {"N": "500000"}}}}
```

The same 3 orders, but the wrong one has a `ScannedCount` of 4 and comes in date order; the fix reads 3, already sorted by amount.

Dropping the partition key and putting a condition only on `total`:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byTotal", "KeyConditionExpression": "#t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":x": {"N": "900000"}}}}
```

The LSI is still split by `customerId`: a Query needs equality on the partition key. "Every order above 900,000 of every customer" needs a separate GSI.

## Practice

Three steps on LSI `byTotal`: one customer's orders above 500,000 (strong read), one customer's largest order, then the orders within a price range. Steps 1 and 3 have a cost bar.

## Recap

- LSI: same partition key as the table, another sort key, re-sorting the item collection.
- A range condition on the LSI sort key is a key condition and reads only the part in range.
- An LSI allows strong reads; it is created only with the table; an item collection is capped at 10 GB.
- A Query still needs equality on the partition key, on an LSI too.
