---
id: e-dy-l1-10
engine: dynamodb
level: L1
module: query-scan
title: "Phân trang: Limit, LastEvaluatedKey, ExclusiveStartKey"
title_en: "Pagination: Limit, LastEvaluatedKey, ExclusiveStartKey"
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Đọc một item collection theo từng trang bằng `Limit`.
    en: Read an item collection page by page with `Limit`.
  - vi: Lấy trang sau bằng cách đưa `LastEvaluatedKey` vào `ExclusiveStartKey`.
    en: Get the next page by passing `LastEvaluatedKey` as `ExclusiveStartKey`.
requires: [e-dy-l1-08]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
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
        vi: Màn hình lịch sử đơn hiện 2 đơn mỗi trang. Lấy trang đầu của khách `C-03`, đơn cũ trước. Để ý `LastEvaluatedKey`.
        en: The order history screen shows 2 orders per page. Get the first page for customer `C-03`, oldest first. Watch `LastEvaluatedKey`.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-03"}},
          "Limit": 2}}
      check: doc
      ordered: true
      expect: { Count: 2 }
      hint:
        vi: '`Limit` là số item tối đa mỗi lần gọi.'
        en: '`Limit` is the maximum number of items per call.'
    - task:
        vi: 'Trang 1 trả `LastEvaluatedKey` là `{"customerId": "C-03", "orderId": "2026-08-03#O-110"}`. Lấy trang 2.'
        en: 'Page 1 returned the `LastEvaluatedKey` `{"customerId": "C-03", "orderId": "2026-08-03#O-110"}`. Get page 2.'
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-03"}},
          "Limit": 2,
          "ExclusiveStartKey": {"customerId": {"S": "C-03"}, "orderId": {"S": "2026-08-03#O-110"}}}}
      check: doc
      ordered: true
      expect: { Count: 2 }
      hint:
        vi: 'Gửi lại đúng request đó, thêm `ExclusiveStartKey` bằng `LastEvaluatedKey` (viết ở DynamoDB JSON). Lần đọc bắt đầu ngay **sau** khóa đó.'
        en: 'Send the same request again with `ExclusiveStartKey` set to `LastEvaluatedKey` (in DynamoDB JSON). The read starts right **after** that key.'
---

## Ý chính

Một lần `Query` hoặc `Scan` dừng khi gặp điều nào tới trước:

- đã đọc `Limit` item;
- đã đọc 1 MB dữ liệu.

Nếu còn dữ liệu, phản hồi có `LastEvaluatedKey`: khóa của item cuối cùng đã đọc. Gửi lại request với `ExclusiveStartKey` bằng khóa đó để đọc tiếp. Khi phản hồi **không còn** `LastEvaluatedKey` thì đã hết.

`Limit` giới hạn số item **đọc**, không phải số item **trả về sau bộ lọc**. Với `FilterExpression`, một trang có thể trả ít hơn `Limit`, thậm chí 0 item mà vẫn còn `LastEvaluatedKey`.

## Ví dụ

Vòng lặp phân trang trong code ứng dụng:

```text
start = none
repeat:
  page = Query(..., Limit = 2, ExclusiveStartKey = start)
  show page.Items
  start = page.LastEvaluatedKey
until start is none
```

## Thực hành

`C-03` có 4 đơn, nên 2 trang là đủ. Khi item cuối nằm đúng ở ranh giới, DynamoDB có thể vẫn trả `LastEvaluatedKey`, và lần gọi sau trả 0 item. Code phải chịu được trường hợp đó.

# EN

## Key idea

A `Query` or `Scan` call stops at whichever comes first:

- it has read `Limit` items;
- it has read 1 MB of data.

If more data is left, the response carries `LastEvaluatedKey`: the key of the last item read. Send the request again with `ExclusiveStartKey` set to that key to keep reading. When the response has **no** `LastEvaluatedKey`, you are done.

`Limit` caps the items **read**, not the items **returned after the filter**. With a `FilterExpression`, a page can return fewer than `Limit` items, even 0, and still carry a `LastEvaluatedKey`.

## Example

The pagination loop in application code:

```text
start = none
repeat:
  page = Query(..., Limit = 2, ExclusiveStartKey = start)
  show page.Items
  start = page.LastEvaluatedKey
until start is none
```

## Practice

`C-03` has 4 orders, so 2 pages are enough. When the last item sits exactly on the boundary, DynamoDB may still return a `LastEvaluatedKey`, and the next call returns 0 items. Your code must cope with that.
