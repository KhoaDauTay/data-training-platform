---
id: e-bp-d08
engine: best
track: dynamodb
level: L2
module: d
title: "Item nhỏ: phần lớn để S3, phần hay đổi để riêng"
title_en: "Keep items small: big parts in S3, busy parts apart"
kind: quiz
minutes: 3
objectives:
  - vi: "Để thuộc tính lớn ở S3 và giữ khóa đối tượng trong item; tách thuộc tính hay đổi ra một item nhỏ riêng."
    en: "Keep large attributes in S3 with the object key in the item; move often-changed attributes into a small item of their own."
avoid:
  vi: "Trả tiền ghi cả item vài KB mỗi lần chỉ cộng 1 lượt xem."
  en: "Paying to write a whole multi-KB item every time you add 1 view."
requires: [e-dy-l2-08, e-dy-l2-10]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-use-s3-too.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: same
  setup: |
    {"tables": [
      {"TableName":"Products","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
    ],
    "items": {
      "Products": [
        {"pk":{"S":"PRODUCT#A"},"sk":{"S":"DETAIL"},"name":{"S":"Tea set"},"manual":{"S":"Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. Rinse the pot with hot water before the first brew. "},"views":{"N":"10"}},
        {"pk":{"S":"PRODUCT#B"},"sk":{"S":"DETAIL"},"name":{"S":"Tea cup"},"manualKey":{"S":"s3://shop-manuals/B.pdf"}},
        {"pk":{"S":"PRODUCT#B"},"sk":{"S":"COUNTERS"},"views":{"N":"10"}}
      ]
    }}
  bad: |
    {"op": "UpdateItem", "input": {"TableName": "Products", "Key": {"pk": {"S": "PRODUCT#A"}, "sk": {"S": "DETAIL"}}, "UpdateExpression": "ADD #v :one", "ExpressionAttributeNames": {"#v": "views"}, "ExpressionAttributeValues": {":one": {"N": "1"}}, "ReturnValues": "UPDATED_NEW", "ReturnConsumedCapacity": "TOTAL"}}
  good: |
    {"op": "UpdateItem", "input": {"TableName": "Products", "Key": {"pk": {"S": "PRODUCT#B"}, "sk": {"S": "COUNTERS"}}, "UpdateExpression": "ADD #v :one", "ExpressionAttributeNames": {"#v": "views"}, "ExpressionAttributeValues": {":one": {"N": "1"}}, "ReturnValues": "UPDATED_NEW", "ReturnConsumedCapacity": "TOTAL"}}
  expect: { compare: wcu }
quiz:
  - q:
      vi: "Item cỡ 6 KB. Một `UpdateItem` chỉ cộng 1 vào `views`. Request đó tốn bao nhiêu WCU?"
      en: "An item is 6 KB. One `UpdateItem` only adds 1 to `views`. How many WCU does it cost?"
    options:
      - { vi: "1, vì chỉ sửa một thuộc tính", en: "1, because only one attribute changes" }
      - { vi: "Khoảng 6–7, vì tính theo cỡ cả item", en: "About 6–7, because the whole item size counts" }
      - { vi: "0, vì `ADD` không tính phí", en: "0, because `ADD` is free" }
    answer: 1
    why:
      vi: "Không phải 1, cũng không phải 0: WCU (write capacity unit, đơn vị ghi) tính theo cỡ cả item, không theo phần bị sửa, và `ADD` cũng tính phí. 1 WCU ghi tối đa 1 KB, lấy cỡ lớn hơn giữa trước và sau khi sửa: 6 KB / 1 KB = 6 WCU, thành 7 nếu item vượt 6 KB. Đưa bộ đếm ra một item riêng dưới 1 KB thì mỗi lần cộng còn 1 WCU."
      en: "Not 1, and not 0: WCU (write capacity unit) is charged on the whole item size, not the changed part, and `ADD` is billed too. 1 WCU writes up to 1 KB, taking the larger of the sizes before and after: 6 KB / 1 KB = 6 WCU, or 7 if the item grows past 6 KB. A counter in its own item under 1 KB costs 1 WCU per increment."
---

## Ý chính

Item tối đa 400 KB. Thuộc tính lớn (ảnh, file hướng dẫn) để ở S3, item chỉ giữ khóa đối tượng; văn bản dài thì nén. Thuộc tính hay đổi (bộ đếm) tách khỏi item to ít đổi.

## Vì sao

- Đọc tính theo khối 4 KB (RCU), ghi theo khối 1 KB (WCU) của cả item.
- `UpdateItem` tính theo cỡ cả item, không theo phần bị sửa.
- Item gần 400 KB còn bị `ValidationException` khi lớn thêm.

## Ví dụ

Cùng phép `ADD` một lượt xem. Bản Không nên sửa item `PRODUCT#A` chứa cả nội dung hướng dẫn (~6 KB); bản Nên sửa item `COUNTERS` nhỏ, còn nội dung để ở S3 (`manualKey`). Cả hai trả `views` = 11; số đo dưới pane là capacity của lần ghi.

# EN

## Key idea

An item is at most 400 KB. Large attributes (images, manuals) go to S3 and the item keeps the object key; long text gets compressed. Often-changed attributes (counters) move out of large, rarely-changed items.

## Why

- Reads are charged in 4 KB blocks (RCU), writes in 1 KB blocks (WCU) of the whole item.
- `UpdateItem` is charged on the whole item size, not on the part you change.
- An item close to 400 KB also hits a `ValidationException` when it grows.

## Example

The same `ADD` of one view. Avoid updates item `PRODUCT#A`, which holds the whole manual (~6 KB); Prefer updates the small `COUNTERS` item, with the manual kept in S3 (`manualKey`). Both return `views` = 11; the figure under each pane is the capacity of the write.
