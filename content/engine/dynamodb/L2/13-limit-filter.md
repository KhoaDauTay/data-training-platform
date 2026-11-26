---
id: e-dy-l2-13
engine: dynamodb
level: L2
module: expressions
title: "Limit đếm item đọc, không đếm item trả về"
title_en: "Limit counts items read, not items returned"
kind: predict
runtime: browser
minutes: 10
objectives:
  - vi: Đoán đúng số item một Query có `Limit` và `FilterExpression` trả về.
    en: Predict how many items a Query with `Limit` and a `FilterExpression` returns.
  - vi: Đọc `ScannedCount`, `Count` và `LastEvaluatedKey` để biết còn phải đọc tiếp hay không.
    en: Read `ScannedCount`, `Count` and `LastEvaluatedKey` to know whether you must keep reading.
requires: [e-dy-l2-02, e-dy-l1-10]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html
predict:
  sql: |
    {"op": "Query", "input": {"TableName": "Orders",
      "KeyConditionExpression": "customerId = :c",
      "FilterExpression": "#s = :s",
      "ExpressionAttributeNames": {"#s": "status"},
      "ExpressionAttributeValues": {":c": {"S": "C-01"}, ":s": {"S": "DELIVERED"}},
      "Limit": 6}}
  q:
    vi: 'Khách `C-01` có 12 đơn, trong đó 3 đơn `DELIVERED`. Request này trả về mấy item?'
    en: 'Customer `C-01` has 12 orders, 3 of them `DELIVERED`. How many items does this request return?'
  options:
    - vi: "6"
      en: "6"
    - vi: "3"
      en: "3"
    - vi: "1"
      en: "1"
    - vi: "0"
      en: "0"
  answer: 2
  trap: 0
  why:
    vi: 'Nhiều người nghĩ `Limit` là số item trả về sau bộ lọc, nên chọn 3 hoặc 6. Thật ra DynamoDB đọc tối đa 6 item theo sort key **rồi mới** lọc. Trong 6 đơn đầu của `C-01` chỉ có 1 đơn `DELIVERED`, nên `Count` là 1, `ScannedCount` là 6, và phản hồi có `LastEvaluatedKey` vì còn item chưa đọc. Đáp án 0 xảy ra khi trong các item đã đọc không có đơn nào `DELIVERED`, ví dụ với `Limit` 2.'
    en: 'Many people think `Limit` is the number of items returned after the filter, so they pick 3 or 6. In fact DynamoDB reads up to 6 items in sort key order **and then** filters them. Only 1 of the first 6 orders of `C-01` is `DELIVERED`, so `Count` is 1, `ScannedCount` is 6, and the response carries a `LastEvaluatedKey` because items are left unread. The answer 0 happens when none of the items read is `DELIVERED`, for example with `Limit` 2.'
quiz:
  - q:
      vi: 'Một trang `Query` có bộ lọc trả `Count` 0 kèm `LastEvaluatedKey`. Khách còn đơn khớp bộ lọc không?'
      en: 'One page of a filtered `Query` returns `Count` 0 with a `LastEvaluatedKey`. Does the customer have more matching orders?'
    options:
      - vi: Không, `Count` 0 nghĩa là không còn đơn nào khớp
        en: No, `Count` 0 means no order matches
      - vi: Chưa biết, còn item chưa đọc; đọc tiếp với `ExclusiveStartKey`
        en: Not known yet, items are left unread; keep reading with `ExclusiveStartKey`
      - vi: DynamoDB báo lỗi vì trang rỗng
        en: DynamoDB raises an error because the page is empty
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì trang không trả item nào, nhưng `Count` chỉ đếm các item vừa đọc ở trang này. `LastEvaluatedKey` (khóa để đọc trang tiếp) nghĩa là còn item chưa đọc, và trang sau vẫn có thể có đơn khớp: trang 1 của `C-01` chỉ có 1 đơn khớp, trang 2 có thêm 2. Trang rỗng cũng không phải lỗi, vì bộ lọc bỏ hết item đã đọc là chuyện bình thường; DynamoDB vẫn trả phản hồi thành công.'
      en: 'It sounds right because the page returned no item, but `Count` only counts the items read on this page. A `LastEvaluatedKey` (the key for reading the next page) means items are left unread, and the next page can still hold matching orders: page 1 of `C-01` has only 1 match, page 2 adds 2 more. An empty page is not an error either, because a filter dropping every item read is normal; DynamoDB still returns a successful response.'
lab:
  setup: |
    {"tables": [{"TableName":"Orders","KeySchema":[{"AttributeName":"customerId","KeyType":"HASH"},{"AttributeName":"orderId","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"customerId","AttributeType":"S"},{"AttributeName":"orderId","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
     "items": {"Orders": [
      {"customerId":"C-01","orderId":"2026-05-02#O-201","status":"NEW","total":120000},
      {"customerId":"C-01","orderId":"2026-05-09#O-202","status":"PAID","total":340000},
      {"customerId":"C-01","orderId":"2026-05-21#O-203","status":"SHIPPED","total":95000},
      {"customerId":"C-01","orderId":"2026-06-04#O-204","status":"DELIVERED","total":410000},
      {"customerId":"C-01","orderId":"2026-06-18#O-205","status":"NEW","total":70000},
      {"customerId":"C-01","orderId":"2026-07-01#O-206","status":"PAID","total":260000},
      {"customerId":"C-01","orderId":"2026-07-15#O-207","status":"SHIPPED","total":180000},
      {"customerId":"C-01","orderId":"2026-08-02#O-208","status":"DELIVERED","total":530000},
      {"customerId":"C-01","orderId":"2026-08-20#O-209","status":"NEW","total":150000},
      {"customerId":"C-01","orderId":"2026-09-05#O-210","status":"PAID","total":90000},
      {"customerId":"C-01","orderId":"2026-09-26#O-211","status":"SHIPPED","total":220000},
      {"customerId":"C-01","orderId":"2026-10-14#O-212","status":"DELIVERED","total":310000},
      {"customerId":"C-02","orderId":"2026-06-11#O-213","status":"DELIVERED","total":640000},
      {"customerId":"C-02","orderId":"2026-09-30#O-214","status":"NEW","total":210000}
    ]}}
  steps:
    - task:
        vi: Chạy đúng request ở câu đoán. Đối chiếu `Count` và `ScannedCount` với đáp án bạn chọn.
        en: Run the exact request from the prediction. Compare `Count` and `ScannedCount` with the answer you picked.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "FilterExpression": "#s = :s",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":c": {"S": "C-01"}, ":s": {"S": "DELIVERED"}},
          "Limit": 6}}
      check: doc
      ordered: true
      expect: { Count: 1, ScannedCount: 6 }
      hint:
        vi: 'Chép request ở câu đoán vào editor và bấm Chạy.'
        en: 'Copy the request from the prediction into the editor and press Run.'
    - task:
        vi: 'Trang 1 dừng ở `LastEvaluatedKey` `{"customerId": "C-01", "orderId": "2026-07-01#O-206"}`. Đọc trang 2, vẫn `Limit` 6 và cùng bộ lọc.'
        en: 'Page 1 stopped at the `LastEvaluatedKey` `{"customerId": "C-01", "orderId": "2026-07-01#O-206"}`. Read page 2, still with `Limit` 6 and the same filter.'
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "FilterExpression": "#s = :s",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":c": {"S": "C-01"}, ":s": {"S": "DELIVERED"}},
          "Limit": 6,
          "ExclusiveStartKey": {"customerId": {"S": "C-01"}, "orderId": {"S": "2026-07-01#O-206"}}}}
      check: doc
      ordered: true
      expect: { Count: 2, ScannedCount: 6 }
      hint:
        vi: 'Thêm `ExclusiveStartKey` bằng `LastEvaluatedKey` của trang 1, viết ở DynamoDB JSON.'
        en: 'Add `ExclusiveStartKey` set to page 1''s `LastEvaluatedKey`, written in DynamoDB JSON.'
    - task:
        vi: Màn hình chỉ cần đủ 3 đơn `DELIVERED` của `C-01` trong một lần gọi. Bỏ thứ đang làm request dừng sớm.
        en: The screen just needs all 3 `DELIVERED` orders of `C-01` in one call. Remove what makes the request stop early.
      solution: |
        {"op": "Query", "input": {"TableName": "Orders",
          "KeyConditionExpression": "customerId = :c",
          "FilterExpression": "#s = :s",
          "ExpressionAttributeNames": {"#s": "status"},
          "ExpressionAttributeValues": {":c": {"S": "C-01"}, ":s": {"S": "DELIVERED"}}}}
      check: doc
      perf: { table: Orders }
      slow: |
        {"op":"Scan","input":{"TableName":"Orders","ExpressionAttributeNames":{"#s":"status"},"ExpressionAttributeValues":{":c":{"S":"C-01"},":s":{"S":"DELIVERED"}},"FilterExpression":"(customerId = :c) AND (#s = :s)"}}
      ordered: true
      expect: { Count: 3, ScannedCount: 12 }
      hint:
        vi: 'Bỏ `Limit`. Để ý `ScannedCount`: request vẫn đọc cả 12 đơn.'
        en: 'Drop `Limit`. Watch `ScannedCount`: the request still reads all 12 orders.'
---

## Mở bài

Bạn muốn 6 đơn `DELIVERED`, nên viết `Limit: 6` cùng một bộ lọc. Kết quả chỉ có 1 đơn. Vì sao?

## Ý chính

Một lần `Query` hoặc `Scan` làm theo thứ tự:

- đọc item theo khóa, dừng khi đủ `Limit` item hoặc đủ 1 MB;
- áp `FilterExpression` lên các item vừa đọc;
- trả item còn lại.

Nhiều người nghĩ `Limit` là số item **trả về**. Thật ra `Limit` là số item **đọc** ("The maximum number of items to evaluate", API Scan; Query dùng cùng luật). Phản hồi cho thấy cả hai số:

- `ScannedCount`: số item đã đọc (và đã tính phí);
- `Count`: số item còn lại sau bộ lọc.

Còn `LastEvaluatedKey` nghĩa là còn item chưa đọc. Một trang có thể trả 0 item mà vẫn còn trang sau. Trang này chưa hiện `LastEvaluatedKey`, nên bước 2 ghi sẵn khóa đó.

## Ví dụ

12 đơn của `C-01`, bộ lọc `status = DELIVERED`:

```text
Limit 6, page 1  -> ScannedCount 6,  Count 1, LastEvaluatedKey set
Limit 6, page 2  -> ScannedCount 6,  Count 2
no Limit         -> ScannedCount 12, Count 3
```

## Thực hành

Muốn đủ N item khớp bộ lọc thì phải lặp theo `LastEvaluatedKey` cho tới khi gom đủ. Muốn rẻ hơn thì đưa điều kiện vào khóa: một GSI có partition key (khóa phân vùng) `status` chỉ đọc đúng các đơn `DELIVERED`, nên `ScannedCount` bằng `Count`.

## Tóm tắt

- `Limit` là số item đọc, không phải số item trả về.
- Bộ lọc chạy sau khi đọc: `ScannedCount` là item đã đọc và tính phí, `Count` là item còn lại.
- `LastEvaluatedKey` nghĩa là còn item chưa đọc, kể cả khi trang trả 0 item.
- Đưa điều kiện vào khóa để `ScannedCount` bằng `Count`.

# EN

## Opening

You want 6 `DELIVERED` orders, so you write `Limit: 6` with a filter. The result holds just 1 order. Why?

## Key idea

One `Query` or `Scan` call works in this order:

- read items by key, stopping after `Limit` items or 1 MB;
- apply the `FilterExpression` to the items just read;
- return what is left.

Many people think `Limit` is the number of items **returned**. In fact `Limit` is the number of items **read** ("The maximum number of items to evaluate", API Scan; Query follows the same rule). The response shows both numbers:

- `ScannedCount`: the items read (and billed);
- `Count`: the items left after the filter.

A `LastEvaluatedKey` means items are left unread. A page can return 0 items and still have a next page. This page does not show `LastEvaluatedKey` yet, so step 2 gives you that key.

## Example

The 12 orders of `C-01`, filter `status = DELIVERED`:

```text
Limit 6, page 1  -> ScannedCount 6,  Count 1, LastEvaluatedKey set
Limit 6, page 2  -> ScannedCount 6,  Count 2
no Limit         -> ScannedCount 12, Count 3
```

## Practice

To get N items that match a filter, loop on `LastEvaluatedKey` until you have collected enough. To make it cheaper, move the condition into a key: a GSI with partition key `status` reads only the `DELIVERED` orders, so `ScannedCount` equals `Count`.

## Recap

- `Limit` is the number of items read, not the number returned.
- The filter runs after the read: `ScannedCount` is the items read and billed, `Count` the items left.
- A `LastEvaluatedKey` means items are left unread, even when a page returns 0 items.
- Move the condition into a key so that `ScannedCount` equals `Count`.
