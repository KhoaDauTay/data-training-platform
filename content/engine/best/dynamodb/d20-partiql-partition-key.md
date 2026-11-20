---
id: e-bp-d20
engine: best
track: dynamodb
level: L2
module: d
title: "PartiQL SELECT phải có partition key trong WHERE"
title_en: "A PartiQL SELECT needs the partition key in WHERE"
kind: quiz
minutes: 3
objectives:
  - vi: "Viết `SELECT` của PartiQL với điều kiện `=` hoặc `IN` trên partition key, để nó thành một `Query` chứ không quét cả bảng."
    en: "Write PartiQL `SELECT` statements with an `=` or `IN` condition on the partition key, so they become a `Query`, not a full table scan."
avoid:
  vi: "Một câu trông như SQL nhưng âm thầm quét cả bảng."
  en: "A statement that looks like SQL but silently scans the whole table."
requires: [e-dy-l2-07]
skills: [where]
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html
verified: { version: "dynoxide 1.5.0", date: "2026-11-20" }
pair:
  runtime: dynoxide
  check: same
  setup: |
    {"tables": [
      {"TableName":"Shop","BillingMode":"PAY_PER_REQUEST","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"}]}
    ],
    "items": {
      "Shop": [
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#100"},"customerId":{"S":"1"},"total":{"N":"50000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-04#101"},"customerId":{"S":"2"},"total":{"N":"51000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-07#102"},"customerId":{"S":"3"},"total":{"N":"52000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-10#103"},"customerId":{"S":"4"},"total":{"N":"53000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-13#104"},"customerId":{"S":"5"},"total":{"N":"54000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-16#105"},"customerId":{"S":"6"},"total":{"N":"55000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-19#106"},"customerId":{"S":"1"},"total":{"N":"56000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-22#107"},"customerId":{"S":"2"},"total":{"N":"57000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-25#108"},"customerId":{"S":"3"},"total":{"N":"58000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-28#109"},"customerId":{"S":"4"},"total":{"N":"59000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-01#110"},"customerId":{"S":"5"},"total":{"N":"60000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-04#111"},"customerId":{"S":"6"},"total":{"N":"61000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-07#112"},"customerId":{"S":"1"},"total":{"N":"62000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-10#113"},"customerId":{"S":"2"},"total":{"N":"63000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-13#114"},"customerId":{"S":"3"},"total":{"N":"64000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-16#115"},"customerId":{"S":"4"},"total":{"N":"65000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-19#116"},"customerId":{"S":"5"},"total":{"N":"66000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-22#117"},"customerId":{"S":"6"},"total":{"N":"67000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-25#118"},"customerId":{"S":"1"},"total":{"N":"68000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-28#119"},"customerId":{"S":"2"},"total":{"N":"69000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-01#120"},"customerId":{"S":"3"},"total":{"N":"70000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-04#121"},"customerId":{"S":"4"},"total":{"N":"71000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-07#122"},"customerId":{"S":"5"},"total":{"N":"72000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-10#123"},"customerId":{"S":"6"},"total":{"N":"73000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-13#124"},"customerId":{"S":"1"},"total":{"N":"74000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-16#125"},"customerId":{"S":"2"},"total":{"N":"75000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-19#126"},"customerId":{"S":"3"},"total":{"N":"76000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-22#127"},"customerId":{"S":"4"},"total":{"N":"77000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-25#128"},"customerId":{"S":"5"},"total":{"N":"78000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-28#129"},"customerId":{"S":"6"},"total":{"N":"79000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#1"},"sk":{"S":"ORDER#2026-10-01#130"},"customerId":{"S":"1"},"total":{"N":"80000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#2"},"sk":{"S":"ORDER#2026-10-04#131"},"customerId":{"S":"2"},"total":{"N":"81000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#3"},"sk":{"S":"ORDER#2026-10-07#132"},"customerId":{"S":"3"},"total":{"N":"82000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#4"},"sk":{"S":"ORDER#2026-10-10#133"},"customerId":{"S":"4"},"total":{"N":"83000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#5"},"sk":{"S":"ORDER#2026-10-13#134"},"customerId":{"S":"5"},"total":{"N":"84000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}},
        {"pk":{"S":"CUST#6"},"sk":{"S":"ORDER#2026-10-16#135"},"customerId":{"S":"6"},"total":{"N":"85000"},"note":{"S":"Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. Leave the parcel at the side door and call the shop before arriving. "}}
      ]
    }}
  bad: |
    SELECT sk, total FROM "Shop" WHERE "customerId" = '2'
  good: |
    SELECT sk, total FROM "Shop" WHERE "pk" = 'CUST#2'
  expect: { compare: rcu }
quiz:
  - q:
      vi: "Bảng `Shop` có partition key `pk`. Câu `SELECT * FROM \"Shop\" WHERE \"customerId\" = '2'` chạy như thế nào?"
      en: "Table `Shop` has partition key `pk`. How does `SELECT * FROM \"Shop\" WHERE \"customerId\" = '2'` run?"
    options:
      - { vi: "Như một `Query`", en: "As a `Query`" }
      - { vi: "Như một `Scan` cả bảng", en: "As a full table `Scan`" }
      - { vi: "Báo lỗi cú pháp", en: "As a syntax error" }
    answer: 1
    why:
      vi: "`WHERE` không có `=` hay `IN` trên partition key thì câu `SELECT` thành quét cả bảng, không báo lỗi. Docs còn chỉ cách cấm quét cả bảng của PartiQL bằng IAM policy."
      en: "If `WHERE` has no `=` or `IN` on the partition key, the `SELECT` becomes a full table scan, with no error. The docs also show how to deny PartiQL full table scans with an IAM policy."
---

## Ý chính

Câu `SELECT` của PartiQL trên DynamoDB phải có điều kiện `=` hoặc `IN` trên partition key. Có thể cấm quét cả bảng bằng IAM policy.

## Vì sao

- Cú pháp giống SQL nhưng engine vẫn là DynamoDB: không có planner chọn index cho bạn.
- Thiếu partition key thì câu lệnh thành `Scan`, trả tiền đọc mọi item.

## Ví dụ

Bảng có 36 đơn của 6 khách, mỗi đơn mang cả `pk` = `CUST#2` lẫn thuộc tính `customerId` = 2. Hai câu trả cùng 6 đơn; số đo dưới pane là RCU.

# EN

## Key idea

A PartiQL `SELECT` on DynamoDB must have an `=` or `IN` condition on the partition key. Full table scans can be denied with an IAM policy.

## Why

- The syntax looks like SQL but the engine is still DynamoDB: no planner picks an index for you.
- Without the partition key the statement becomes a `Scan`, paying to read every item.

## Example

The table holds 36 orders of 6 customers; each order carries both `pk` = `CUST#2` and the attribute `customerId` = 2. Both statements return the same 6 orders; the figure under each pane is the RCU.
