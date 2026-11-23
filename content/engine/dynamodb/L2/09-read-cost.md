---
id: e-dy-l2-09
engine: dynamodb
level: L2
module: partiql-cost
title: "Tính RCU trước khi đọc"
title_en: "Work out RCU before you read"
kind: predict
runtime: docs
minutes: 12
objectives:
  - vi: Tính RCU của GetItem, BatchGetItem, Query và Scan theo luật làm tròn 4 KB.
    en: Compute the RCU of GetItem, BatchGetItem, Query and Scan with the 4 KB rounding rule.
  - vi: Biết projection, `Select COUNT` và item không tồn tại đều không làm rẻ hơn.
    en: Know that a projection, `Select COUNT` and a missing item never make a read cheaper.
requires: [e-dy-l2-08, e-dy-l1-09]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
predict:
  sql: |
    {"op": "BatchGetItem", "input": {"RequestItems": {"Books": {
      "Keys": [{"isbn": {"S": "978-1-01"}}, {"isbn": {"S": "978-1-02"}}],
      "ConsistentRead": true}},
     "ReturnConsumedCapacity": "TOTAL"}}
  q:
    vi: Hai item nặng 1,5 KB và 6,5 KB. Request đọc nhất quán mạnh (strongly consistent) này tốn bao nhiêu RCU?
    en: The two items weigh 1.5 KB and 6.5 KB. How many RCU does this strongly consistent request consume?
  options:
    - vi: "2"
      en: "2"
    - vi: "3"
      en: "3"
    - vi: "4"
      en: "4"
    - vi: "1,5"
      en: "1.5"
  answer: 1
  trap: 0
  why:
    vi: Nghe hợp lý vì 1,5 + 6,5 = 8 KB là đúng 2 RCU, nhưng BatchGetItem làm tròn **từng item** lên bội số 4 KB rồi mới cộng - 4 KB + 8 KB = 12 KB, tức 3 RCU strong (1,5 nếu eventual).
    en: It sounds right because 1.5 + 6.5 = 8 KB is exactly 2 RCU, but BatchGetItem rounds **each item** up to a multiple of 4 KB before adding - 4 KB + 8 KB = 12 KB, which is 3 RCU strong (1.5 if eventual).
quiz:
  - q:
      vi: Một Query trả 10 item, tổng 40,8 KB, đọc nhất quán cuối. Tốn bao nhiêu RCU?
      en: A Query returns 10 items totalling 40.8 KB, eventually consistent. How many RCU?
    options:
      - vi: "5"
        en: "5"
      - vi: "5,5"
        en: "5.5"
      - vi: "11"
        en: "11"
      - vi: "20"
        en: "20"
    answer: 1
    why:
      vi: Query cộng cỡ mọi item đã đọc **rồi mới** làm tròn - 40,8 KB thành 44 KB, tức 11 RCU strong, chia đôi cho eventual là 5,5.
      en: A Query adds up all items read **then** rounds - 40.8 KB becomes 44 KB, which is 11 RCU strong, halved to 5.5 for eventual.
  - q:
      vi: Scan đọc 1000 item, mỗi item 100 byte, bộ lọc giữ lại 20 item. Đọc nhất quán cuối tốn bao nhiêu RCU?
      en: A Scan reads 1,000 items of 100 bytes each, and its filter keeps 20. How many RCU for an eventually consistent read?
    options:
      - vi: "0,5 - chỉ 20 item được trả về"
        en: "0.5 - only 20 items are returned"
      - vi: "12,5"
        en: "12.5"
      - vi: "25"
        en: "25"
    answer: 1
    trap: 0
    why:
      vi: Nghe hợp lý vì chỉ 20 item về tới bạn, nhưng Scan tính theo item **đã đọc**, không theo item trả về. 1000 × 100 = 100.000 byte, khoảng 97,7 KB, làm tròn lên 100 KB = 25 RCU strong, 12,5 eventual.
      en: It sounds right because only 20 items reach you, but a Scan is charged for items **read**, not items returned. 1,000 × 100 = 100,000 bytes, about 97.7 KB, rounded up to 100 KB = 25 RCU strong, 12.5 eventual.
  - q:
      vi: GetItem một item 3,5 KB, chỉ lấy một thuộc tính 100 byte bằng ProjectionExpression, đọc nhất quán cuối. Tốn bao nhiêu?
      en: GetItem on a 3.5 KB item, returning one 100-byte attribute with a ProjectionExpression, eventually consistent. What does it cost?
    options:
      - vi: "0,5 RCU"
        en: "0.5 RCU"
      - vi: "0,0125 RCU"
        en: "0.0125 RCU"
      - vi: "1 RCU"
        en: "1 RCU"
    answer: 0
    why:
      vi: Projection không đổi cỡ dùng để tính - 3,5 KB làm tròn lên 4 KB = 1 RCU strong, 0,5 eventual. Đọc một khóa không tồn tại cũng tốn như vậy.
      en: A projection does not change the size used for billing - 3.5 KB rounds up to 4 KB = 1 RCU strong, 0.5 eventual. Reading a key that does not exist costs the same.
---

## Mở bài

Hai cuốn sách nặng tổng cộng 8 KB. Đọc chúng bằng một `BatchGetItem` có tốn đúng 2 RCU như phép chia 8 cho 4 không?

## Ý chính

Đơn vị đọc:

- 1 RCU (read capacity unit, đơn vị năng lực đọc) = một lần đọc **nhất quán mạnh** (strongly consistent) item tới 4 KB.
- Đọc **nhất quán cuối** (eventually consistent, mặc định) tốn một nửa.
- Đọc trong transaction tốn gấp đôi đọc nhất quán mạnh.

Cỡ luôn làm tròn lên bội số 4 KB, nhưng làm tròn **ở đâu** tùy thao tác:

- `GetItem`: làm tròn item đó.
- `BatchGetItem`: làm tròn **từng item** rồi cộng.
- `Query`: cộng cỡ mọi item đã đọc rồi làm tròn **một lần**.
- `Scan`: như Query, trên mọi item **đã đọc**, kể cả item bị bộ lọc bỏ.

Không làm rẻ hơn: `ProjectionExpression`, `Select: "COUNT"`, đọc item không tồn tại.

## Ví dụ

1500 item, mỗi item 64 byte, đọc bằng một Query:

```text
1500 x 64 B = 96000 B = 93.75 KB -> 96 KB -> 24 RCU strong, 12 RCU eventual
```

Đọc từng cái bằng GetItem sẽ là 1500 x 0,5 = 750 RCU eventual. Đó là lý do đặt item hay đọc cùng nhau vào chung một item collection.

## Thực hành

Bật `"ReturnConsumedCapacity": "TOTAL"` để DynamoDB trả con số thật. Bộ mô phỏng trong trình duyệt trả số gần đúng; các đáp án ở đây theo luật của AWS.

## Tóm tắt

- 1 RCU = một lần đọc nhất quán mạnh item tới 4 KB; nhất quán cuối một nửa, transaction gấp đôi.
- `GetItem` và `BatchGetItem` làm tròn từng item.
- `Query` và `Scan` cộng mọi item đã đọc rồi làm tròn một lần.
- Scan tính cả item bị bộ lọc bỏ.
- Projection, `COUNT` và item không tồn tại không làm lần đọc rẻ hơn.

# EN

## Opening

Two books weigh 8 KB in total. Does reading them with one `BatchGetItem` cost exactly 2 RCU, as 8 divided by 4 suggests?

## Key idea

The read unit:

- 1 RCU (read capacity unit) = one **strongly consistent** read of an item up to 4 KB.
- An **eventually consistent** read (the default) costs half.
- A transactional read costs twice a strong read.

Size is always rounded up to a multiple of 4 KB, but **where** it is rounded depends on the operation:

- `GetItem`: round that item.
- `BatchGetItem`: round **each item**, then add.
- `Query`: add the sizes of every item read, then round **once**.
- `Scan`: like Query, over every item **read**, including items the filter drops.

Never cheaper: `ProjectionExpression`, `Select: "COUNT"`, reading an item that does not exist.

## Example

1,500 items of 64 bytes each, read with one Query:

```text
1500 x 64 B = 96000 B = 93.75 KB -> 96 KB -> 24 RCU strong, 12 RCU eventual
```

Reading them one by one with GetItem would be 1,500 x 0.5 = 750 RCU eventual. That is why items read together belong in one item collection.

## Practice

Turn on `"ReturnConsumedCapacity": "TOTAL"` to get the real number from DynamoDB. The in-browser emulator reports an approximate number; the answers here follow the AWS rules.

## Recap

- 1 RCU = one strongly consistent read of an item up to 4 KB; eventual is half, transactional is double.
- `GetItem` and `BatchGetItem` round each item.
- `Query` and `Scan` add every item read, then round once.
- A Scan also pays for the items its filter drops.
- A projection, `COUNT` and a missing item never make a read cheaper.
