---
id: e-dy-l3-04
engine: dynamodb
level: L3
module: secondary
title: "Query trên GSI"
title_en: "Query a GSI"
kind: lab
runtime: browser
minutes: 12
objectives:
  - vi: Query một GSI bằng `IndexName` và khóa của index.
    en: Query a GSI with `IndexName` and the index's keys.
  - vi: Thấy GSI chỉ trả thuộc tính đã project và không đọc strong được.
    en: See that a GSI returns only projected attributes and has no strong reads.
  - vi: Thu hẹp phần đọc trên GSI bằng điều kiện trên sort key của index.
    en: Narrow the read on a GSI with a condition on the index sort key.
requires: [e-dy-l3-03]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
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
        vi: Kho cần mọi đơn đang ở trạng thái `NEW`, đơn cũ trước. Dùng GSI `byStatus` (khóa `status`, `orderId`; project thêm `total`).
        en: The warehouse needs every order whose status is `NEW`, oldest first. Use GSI `byStatus` (keys `status`, `orderId`; also projects `total`).
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus",
          "KeyConditionExpression": "#s = :s",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","IndexName":"byStatus","ExpressionAttributeNames":{"#s":"status"},"ExpressionAttributeValues":{":s":{"S":"NEW"}},"FilterExpression":"(#s = :s)"}}
      ordered: true
      hint:
        vi: 'Thêm `"IndexName": "byStatus"`; partition key của index là `status`, từ dành riêng.'
        en: 'Add `"IndexName": "byStatus"`; the index partition key is `status`, a reserved word.'
    - task:
        vi: Lấy 5 đơn `PAID` mới nhất từ GSI `byStatus`.
        en: Get the 5 most recent `PAID` orders from GSI `byStatus`.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus",
          "KeyConditionExpression": "#s = :s",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":s": {"S": "PAID"}},
          "ScanIndexForward": false, "Limit": 5}}
      check: doc
      ordered: true
      expect: { Count: 5, ScannedCount: 5 }
      hint:
        vi: Sort key của index là `orderId`, bắt đầu bằng ngày - đọc ngược và dừng ở 5.
        en: The index sort key is `orderId`, which starts with the date - read backwards and stop at 5.
    - task:
        vi: Lấy các đơn `SHIPPED` đặt trong tháng 10/2026 từ GSI `byStatus`. Bước này có thanh chi phí.
        en: Get the `SHIPPED` orders placed in October 2026 from GSI `byStatus`. This step has a cost bar.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus",
          "KeyConditionExpression": "#s = :s AND begins_with(orderId, :m)",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":s": {"S": "SHIPPED"}, ":m": {"S": "2026-10"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","IndexName":"byStatus","FilterExpression":"#s = :s AND begins_with(orderId, :m)","ExpressionAttributeNames":{"#s":"status"},"ExpressionAttributeValues":{":s":{"S":"SHIPPED"},":m":{"S":"2026-10"}}}}
      ordered: true
      hint:
        vi: 'Sort key của index là `orderId`, bắt đầu bằng ngày: `begins_with(orderId, :m)` thuộc `KeyConditionExpression`, không phải bộ lọc.'
        en: 'The index sort key is `orderId`, which starts with the date: `begins_with(orderId, :m)` belongs in the `KeyConditionExpression`, not a filter.'
quiz:
  - q:
      vi: 'Ở bước 1, nếu thêm `"ConsistentRead": true` thì sao?'
      en: 'In step 1, what happens if you add `"ConsistentRead": true`?'
    options:
      - vi: Đọc strong, giá gấp đôi.
        en: A strong read at twice the price.
      - vi: '`ValidationException` - GSI không hỗ trợ đọc strongly consistent.'
        en: '`ValidationException` - a GSI does not support strongly consistent reads.'
      - vi: DynamoDB bỏ qua tham số.
        en: DynamoDB ignores the parameter.
    answer: 1
    trap: 0
    why:
      vi: Nghe như GSI chỉ là một bảng khác nên đọc strong được như bảng gốc. Thật ra GSI cập nhật bất đồng bộ, nên DynamoDB từ chối `ConsistentRead`; bộ mô phỏng trả đúng lỗi này - "Consistent reads are not supported on global secondary indexes".
      en: It sounds as if a GSI is just another table, so it should allow strong reads like the base table. In fact a GSI is updated asynchronously, so DynamoDB refuses `ConsistentRead`; the emulator returns exactly this error - "Consistent reads are not supported on global secondary indexes".
  - q:
      vi: 'Query trên `byStatus` (project `INCLUDE` `total`) trả các đơn `NEW`. Trang cần thêm `city` của mỗi đơn. Làm sao?'
      en: 'A Query on `byStatus` (projecting `INCLUDE` `total`) returns the `NEW` orders. The page also needs each order''s `city`. How?'
    options:
      - { vi: "Thêm `city` vào `ProjectionExpression` của Query trên GSI", en: "Add `city` to the GSI Query's `ProjectionExpression`" }
      - { vi: "Project thêm `city` vào GSI, hoặc đọc từng đơn trên bảng gốc bằng khóa", en: "Project `city` into the GSI, or read each order from the base table by key" }
      - { vi: "Đổi Query sang `ConsistentRead`", en: "Switch the Query to `ConsistentRead`" }
    answer: 1
    why:
      vi: GSI chỉ giữ thuộc tính đã project và không đọc ngược về bảng, nên `ProjectionExpression` không tạo ra `city`. Project thêm (tốn lưu trữ và WCU cho index) hoặc đọc bảng gốc bằng khóa `customerId` + `orderId` có trong kết quả.
      en: A GSI holds only projected attributes and never reads back from the table, so `ProjectionExpression` cannot produce `city`. Project it (costing index storage and WCU) or read the base table with the `customerId` + `orderId` keys found in the result.
---

## Mở bài

Bảng `Orders` có 120 đơn, khóa theo khách. Kho chỉ muốn 18 đơn đang `NEW`, và không ai muốn đọc cả 120 để tìm chúng. GSI `byStatus` đã có sẵn: giờ đọc nó thế nào?

## Ý chính

Query một GSI giống Query bảng, thêm `IndexName`. `KeyConditionExpression` dùng khóa của index: ở đây partition key `status` và sort key `orderId`. Kết quả có thứ tự theo sort key của index, nên `ScanIndexForward` và `Limit` vẫn dùng được như trên bảng.

GSI khác bảng ở ba chỗ. Nó chỉ có thuộc tính đã project: `byStatus` mang khóa bảng (`customerId`, `orderId`), khóa index (`status`) và `total`; `city` không có. Nó không đọc strong được, vì được cập nhật bất đồng bộ. Và nhiều item có thể có cùng khóa index; DynamoDB không bắt khóa GSI phải duy nhất.

Nhiều người nghĩ đặt điều kiện vào `FilterExpression` cũng rẻ như vào khóa. Thật ra bộ lọc chạy sau khi đọc: Scan cả index rồi lọc trạng thái và tháng vẫn đọc mọi item của index. Điều kiện trên sort key của index (`begins_with(orderId, :m)`) mới thu hẹp phần đọc.

`status` là từ dành riêng của DynamoDB, nên phải viết qua `ExpressionAttributeNames` (`#s`). Lab chạy bằng dynoxide; `ScannedCount` là số đo thật.

## Cú pháp

```text
{"op": "Query", "input": {"TableName": "<table>", "IndexName": "<index>",
  "KeyConditionExpression": "<index pk> = :v [AND <index sk condition>]",
  ["ExpressionAttributeNames": {"#n": "<reserved word>"},]
  "ExpressionAttributeValues": {":v": {...}},
  ["ScanIndexForward": false,] ["Limit": <n>]}}
```

- `IndexName`: đọc index thay vì bảng.
- Khóa trong điều kiện là khóa của index, không phải của bảng.
- Không có `"ConsistentRead": true` trên GSI.
- Thuộc tính trả về chỉ gồm khóa và phần project.

## Ví dụ

Các đơn đang `NEW` qua GSI:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

18 đơn, `ScannedCount` cũng 18. Mỗi item chỉ có `customerId`, `orderId`, `status`, `total`.

Đơn `DELIVERED` gần nhất, đọc ngược trên sort key của index:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "DELIVERED"}}, "ScanIndexForward": false, "Limit": 1}}
```

Một item, `ScannedCount` 1: `Limit` dừng việc đọc, không chỉ cắt kết quả.

## Lỗi hay gặp

Scan cả bảng rồi lọc theo trạng thái:

```json
// WRONG: reads all 120 orders to return the NEW ones
{"op": "Scan", "input": {"TableName": "Orders", "FilterExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

```json
// FIX: the GSI is keyed on status
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

Câu sai có `ScannedCount` 120, câu sửa 18. Câu sai còn trả cả `city`, nên dễ tưởng nó "tốt hơn".

Xin đọc strong trên GSI:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}, "ConsistentRead": true}}
```

GSI chỉ có đọc eventually consistent. Một đơn vừa đổi trạng thái có thể chưa hiện trong index ngay.

## Thực hành

Ba bước trên GSI `byStatus`: mọi đơn `NEW`, 5 đơn `PAID` mới nhất, rồi các đơn `SHIPPED` của tháng 10. Bước 1 và 3 có thanh chi phí: một Scan có lọc cho cùng item vẫn không đạt.

## Tóm tắt

- Query GSI = Query bảng + `IndexName`, điều kiện dùng khóa của index.
- GSI chỉ trả thuộc tính đã project và không đọc strong được.
- Điều kiện trên sort key của index thu hẹp phần đọc; `FilterExpression` thì không.
- Từ dành riêng như `status` đi qua `ExpressionAttributeNames`.

# EN

## Opening

Table `Orders` holds 120 orders, keyed by customer. The warehouse wants only the 18 `NEW` ones, and nobody wants to read all 120 to find them. GSI `byStatus` is already there: how do you read it?

## Key idea

Querying a GSI is like querying the table, plus `IndexName`. The `KeyConditionExpression` uses the index's keys: here partition key `status` and sort key `orderId`. Results come in the index's sort key order, so `ScanIndexForward` and `Limit` work just as on the table.

A GSI differs from the table in three ways. It has only its projected attributes: `byStatus` carries the table key (`customerId`, `orderId`), the index key (`status`) and `total`; `city` is not there. It has no strong reads, because it is updated asynchronously. And many items can share the same index key; DynamoDB does not require GSI keys to be unique.

Many people think a condition in `FilterExpression` is as cheap as one in the key. In fact the filter runs after the read: a Scan of the whole index filtered by status and month still reads every item of the index. A condition on the index sort key (`begins_with(orderId, :m)`) is what narrows the read.

`status` is a DynamoDB reserved word, so it must go through `ExpressionAttributeNames` (`#s`). The lab runs on dynoxide; `ScannedCount` is a real figure.

## Syntax

```text
{"op": "Query", "input": {"TableName": "<table>", "IndexName": "<index>",
  "KeyConditionExpression": "<index pk> = :v [AND <index sk condition>]",
  ["ExpressionAttributeNames": {"#n": "<reserved word>"},]
  "ExpressionAttributeValues": {":v": {...}},
  ["ScanIndexForward": false,] ["Limit": <n>]}}
```

- `IndexName`: read the index instead of the table.
- The keys in the condition are the index's keys, not the table's.
- No `"ConsistentRead": true` on a GSI.
- Returned attributes are only the keys and the projection.

## Example

The `NEW` orders through the GSI:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

18 orders, and `ScannedCount` is 18 too. Each item has only `customerId`, `orderId`, `status`, `total`.

The latest `DELIVERED` order, reading the index sort key backwards:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "DELIVERED"}}, "ScanIndexForward": false, "Limit": 1}}
```

One item, `ScannedCount` 1: `Limit` stops the read, it does not just cut the result.

## Common mistakes

Scanning the whole table and filtering on status:

```json
// WRONG: reads all 120 orders to return the NEW ones
{"op": "Scan", "input": {"TableName": "Orders", "FilterExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

```json
// FIX: the GSI is keyed on status
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

The wrong one has a `ScannedCount` of 120, the fix 18. The wrong one also returns `city`, so it is easy to think it is "better".

Asking for a strong read on a GSI:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "byStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}, "ConsistentRead": true}}
```

A GSI has only eventually consistent reads. An order whose status just changed may not show in the index right away.

## Practice

Three steps on GSI `byStatus`: every `NEW` order, the 5 latest `PAID` orders, then the `SHIPPED` orders of October. Steps 1 and 3 have a cost bar: a filtered Scan gives the same items and still does not pass.

## Recap

- Query a GSI = Query the table + `IndexName`; the condition uses the index's keys.
- A GSI returns only projected attributes and has no strong reads.
- A condition on the index sort key narrows the read; `FilterExpression` does not.
- Reserved words like `status` go through `ExpressionAttributeNames`.
