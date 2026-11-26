---
id: e-bp-d02
engine: best
track: dynamodb
level: L2
module: d
title: "Partition key nhiều giá trị, tải đều"
title_en: "High-cardinality, evenly used partition keys"
kind: quiz
minutes: 4
objectives:
  - vi: "Chọn partition key có rất nhiều giá trị và lưu lượng chia đều giữa chúng (id khách, id thiết bị)."
    en: "Choose a partition key with very many values and traffic spread evenly across them (customer id, device id)."
avoid:
  vi: "Một khóa \"nóng\" bị throttle dù tổng capacity của bảng còn dư."
  en: "One \"hot\" key being throttled while the table still has spare capacity."
requires: [e-dy-l1-02, e-dy-l4-01]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-uniform-load.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: runs
  setup: |
    {"tables": [
          {"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"},{"AttributeName":"status","AttributeType":"S"}],"GlobalSecondaryIndexes":[{"IndexName":"ByStatus","KeySchema":[{"AttributeName":"status","KeyType":"HASH"}],"Projection":{"ProjectionType":"KEYS_ONLY"}}]}
         ],
         "items": {
          "Shop": [
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#100"},"status":{"S":"PENDING"},"total":{"N":"50000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#101"},"status":{"S":"CANCELLED"},"total":{"N":"87000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#102"},"status":{"S":"PAID"},"total":{"N":"124000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#103"},"status":{"S":"PAID"},"total":{"N":"161000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#104"},"status":{"S":"PAID"},"total":{"N":"198000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#105"},"status":{"S":"PAID"},"total":{"N":"235000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#106"},"status":{"S":"PAID"},"total":{"N":"272000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#107"},"status":{"S":"PAID"},"total":{"N":"309000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#108"},"status":{"S":"PENDING"},"total":{"N":"346000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#109"},"status":{"S":"CANCELLED"},"total":{"N":"383000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#110"},"status":{"S":"PAID"},"total":{"N":"420000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#111"},"status":{"S":"PAID"},"total":{"N":"457000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#112"},"status":{"S":"PAID"},"total":{"N":"494000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#113"},"status":{"S":"PAID"},"total":{"N":"81000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#114"},"status":{"S":"PAID"},"total":{"N":"118000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#115"},"status":{"S":"PAID"},"total":{"N":"155000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#116"},"status":{"S":"PENDING"},"total":{"N":"192000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#117"},"status":{"S":"CANCELLED"},"total":{"N":"229000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#118"},"status":{"S":"PAID"},"total":{"N":"266000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#119"},"status":{"S":"PAID"},"total":{"N":"303000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#120"},"status":{"S":"PAID"},"total":{"N":"340000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#121"},"status":{"S":"PAID"},"total":{"N":"377000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#122"},"status":{"S":"PAID"},"total":{"N":"414000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#123"},"status":{"S":"PAID"},"total":{"N":"451000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#124"},"status":{"S":"PENDING"},"total":{"N":"488000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#125"},"status":{"S":"CANCELLED"},"total":{"N":"75000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#126"},"status":{"S":"PAID"},"total":{"N":"112000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#127"},"status":{"S":"PAID"},"total":{"N":"149000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#128"},"status":{"S":"PAID"},"total":{"N":"186000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#129"},"status":{"S":"PAID"},"total":{"N":"223000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#130"},"status":{"S":"PAID"},"total":{"N":"260000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#131"},"status":{"S":"PAID"},"total":{"N":"297000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#132"},"status":{"S":"PENDING"},"total":{"N":"334000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#133"},"status":{"S":"CANCELLED"},"total":{"N":"371000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#134"},"status":{"S":"PAID"},"total":{"N":"408000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#135"},"status":{"S":"PAID"},"total":{"N":"445000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#136"},"status":{"S":"PAID"},"total":{"N":"482000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#137"},"status":{"S":"PAID"},"total":{"N":"69000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#138"},"status":{"S":"PAID"},"total":{"N":"106000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#139"},"status":{"S":"PAID"},"total":{"N":"143000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#140"},"status":{"S":"PENDING"},"total":{"N":"180000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#141"},"status":{"S":"CANCELLED"},"total":{"N":"217000"}},
            {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#142"},"status":{"S":"PAID"},"total":{"N":"254000"}},
            {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-06#143"},"status":{"S":"PAID"},"total":{"N":"291000"}},
            {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-11#144"},"status":{"S":"PAID"},"total":{"N":"328000"}},
            {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#145"},"status":{"S":"PAID"},"total":{"N":"365000"}},
            {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-21#146"},"status":{"S":"PAID"},"total":{"N":"402000"}},
            {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-26#147"},"status":{"S":"PAID"},"total":{"N":"439000"}}
          ]
         }}
  bad: |
    {"op": "Query", "input": {"TableName": "Shop", "IndexName": "ByStatus", "KeyConditionExpression": "#s = :s", "ExpressionAttributeNames": {"#s": "status"}, "ExpressionAttributeValues": {":s": {"S": "PAID"}}, "Select": "COUNT"}}
  good: |
    {"op": "Query", "input": {"TableName": "Shop", "KeyConditionExpression": "pk = :p", "ExpressionAttributeValues": {":p": {"S": "CUST#2"}}, "Select": "COUNT"}}
  expect: null
quiz:
  - q:
      vi: "Một GSI ghi nhiều cần partition key. Ứng viên nào dễ tạo khóa nóng nhất?"
      en: "A write-heavy GSI needs a partition key. Which candidate is most likely to create a hot key?"
    options:
      - { vi: "`customerId`", en: "`customerId`" }
      - { vi: "`status` (PENDING, PAID, CANCELLED)", en: "`status` (PENDING, PAID, CANCELLED)" }
      - { vi: "`orderId`", en: "`orderId`" }
    answer: 1
    why:
      vi: "`customerId` và `orderId` có rất nhiều giá trị nên lượt ghi rải đều. `status` chỉ có ba giá trị và phần lớn item là PAID, nên gần hết lượt ghi của GSI dồn vào một partition key. Mỗi partition (phân vùng vật lý) chịu khoảng 1000 WCU (write capacity unit, đơn vị ghi: một lần ghi item tới 1 KB) mỗi giây, nên khóa PAID bị throttle trước dù bảng còn dư."
      en: "`customerId` and `orderId` have very many values, so writes spread evenly. `status` has only three values and most items are PAID, so almost every GSI write lands on one partition key. Each partition takes about 1000 WCU (write capacity unit: one write of an item up to 1 KB) per second, so the PAID key is throttled first while the table has room."
---

## Ý chính

Partition key (khóa phân vùng) phải có rất nhiều giá trị và lưu lượng chia đều giữa chúng: id khách, id thiết bị. Không dùng giá trị ít và lệch (trạng thái, ngày hôm nay, loại sản phẩm) làm partition key của bảng hay GSI ghi nhiều.

## Vì sao

- Dữ liệu và thông lượng chia theo partition (phân vùng vật lý).
- Mỗi partition có giới hạn riêng: khoảng 3000 RCU và 1000 WCU mỗi giây.
- Một khóa "nóng" bị throttle dù tổng capacity của bảng còn dư; adaptive capacity chỉ giảm nhẹ.

## Ví dụ

Trên 48 đơn, GSI `ByStatus` dồn 36 item vào một khóa `PAID`. Khóa `CUST#2` của bảng chỉ giữ 8 item. dynoxide chạy trên một nút nên không mô phỏng throttle; bạn chỉ thấy độ lệch.

# EN

## Key idea

A partition key must have very many values with traffic spread evenly across them: customer id, device id. Do not use few, skewed values (a status, today's date, a product type) as the partition key of a write-heavy table or GSI.

## Why

- Data and throughput are split by partition.
- Each partition has its own limit: about 3000 RCU and 1000 WCU per second.
- A "hot" key is throttled while the table still has spare capacity; adaptive capacity only softens this.

## Example

Over 48 orders, the `ByStatus` GSI puts 36 items on the single key `PAID`. The table's key `CUST#2` holds only 8 items. dynoxide runs on one node, so it does not simulate throttling; you only see the skew.
