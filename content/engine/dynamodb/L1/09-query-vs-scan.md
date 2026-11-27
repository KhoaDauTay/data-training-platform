---
id: e-dy-l1-09
engine: dynamodb
level: L1
module: query-scan
title: "Query và Scan: cùng kết quả, khác giá"
title_en: "Query and Scan: same result, different price"
kind: lab
runtime: browser
minutes: 10
figures: [{ name: dy-query-vs-scan, at: idea }]
objectives:
  - vi: Đọc `Count` và `ScannedCount` để biết request đã đọc bao nhiêu item.
    en: Read `Count` and `ScannedCount` to know how many items a request read.
  - vi: Giải thích vì sao Scan có lọc vẫn đọc cả bảng.
    en: Explain why a filtered Scan still reads the whole table.
requires: [e-dy-l1-08]
sources:
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html, title_vi: "Scan" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.html, title_vi: "Query" }
  - { url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-query-scan.html, title_vi: "Thực hành tốt: Query và Scan" }
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
        vi: Lấy mọi đơn của khách `C-12` bằng cách rẻ nhất. Để ý `ScannedCount` dưới kết quả.
        en: Get every order of customer `C-12` the cheapest way. Watch `ScannedCount` under the result.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-12"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeValues":{":c":{"S":"C-12"}},"FilterExpression":"(customerId = :c)"}}
      ordered: true
      expect: { Count: 4, ScannedCount: 4 }
      hint:
        vi: Khách là partition key, nên đây là một `Query`.
        en: The customer is the partition key, so this is a `Query`.
    - task:
        vi: Bây giờ lấy đúng các đơn đó bằng `Scan` có bộ lọc trên `customerId`. Trước khi chạy, đoán `ScannedCount` bằng 4 như bước 1 hay lớn hơn, rồi chạy và so.
        en: Now get the same orders with a `Scan` filtered on `customerId`. Before you run it, guess whether `ScannedCount` is 4 like step 1 or larger, then run it and compare.
      solution: |
        {"op": "Scan", "input": {"TableName": "Orders",
          "FilterExpression": "customerId = :c",
          "ExpressionAttributeValues": {":c": {"S": "C-12"}}}}
      check: doc
      expect: { Count: 4, ScannedCount: 120 }
      hint:
        vi: '`Scan` không có `KeyConditionExpression`; điều kiện đi vào `FilterExpression`.'
        en: '`Scan` has no `KeyConditionExpression`; the condition goes into `FilterExpression`.'
    - task:
        vi: Đếm số đơn đang ở trạng thái mới (`status` là `NEW`) trên toàn bảng, chỉ lấy con số, không lấy item.
        en: Count the orders whose `status` is `NEW` across the whole table, returning only the number, not the items.
      solution: |
        {"op": "Scan", "input": {"TableName": "Orders",
          "FilterExpression": "#s = :n",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":n": {"S": "NEW"}},
          "Select": "COUNT"}}
      check: doc
      expect: { ScannedCount: 120 }
      hint:
        vi: '`status` là từ dành riêng: viết `#s` trong biểu thức và khai `"#s": "status"` trong `ExpressionAttributeNames`. `Select` là `COUNT`.'
        en: '`status` is a reserved word: write `#s` in the expression and declare `"#s": "status"` in `ExpressionAttributeNames`. Set `Select` to `COUNT`.'
quiz:
  - q:
      vi: '`Scan` có `FilterExpression` trên `customerId` trả 4 đơn của `C-12`, bảng có 120 item. Bạn trả tiền cho bao nhiêu item?'
      en: 'A `Scan` with a `FilterExpression` on `customerId` returns the 4 orders of `C-12`, and the table holds 120 items. How many items do you pay for?'
    options:
      - vi: 4, số item được trả về (`Count`)
        en: 4, the items returned (`Count`)
      - vi: 120, số item đã đọc (`ScannedCount`)
        en: 120, the items read (`ScannedCount`)
      - vi: 0, vì bộ lọc chạy trước khi đọc
        en: 0, because the filter runs before the read
    answer: 1
    trap: 0
    why:
      vi: 'Bạn chỉ nhận về 4 item (`Count`), nhưng `Scan` đọc cả 120 item của bảng trước, rồi mới áp `FilterExpression` để bỏ những item không khớp. Giá tính theo phần đã đọc, tức `ScannedCount` = 120. Bộ lọc không chạy trước khi đọc, nên không có chuyện 0. Muốn chỉ trả cho 4 item thì đặt `customerId` làm partition key và dùng Query.'
      en: 'You get only 4 items back (`Count`), but the `Scan` first reads all 120 items of the table, then applies the `FilterExpression` to drop those that do not match. You pay for what was read, `ScannedCount` = 120. The filter never runs before the read, so it cannot be 0. To pay for only 4 items, make `customerId` the partition key and use a Query.'
  - q:
      vi: 'Thêm `"Select": "COUNT"` vào một `Scan` có lọc. Giá thay đổi thế nào?'
      en: 'You add `"Select": "COUNT"` to a filtered `Scan`. How does the price change?'
    options:
      - vi: Rẻ hơn nhiều, vì chỉ trả về một con số
        en: Much cheaper, because only one number comes back
      - vi: Không đổi, vì mọi item vẫn phải được đọc
        en: No change, because every item still has to be read
      - vi: Đắt hơn, vì phải đếm thêm
        en: More expensive, because of the extra counting
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì phản hồi nhỏ đi, nhưng `COUNT` chỉ bỏ item khỏi phản hồi. DynamoDB vẫn đọc từng item để áp bộ lọc rồi đếm, và capacity tính theo dữ liệu đã đọc, nên `ScannedCount` (120 ở bảng này) và capacity không đổi. Việc đếm cũng không bị tính thêm, nên "đắt hơn" cũng sai.'
      en: 'It sounds right because the response gets smaller, but `COUNT` only drops the items from the response. DynamoDB still reads every item to apply the filter and count, and capacity is charged on the data read, so `ScannedCount` (120 in this table) and the capacity stay the same. The counting is not charged either, so "more expensive" is wrong too.'
---
## Mở bài

Hai request cùng trả về 4 đơn của một khách. Một cái đọc 4 item, cái kia đọc 120. Làm sao biết request của bạn thuộc loại nào?

## Ý chính

- `Query` đi thẳng tới một item collection qua partition key (khóa phân vùng). Nó chỉ đọc item của collection đó.
- `Scan` đọc **mọi item** của bảng, theo thứ tự băm (không phải thứ tự bạn muốn), rồi mới áp `FilterExpression`.

Phản hồi cho biết hai con số:

- `ScannedCount`: số item **đã đọc**. Bạn trả tiền theo con số này.
- `Count`: số item **còn lại sau bộ lọc**, tức số được trả về.

`Select: "COUNT"` chỉ trả con số, nhưng vẫn phải đọc từng item, nên giá không đổi.

Bảng 120 item thì `Scan` đọc nhiều gấp 30 lần `Query` cho cùng 4 đơn. Bảng 10 triệu item thì `Scan` phải phân trang qua hàng nghìn lần gọi 1 MB. Scan vẫn có chỗ dùng: bảng nhỏ, việc chạy một lần, xuất dữ liệu. Với câu hỏi lặp lại, hãy thiết kế khóa (hoặc index (chỉ mục) ở L3) để thành `Query`.

Hình từng bước ở cuối mục này so hai cách trên bảng `Orders` 120 item của lab: `Query` đọc 4 item của C-01, `Scan` đọc cả 120 để trả về đúng 4 item đó.

## Cú pháp

```text
{"op": "Query", "input": {..., "KeyConditionExpression": "<pk> = :p", "Select": "COUNT"}}
{"op": "Scan",  "input": {..., "FilterExpression": "<attr> = :v", "Select": "COUNT"}}
response: Count = items returned, ScannedCount = items read
```

- `Scan` không có `KeyConditionExpression`.
- `FilterExpression` áp sau khi đọc, ở cả `Query` lẫn `Scan`.

## Ví dụ

Bốn đơn của `C-12`: `Count` 4, `ScannedCount` 4:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-12"}}}}
```

Chỉ đếm, vẫn đọc 4 item:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-05"}}, "Select": "COUNT"}}
```

`Count` và `ScannedCount` cùng là 4, giá 0.5 RCU như khi lấy cả item.

Bộ lọc trên `status` áp sau khi đọc: `Count` 3 (đơn `DELIVERED` bị bỏ), `ScannedCount` vẫn 4:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#s = :n", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":c": {"S": "C-12"}, ":n": {"S": "SHIPPED"}}}}
```

So hai request trên cùng 4 đơn của `C-12`:

```text
Query: Count 4, ScannedCount 4
Scan:  Count 4, ScannedCount 120
```

## Lỗi hay gặp

Đưa điều kiện khóa vào `Scan`:

```json
// ERROR ValidationException
{"op": "Scan", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-12"}}}}
```

Theo tài liệu API, `Scan` không có tham số `KeyConditionExpression`. Dynoxide bỏ qua tham số lạ đó và từ chối vì `ExpressionAttributeValues` không có biểu thức nào dùng; bỏ cả hai thì nó lặng lẽ Scan cả bảng. Điều kiện của `Scan` luôn đi vào `FilterExpression`.

Đếm đơn của một khách bằng `Scan` vì "chỉ lấy con số":

```json
// WRONG: Count 4, but ScannedCount 120
{"op": "Scan", "input": {"TableName": "Orders", "FilterExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-12"}}, "Select": "COUNT"}}
```

```json
// FIX: the same count, ScannedCount 4
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-12"}}, "Select": "COUNT"}}
```

Engine ghi 1 RCU (read capacity unit, đơn vị đọc) cho Scan, 0.5 cho Query. Đây là số engine đo, theo luật của AWS: Scan và Query cộng cỡ mọi item đã đọc, làm tròn lên bội 4 KB, mỗi 4 KB là 1 RCU khi đọc nhất quán mạnh, rồi chia đôi khi đọc nhất quán cuối (eventually consistent). 120 item ở đây khoảng 66 byte mỗi item, tổng chừng 7.8 KB, làm tròn lên 8 KB = 2 RCU, chia đôi = 1; 4 item của Query dưới 4 KB nên 1 ÷ 2 = 0.5. Tổng sát mức 8 KB. Nếu ước bằng độ dài dòng JSON của mỗi item trong setup (khoảng 100 ký tự) thì ra 12 KB và 1.5 RCU, nhưng DynamoDB chỉ đếm byte của tên thuộc tính và giá trị, không đếm dấu ngoặc, dấu nháy hay dấu phẩy của JSON. Trên bảng nhỏ này chênh lệch capacity còn nhỏ, nhưng `ScannedCount` 120 so với 4 cho thấy Scan tăng theo cả bảng.

## Thực hành

Bảng `Orders` có 120 đơn. Bước 1 có thanh hiệu năng: một `Scan` ra cùng 4 đơn vẫn không đạt. Mỗi bước có điều kiện về `Count` và `ScannedCount`: đọc chúng dưới kết quả của bước.

## Tóm tắt

- `Query` đọc một item collection; `Scan` đọc cả bảng.
- `ScannedCount` là số item đã đọc, và là số bạn trả tiền.
- `Count` là số item còn lại sau bộ lọc.
- `FilterExpression` và `Select: "COUNT"` không làm lần đọc rẻ hơn.

# EN

## Opening

Two requests both return the 4 orders of one customer. One reads 4 items, the other 120. How do you tell which kind yours is?

## Key idea

- `Query` goes straight to one item collection through the partition key. It reads only the items of that collection.
- `Scan` reads **every item** in the table, in hash order (not the order you want), and only then applies the `FilterExpression`.

The response carries two numbers:

- `ScannedCount`: items **read**. You pay for this number.
- `Count`: items **left after the filter**, that is, the ones returned.

`Select: "COUNT"` returns only the number, but each item still has to be read, so the price is the same.

With 120 items a `Scan` reads 30 times more items than a `Query` for the same 4 orders. With 10 million items a `Scan` has to page through thousands of 1 MB calls. Scan still has its uses: small tables, one-off jobs, exports. For a question you ask again and again, design the key (or an index, in L3) so that it becomes a `Query`.

The step-through figure at the end of this section compares the two on the lab's 120-item table `Orders`: `Query` reads C-01's 4 items, `Scan` reads all 120 to return the same 4.

## Syntax

```text
{"op": "Query", "input": {..., "KeyConditionExpression": "<pk> = :p", "Select": "COUNT"}}
{"op": "Scan",  "input": {..., "FilterExpression": "<attr> = :v", "Select": "COUNT"}}
response: Count = items returned, ScannedCount = items read
```

- `Scan` has no `KeyConditionExpression`.
- A `FilterExpression` applies after the read, in both `Query` and `Scan`.

## Example

The four orders of `C-12`: `Count` 4, `ScannedCount` 4:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-12"}}}}
```

Only the count, still 4 items read:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-05"}}, "Select": "COUNT"}}
```

`Count` and `ScannedCount` are both 4, at 0.5 RCU, as when the items themselves are returned.

A filter on `status` applies after the read: `Count` 3 (the `DELIVERED` order is dropped), `ScannedCount` still 4:

```json
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "FilterExpression": "#s = :n", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":c": {"S": "C-12"}, ":n": {"S": "SHIPPED"}}}}
```

The two requests compared on the same 4 orders of `C-12`:

```text
Query: Count 4, ScannedCount 4
Scan:  Count 4, ScannedCount 120
```

## Common mistakes

Giving a `Scan` a key condition:

```json
// ERROR ValidationException
{"op": "Scan", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-12"}}}}
```

According to the API reference, `Scan` has no `KeyConditionExpression` parameter. Dynoxide ignores that unknown parameter and refuses because no expression uses the `ExpressionAttributeValues`; drop both and it quietly scans the whole table. A `Scan` condition always goes into a `FilterExpression`.

Counting one customer's orders with a `Scan` because "it only returns a number":

```json
// WRONG: Count 4, but ScannedCount 120
{"op": "Scan", "input": {"TableName": "Orders", "FilterExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-12"}}, "Select": "COUNT"}}
```

```json
// FIX: the same count, ScannedCount 4
{"op": "Query", "input": {"TableName": "Orders", "KeyConditionExpression": "customerId = :c", "ExpressionAttributeValues": {":c": {"S": "C-12"}}, "Select": "COUNT"}}
```

The engine records 1 RCU (read capacity unit) for the Scan and 0.5 for the Query. These are the engine's measurements, following the AWS rule: a Scan or Query adds up the size of every item read, rounds up to a multiple of 4 KB, counts 1 RCU per 4 KB for a strongly consistent read, then halves it for an eventually consistent read. The 120 items here are about 66 bytes each, roughly 7.8 KB in total, rounded up to 8 KB = 2 RCU, halved = 1; the Query's 4 items are under 4 KB, so 1 ÷ 2 = 0.5. The total sits just under 8 KB. Estimating from the length of each item's JSON line in the setup (about 100 characters) gives 12 KB and 1.5 RCU, but DynamoDB counts only the bytes of attribute names and values, not JSON braces, quotes or commas. On this small table the capacity gap is still small, but a `ScannedCount` of 120 against 4 shows the Scan grows with the whole table.

## Practice

Table `Orders` holds 120 orders. Step 1 has a performance bar: a `Scan` that returns the same 4 orders still does not pass. Each step has conditions on `Count` and `ScannedCount`: read them under the step's result.

## Recap

- `Query` reads one item collection; `Scan` reads the whole table.
- `ScannedCount` is the number of items read, and the number you pay for.
- `Count` is the number of items left after the filter.
- A `FilterExpression` and `Select: "COUNT"` do not make the read cheaper.
