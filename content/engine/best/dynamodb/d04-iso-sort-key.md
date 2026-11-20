---
id: e-bp-d04
engine: best
track: dynamodb
level: L2
module: d
title: "Sort key theo thứ tự rộng tới hẹp, ngày dạng ISO"
title_en: "Sort keys from broad to narrow, dates in ISO form"
kind: quiz
minutes: 4
objectives:
  - vi: "Ghép sort key từ cấp rộng tới hẹp và viết ngày theo ISO-8601 (`SALE#2026-10-31`), để `begins_with` và `BETWEEN` lấy đúng khoảng."
    en: "Build sort keys from the broadest level down and write dates in ISO-8601 (`SALE#2026-10-31`), so `begins_with` and `BETWEEN` select the right range."
avoid:
  vi: "Một \"tháng 10\" lẫn cả ngày cuối tháng 9 và đầu tháng 11."
  en: "An \"October\" that also holds the last days of September and the first of November."
requires: [e-dy-l3-09]
skills: [order_by]
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-sort-keys.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: diff
  setup: |
    {"tables": [
          {"TableName":"StoreDaysText","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]},
          {"TableName":"StoreDays","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
         ],
         "items": {
          "StoreDaysText": [
            {"pk":{"S":"STORE#3"},"sk":{"S":"28/09/2026"},"revenue":{"N":"1364000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"29/09/2026"},"revenue":{"N":"1377000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"30/09/2026"},"revenue":{"N":"1390000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"01/10/2026"},"revenue":{"N":"1013000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"02/10/2026"},"revenue":{"N":"1026000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"03/10/2026"},"revenue":{"N":"1039000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"04/10/2026"},"revenue":{"N":"1052000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"05/10/2026"},"revenue":{"N":"1065000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"06/10/2026"},"revenue":{"N":"1078000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"07/10/2026"},"revenue":{"N":"1091000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"08/10/2026"},"revenue":{"N":"1104000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"09/10/2026"},"revenue":{"N":"1117000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"10/10/2026"},"revenue":{"N":"1130000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"11/10/2026"},"revenue":{"N":"1143000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"12/10/2026"},"revenue":{"N":"1156000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"13/10/2026"},"revenue":{"N":"1169000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"14/10/2026"},"revenue":{"N":"1182000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"15/10/2026"},"revenue":{"N":"1195000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"16/10/2026"},"revenue":{"N":"1208000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"17/10/2026"},"revenue":{"N":"1221000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"18/10/2026"},"revenue":{"N":"1234000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"19/10/2026"},"revenue":{"N":"1247000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"20/10/2026"},"revenue":{"N":"1260000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"21/10/2026"},"revenue":{"N":"1273000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"22/10/2026"},"revenue":{"N":"1286000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"23/10/2026"},"revenue":{"N":"1299000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"24/10/2026"},"revenue":{"N":"1312000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"25/10/2026"},"revenue":{"N":"1325000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"26/10/2026"},"revenue":{"N":"1338000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"27/10/2026"},"revenue":{"N":"1351000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"28/10/2026"},"revenue":{"N":"1364000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"29/10/2026"},"revenue":{"N":"1377000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"30/10/2026"},"revenue":{"N":"1390000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"31/10/2026"},"revenue":{"N":"1003000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"01/11/2026"},"revenue":{"N":"1013000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"02/11/2026"},"revenue":{"N":"1026000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"03/11/2026"},"revenue":{"N":"1039000"}}
          ],
          "StoreDays": [
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-09-28"},"revenue":{"N":"1364000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-09-29"},"revenue":{"N":"1377000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-09-30"},"revenue":{"N":"1390000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-01"},"revenue":{"N":"1013000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-02"},"revenue":{"N":"1026000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-03"},"revenue":{"N":"1039000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-04"},"revenue":{"N":"1052000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-05"},"revenue":{"N":"1065000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-06"},"revenue":{"N":"1078000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-07"},"revenue":{"N":"1091000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-08"},"revenue":{"N":"1104000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-09"},"revenue":{"N":"1117000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-10"},"revenue":{"N":"1130000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-11"},"revenue":{"N":"1143000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-12"},"revenue":{"N":"1156000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-13"},"revenue":{"N":"1169000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-14"},"revenue":{"N":"1182000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-15"},"revenue":{"N":"1195000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-16"},"revenue":{"N":"1208000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-17"},"revenue":{"N":"1221000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-18"},"revenue":{"N":"1234000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-19"},"revenue":{"N":"1247000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-20"},"revenue":{"N":"1260000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-21"},"revenue":{"N":"1273000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-22"},"revenue":{"N":"1286000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-23"},"revenue":{"N":"1299000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-24"},"revenue":{"N":"1312000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-25"},"revenue":{"N":"1325000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-26"},"revenue":{"N":"1338000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-27"},"revenue":{"N":"1351000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-28"},"revenue":{"N":"1364000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-29"},"revenue":{"N":"1377000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-30"},"revenue":{"N":"1390000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-10-31"},"revenue":{"N":"1003000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-11-01"},"revenue":{"N":"1013000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-11-02"},"revenue":{"N":"1026000"}},
            {"pk":{"S":"STORE#3"},"sk":{"S":"SALE#2026-11-03"},"revenue":{"N":"1039000"}}
          ]
         }}
  bad: |
    {"op": "Query", "input": {"TableName": "StoreDaysText", "KeyConditionExpression": "pk = :p AND sk BETWEEN :a AND :b", "ExpressionAttributeValues": {":p": {"S": "STORE#3"}, ":a": {"S": "01/10/2026"}, ":b": {"S": "31/10/2026"}}, "Select": "COUNT"}}
  good: |
    {"op": "Query", "input": {"TableName": "StoreDays", "KeyConditionExpression": "pk = :p AND begins_with(sk, :m)", "ExpressionAttributeValues": {":p": {"S": "STORE#3"}, ":m": {"S": "SALE#2026-10"}}, "Select": "COUNT"}}
  expect: null
quiz:
  - q:
      vi: "Sort key dạng chuỗi `dd/mm/yyyy`. `sk BETWEEN '01/10/2026' AND '31/10/2026'` có lấy `29/09/2026` không?"
      en: "The sort key is a `dd/mm/yyyy` string. Does `sk BETWEEN '01/10/2026' AND '31/10/2026'` pick up `29/09/2026`?"
    options:
      - { vi: "Không, vì đó là tháng 9", en: "No, it is in September" }
      - { vi: "Có: chuỗi được so từng ký tự, \"29/09\" nằm giữa \"01/10\" và \"31/10\"", en: "Yes: strings compare character by character, and \"29/09\" falls between \"01/10\" and \"31/10\"" }
      - { vi: "Báo lỗi vì sort key không phải ngày", en: "An error, because the sort key is not a date" }
    answer: 1
    why:
      vi: "Sort key được sắp theo byte. Với `dd/mm/yyyy`, ngày đứng trước tháng, nên thứ tự chuỗi không phải thứ tự thời gian. ISO `yyyy-mm-dd` sắp đúng thời gian, và `begins_with(sk, 'SALE#2026-10')` lấy trọn một tháng."
      en: "Sort keys are ordered by bytes. With `dd/mm/yyyy` the day comes before the month, so string order is not time order. ISO `yyyy-mm-dd` sorts in time order, and `begins_with(sk, 'SALE#2026-10')` takes exactly one month."
---

## Ý chính

Sort key (khóa sắp xếp) ghép theo cấp từ rộng tới hẹp (`COUNTRY#VN#CITY#DANANG#STORE#3`), hoặc tiền tố loại + thời gian ISO-8601 (`SALE#2026-10-31`). Như vậy một `Query` với `begins_with` hay `BETWEEN` lấy đúng nhóm, đúng khoảng.

## Vì sao

- Sort key được sắp theo byte.
- Đặt đúng thứ tự cấp thì mỗi mức "đi sâu" là một `Query`, không cần index thêm.
- Ngày kiểu `dd/mm/yyyy` sắp sai thứ tự thời gian.

## Ví dụ

Cùng 37 ngày bán của cửa hàng 3, từ 2026-09-28 tới 2026-11-03. `BETWEEN` trên chuỗi `dd/mm/yyyy` đếm 37 item (lẫn tháng 9 và tháng 11). `begins_with` trên sort key ISO đếm đúng 31.

# EN

## Key idea

Build sort keys by level from broad to narrow (`COUNTRY#VN#CITY#DANANG#STORE#3`), or as a type prefix plus an ISO-8601 time (`SALE#2026-10-31`). Then one `Query` with `begins_with` or `BETWEEN` takes exactly the right group or range.

## Why

- Sort keys are ordered by bytes.
- With the levels in the right order, every "drill-down" is one `Query`, with no extra index.
- Dates written as `dd/mm/yyyy` sort out of time order.

## Example

Same 37 sales days of store 3, from 2026-09-28 to 2026-11-03. `BETWEEN` on the `dd/mm/yyyy` string counts 37 items (September and November mixed in). `begins_with` on the ISO sort key counts exactly 31.
