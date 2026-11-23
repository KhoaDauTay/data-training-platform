---
id: e-dy-l4-09
engine: dynamodb
level: L4
module: patterns
title: "GSI dùng chung: một index, nhiều kiểu tra cứu"
title_en: "Overloaded GSI: one index, many kinds of lookup"
kind: lab
runtime: browser
minutes: 12
objectives:
  - { vi: "Dùng một thuộc tính chung chứa giá trị khác nhau tùy loại item", en: "Use one shared attribute that holds a different kind of value per item type" }
  - { vi: "Trả lời ba câu hỏi khác nhau bằng cùng một GSI", en: "Answer three different questions with the same GSI" }
requires: [e-dy-l4-07]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-gsi-overloading.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
viz: dy-gsi
lab:
  setup: |
    {"tables": [
      {"TableName":"Staff","KeySchema":[{"AttributeName":"pk","KeyType":"HASH"},{"AttributeName":"sk","KeyType":"RANGE"}],"AttributeDefinitions":[{"AttributeName":"pk","AttributeType":"S"},{"AttributeName":"sk","AttributeType":"S"},{"AttributeName":"lookup","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST","GlobalSecondaryIndexes":[{"IndexName":"ByLookup","KeySchema":[{"AttributeName":"sk","KeyType":"HASH"},{"AttributeName":"lookup","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]}
    ], "items": {
      "Staff": [
        {"pk":"EMP#e01","sk":"PROFILE","lookup":"Tran Lan","phone":"0905100000"},
        {"pk":"EMP#e01","sk":"WAREHOUSE","lookup":"WH#01"},
        {"pk":"EMP#e01","sk":"HIRED","lookup":"2025-01-01"},
        {"pk":"EMP#e02","sk":"PROFILE","lookup":"Le Minh","phone":"0905107919"},
        {"pk":"EMP#e02","sk":"WAREHOUSE","lookup":"WH#02"},
        {"pk":"EMP#e02","sk":"HIRED","lookup":"2026-08-12"},
        {"pk":"EMP#e03","sk":"PROFILE","lookup":"Pham Quang","phone":"0905115838"},
        {"pk":"EMP#e03","sk":"WAREHOUSE","lookup":"WH#03"},
        {"pk":"EMP#e03","sk":"HIRED","lookup":"2025-05-23"},
        {"pk":"EMP#e04","sk":"PROFILE","lookup":"Tran Hieu","phone":"0905123757"},
        {"pk":"EMP#e04","sk":"WAREHOUSE","lookup":"WH#01"},
        {"pk":"EMP#e04","sk":"HIRED","lookup":"2026-02-06"},
        {"pk":"EMP#e05","sk":"PROFILE","lookup":"Vo Thu","phone":"0905131676"},
        {"pk":"EMP#e05","sk":"WAREHOUSE","lookup":"WH#02"},
        {"pk":"EMP#e05","sk":"HIRED","lookup":"2025-09-17"},
        {"pk":"EMP#e06","sk":"PROFILE","lookup":"Dang Khoa","phone":"0905139595"},
        {"pk":"EMP#e06","sk":"WAREHOUSE","lookup":"WH#03"},
        {"pk":"EMP#e06","sk":"HIRED","lookup":"2026-06-28"},
        {"pk":"EMP#e07","sk":"PROFILE","lookup":"Bui Ngoc","phone":"0905147514"},
        {"pk":"EMP#e07","sk":"WAREHOUSE","lookup":"WH#01"},
        {"pk":"EMP#e07","sk":"HIRED","lookup":"2025-03-11"},
        {"pk":"EMP#e08","sk":"PROFILE","lookup":"Do Phuc","phone":"0905155433"},
        {"pk":"EMP#e08","sk":"WAREHOUSE","lookup":"WH#02"},
        {"pk":"EMP#e08","sk":"HIRED","lookup":"2026-10-22"},
        {"pk":"EMP#e09","sk":"PROFILE","lookup":"Ho Tam","phone":"0905163352"},
        {"pk":"EMP#e09","sk":"WAREHOUSE","lookup":"WH#03"},
        {"pk":"EMP#e09","sk":"HIRED","lookup":"2025-07-05"},
        {"pk":"EMP#e10","sk":"PROFILE","lookup":"Ngo Yen","phone":"0905171271"},
        {"pk":"EMP#e10","sk":"WAREHOUSE","lookup":"WH#01"},
        {"pk":"EMP#e10","sk":"HIRED","lookup":"2026-04-16"}
      ]
    }}
  steps:
    - task: { vi: "Bảng `Staff`: mỗi nhân viên có ba item, sort key `PROFILE`, `WAREHOUSE`, `HIRED`. Thuộc tính `lookup` chứa tên, mã kho hoặc ngày vào làm tùy item. GSI `ByLookup` có partition key `sk`, sort key `lookup`. Đọc mọi nhân viên làm ở kho `WH#02`.", en: "The `Staff` table: each employee has three items, sort keys `PROFILE`, `WAREHOUSE`, `HIRED`. The `lookup` attribute holds a name, a warehouse id or a hire date depending on the item. The GSI `ByLookup` has partition key `sk` and sort key `lookup`. Read every employee working in warehouse `WH#02`." }
      solution: |
        {"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup = :w", "ExpressionAttributeValues": {":t": {"S": "WAREHOUSE"}, ":w": {"S": "WH#02"}}}}
      check: doc
      perf: { table: Staff }
      slow: |
        {"op":"Scan","input":{"TableName":"Staff","IndexName":"ByLookup","ExpressionAttributeValues":{":t":{"S":"WAREHOUSE"},":w":{"S":"WH#02"}},"FilterExpression":"(sk = :t AND lookup = :w)"}}
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "Trên GSI, `sk` chọn loại item, `lookup` chọn giá trị.", en: "On the GSI, `sk` picks the item type and `lookup` picks the value." }
    - task: { vi: "Cùng GSI đó: đọc mọi người vào làm từ 2026-01-01 tới 2026-06-30, theo thứ tự ngày vào làm.", en: "Same GSI: read everyone hired from 2026-01-01 to 2026-06-30, in hire date order." }
      solution: |
        {"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup BETWEEN :a AND :b", "ExpressionAttributeValues": {":t": {"S": "HIRED"}, ":a": {"S": "2026-01-01"}, ":b": {"S": "2026-06-30"}}}}
      check: doc
      perf: { table: Staff }
      slow: |
        {"op":"Scan","input":{"TableName":"Staff","IndexName":"ByLookup","ExpressionAttributeValues":{":t":{"S":"HIRED"},":a":{"S":"2026-01-01"},":b":{"S":"2026-06-30"}},"FilterExpression":"(sk = :t AND lookup BETWEEN :a AND :b)"}}
      ordered: true
      expect: { Count: 3, ScannedCount: 3 }
      hint: { vi: "Ngày ở dạng `YYYY-MM-DD` sắp đúng theo chuỗi, nên `BETWEEN` trên sort key dùng được.", en: "Dates in `YYYY-MM-DD` sort correctly as strings, so `BETWEEN` on the sort key works." }
    - task: { vi: "Cùng GSI đó: tìm mọi hồ sơ có tên bắt đầu bằng `Tran`.", en: "Same GSI: find every profile whose name starts with `Tran`." }
      solution: |
        {"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND begins_with(lookup, :n)", "ExpressionAttributeValues": {":t": {"S": "PROFILE"}, ":n": {"S": "Tran"}}}}
      check: doc
      perf: { table: Staff }
      slow: |
        {"op":"Scan","input":{"TableName":"Staff","IndexName":"ByLookup","ExpressionAttributeValues":{":t":{"S":"PROFILE"},":n":{"S":"Tran"}},"FilterExpression":"(sk = :t AND begins_with(lookup, :n))"}}
      expect: { Count: 2, ScannedCount: 2 }
      hint: { vi: "`begins_with` dùng được trên sort key trong `KeyConditionExpression`.", en: "`begins_with` works on the sort key inside `KeyConditionExpression`." }
---

## Ý chính

Mỗi bảng mặc định có tối đa 20 GSI, nhưng bạn có thể tra cứu theo nhiều thuộc tính hơn thế bằng **GSI overloading** (GSI dùng chung):

- mọi item có chung một thuộc tính (ở đây `lookup`), nhưng giá trị mang nghĩa khác nhau tùy loại item: tên với hồ sơ, mã kho với item kho, ngày với item vào làm;
- GSI lấy **sort key của bảng** làm partition key và thuộc tính chung làm sort key;
- partition key của GSI chọn "loại câu hỏi", sort key trả lời câu hỏi bằng `=`, `BETWEEN` hay `begins_with`.

Một GSI thay cho ba, tức ít index phải ghi và ít quota phải dùng. Đổi lại, giá trị trong `lookup` phải được chọn sao cho sắp đúng theo chuỗi (ngày `YYYY-MM-DD`, mã có tiền tố).

## Ví dụ

```text
pk       sk         lookup
EMP#e02  PROFILE    Le Minh
EMP#e02  WAREHOUSE  WH#02
EMP#e02  HIRED      2026-08-12

GSI ByLookup: hash = sk, range = lookup
WAREHOUSE | WH#02      -> EMP#e02, EMP#e05, EMP#e08
HIRED     | 2026-02-06 -> EMP#e04
```

## Thực hành

10 nhân viên × 3 item = 30 item. Ba câu hỏi, một GSI.

# EN

## Key idea

A table has a default quota of 20 GSIs, yet you can look items up by more fields than that with an **overloaded GSI**:

- every item shares one attribute (here `lookup`), but its value means different things per item type: a name on a profile, a warehouse id on a warehouse item, a date on a hire item;
- the GSI uses the **table's sort key** as its partition key and the shared attribute as its sort key;
- the GSI partition key picks the "kind of question", the sort key answers it with `=`, `BETWEEN` or `begins_with`.

One GSI replaces three, so fewer indexes to write and less quota used. In exchange, the values in `lookup` must be chosen to sort correctly as strings (`YYYY-MM-DD` dates, prefixed ids).

## Example

```text
pk       sk         lookup
EMP#e02  PROFILE    Le Minh
EMP#e02  WAREHOUSE  WH#02
EMP#e02  HIRED      2026-08-12

GSI ByLookup: hash = sk, range = lookup
WAREHOUSE | WH#02      -> EMP#e02, EMP#e05, EMP#e08
HIRED     | 2026-02-06 -> EMP#e04
```

## Practice

10 employees × 3 items = 30 items. Three questions, one GSI.
