---
id: e-dy-l3-06
engine: dynamodb
level: L3
module: secondary
title: "Sparse index: index chỉ chứa item đáng quan tâm"
title_en: "Sparse index: an index that holds only the items that matter"
figures: [{ name: dy-sparse-gsi, at: idea }]
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Giải thích vì sao item thiếu thuộc tính khóa của GSI không vào GSI.
    en: Explain why an item missing a GSI key attribute stays out of the GSI.
  - vi: Dùng sparse index để đọc "việc đang mở" mà không Scan cả bảng.
    en: Use a sparse index to read "open work" without scanning the whole table.
  - vi: Thu hẹp việc đọc sparse index bằng điều kiện trên sort key của nó.
    en: Narrow a read of the sparse index with a condition on its sort key.
requires: [e-dy-l3-04]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html, title_vi: "Thực hành tốt: index thưa" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html, title_vi: "Global secondary index (GSI)" }
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
        vi: Chỉ đơn `NEW` mới có thuộc tính `openSince`. GSI `openOrders` có khóa `city` + `openSince` (project `KEYS_ONLY`). Lấy các đơn đang mở ở "Hue", cũ nhất trước.
        en: Only `NEW` orders carry the attribute `openSince`. GSI `openOrders` is keyed on `city` + `openSince` (projection `KEYS_ONLY`). Get the open orders in "Hue", oldest first.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "openOrders",
          "KeyConditionExpression": "city = :c",
          "ExpressionAttributeValues": {":c": {"S": "Hue"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","IndexName":"openOrders","ExpressionAttributeValues":{":c":{"S":"Hue"}},"FilterExpression":"(city = :c)"}}
      ordered: true
      hint:
        vi: Partition key của index là `city`; sort key `openSince` cho thứ tự thời gian.
        en: The index partition key is `city`; the sort key `openSince` gives time order.
    - task:
        vi: Bảng điều phối cần mọi đơn đang mở ở mọi thành phố. Đọc thẳng cả GSI `openOrders`, rồi so `ScannedCount` với 120 đơn của bảng.
        en: The dispatch board needs every open order in every city. Read the whole GSI `openOrders` directly, and compare `ScannedCount` with the table's 120 orders.
      solution: |
        {"op": "Scan", "input": {"TableName": "Orders", "IndexName": "openOrders"}}
      check: doc
      expect: { ScannedCount: 18, Count: 18 }
      hint:
        vi: '`Scan` cũng nhận `IndexName`. Index chỉ có 18 item vì chỉ 18 đơn có `openSince`.'
        en: '`Scan` also takes an `IndexName`. The index holds only 18 items because only 18 orders have `openSince`.'
    - task:
        vi: Điều phối "Da Nang" chỉ cần các đơn mở từ ngày 2026-10-06 trở đi. Đọc từ GSI `openOrders`. Bước này có thanh chi phí.
        en: The "Da Nang" dispatcher needs only the orders open since 2026-10-06 or later. Read from GSI `openOrders`. This step has a cost bar.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders", "IndexName": "openOrders",
          "KeyConditionExpression": "city = :c AND openSince >= :d",
          "ExpressionAttributeValues": {":c": {"S": "Da Nang"}, ":d": {"S": "2026-10-06"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","IndexName":"openOrders","ExpressionAttributeValues":{":c":{"S":"Da Nang"},":d":{"S":"2026-10-06"}},"FilterExpression":"city = :c AND openSince >= :d"}}
      expect: { Count: 4, ScannedCount: 4 }
      hint:
        vi: '`openSince` là sort key của index: `>=` thuộc `KeyConditionExpression`.'
        en: '`openSince` is the index sort key: `>=` belongs in the `KeyConditionExpression`.'
quiz:
  - q:
      vi: Đơn `O-108` vừa giao xong. Làm sao để nó rời khỏi GSI `openOrders`?
      en: Order `O-108` has just been delivered. How does it leave GSI `openOrders`?
    options:
      - { vi: "Đổi `status` thành `DELIVERED`; index tự hiểu", en: "Set `status` to `DELIVERED`; the index understands" }
      - { vi: "`REMOVE openSince` trong cùng lệnh cập nhật; item thiếu khóa index nên bị xóa khỏi index", en: "`REMOVE openSince` in the same update; the item lacks the index key, so it is deleted from the index" }
      - { vi: "Gọi `DeleteItem` trên index", en: "Call `DeleteItem` on the index" }
    answer: 1
    trap: 0
    why:
      vi: 'Đổi sang `DELIVERED` chưa đủ: `openOrders` không có khóa `status`, nó chỉ xét item có `openSince` hay không, nên còn `openSince` thì đơn còn trong index. `DeleteItem` cũng không được vì index không nhận lệnh ghi trực tiếp. `REMOVE openSince` làm item thiếu khóa index, và DynamoDB tự xóa bản sao trong index.'
      en: 'Setting `DELIVERED` is not enough: `openOrders` has no `status` key, it only checks whether the item has `openSince`, so while `openSince` stays the order stays in the index. `DeleteItem` fails too, because an index takes no direct writes. `REMOVE openSince` leaves the item without the index key, and DynamoDB deletes its copy from the index.'
  - q:
      vi: 102 đơn không có `openSince` được ghi vào bảng. GSI `openOrders` tốn gì cho chúng?
      en: 102 orders without `openSince` are written to the table. What does GSI `openOrders` cost for them?
    options:
      - { vi: "Không gì: item không vào index thì index không phải ghi và không lưu", en: "Nothing: an item that never enters the index needs no index write and no storage" }
      - { vi: "Một WCU mỗi đơn, như mọi index", en: "One WCU per order, as for every index" }
      - { vi: "Một nửa WCU mỗi đơn", en: "Half a WCU per order" }
    answer: 0
    why:
      vi: 'GSI chỉ ghi khi item có đủ khóa index (hoặc vừa mất khóa, lúc đó index xóa bản sao). 102 đơn này không có `openSince` nên không vào `openOrders`: không lưu và không tốn WCU (write capacity unit, đơn vị ghi) nào cho index. "Một WCU mỗi đơn" chỉ đúng với item thật sự vào index; không có mức "nửa WCU" cho lượt ghi.'
      en: 'A GSI writes only when an item has every index key (or has just lost one, when the index deletes its copy). These 102 orders have no `openSince`, so they never enter `openOrders`: no storage and no WCU (write capacity units) for the index. "One WCU per order" holds only for items that do enter the index; there is no "half WCU" for a write.'
---

## Mở bài

Bảng điều phối chỉ cần 18 đơn đang mở trong 120 đơn, và số đơn đã giao sẽ còn tăng mãi. Một index trên `status` vẫn giữ cả đơn đã giao. Có cách nào để index chỉ chứa đúng việc đang mở không?

## Ý chính

DynamoDB chỉ ghi một item vào GSI khi item có đủ thuộc tính khóa của GSI. Item thiếu thì bị bỏ qua: không lưu trong index, không tốn WCU cho index. Index như vậy gọi là sparse (thưa).

Mẹo dùng: thêm một thuộc tính "cờ" chỉ khi item ở trạng thái cần theo dõi, và xóa nó (`REMOVE`) khi xong việc. Đơn mới thì `SET openSince = :d` và vào index; đơn đã giao thì `REMOVE openSince` và tự rời index. Chọn giá trị cờ có ích luôn: ở đây `openSince` là ngày mở đơn, làm sort key để đơn cũ nhất đứng đầu.

Nhiều người nghĩ đổi `status` là đủ để đơn rời index. Thật ra `openOrders` không có khóa `status`; chỉ việc có hay không có `openSince` mới quyết định. Ngược lại, Scan index chỉ đọc đúng phần việc đang mở, rẻ hơn rất nhiều so với Scan bảng có bộ lọc.

Lab chạy bằng dynoxide; `ScannedCount` là số đo thật.

Hình dưới vẽ ba đơn ở Hue: đơn không có openSince không vào index.

## Cú pháp

```text
{"op": "UpdateItem", "input": {..., "UpdateExpression": "SET openSince = :d"}}   -> enters the sparse index
{"op": "UpdateItem", "input": {..., "UpdateExpression": "REMOVE openSince"}}     -> leaves the sparse index
{"op": "Query", "input": {"TableName": "<t>", "IndexName": "<sparse>", "KeyConditionExpression": "city = :c [AND openSince >= :d]", ...}}
{"op": "Scan",  "input": {"TableName": "<t>", "IndexName": "<sparse>"}}
```

- Thuộc tính cờ chỉ có mặt khi item cần được theo dõi.
- Scan một sparse index chỉ đọc các item có cờ.
- Giá trị khóa index không được là chuỗi rỗng.

## Ví dụ

Các đơn đang mở ở "Hue", cũ nhất trước:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "openOrders", "KeyConditionExpression": "city = :c", "ExpressionAttributeValues": {":c": {"S": "Hue"}}}}
```

Bốn đơn, mỗi item chỉ có khóa (`KEYS_ONLY`): `customerId`, `orderId`, `city`, `openSince`.

Cả bảng điều phối, đọc thẳng cả index:

```json
{"op": "Scan", "input": {"TableName": "Orders", "IndexName": "openOrders"}}
```

18 item, `ScannedCount` 18: index chỉ chứa đơn có `openSince`.

## Lỗi hay gặp

Scan bảng rồi lọc trạng thái:

```json
// WRONG: reads all 120 orders to find 18
{"op": "Scan", "input": {"TableName": "Orders", "FilterExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

```json
// FIX: the sparse index holds only the open orders
{"op": "Scan", "input": {"TableName": "Orders", "IndexName": "openOrders"}}
```

Câu sai có `ScannedCount` 120, câu sửa 18. Bảng càng nhiều đơn cũ, câu sai càng đắt, còn câu sửa thì không đổi.

Đặt cờ bằng chuỗi rỗng thay vì xóa nó:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}}, "UpdateExpression": "SET openSince = :e", "ExpressionAttributeValues": {":e": {"S": ""}}}}
```

`openSince` là khóa của index, và giá trị khóa không được rỗng. Dùng `REMOVE openSince` để đơn rời index.

## Thực hành

Ba bước trên GSI `openOrders`: đơn mở ở một thành phố, toàn bộ index, rồi đơn mở từ một ngày trở đi. Bước 1 và 3 có thanh chi phí.

## Tóm tắt

- Item thiếu khóa của GSI không vào GSI: đó là sparse index.
- `SET` cờ để vào index, `REMOVE` cờ để rời index.
- Scan một sparse index chỉ đọc việc đang theo dõi, không phải cả bảng.
- Giá trị cờ nên có ích: ở đây ngày mở đơn làm sort key.

# EN

## Opening

The dispatch board needs only the 18 open orders out of 120, and the number of delivered orders will keep growing. An index on `status` still holds every delivered order. Is there a way for an index to hold only the open work?

## Key idea

DynamoDB writes an item into a GSI only when the item has every key attribute of the GSI. Items missing one are skipped: not stored in the index, no WCU spent on the index. Such an index is called sparse.

The trick: add a "flag" attribute only while the item is in a state you want to track, and remove it (`REMOVE`) when the work is done. A new order gets `SET openSince = :d` and enters the index; a delivered order gets `REMOVE openSince` and leaves it by itself. Make the flag's value useful too: here `openSince` is the date the order opened, used as the sort key so the oldest order comes first.

Many people think changing `status` is enough for an order to leave the index. In fact `openOrders` has no `status` key; only having or not having `openSince` decides. In return, a Scan of the index reads only the open work, far cheaper than a filtered Scan of the table.

The lab runs on dynoxide; `ScannedCount` is a real figure.

The figure below draws three orders in Hue: the one without openSince is not in the index.

## Syntax

```text
{"op": "UpdateItem", "input": {..., "UpdateExpression": "SET openSince = :d"}}   -> enters the sparse index
{"op": "UpdateItem", "input": {..., "UpdateExpression": "REMOVE openSince"}}     -> leaves the sparse index
{"op": "Query", "input": {"TableName": "<t>", "IndexName": "<sparse>", "KeyConditionExpression": "city = :c [AND openSince >= :d]", ...}}
{"op": "Scan",  "input": {"TableName": "<t>", "IndexName": "<sparse>"}}
```

- The flag attribute exists only while the item must be tracked.
- A Scan of a sparse index reads only the flagged items.
- An index key value cannot be an empty string.

## Example

The open orders in "Hue", oldest first:

```json
{"op": "Query", "input": {"TableName": "Orders", "IndexName": "openOrders", "KeyConditionExpression": "city = :c", "ExpressionAttributeValues": {":c": {"S": "Hue"}}}}
```

Four orders, each item holding only keys (`KEYS_ONLY`): `customerId`, `orderId`, `city`, `openSince`.

The whole dispatch board, reading the whole index:

```json
{"op": "Scan", "input": {"TableName": "Orders", "IndexName": "openOrders"}}
```

18 items, `ScannedCount` 18: the index holds only orders with `openSince`.

## Common mistakes

Scanning the table and filtering on status:

```json
// WRONG: reads all 120 orders to find 18
{"op": "Scan", "input": {"TableName": "Orders", "FilterExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "NEW"}}}}
```

```json
// FIX: the sparse index holds only the open orders
{"op": "Scan", "input": {"TableName": "Orders", "IndexName": "openOrders"}}
```

The wrong one has a `ScannedCount` of 120, the fix 18. The more old orders the table holds, the dearer the wrong one gets, while the fix stays the same.

Setting the flag to an empty string instead of removing it:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Orders", "Key": {"customerId": {"S": "C-02"}, "orderId": {"S": "2026-10-03#O-108"}}, "UpdateExpression": "SET openSince = :e", "ExpressionAttributeValues": {":e": {"S": ""}}}}
```

`openSince` is an index key, and a key value cannot be empty. Use `REMOVE openSince` so the order leaves the index.

## Practice

Three steps on GSI `openOrders`: the open orders of one city, the whole index, then the orders open since a given date. Steps 1 and 3 have a cost bar.

## Recap

- An item missing a GSI's key does not enter the GSI: that is a sparse index.
- `SET` the flag to enter the index, `REMOVE` it to leave.
- A Scan of a sparse index reads only the tracked work, not the whole table.
- Make the flag's value useful: here the open date is the sort key.
