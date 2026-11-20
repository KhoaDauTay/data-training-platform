---
id: e-bp-d03
engine: best
track: dynamodb
level: L3
module: d
title: "Rải khóa nóng bằng hậu tố (write sharding)"
title_en: "Spread a hot key with suffixes (write sharding)"
kind: quiz
minutes: 4
objectives:
  - vi: "Thêm hậu tố `#0`…`#N-1` vào partition key nhận quá nhiều lần ghi, và đọc lại bằng cách hỏi cả N khóa."
    en: "Add a `#0`…`#N-1` suffix to a partition key that takes too many writes, and read it back by asking all N keys."
avoid:
  vi: "Một khóa như \"sự kiện hôm nay\" nhận mọi lần ghi và bị throttle dù bảng còn dư capacity."
  en: "One key such as \"today's events\" taking every write and getting throttled while the table has capacity to spare."
requires: [e-dy-l4-04]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: runs
  setup: |
    {"tables": [
      {"TableName":"Events","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
    ],
    "items": {
      "Events": [
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#000"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#000"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#001"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#001"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#002"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#002"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#003"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#003"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#004"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#004"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#005"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#005"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#006"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#006"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#007"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#007"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#008"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#008"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#009"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#009"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#010"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#010"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#011"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#011"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#012"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#012"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#013"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#013"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#014"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#014"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#015"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#015"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#016"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#016"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#017"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#017"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#018"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#018"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#019"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#019"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#020"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#020"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#021"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#021"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#022"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#022"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#023"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#023"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#024"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#024"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#025"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#025"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#026"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#026"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#027"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#027"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#028"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#028"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#029"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#029"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#030"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#030"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#031"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#031"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#032"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#032"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#033"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#033"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#034"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#034"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#035"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#035"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#036"}},
        {"pk":{"S":"EVENTS#2026-10-31#0"},"sk":{"S":"ts#036"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#037"}},
        {"pk":{"S":"EVENTS#2026-10-31#1"},"sk":{"S":"ts#037"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#038"}},
        {"pk":{"S":"EVENTS#2026-10-31#2"},"sk":{"S":"ts#038"}},
        {"pk":{"S":"EVENTS#2026-10-31"},"sk":{"S":"ts#039"}},
        {"pk":{"S":"EVENTS#2026-10-31#3"},"sk":{"S":"ts#039"}}
      ]
    }}
  bad: |
    {"op": "Query", "input": {"TableName": "Events", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "EVENTS#2026-10-31"}}, "Select": "COUNT"}}
  good: |
    SELECT sk FROM "Events" WHERE "pk" IN ['EVENTS#2026-10-31#0', 'EVENTS#2026-10-31#1', 'EVENTS#2026-10-31#2', 'EVENTS#2026-10-31#3']
  expect: null
quiz:
  - q:
      vi: "Sự kiện của ngày `EVENTS#2026-10-31` được rải ra 4 khóa `EVENTS#2026-10-31#0` … `#3`. Muốn đếm mọi sự kiện của ngày thì sao?"
      en: "The events of day `EVENTS#2026-10-31` are spread over 4 keys `EVENTS#2026-10-31#0` … `#3`. How do you count every event of the day?"
    options:
      - { vi: "Một `GetItem` như trước", en: "One `GetItem` as before" }
      - { vi: "Hỏi cả 4 khóa rồi cộng lại", en: "Ask all 4 keys and add the results" }
      - { vi: "Không đọc lại được nữa", en: "It can no longer be read" }
    answer: 1
    why:
      vi: "Mỗi lần ghi chọn một hậu tố (ngẫu nhiên, hoặc tính từ một thuộc tính để còn tìm lại một item), nên dữ liệu của ngày nằm ở 4 khóa. Đọc là hỏi cả 4, song song hoặc bằng một `IN` của PartiQL, rồi gộp. Ghi được chia ra 4 partition; đọc tốn thêm vài request."
      en: "Each write picks a suffix (random, or calculated from an attribute so one item can still be found), so the day lives under 4 keys. Reading means asking all 4, in parallel or with one PartiQL `IN`, then merging. Writes spread over 4 partitions; reads cost a few more requests."
---

## Ý chính

Khi một khóa logic buộc phải nhận rất nhiều lần ghi (bộ đếm chung, sự kiện theo ngày), thêm hậu tố `#0`…`#N-1` vào partition key. Đọc thì hỏi cả N khóa rồi gộp.

## Vì sao

- Mỗi partition (phân vùng vật lý) có giới hạn ghi riêng; một khóa nóng bị throttle dù bảng còn dư.
- Chia một khóa thành N khóa thì lần ghi rơi vào nhiều partition hơn.
- Hậu tố tính từ một thuộc tính (ví dụ id đơn) cho phép tìm lại một item bằng một lần đọc.

## Ví dụ

Bản Không nên đếm 40 sự kiện trên một khóa; bản Nên lấy đủ 40 bằng một `IN` trên 4 khóa con. Thẻ chạy trên dynoxide, một nút: phần lợi khi ghi (chia tải ra nhiều partition) không đo được ở đây, chỉ thấy cách đọc lại.

# EN

## Key idea

When one logical key must take a very large number of writes (a global counter, events per day), add a `#0`…`#N-1` suffix to the partition key. To read, ask all N keys and merge.

## Why

- Each partition has its own write limit; one hot key is throttled even when the table has capacity to spare.
- Splitting one key into N keys spreads the writes over more partitions.
- A suffix calculated from an attribute (an order id, say) lets you find one item again with one read.

## Example

The Avoid version counts 40 events on one key; the Prefer version gets all 40 with one `IN` over the 4 sub-keys. The card runs on dynoxide, a single node: the write benefit (load spread over partitions) cannot be measured here, only the way you read back.
