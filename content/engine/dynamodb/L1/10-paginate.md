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
figures: [{ name: dy-pagination, at: idea }]
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
    - task:
        vi: 'Màn hình đổi sang "mới nhất trước", vẫn 2 đơn mỗi trang. Trang 1 của `C-03` kết thúc ở `orderId` `2026-09-28#O-111`. Lấy trang 2.'
        en: 'The screen switches to "newest first", still 2 orders per page. Page 1 for `C-03` ended at `orderId` `2026-09-28#O-111`. Get page 2.'
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-03"}},
          "ScanIndexForward": false, "Limit": 2,
          "ExclusiveStartKey": {"customerId": {"S": "C-03"}, "orderId": {"S": "2026-09-28#O-111"}}}}
      check: doc
      ordered: true
      expect: { Count: 2 }
      hint:
        vi: 'Giữ `ScanIndexForward` là `false` ở mọi trang; lần đọc đi tiếp **sau** khóa đó theo chiều đang đọc.'
        en: 'Keep `ScanIndexForward` set to `false` on every page; the read carries on **after** that key in the current direction.'
quiz:
  - q:
      vi: '`Query` đơn của `C-03` với `"Limit": 2` và `FilterExpression` giữ đơn `NEW`. Phản hồi chắc chắn có 2 item không?'
      en: 'A `Query` for the orders of `C-03` with `"Limit": 2` and a `FilterExpression` that keeps `NEW` orders. Is the response sure to hold 2 items?'
    options:
      - vi: Có, `Limit` là số item trả về
        en: Yes, `Limit` is the number of items returned
      - vi: 'Không, `Limit` là số item đọc; bộ lọc có thể bỏ hết, kể cả trả 0 item'
        en: 'No, `Limit` is the number of items read; the filter may drop them all, even down to 0 items'
      - vi: Không, `Limit` bị bỏ qua khi có bộ lọc
        en: No, `Limit` is ignored when there is a filter
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì `LIMIT` của SQL đếm dòng trả về, nhưng `Limit` của DynamoDB dừng sau khi **đọc** đủ số item, rồi bộ lọc mới chạy. Hai đơn đầu của `C-03` không phải `NEW`, nên trang đầu trả 0 item và vẫn có `LastEvaluatedKey`. `Limit` cũng không bị bỏ qua: chính nó làm lần gọi dừng sau 2 item, nên đơn `NEW` thứ tư chưa được đọc tới.'
      en: 'It sounds right because SQL `LIMIT` counts returned rows, but DynamoDB `Limit` stops after **reading** that many items, and only then the filter runs. The first two orders of `C-03` are not `NEW`, so the first page returns 0 items and still carries a `LastEvaluatedKey`. `Limit` is not ignored either: it is what stops the call after 2 items, so the fourth order, the `NEW` one, is never reached.'
  - q:
      vi: Khi nào vòng lặp phân trang nên dừng?
      en: When should a pagination loop stop?
    options:
      - vi: Khi một trang trả ít hơn `Limit` item
        en: When a page returns fewer than `Limit` items
      - vi: 'Khi phản hồi không còn `LastEvaluatedKey`'
        en: 'When the response no longer has a `LastEvaluatedKey`'
      - vi: Khi một trang trả 0 item
        en: When a page returns 0 items
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì trang ngắn trông như trang cuối, nhưng một trang có thể ngắn vì bộ lọc bỏ bớt item hoặc vì lần gọi chạm 1 MB. Trang 0 item cũng chưa chắc là hết: như ví dụ đơn `NEW`, bộ lọc có thể bỏ cả hai item đã đọc trong khi phía sau còn đơn. Chỉ khi phản hồi thiếu `LastEvaluatedKey` (khóa để đọc trang tiếp) thì DynamoDB mới nói là đã đọc hết.'
      en: 'It sounds right because a short page looks like the last one, but a page can be short because the filter dropped items or the call hit the 1 MB cap. A page with 0 items is not proof either: as in the `NEW` orders example, the filter can drop both items read while more orders lie ahead. Only when the response lacks a `LastEvaluatedKey` (the key for reading the next page) has DynamoDB read everything.'
---
## Mở bài

Một khách có hàng trăm đơn, nhưng màn hình chỉ hiện vài đơn mỗi trang. Bạn đọc trang đầu, rồi làm sao đọc đúng trang tiếp theo mà không lặp hay sót đơn nào?

## Ý chính

Một lần `Query` hoặc `Scan` dừng khi gặp điều nào tới trước:

- đã đọc `Limit` item;
- đã đọc 1 MB dữ liệu.

Nếu còn dữ liệu, phản hồi có `LastEvaluatedKey`: khóa của item cuối cùng đã đọc. Gửi lại request với `ExclusiveStartKey` bằng khóa đó để đọc tiếp. Khi phản hồi **không còn** `LastEvaluatedKey` thì đã hết.

`Limit` giới hạn số item **đọc**, không phải số item **trả về sau bộ lọc**. Với `FilterExpression`, một trang có thể trả ít hơn `Limit`, thậm chí 0 item mà vẫn còn `LastEvaluatedKey`.

Khi item cuối nằm đúng ở ranh giới, DynamoDB có thể vẫn trả `LastEvaluatedKey`, và lần gọi sau trả 0 item. Code phải chịu được trường hợp đó.

Hình từng bước ở cuối mục này đọc 4 đơn của C-01 với `Limit` 2: lần gọi 2 vẫn trả `LastEvaluatedKey`, và chỉ lần gọi 3, trả 0 item, mới cho biết đã hết.

## Cú pháp

```text
start = none
repeat:
  page = Query(..., Limit = 2, ExclusiveStartKey = start)
  show page.Items
  start = page.LastEvaluatedKey
until start is none
```

- `ExclusiveStartKey` là khóa chính đầy đủ (với bảng khóa kép: cả partition key lẫn sort key), viết ở DynamoDB JSON.
- Mọi trang gửi cùng điều kiện, cùng `ScanIndexForward`.

## Ví dụ

Ba đơn đầu của `C-03`, cũ trước; phản hồi có `LastEvaluatedKey`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-03"}}, "Limit": 3}}
```

Ba đơn `O-109`, `O-110`, `O-111` về với `ScannedCount` 3, và `LastEvaluatedKey` là khóa của `O-111`, item cuối đã đọc.

Trang tiếp theo bắt đầu ngay sau `2026-09-28#O-111`, còn một đơn:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-03"}}, "Limit": 3, "ExclusiveStartKey": {"customerId": {"S": "C-03"}, "orderId": {"S": "2026-09-28#O-111"}}}}
```

Trang này có một đơn, `O-112`, và phản hồi không còn `LastEvaluatedKey`: đã đọc hết.

## Lỗi hay gặp

Chỉ đưa partition key vào `ExclusiveStartKey`:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-03"}}, "Limit": 2, "ExclusiveStartKey": {"customerId": {"S": "C-03"}}}}
```

Dynoxide báo "The provided starting key is invalid": khóa bắt đầu phải là khóa chính đầy đủ. Chép nguyên `LastEvaluatedKey` vào, đừng tự dựng.

Dùng `Limit` cùng bộ lọc rồi tưởng trang rỗng là hết đơn `NEW`:

```json
// WRONG: Limit reads 2 items, the filter drops both, so the page is empty
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#s = :n", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":n": {"S": "NEW"}}, "Limit": 2}}
```

```json
// FIX: no Limit (or keep paging until there is no LastEvaluatedKey)
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#s = :n", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":n": {"S": "NEW"}}}}
```

Bản sai đọc 2 item, bộ lọc bỏ cả hai, nên trang trả 0 item mà vẫn có `LastEvaluatedKey`. Bản sửa đọc cả 4 item và trả đơn `O-112`. Trang rỗng chưa phải là hết; chỉ khi không còn `LastEvaluatedKey` mới là hết.

## Thực hành

`C-03` có 4 đơn, nên 2 trang là đủ cho mỗi chiều đọc. Bước được chấm theo đúng thứ tự item.

## Tóm tắt

- Mỗi lần gọi dừng ở `Limit` item đọc hoặc 1 MB.
- Còn dữ liệu thì có `LastEvaluatedKey`; đưa nó vào `ExclusiveStartKey`.
- Chỉ dừng khi không còn `LastEvaluatedKey`.
- `Limit` đếm item đọc, không đếm item sau bộ lọc.

# EN

## Opening

A customer has hundreds of orders, but the screen shows only a few per page. You read the first page; how do you read exactly the next one, with no order repeated or missed?

## Key idea

A `Query` or `Scan` call stops at whichever comes first:

- it has read `Limit` items;
- it has read 1 MB of data.

If more data is left, the response carries `LastEvaluatedKey`: the key of the last item read. Send the request again with `ExclusiveStartKey` set to that key to keep reading. When the response has **no** `LastEvaluatedKey`, you are done.

`Limit` caps the items **read**, not the items **returned after the filter**. With a `FilterExpression`, a page can return fewer than `Limit` items, even 0, and still carry a `LastEvaluatedKey`.

When the last item sits exactly on the boundary, DynamoDB may still return a `LastEvaluatedKey`, and the next call returns 0 items. Your code must cope with that.

The step-through figure at the end of this section reads C-01's 4 orders with `Limit` 2: call 2 still returns `LastEvaluatedKey`, and only call 3, with 0 items, tells you the end has come.

## Syntax

```text
start = none
repeat:
  page = Query(..., Limit = 2, ExclusiveStartKey = start)
  show page.Items
  start = page.LastEvaluatedKey
until start is none
```

- `ExclusiveStartKey` is the full primary key (for a composite key: both the partition key and the sort key), in DynamoDB JSON.
- Every page sends the same condition and the same `ScanIndexForward`.

## Example

The first three orders of `C-03`, oldest first; the response carries a `LastEvaluatedKey`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-03"}}, "Limit": 3}}
```

Orders `O-109`, `O-110`, `O-111` come back with `ScannedCount` 3, and the `LastEvaluatedKey` is the key of `O-111`, the last item read.

The next page starts right after `2026-09-28#O-111`, with one order left:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-03"}}, "Limit": 3, "ExclusiveStartKey": {"customerId": {"S": "C-03"}, "orderId": {"S": "2026-09-28#O-111"}}}}
```

This page has one order, `O-112`, and the response has no `LastEvaluatedKey` any more: everything has been read.

## Common mistakes

Putting only the partition key into `ExclusiveStartKey`:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-03"}}, "Limit": 2, "ExclusiveStartKey": {"customerId": {"S": "C-03"}}}}
```

Dynoxide reports "The provided starting key is invalid": the start key must be the full primary key. Copy the `LastEvaluatedKey` as it is; do not build it yourself.

Using `Limit` with a filter and taking an empty page to mean there are no `NEW` orders:

```json
// WRONG: Limit reads 2 items, the filter drops both, so the page is empty
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#s = :n", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":n": {"S": "NEW"}}, "Limit": 2}}
```

```json
// FIX: no Limit (or keep paging until there is no LastEvaluatedKey)
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#s = :n", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":n": {"S": "NEW"}}}}
```

The wrong version reads 2 items, the filter drops both, so the page returns 0 items yet still has a `LastEvaluatedKey`. The fix reads all 4 items and returns order `O-112`. An empty page is not the end; only a missing `LastEvaluatedKey` is.

## Practice

`C-03` has 4 orders, so 2 pages are enough in each direction. Each step is graded in item order.

## Recap

- Each call stops at `Limit` items read or at 1 MB.
- More data means a `LastEvaluatedKey`; pass it as `ExclusiveStartKey`.
- Stop only when there is no `LastEvaluatedKey`.
- `Limit` counts items read, not items left after the filter.
