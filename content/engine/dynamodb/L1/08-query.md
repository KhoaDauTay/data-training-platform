---
id: e-dy-l1-08
engine: dynamodb
level: L1
module: query-scan
title: "Query: đọc một item collection"
title_en: "Query: read an item collection"
kind: lab
runtime: browser
minutes: 12
figures: [{ name: dy-query-vs-scan, at: idea, variant: query }]
objectives:
  - vi: Viết `KeyConditionExpression` với điều kiện bằng trên partition key.
    en: Write a `KeyConditionExpression` with an equality on the partition key.
  - vi: Thu hẹp theo sort key bằng `begins_with` và `BETWEEN`.
    en: Narrow by sort key with `begins_with` and `BETWEEN`.
  - vi: Đảo thứ tự bằng `ScanIndexForward` và lấy N item đầu bằng `Limit`.
    en: Reverse the order with `ScanIndexForward` and take the first N items with `Limit`.
requires: [e-dy-l1-04, e-dy-l1-05]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html, title_vi: "Query" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html, title_vi: "Query: điều kiện trên khóa (key condition expression)" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html, title_vi: "API Query" }
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
        vi: Lấy mọi đơn của khách `C-07`.
        en: Get every order of customer `C-07`.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-07"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeValues":{":c":{"S":"C-07"}},"FilterExpression":"(customerId = :c)"}}
      ordered: true
      hint:
        vi: 'Partition key luôn so bằng `=` với một chỗ giữ chỗ, ví dụ `customerId = :c`.'
        en: 'The partition key is always compared with `=` against a placeholder, for example `customerId = :c`.'
    - task:
        vi: Lấy các đơn của `C-07` trong tháng 9/2026. Nhớ `orderId` bắt đầu bằng ngày `YYYY-MM-DD`.
        en: Get the orders of `C-07` from September 2026. Remember `orderId` starts with the date `YYYY-MM-DD`.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c AND begins_with(orderId, :m)",
          "ExpressionAttributeValues": {":c": {"S": "C-07"}, ":m": {"S": "2026-09"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeValues":{":c":{"S":"C-07"},":m":{"S":"2026-09"}},"FilterExpression":"(customerId = :c AND begins_with(orderId, :m))"}}
      ordered: true
      hint:
        vi: 'Một tiền tố của sort key - `begins_with(orderId, :m)`.'
        en: 'A prefix of the sort key - `begins_with(orderId, :m)`.'
    - task:
        vi: Lấy các đơn của `C-02` từ 2026-08-01 tới hết 2026-09-30, đơn mới nhất trước.
        en: Get the orders of `C-02` from 2026-08-01 through the end of 2026-09-30, newest first.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c AND orderId BETWEEN :a AND :b",
          "ExpressionAttributeValues": {":c": {"S": "C-02"}, ":a": {"S": "2026-08-01"}, ":b": {"S": "2026-09-31"}},
          "ScanIndexForward": false}}
      check: doc
      ordered: true
      hint:
        vi: '`BETWEEN` so chuỗi theo byte và lấy cả hai đầu. Cận trên phải lớn hơn mọi `orderId` của ngày 30/9, ví dụ `2026-09-31`. `ScanIndexForward` là `false` để đảo thứ tự.'
        en: '`BETWEEN` compares strings byte by byte and includes both ends. The upper bound must sort after every `orderId` of 30 September, for example `2026-09-31`. Set `ScanIndexForward` to `false` to reverse the order.'
    - task:
        vi: Chỉ lấy đơn mới nhất của khách `C-05`.
        en: Get only the latest order of customer `C-05`.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-05"}},
          "ScanIndexForward": false, "Limit": 1}}
      check: doc
      ordered: true
      hint:
        vi: Đảo thứ tự rồi giới hạn số item đọc.
        en: Reverse the order, then cap how many items are read.
quiz:
  - q:
      vi: 'Bạn cần các đơn `NEW` của `C-07`. Đặt `#s = :n` (với `#s` là `status`) vào `KeyConditionExpression` được không?'
      en: 'You need the `NEW` orders of `C-07`. Can `#s = :n` (with `#s` standing for `status`) go into the `KeyConditionExpression`?'
    options:
      - vi: Được, mọi thuộc tính đều lọc được trong điều kiện khóa
        en: Yes, any attribute can be filtered in the key condition
      - vi: 'Không, điều kiện khóa chỉ nói về partition key và sort key; `status` thuộc `FilterExpression`'
        en: 'No, the key condition only covers the partition key and the sort key; `status` belongs in a `FilterExpression`'
      - vi: Được, nếu thêm `Limit`
        en: Yes, if you add `Limit`
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì `WHERE` của SQL nhận mọi cột, nhưng `KeyConditionExpression` chỉ chọn vùng đọc theo khóa. `status` không phải partition key hay sort key của `Orders`, nên đặt nó ở đó là `ValidationException`; nó thuộc `FilterExpression`, áp sau khi đọc item collection của `C-07`. Thêm `Limit` không đổi gì: `Limit` chỉ giới hạn số item đọc, không làm `status` thành khóa.'
      en: 'It sounds right because an SQL `WHERE` takes any column, but a `KeyConditionExpression` only picks the key range to read. `status` is neither the partition key nor the sort key of `Orders`, so putting it there is a `ValidationException`; it belongs in a `FilterExpression`, applied after the item collection of `C-07` is read. Adding `Limit` changes nothing: `Limit` only caps how many items are read, it does not turn `status` into a key.'
  - q:
      vi: '`Query` mọi đơn của `C-02` mà không có `ScanIndexForward`. Đơn về theo thứ tự nào?'
      en: '`Query` every order of `C-02` without `ScanIndexForward`. In what order do the orders come back?'
    options:
      - vi: Theo thứ tự được ghi vào bảng
        en: In the order they were written
      - vi: '`orderId` tăng dần'
        en: 'Ascending `orderId`'
      - vi: Không có thứ tự nhất định
        en: In no particular order
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý nếu nghĩ bảng như một file ghi nối đuôi, nhưng trong một item collection DynamoDB lưu item theo sort key. `Query` đọc tăng dần theo sort key, trừ khi `ScanIndexForward` là `false`. Thứ tự này được bảo đảm, không ngẫu nhiên: chỉ cả bảng (và `Scan`) mới không có thứ tự chung, còn trong một item collection thì luôn có.'
      en: 'It sounds right if a table were an append-only file, but inside an item collection DynamoDB stores items by sort key. `Query` reads in ascending sort key order unless `ScanIndexForward` is `false`. This order is guaranteed, not random: only the table as a whole (and a `Scan`) has no overall order, while one item collection always has one.'
---
## Mở bài

Màn hình lịch sử đơn cần các đơn của một khách trong một khoảng ngày, mới nhất trước. Bảng `Orders` có 120 đơn. Làm sao đọc đúng những đơn đó mà không chạm tới đơn của khách khác?

## Ý chính

`Query` đọc **một item collection**: mọi item có cùng partition key (khóa phân vùng), theo thứ tự sort key (khóa sắp xếp). `KeyConditionExpression` có hai phần:

- Partition key: **bắt buộc**, chỉ so `=`.
- Sort key: **tùy chọn**, một trong `=`, `<`, `<=`, `>`, `>=`, `BETWEEN … AND …`, `begins_with(…)`.

Không đặt được điều kiện lên thuộc tính thường trong `KeyConditionExpression`. Thứ đó là `FilterExpression` (bài sau và L2).

`ScanIndexForward: false` đảo chiều đọc (mặc định tăng dần). `Limit` giới hạn số item **được đọc**.

Sort key chuỗi được so theo byte UTF-8. Nhờ đặt ngày ở đầu `orderId`, khoảng ngày trở thành khoảng sort key. Cận trên "2026-09-30" sẽ **loại** đơn `2026-09-30#O-…`, vì chuỗi dài hơn đứng sau. Dùng một cận lớn hơn như "2026-09-31" hoặc "2026-09-30~".

Hình cuối mục này cho thấy `Query` với `customerId = C-01` đi thẳng tới 4 item của C-01, theo thứ tự sort key, và không chạm 116 item còn lại.

## Cú pháp

```text
"KeyConditionExpression": "<pk> = :p"
"KeyConditionExpression": "<pk> = :p AND <sk> BETWEEN :a AND :b"
"KeyConditionExpression": "<pk> = :p AND begins_with(<sk>, :prefix)"
"ScanIndexForward": false, "Limit": <n>
```

- Đúng một điều kiện `=` trên partition key.
- Tối đa một điều kiện trên sort key.

## Ví dụ

Các đơn tháng 8 của `C-03`, theo tiền tố của sort key:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND begins_with(orderId, :m)", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":m": {"S": "2026-08"}}}}
```

Kết quả là một đơn, `2026-08-03#O-110`, và `ScannedCount` bằng 1: `Query` chỉ chạm đúng item khớp khóa, không đọc 119 đơn còn lại.

Hai đơn mới nhất của `C-02`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}, "ScanIndexForward": false, "Limit": 2}}
```

Đơn `O-108` (3/10) về trước, rồi `O-107` (17/9). Vì `Limit` dừng việc đọc khi còn item, phản hồi kèm `LastEvaluatedKey`: dấu cho trang sau (bài 10).

## Lỗi hay gặp

Đặt điều kiện trên thuộc tính thường vào điều kiện khóa:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND city = :t", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":t": {"S": "Da Nang"}}}}
```

`city` không phải khóa, nên DynamoDB báo thiếu sort key trong điều kiện. Điều kiện trên thuộc tính thường đi vào `FilterExpression`, áp sau khi `Query` đã đọc các item mà điều kiện khóa chọn; item bị lọc bỏ vẫn tính vào capacity.

Lấy cận trên đúng bằng ngày cuối:

```json
// WRONG: "2026-09-28" sorts before "2026-09-28#O-111", so that order is left out
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND orderId BETWEEN :a AND :b", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":a": {"S": "2026-08-01"}, ":b": {"S": "2026-09-28"}}}}
```

```json
// FIX: an upper bound that sorts after every order of that day
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND orderId BETWEEN :a AND :b", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":a": {"S": "2026-08-01"}, ":b": {"S": "2026-09-28~"}}}}
```

Bản sai trả một đơn, bản sửa trả hai (`O-110` và `O-111` ngày 28/9). Không có lỗi nào báo cho bạn: đơn bị thiếu chỉ lộ ra khi đếm lại. Khi sort key ghép ngày với mã, hãy nghĩ cận trên như một chuỗi, không như một ngày.

## Thực hành

Bảng `Orders` có 120 đơn của 30 khách, mỗi khách 4 đơn từ tháng 7 tới tháng 10/2026. Kết quả Query có thứ tự, nên bước được chấm theo đúng thứ tự. Bước 1 đọc cả item collection của một khách. Bước 2 thu hẹp bằng tiền tố tháng. Bước 3 dùng `BETWEEN` với cận trên đủ lớn và đảo thứ tự. Bước 4 lấy đúng một item mới nhất. Hai bước đầu có thanh hiệu năng: một `Scan` có lọc ra cùng item vẫn không đạt.

## Tóm tắt

- `Query` đọc một item collection, theo thứ tự sort key.
- Partition key chỉ so `=`; sort key có `<`, `BETWEEN`, `begins_with`…
- Thuộc tính thường không vào được `KeyConditionExpression`.
- `ScanIndexForward: false` đảo thứ tự; `Limit` giới hạn số item đọc.
- Cận chuỗi so theo byte: chọn cận trên lớn hơn mọi giá trị muốn lấy.

# EN

## Opening

The order history screen needs one customer's orders in a date range, newest first. Table `Orders` holds 120 orders. How do you read exactly those orders without touching any other customer's?

## Key idea

`Query` reads **one item collection**: every item with the same partition key, in sort key order. A `KeyConditionExpression` has two parts:

- Partition key: **required**, compared only with `=`.
- Sort key: **optional**, one of `=`, `<`, `<=`, `>`, `>=`, `BETWEEN … AND …`, `begins_with(…)`.

You cannot put a condition on an ordinary attribute in the `KeyConditionExpression`. That is the job of a `FilterExpression` (next lesson and L2).

`ScanIndexForward: false` reverses the read direction (ascending by default). `Limit` caps how many items are **read**.

String sort keys compare by UTF-8 bytes. Because the date sits at the front of `orderId`, a date range becomes a sort key range. An upper bound of "2026-09-30" would **exclude** order `2026-09-30#O-…`, because the longer string sorts after it. Use a larger bound such as "2026-09-31" or "2026-09-30~".

The figure at the end of this section shows a `Query` with `customerId = C-01` going straight to C-01's 4 items, in sort-key order, without touching the other 116.

## Syntax

```text
"KeyConditionExpression": "<pk> = :p"
"KeyConditionExpression": "<pk> = :p AND <sk> BETWEEN :a AND :b"
"KeyConditionExpression": "<pk> = :p AND begins_with(<sk>, :prefix)"
"ScanIndexForward": false, "Limit": <n>
```

- Exactly one `=` condition on the partition key.
- At most one condition on the sort key.

## Example

The August orders of `C-03`, by a sort key prefix:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND begins_with(orderId, :m)", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":m": {"S": "2026-08"}}}}
```

The result is one order, `2026-08-03#O-110`, and `ScannedCount` is 1: `Query` touches only the item that matches the key and never reads the other 119 orders.

The two most recent orders of `C-02`:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-02"}}, "ScanIndexForward": false, "Limit": 2}}
```

Order `O-108` (3 October) comes first, then `O-107` (17 September). Because `Limit` stopped the read while items were left, the response carries a `LastEvaluatedKey`: the marker for the next page (lesson 10).

## Common mistakes

Putting a condition on an ordinary attribute into the key condition:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND city = :t", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":t": {"S": "Da Nang"}}}}
```

`city` is not a key, so DynamoDB reports that the sort key is missing from the condition. A condition on an ordinary attribute goes into a `FilterExpression`, applied after the `Query` has read the items the key condition selects; items filtered out still count toward capacity.

Using the last day itself as the upper bound:

```json
// WRONG: "2026-09-28" sorts before "2026-09-28#O-111", so that order is left out
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND orderId BETWEEN :a AND :b", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":a": {"S": "2026-08-01"}, ":b": {"S": "2026-09-28"}}}}
```

```json
// FIX: an upper bound that sorts after every order of that day
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c AND orderId BETWEEN :a AND :b", "ExpressionAttributeValues": {":c": {"S": "C-03"}, ":a": {"S": "2026-08-01"}, ":b": {"S": "2026-09-28~"}}}}
```

The wrong version returns one order, the fix returns two (`O-110` and `O-111` of 28 September). No error tells you: the missing order shows only when you count again. When the sort key joins a date and an id, treat the upper bound as a string, not as a date.

## Practice

Table `Orders` holds 120 orders of 30 customers, 4 orders each from July to October 2026. Query results have an order, so each step is graded in that order. Step 1 reads one customer's whole item collection. Step 2 narrows it with a month prefix. Step 3 uses `BETWEEN` with a large enough upper bound and reverses the order. Step 4 takes exactly the newest item. The first two steps have a performance bar: a filtered `Scan` that returns the same items still does not pass.

## Recap

- `Query` reads one item collection, in sort key order.
- The partition key takes only `=`; the sort key takes `<`, `BETWEEN`, `begins_with`…
- Ordinary attributes cannot go into the `KeyConditionExpression`.
- `ScanIndexForward: false` reverses the order; `Limit` caps the items read.
- String bounds compare by bytes: pick an upper bound above every value you want.
