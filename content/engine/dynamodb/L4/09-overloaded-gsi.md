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
  - { vi: "Chọn giá trị cho thuộc tính chung sao cho sắp đúng theo chuỗi", en: "Choose values for the shared attribute that sort correctly as strings" }
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
quiz:
  - q: { vi: "Ngày vào làm được lưu là `1/2/2026`, `15/11/2025`. Query `lookup BETWEEN` theo khoảng ngày trên GSI có đúng không?", en: "Hire dates are stored as `1/2/2026`, `15/11/2025`. Is a Query with `lookup BETWEEN` over a date range on the GSI right?" }
    options:
      - { vi: "Đúng, DynamoDB nhận ra đó là ngày", en: "Yes, DynamoDB recognises them as dates" }
      - { vi: "Sai: sort key chuỗi so theo byte, nên ngày phải viết `YYYY-MM-DD` đủ chữ số", en: "No: a string sort key compares bytes, so dates must be written `YYYY-MM-DD` with every digit" }
      - { vi: "Đúng nếu bảng ở chế độ on-demand", en: "Yes if the table is on-demand" }
    answer: 1
    trap: 0
    why: { vi: "Nghe hợp lý vì nhìn qua đó là ngày, nhưng DynamoDB chỉ có chuỗi, số và nhị phân: `1/2/2026` đứng trước `15/11/2025` theo byte. Viết năm trước, đủ hai chữ số tháng và ngày thì thứ tự chuỗi trùng thứ tự thời gian.", en: "It sounds right because they look like dates, but DynamoDB has only strings, numbers and binary: `1/2/2026` comes before `15/11/2025` by bytes. Year first, with two digits for month and day, makes string order match time order." }
  - q: { vi: "Vì sao GSI `ByLookup` lấy sort key của bảng (`sk`) làm partition key của nó?", en: "Why does the GSI `ByLookup` use the table's sort key (`sk`) as its own partition key?" }
    options:
      - { vi: "Để mỗi loại item (`PROFILE`, `WAREHOUSE`, `HIRED`) là một partition riêng trên GSI, chọn được loại câu hỏi", en: "So each item type (`PROFILE`, `WAREHOUSE`, `HIRED`) is its own partition on the GSI, picking the kind of question" }
      - { vi: "Vì GSI bắt buộc dùng sort key của bảng", en: "Because a GSI must use the table's sort key" }
      - { vi: "Để GSI nhất quán mạnh", en: "To make the GSI strongly consistent" }
    answer: 0
    why: { vi: "Partition key của GSI chọn loại item, sort key `lookup` trả lời câu hỏi bằng `=`, `BETWEEN` hay `begins_with`. Lưu ý: chỉ có ba giá trị `sk`, nên với tải lớn GSI này dồn mỗi loại vào một partition; khi đó cần thêm hậu tố shard.", en: "The GSI partition key picks the item type, the sort key `lookup` answers the question with `=`, `BETWEEN` or `begins_with`. Note: there are only three `sk` values, so under heavy load this GSI piles each type onto one partition; then add a shard suffix." }
---
## Mở bài

Trang nhân sự cần tìm theo tên, theo kho và theo ngày vào làm. Ba GSI thì ba lần ghi thêm cho mỗi thay đổi, và mỗi bảng mặc định chỉ có tối đa 20 GSI. Liệu một GSI có trả lời được cả ba câu hỏi?

## Ý chính

GSI overloading (GSI dùng chung): mọi item có chung một thuộc tính (ở đây `lookup`), nhưng giá trị mang nghĩa khác nhau tùy loại item: tên với hồ sơ, mã kho với item kho, ngày với item vào làm. GSI lấy sort key của bảng làm partition key và thuộc tính chung làm sort key. Partition key của GSI chọn "loại câu hỏi", sort key trả lời câu hỏi bằng `=`, `BETWEEN` hay `begins_with`.

Một GSI thay cho ba, tức ít index phải ghi và ít quota phải dùng. Đổi lại, giá trị trong `lookup` phải sắp đúng theo chuỗi: ngày `YYYY-MM-DD` đủ chữ số, mã có tiền tố.

Nhiều người nghĩ DynamoDB tự hiểu một chuỗi trông như ngày. Thật ra nó chỉ so byte: `2026-1-1` và `2026-02-06` không sắp theo thời gian, nên một `BETWEEN` với ngày thiếu số 0 sẽ trả sai mà không báo lỗi.

Lab chạy bằng dynoxide trong trình duyệt.

## Cú pháp

```text
table:  pk = <entity>, sk = <item type>, lookup = <value for that type>
GSI:    {"IndexName": "ByLookup", "KeySchema": [{"AttributeName": "sk", "KeyType": "HASH"}, {"AttributeName": "lookup", "KeyType": "RANGE"}]}
query:  "sk = :type AND lookup = :v"
        "sk = :type AND lookup BETWEEN :a AND :b"
        "sk = :type AND begins_with(lookup, :prefix)"
```

- `sk` của bảng chọn loại item; `lookup` giữ giá trị để tra cứu.
- Giá trị của `lookup` phải sắp đúng theo chuỗi.
- Mỗi bảng mặc định tối đa 20 GSI.

## Ví dụ

Nhân viên ở kho `WH#01`:

```json
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup = :w", "ExpressionAttributeValues": {":t": {"S": "WAREHOUSE"}, ":w": {"S": "WH#01"}}}}
```

Bốn người: `e01`, `e04`, `e07`, `e10`.

Người vào làm trong năm 2025, theo thứ tự ngày:

```json
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup BETWEEN :a AND :b", "ExpressionAttributeValues": {":t": {"S": "HIRED"}, ":a": {"S": "2025-01-01"}, ":b": {"S": "2025-12-31"}}}}
```

Năm người, từ `2025-01-01` tới `2025-09-17`.

Hồ sơ có tên bắt đầu bằng `D`:

```json
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND begins_with(lookup, :n)", "ExpressionAttributeValues": {":t": {"S": "PROFILE"}, ":n": {"S": "D"}}}}
```

`Dang Khoa` và `Do Phuc`.

## Lỗi hay gặp

Viết ngày thiếu số 0:

```json
// WRONG: "2026-1-1" sorts after "2026-02-06" and "2026-06-28"
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup BETWEEN :a AND :b", "ExpressionAttributeValues": {":t": {"S": "HIRED"}, ":a": {"S": "2026-1-1"}, ":b": {"S": "2026-6-30"}}}}
```

```json
// FIX: zero-padded YYYY-MM-DD
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup BETWEEN :a AND :b", "ExpressionAttributeValues": {":t": {"S": "HIRED"}, ":a": {"S": "2026-01-01"}, ":b": {"S": "2026-06-30"}}}}
```

Câu sai chỉ trả `2026-10-22`, một ngày nằm ngoài khoảng; câu sửa trả đúng ba người.

Dùng `begins_with` trên partition key của GSI:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "begins_with(sk, :t)", "ExpressionAttributeValues": {":t": {"S": "W"}}}}
```

Partition key (của bảng hay của GSI) chỉ so bằng. Ghi đúng loại item: `sk = :t`.

## Thực hành

10 nhân viên × 3 item = 30 item. Ba câu hỏi, một GSI: theo kho, theo khoảng ngày vào làm, theo tiền tố tên.

## Tóm tắt

- GSI dùng chung: một thuộc tính chung, nghĩa khác nhau tùy loại item.
- Partition key của GSI chọn loại câu hỏi, sort key trả lời nó.
- Giá trị phải sắp đúng theo byte: ngày `YYYY-MM-DD`, mã có tiền tố.
- Partition key chỉ so bằng; `BETWEEN` và `begins_with` dành cho sort key.

# EN

## Opening

The HR page needs lookups by name, by warehouse and by hire date. Three GSIs mean three extra writes per change, and a table has a default quota of 20 GSIs. Can one GSI answer all three questions?

## Key idea

GSI overloading: every item shares one attribute (here `lookup`), but its value means different things per item type: a name on a profile, a warehouse id on a warehouse item, a date on a hire item. The GSI uses the table's sort key as its partition key and the shared attribute as its sort key. The GSI partition key picks the "kind of question", the sort key answers it with `=`, `BETWEEN` or `begins_with`.

One GSI replaces three, so fewer indexes to write and less quota used. In exchange, the values in `lookup` must sort correctly as strings: `YYYY-MM-DD` dates with every digit, prefixed ids.

Many people think DynamoDB understands a string that looks like a date. In fact it only compares bytes: `2026-1-1` and `2026-02-06` do not sort by time, so a `BETWEEN` with unpadded dates returns wrong items without any error.

The lab runs on dynoxide in the browser.

## Syntax

```text
table:  pk = <entity>, sk = <item type>, lookup = <value for that type>
GSI:    {"IndexName": "ByLookup", "KeySchema": [{"AttributeName": "sk", "KeyType": "HASH"}, {"AttributeName": "lookup", "KeyType": "RANGE"}]}
query:  "sk = :type AND lookup = :v"
        "sk = :type AND lookup BETWEEN :a AND :b"
        "sk = :type AND begins_with(lookup, :prefix)"
```

- The table's `sk` picks the item type; `lookup` holds the value to look up.
- The values of `lookup` must sort correctly as strings.
- A table has at most 20 GSIs by default.

## Example

Employees in warehouse `WH#01`:

```json
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup = :w", "ExpressionAttributeValues": {":t": {"S": "WAREHOUSE"}, ":w": {"S": "WH#01"}}}}
```

Four people: `e01`, `e04`, `e07`, `e10`.

People hired in 2025, in date order:

```json
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup BETWEEN :a AND :b", "ExpressionAttributeValues": {":t": {"S": "HIRED"}, ":a": {"S": "2025-01-01"}, ":b": {"S": "2025-12-31"}}}}
```

Five people, from `2025-01-01` to `2025-09-17`.

Profiles whose name starts with `D`:

```json
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND begins_with(lookup, :n)", "ExpressionAttributeValues": {":t": {"S": "PROFILE"}, ":n": {"S": "D"}}}}
```

`Dang Khoa` and `Do Phuc`.

## Common mistakes

Writing dates without leading zeros:

```json
// WRONG: "2026-1-1" sorts after "2026-02-06" and "2026-06-28"
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup BETWEEN :a AND :b", "ExpressionAttributeValues": {":t": {"S": "HIRED"}, ":a": {"S": "2026-1-1"}, ":b": {"S": "2026-6-30"}}}}
```

```json
// FIX: zero-padded YYYY-MM-DD
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "sk = :t AND lookup BETWEEN :a AND :b", "ExpressionAttributeValues": {":t": {"S": "HIRED"}, ":a": {"S": "2026-01-01"}, ":b": {"S": "2026-06-30"}}}}
```

The wrong query returns only `2026-10-22`, a date outside the range; the fix returns the right three people.

Using `begins_with` on the GSI's partition key:

```json
// ERROR ValidationException
{"op": "Query", "input": {"TableName": "Staff", "IndexName": "ByLookup", "KeyConditionExpression": "begins_with(sk, :t)", "ExpressionAttributeValues": {":t": {"S": "W"}}}}
```

A partition key (of the table or of a GSI) only supports equality. Name the item type: `sk = :t`.

## Practice

10 employees × 3 items = 30 items. Three questions, one GSI: by warehouse, by a range of hire dates, by a name prefix.

## Recap

- Overloaded GSI: one shared attribute whose meaning depends on the item type.
- The GSI partition key picks the kind of question, the sort key answers it.
- Values must sort correctly by bytes: `YYYY-MM-DD` dates, prefixed ids.
- A partition key only supports equality; `BETWEEN` and `begins_with` are for the sort key.
