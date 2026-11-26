---
id: e-dy-l2-02
engine: dynamodb
level: L2
module: expressions
title: "Điều kiện trên khóa hay trên bộ lọc"
title_en: "Condition on the key or in the filter"
kind: lab
runtime: browser
minutes: 12
figures: [{ name: dy-read-pipeline, at: idea }]
objectives:
  - vi: Viết `FilterExpression` với tên thay thế cho từ dành riêng.
    en: Write a `FilterExpression` with stand-in names for reserved words.
  - vi: Đưa điều kiện về sort key khi có thể, để đọc ít item hơn.
    en: Move a condition onto the sort key whenever possible, so fewer items are read.
requires: [e-dy-l2-01]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
lab:
  setup: |
    {"tables": [{"TableName":"Orders","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"customerId","AttributeType":"S"},{"AttributeName":"orderId","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
     "items": {"Orders": [
      {"customerId":"C-01","orderId":"2026-07-28#O-101","status":"DELIVERED","total":770000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-08-28#O-102","status":"DELIVERED","total":770000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-09-17#O-103","status":"SHIPPED","total":800000,"city":"Quy Nhon"},
      {"customerId":"C-01","orderId":"2026-10-19#O-104","status":"DELIVERED","total":120000,"city":"Quy Nhon"},
      {"customerId":"C-02","orderId":"2026-07-25#O-105","status":"SHIPPED","total":640000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-08-26#O-106","status":"PAID","total":910000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-09-17#O-107","status":"DELIVERED","total":210000,"city":"Da Nang"},
      {"customerId":"C-02","orderId":"2026-10-03#O-108","status":"NEW","total":820000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-07-05#O-109","status":"SHIPPED","total":560000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-08-03#O-110","status":"PAID","total":310000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-09-28#O-111","status":"DELIVERED","total":750000,"city":"Da Nang"},
      {"customerId":"C-03","orderId":"2026-10-13#O-112","status":"NEW","total":580000,"city":"Da Nang"},
      {"customerId":"C-04","orderId":"2026-07-15#O-113","status":"SHIPPED","total":420000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-08-16#O-114","status":"DELIVERED","total":900000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-09-02#O-115","status":"SHIPPED","total":120000,"city":"Hue"},
      {"customerId":"C-04","orderId":"2026-10-15#O-116","status":"SHIPPED","total":130000,"city":"Hue"},
      {"customerId":"C-05","orderId":"2026-07-24#O-117","status":"DELIVERED","total":440000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-08-02#O-118","status":"DELIVERED","total":260000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-09-09#O-119","status":"DELIVERED","total":670000,"city":"Hoi An"},
      {"customerId":"C-05","orderId":"2026-10-20#O-120","status":"NEW","total":680000,"city":"Hoi An"},
      {"customerId":"C-06","orderId":"2026-07-18#O-121","status":"PAID","total":280000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-08-25#O-122","status":"SHIPPED","total":440000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-09-22#O-123","status":"DELIVERED","total":80000,"city":"Hue"},
      {"customerId":"C-06","orderId":"2026-10-18#O-124","status":"NEW","total":690000,"city":"Hue"},
      {"customerId":"C-07","orderId":"2026-07-23#O-125","status":"PAID","total":210000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-08-08#O-126","status":"DELIVERED","total":790000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-09-02#O-127","status":"DELIVERED","total":690000,"city":"Hoi An"},
      {"customerId":"C-07","orderId":"2026-10-05#O-128","status":"PAID","total":680000,"city":"Hoi An"},
      {"customerId":"C-08","orderId":"2026-07-17#O-129","status":"SHIPPED","total":680000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-08-20#O-130","status":"SHIPPED","total":440000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-09-07#O-131","status":"SHIPPED","total":660000,"city":"Da Nang"},
      {"customerId":"C-08","orderId":"2026-10-06#O-132","status":"NEW","total":590000,"city":"Da Nang"},
      {"customerId":"C-09","orderId":"2026-07-23#O-133","status":"PAID","total":280000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-08-26#O-134","status":"DELIVERED","total":790000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-09-18#O-135","status":"SHIPPED","total":710000,"city":"Hoi An"},
      {"customerId":"C-09","orderId":"2026-10-01#O-136","status":"NEW","total":140000,"city":"Hoi An"},
      {"customerId":"C-10","orderId":"2026-07-24#O-137","status":"SHIPPED","total":90000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-08-01#O-138","status":"PAID","total":910000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-09-12#O-139","status":"PAID","total":490000,"city":"Quy Nhon"},
      {"customerId":"C-10","orderId":"2026-10-04#O-140","status":"NEW","total":400000,"city":"Quy Nhon"},
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
      {"customerId":"C-13","orderId":"2026-10-25#O-152","status":"NEW","total":170000,"city":"Quy Nhon"},
      {"customerId":"C-14","orderId":"2026-07-27#O-153","status":"SHIPPED","total":620000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-08-06#O-154","status":"SHIPPED","total":640000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-09-06#O-155","status":"SHIPPED","total":480000,"city":"Hue"},
      {"customerId":"C-14","orderId":"2026-10-17#O-156","status":"NEW","total":440000,"city":"Hue"},
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
      {"customerId":"C-17","orderId":"2026-10-08#O-168","status":"NEW","total":400000,"city":"Da Nang"},
      {"customerId":"C-18","orderId":"2026-07-21#O-169","status":"SHIPPED","total":710000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-08-01#O-170","status":"SHIPPED","total":700000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-09-05#O-171","status":"PAID","total":910000,"city":"Quy Nhon"},
      {"customerId":"C-18","orderId":"2026-10-01#O-172","status":"NEW","total":160000,"city":"Quy Nhon"},
      {"customerId":"C-19","orderId":"2026-07-20#O-173","status":"SHIPPED","total":940000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-08-17#O-174","status":"PAID","total":370000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-09-06#O-175","status":"PAID","total":850000,"city":"Da Nang"},
      {"customerId":"C-19","orderId":"2026-10-06#O-176","status":"NEW","total":260000,"city":"Da Nang"},
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
      {"customerId":"C-23","orderId":"2026-10-28#O-192","status":"NEW","total":440000,"city":"Quy Nhon"},
      {"customerId":"C-24","orderId":"2026-07-20#O-193","status":"DELIVERED","total":720000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-08-10#O-194","status":"DELIVERED","total":160000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-09-22#O-195","status":"DELIVERED","total":800000,"city":"Hue"},
      {"customerId":"C-24","orderId":"2026-10-08#O-196","status":"NEW","total":440000,"city":"Hue"},
      {"customerId":"C-25","orderId":"2026-07-16#O-197","status":"DELIVERED","total":690000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-08-06#O-198","status":"PAID","total":590000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-09-11#O-199","status":"DELIVERED","total":870000,"city":"Da Nang"},
      {"customerId":"C-25","orderId":"2026-10-03#O-200","status":"NEW","total":460000,"city":"Da Nang"},
      {"customerId":"C-26","orderId":"2026-07-28#O-201","status":"SHIPPED","total":280000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-08-11#O-202","status":"SHIPPED","total":170000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-09-08#O-203","status":"SHIPPED","total":850000,"city":"Hoi An"},
      {"customerId":"C-26","orderId":"2026-10-12#O-204","status":"NEW","total":370000,"city":"Hoi An"},
      {"customerId":"C-27","orderId":"2026-07-27#O-205","status":"DELIVERED","total":730000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-08-06#O-206","status":"SHIPPED","total":480000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-09-02#O-207","status":"SHIPPED","total":810000,"city":"Hue"},
      {"customerId":"C-27","orderId":"2026-10-24#O-208","status":"NEW","total":260000,"city":"Hue"},
      {"customerId":"C-28","orderId":"2026-07-04#O-209","status":"SHIPPED","total":260000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-08-04#O-210","status":"PAID","total":550000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-09-20#O-211","status":"SHIPPED","total":530000,"city":"Hoi An"},
      {"customerId":"C-28","orderId":"2026-10-18#O-212","status":"PAID","total":850000,"city":"Hoi An"},
      {"customerId":"C-29","orderId":"2026-07-17#O-213","status":"SHIPPED","total":210000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-08-11#O-214","status":"SHIPPED","total":890000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-09-04#O-215","status":"SHIPPED","total":740000,"city":"Quy Nhon"},
      {"customerId":"C-29","orderId":"2026-10-18#O-216","status":"NEW","total":410000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-07-25#O-217","status":"DELIVERED","total":410000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-08-18#O-218","status":"DELIVERED","total":250000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-09-14#O-219","status":"SHIPPED","total":520000,"city":"Quy Nhon"},
      {"customerId":"C-30","orderId":"2026-10-18#O-220","status":"DELIVERED","total":240000,"city":"Quy Nhon"}
    ]}}
  steps:
    - task:
        vi: Lấy các đơn của `C-02` có `total` trên `500000`. Trước khi chạy, đoán `ScannedCount` bằng số đơn trả về hay bằng cả 4 đơn của khách, rồi so `Count` với `ScannedCount`.
        en: Get the orders of `C-02` whose `total` is above `500000`. Before you run it, guess whether `ScannedCount` equals the orders returned or all 4 orders of the customer, then compare `Count` with `ScannedCount`.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "FilterExpression": "#t > :x",
          "ExpressionAttributeNames": {"#t": "total"},
          "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeNames":{"#t":"total"},"ExpressionAttributeValues":{":c":{"S":"C-02"},":x":{"N":"500000"}},"FilterExpression":"(customerId = :c) AND (#t > :x)"}}
      ordered: true
      expect: { Count: 3, ScannedCount: 4 }
      hint:
        vi: '`total` là từ dành riêng - dùng `#t` và khai trong `ExpressionAttributeNames`.'
        en: '`total` is a reserved word - use `#t` and declare it in `ExpressionAttributeNames`.'
    - task:
        vi: Lấy đơn tháng 10/2026 của khách `C-21`, sao cho DynamoDB chỉ đọc đúng item cần trả về.
        en: Get the October 2026 order of customer `C-21` so that DynamoDB reads only the item it returns.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c AND begins_with(orderId, :m)",
          "ExpressionAttributeValues": {":c": {"S": "C-21"}, ":m": {"S": "2026-10"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeValues":{":c":{"S":"C-21"},":m":{"S":"2026-10"}},"FilterExpression":"(customerId = :c AND begins_with(orderId, :m))"}}
      ordered: true
      expect: { Count: 1, ScannedCount: 1 }
      hint:
        vi: Tháng nằm ở đầu sort key, nên điều kiện thuộc về `KeyConditionExpression`. Đặt nó vào bộ lọc sẽ bị từ chối, vì bộ lọc của Query không được dùng thuộc tính khóa.
        en: The month sits at the front of the sort key, so the condition belongs in the `KeyConditionExpression`. Putting it in the filter is rejected, because a Query filter cannot use key attributes.
    - task:
        vi: Lấy các đơn của `C-02`, nhưng chỉ trả `orderId`, `status` và `total`.
        en: Get the orders of `C-02`, returning only `orderId`, `status` and `total`.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "ProjectionExpression": "orderId, #s, #t",
          "ExpressionAttributeNames": {"#s": "status", "#t": "total"},
          "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeNames":{"#s":"status","#t":"total"},"ExpressionAttributeValues":{":c":{"S":"C-02"}},"ProjectionExpression":"orderId, #s, #t","FilterExpression":"(customerId = :c)"}}
      ordered: true
      hint:
        vi: '`ProjectionExpression` cũng phải dùng `#s`, `#t` cho từ dành riêng.'
        en: '`ProjectionExpression` must use `#s`, `#t` for reserved words too.'
quiz:
  - q:
      vi: Ở bước 1, bộ lọc bỏ đi 1 trong 4 đơn. Lượng capacity đọc thay đổi thế nào so với không lọc?
      en: In step 1 the filter dropped 1 of 4 orders. How does the read capacity change compared with no filter?
    options:
      - vi: Giảm một phần tư.
        en: It drops by a quarter.
      - vi: Không đổi - capacity tính theo item đã đọc, bộ lọc chạy sau khi đọc.
        en: It does not change - capacity is charged for items read, and the filter runs after reading.
      - vi: Bằng 0 cho item bị lọc bỏ.
        en: It is zero for the dropped item.
    answer: 1
    trap: 0
    why:
      vi: Nghe hợp lý vì trả về ít item hơn, nhưng FilterExpression chạy sau khi Query đã đọc cả 4 đơn của `C-02`. Capacity tính trên dữ liệu đã đọc (`ScannedCount` 4), không phải `Count` 3; bốn item nhỏ nằm trong một khối 4 KB, nên có lọc hay không vẫn là 1 khối × 0.5 = 0.5 RCU (read capacity unit, đơn vị đọc, đọc nhất quán cuối). Đơn `O-107` bị bỏ cũng không miễn phí, vì nó đã được đọc trước khi bị bỏ.
      en: It sounds right because fewer items come back, but a FilterExpression runs after the Query has read all 4 orders of `C-02`. Capacity is charged on what was read (`ScannedCount` 4), not on `Count` 3; four small items fit in one 4 KB block, so with or without the filter it is 1 block × 0.5 = 0.5 RCU (read capacity unit, eventually consistent read). The dropped order `O-107` is not free either, because it was read before it was dropped.
  - q:
      vi: 'Bạn chuyển điều kiện `begins_with(orderId, :m)` từ `KeyConditionExpression` sang `FilterExpression` của cùng Query. Chuyện gì xảy ra?'
      en: 'You move the condition `begins_with(orderId, :m)` from the `KeyConditionExpression` to the `FilterExpression` of the same Query. What happens?'
    options:
      - vi: Cùng kết quả, chỉ đọc nhiều item hơn
        en: The same result, it just reads more items
      - vi: '`ValidationException`, vì bộ lọc của Query không được dùng thuộc tính khóa'
        en: 'A `ValidationException`, because a Query filter cannot use key attributes'
      - vi: Kết quả rỗng
        en: An empty result
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì trên `Scan` đó đúng là chuyện xảy ra, nhưng Query từ chối bộ lọc nhắc tới partition key hay sort key. Request bị từ chối trước khi đọc, nên không có kết quả nào, kể cả kết quả rỗng. Điều kiện trên sort key chỉ có một chỗ: `KeyConditionExpression`.'
      en: 'It sounds right because that is what happens on a `Scan`, but a Query rejects a filter that mentions the partition key or the sort key. The request is refused before any read, so there is no result at all, not even an empty one. A sort key condition has one place only: the `KeyConditionExpression`.'
---

## Mở bài

Bạn cần đơn tháng 10 của một khách và lọc theo tháng trong `FilterExpression`. Kết quả có thể đúng, nhưng bạn trả tiền cho bao nhiêu item?

## Ý chính

Một Query đi qua ba bước:

- `KeyConditionExpression` chọn những item sẽ **đọc**.
- `FilterExpression` bỏ bớt item **đã đọc**.
- `ProjectionExpression` cắt bớt thuộc tính **trả về**.

Chỉ bước đầu làm giảm lượng đọc, tức giảm tiền. Bộ lọc và projection chỉ làm phản hồi gọn hơn.

Bộ lọc của Query không được nhắc tới partition key hay sort key. DynamoDB từ chối với lỗi `ValidationException`. Muốn lọc theo sort key, viết điều kiện đó trong `KeyConditionExpression`. Khi thiết kế khóa, đưa thứ hay lọc nhất (ngày, loại, trạng thái) vào đầu sort key.

Hình cuối mục này đếm item qua ba bước cho đơn của C-01: đọc 4, bộ lọc còn 3, projection chỉ giữ `total`; bạn trả tiền cho 4.

## Cú pháp

```text
"KeyConditionExpression": "customerId = :c AND begins_with(orderId, :m)",
"FilterExpression": "#t > :x",
"ProjectionExpression": "orderId, #t"
```

- Key condition: bằng trên partition key, thêm tối đa một điều kiện sort key.
- Filter: thuộc tính không phải khóa, chạy sau khi đọc.

## Ví dụ

Đơn của `C-02` trên 500000: `Count` 3, `ScannedCount` 4:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}}}}
```

Đơn `O-107` (210000) đã được đọc rồi mới bị bộ lọc bỏ, nên bạn vẫn trả tiền cho nó.

Tháng nằm ở đầu sort key, nên đơn tháng 9 của `C-03` chỉ đọc một item:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND begins_with(orderId, :m)", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":m": {"S": "2026-09"}}}}
```

Kết quả là đơn `O-111`, `ScannedCount` bằng 1: điều kiện tháng nằm trong khóa, nên không có item nào bị đọc thừa.

## Lỗi hay gặp

Đặt điều kiện sort key vào bộ lọc của Query:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "begins_with(orderId, :m)", "ExpressionAttributeValues": {":c": {"S": "C-21"}, ":m": {"S": "2026-10"}}}}
```

Thông báo nói rõ bộ lọc chỉ chứa được thuộc tính không thuộc khóa chính, và nêu tên `orderId`. Chuyển `begins_with(orderId, :m)` sang `KeyConditionExpression`.

Lọc theo khách bằng `Scan`:

```json
// WRONG: the same 4 orders, but every item of the table is read
{"op": "Scan", "input": {"TableName": "Orders", "FilterExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

```json
// FIX: the customer is the partition key
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

`ScannedCount` của `Scan` là 120, của Query là 4. Engine tính `Scan` 1 RCU (read capacity unit, đơn vị đọc), Query 0.5 RCU: tổng dữ liệu 120 item vượt một khối 4 KB nên thành 2 khối × 0.5 = 1, còn 4 item của Query nằm trong 1 khối × 0.5 = 0.5. Bảng chỉ có 120 item nhỏ nên chênh lệch còn nhỏ, nhưng `Scan` lớn dần theo cỡ bảng, còn Query chỉ theo cỡ item collection.

## Thực hành

Bảng `Orders` có 120 đơn của 30 khách, sort key `orderId` bắt đầu bằng ngày. So `Count` với `ScannedCount` sau mỗi lần chạy. Bước 1 lọc theo `total` qua `#t`. Bước 2 đưa tháng vào điều kiện khóa để chỉ đọc đúng item cần. Bước 3 thêm `ProjectionExpression` với tên thay thế. Cả ba bước có thanh hiệu năng: một `Scan` có lọc ra cùng item vẫn không đạt.

## Tóm tắt

- Key condition chọn item để đọc; filter bỏ bớt sau khi đọc.
- Capacity tính theo `ScannedCount`, không theo `Count`.
- Bộ lọc của Query không được dùng thuộc tính khóa.
- Đưa thứ hay lọc vào đầu sort key để lọc bằng key condition.

# EN

## Opening

You need one customer's October orders and filter on the month in the `FilterExpression`. The result may be right, but how many items do you pay for?

## Key idea

A Query goes through three steps:

- `KeyConditionExpression` chooses which items are **read**.
- `FilterExpression` drops items **already read**.
- `ProjectionExpression` trims the attributes **returned**.

Only the first step reduces what is read, which is what you pay for. The filter and the projection only make the response smaller.

A Query filter cannot mention the partition key or the sort key. DynamoDB rejects it with a `ValidationException`. To filter on the sort key, write that condition in the `KeyConditionExpression`. When designing a key, put what you filter on most (date, type, status) at the front of the sort key.

The figure at the end of this section counts items through the three steps for C-01's orders: 4 read, 3 left after the filter, the projection keeps only `total`; you pay for 4.

## Syntax

```text
"KeyConditionExpression": "customerId = :c AND begins_with(orderId, :m)",
"FilterExpression": "#t > :x",
"ProjectionExpression": "orderId, #t"
```

- Key condition: equality on the partition key, plus at most one sort key condition.
- Filter: non-key attributes, applied after reading.

## Example

The orders of `C-02` above 500000: `Count` 3, `ScannedCount` 4:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#t > :x", "ExpressionAttributeNames": {"#t": "total"}, "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":x": {"N": "500000"}}}}
```

Order `O-107` (210000) is read and only then dropped by the filter, so you still pay for it.

The month sits at the front of the sort key, so the September order of `C-03` reads one item:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND begins_with(orderId, :m)", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":m": {"S": "2026-09"}}}}
```

The result is order `O-111` with a `ScannedCount` of 1: the month condition is in the key, so no item is read for nothing.

## Common mistakes

Putting a sort key condition into the Query filter:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "begins_with(orderId, :m)", "ExpressionAttributeValues": {":c": {"S": "C-21"}, ":m": {"S": "2026-10"}}}}
```

The message says a filter can only hold attributes outside the primary key, and names `orderId`. Move `begins_with(orderId, :m)` into the `KeyConditionExpression`.

Filtering on the customer with a `Scan`:

```json
// WRONG: the same 4 orders, but every item of the table is read
{"op": "Scan", "input": {"TableName": "Orders", "FilterExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

```json
// FIX: the customer is the partition key
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}}}
```

The `Scan` has a `ScannedCount` of 120, the Query 4. The engine charges the `Scan` 1 RCU (read capacity unit) and the Query 0.5 RCU: the 120 items add up to more than one 4 KB block, so 2 blocks × 0.5 = 1, while the Query's 4 items fit in 1 block × 0.5 = 0.5. With only 120 small items the gap is still small, but a `Scan` grows with the table while a Query grows only with its item collection.

## Practice

Table `Orders` holds 120 orders of 30 customers; the sort key `orderId` starts with the date. Compare `Count` with `ScannedCount` after each run. Step 1 filters on `total` through `#t`. Step 2 moves the month into the key condition so only the needed item is read. Step 3 adds a `ProjectionExpression` with substitute names. All three steps have a performance bar: a filtered `Scan` that returns the same items does not pass.

## Recap

- A key condition picks the items to read; a filter drops items after reading.
- Capacity follows `ScannedCount`, not `Count`.
- A Query filter cannot use key attributes.
- Put what you filter on at the front of the sort key, so the key condition does the filtering.
