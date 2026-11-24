---
id: e-dy-l3-14
engine: dynamodb
level: L3
module: single-table
title: "Lab: khách đứng đầu partition key (TENANT#)"
title_en: "Lab: the tenant leads the partition key (TENANT#)"
kind: lab
runtime: browser
minutes: 15
viz: dy-single-table
objectives:
  - vi: "Đặt mã khách vào đầu partition key (`TENANT#<id>`) để mọi trang của một khách là một Query"
    en: "Put the tenant id at the start of the partition key (`TENANT#<id>`) so every page of one tenant is one Query"
  - vi: "Cho GSI một partition key cũng mở đầu bằng mã khách"
    en: "Give a GSI a partition key that also starts with the tenant id"
  - vi: "Thấy Scan có bộ lọc theo khách đọc item của mọi khách"
    en: "See that a Scan filtered by tenant reads every tenant's items"
requires: [e-dy-l3-07, e-dy-l3-04]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-gsi-overloading.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
lab:
  setup: |
    {"tables": [{"TableName": "Portal", "BillingMode": "PAY_PER_REQUEST",
      "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}],
      "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}, {"AttributeName": "SK", "AttributeType": "S"}, {"AttributeName": "GSI1PK", "AttributeType": "S"}, {"AttributeName": "status", "AttributeType": "S"}],
      "GlobalSecondaryIndexes": [
        {"IndexName": "byTenantStatus", "KeySchema": [{"AttributeName": "GSI1PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}},
        {"IndexName": "byStatus", "KeySchema": [{"AttributeName": "status", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}], "Projection": {"ProjectionType": "ALL"}}]}],
     "items": {"Portal": [
      {"PK": "TENANT#C01", "SK": "SHIP#2026-09-28#SH-1001", "status": "delivered", "GSI1PK": "TENANT#C01#STATUS#delivered", "port": "Busan", "weightKg": 1200},
      {"PK": "TENANT#C02", "SK": "SHIP#2026-09-30#SH-1002", "status": "delivered", "GSI1PK": "TENANT#C02#STATUS#delivered", "port": "Kaohsiung", "weightKg": 800},
      {"PK": "TENANT#C03", "SK": "SHIP#2026-10-01#SH-1003", "status": "delivered", "GSI1PK": "TENANT#C03#STATUS#delivered", "port": "Singapore", "weightKg": 2400},
      {"PK": "TENANT#C01", "SK": "SHIP#2026-10-04#SH-1004", "status": "open", "GSI1PK": "TENANT#C01#STATUS#open", "port": "Busan", "weightKg": 950},
      {"PK": "TENANT#C02", "SK": "SHIP#2026-10-05#SH-1005", "status": "delivered", "GSI1PK": "TENANT#C02#STATUS#delivered", "port": "Laem Chabang", "weightKg": 1600},
      {"PK": "TENANT#C03", "SK": "SHIP#2026-10-07#SH-1006", "status": "open", "GSI1PK": "TENANT#C03#STATUS#open", "port": "Singapore", "weightKg": 700},
      {"PK": "TENANT#C01", "SK": "SHIP#2026-10-09#SH-1007", "status": "delivered", "GSI1PK": "TENANT#C01#STATUS#delivered", "port": "Yokohama", "weightKg": 1300},
      {"PK": "TENANT#C02", "SK": "SHIP#2026-10-10#SH-1008", "status": "open", "GSI1PK": "TENANT#C02#STATUS#open", "port": "Kaohsiung", "weightKg": 500},
      {"PK": "TENANT#C03", "SK": "SHIP#2026-10-12#SH-1009", "status": "delivered", "GSI1PK": "TENANT#C03#STATUS#delivered", "port": "Port Klang", "weightKg": 2100},
      {"PK": "TENANT#C01", "SK": "SHIP#2026-10-15#SH-1010", "status": "open", "GSI1PK": "TENANT#C01#STATUS#open", "port": "Busan", "weightKg": 400},
      {"PK": "TENANT#C02", "SK": "SHIP#2026-10-17#SH-1011", "status": "delivered", "GSI1PK": "TENANT#C02#STATUS#delivered", "port": "Laem Chabang", "weightKg": 1100},
      {"PK": "TENANT#C03", "SK": "SHIP#2026-10-20#SH-1012", "status": "open", "GSI1PK": "TENANT#C03#STATUS#open", "port": "Port Klang", "weightKg": 650},
      {"PK": "TENANT#C01", "SK": "SHIP#2026-10-22#SH-1013", "status": "open", "GSI1PK": "TENANT#C01#STATUS#open", "port": "Yokohama", "weightKg": 900},
      {"PK": "TENANT#C02", "SK": "SHIP#2026-10-24#SH-1014", "status": "open", "GSI1PK": "TENANT#C02#STATUS#open", "port": "Kaohsiung", "weightKg": 300},
      {"PK": "TENANT#C02", "SK": "SHIP#2026-10-27#SH-1015", "status": "open", "GSI1PK": "TENANT#C02#STATUS#open", "port": "Laem Chabang", "weightKg": 750}
    ]}}
  steps:
    - name: { vi: "Mọi lô của một khách", en: "Every shipment of one tenant" }
      task:
        vi: "Cổng khách hàng của Cargo Query mở trang \"Lô hàng của tôi\" cho khách `C02`. Đọc mọi lô của khách đó bằng một Query trên bảng `Portal`."
        en: "The Cargo Query customer portal opens the \"My shipments\" page for tenant `C02`. Read every shipment of that tenant with one Query on table `Portal`."
      solution: |
        {"op": "Query", "input": {
          "TableName": "Portal",
          "KeyConditionExpression": "PK = :t",
          "ExpressionAttributeValues": {
            ":t": {"S": "TENANT#C02"}}}}
      check: doc
      perf: { table: Portal }
      slow: |
        {"op":"Scan","input":{"TableName":"Portal","FilterExpression":"PK = :t","ExpressionAttributeValues":{":t":{"S":"TENANT#C02"}}}}
      expect: { Count: 6, ScannedCount: 6 }
      hint:
        vi: "Partition key là `PK`, giá trị `TENANT#C02`."
        en: "The partition key is `PK`, value `TENANT#C02`."
    - name: { vi: "Một tháng của một khách", en: "One month of one tenant" }
      task:
        vi: "Khách `C02` lọc trang theo tháng 10/2026. Đọc các lô có sort key bắt đầu bằng `SHIP#2026-10`, vẫn bằng một Query."
        en: "Tenant `C02` filters the page to October 2026. Read the shipments whose sort key starts with `SHIP#2026-10`, still with one Query."
      solution: |
        {"op": "Query", "input": {
          "TableName": "Portal",
          "KeyConditionExpression":
            "PK = :t AND begins_with(SK, :m)",
          "ExpressionAttributeValues": {
            ":t": {"S": "TENANT#C02"},
            ":m": {"S": "SHIP#2026-10"}}}}
      check: doc
      perf: { table: Portal }
      slow: |
        {"op":"Scan","input":{"TableName":"Portal","FilterExpression":"PK = :t AND begins_with(SK, :m)","ExpressionAttributeValues":{":t":{"S":"TENANT#C02"},":m":{"S":"SHIP#2026-10"}}}}
      expect: { Count: 5, ScannedCount: 5 }
      hint:
        vi: "`begins_with` trên sort key nằm trong `KeyConditionExpression`."
        en: "`begins_with` on the sort key goes in `KeyConditionExpression`."
    - name: { vi: "Lô đang mở, qua GSI có tiền tố khách", en: "Open shipments, through a tenant-prefixed GSI" }
      task:
        vi: "Trang \"Đang vận chuyển\" của khách `C02` cần các lô có `status` là `open`. Dùng GSI `byTenantStatus`, partition key `GSI1PK` có dạng `TENANT#<tenant>#STATUS#<status>`."
        en: "The \"In transit\" page of tenant `C02` needs the shipments whose `status` is `open`. Use GSI `byTenantStatus`, whose partition key `GSI1PK` has the form `TENANT#<tenant>#STATUS#<status>`."
      solution: |
        {"op": "Query", "input": {
          "TableName": "Portal",
          "IndexName": "byTenantStatus",
          "KeyConditionExpression": "GSI1PK = :g",
          "ExpressionAttributeValues": {
            ":g": {"S": "TENANT#C02#STATUS#open"}}}}
      check: doc
      perf: { table: Portal }
      slow: |
        {"op":"Scan","input":{"TableName":"Portal","IndexName":"byTenantStatus","FilterExpression":"GSI1PK = :g","ExpressionAttributeValues":{":g":{"S":"TENANT#C02#STATUS#open"}}}}
      expect: { Count: 3, ScannedCount: 3 }
      hint:
        vi: "Thêm `\"IndexName\": \"byTenantStatus\"`; giá trị khóa là `TENANT#C02#STATUS#open`."
        en: "Add `\"IndexName\": \"byTenantStatus\"`; the key value is `TENANT#C02#STATUS#open`."
    - name: { vi: "Ghi một lô mới đúng khóa", en: "Write a new shipment with the right keys" }
      task:
        vi: "Khách `C03` đặt lô `SH-1016` ngày 2026-10-30, cảng `Busan`, 1000 kg, trạng thái `open`. Ghi item với `PK`, `SK` và `GSI1PK` đúng dạng của bảng để cả ba trang trên tìm thấy nó."
        en: "Tenant `C03` books shipment `SH-1016` on 2026-10-30, port `Busan`, 1000 kg, status `open`. Write the item with `PK`, `SK` and `GSI1PK` in the table's format so all three pages above find it."
      solution: |
        {"op": "PutItem", "input": {
          "TableName": "Portal",
          "Item": {
            "PK": {"S": "TENANT#C03"},
            "SK": {"S": "SHIP#2026-10-30#SH-1016"},
            "status": {"S": "open"},
            "GSI1PK": {"S": "TENANT#C03#STATUS#open"},
            "port": {"S": "Busan"},
            "weightKg": {"N": "1000"}}}}
      check: doc
      hint:
        vi: "`SK` là `SHIP#<date>#<id>` (ngày, mã lô); `GSI1PK` ghép mã khách với trạng thái."
        en: "`SK` is `SHIP#<date>#<id>` (date, shipment id); `GSI1PK` joins the tenant id with the status."
quiz:
  - q:
      vi: "Một bảng khác của cổng dùng partition key là mã lô và lưu `tenantId` như thuộc tính thường. Trang khách gọi Scan với `FilterExpression` `tenantId = :t`, kết quả đúng. Vấn đề là gì?"
      en: "Another portal table uses the shipment id as partition key and keeps `tenantId` as a plain attribute. The tenant page calls a Scan with `FilterExpression` `tenantId = :t`, and the result is right. What is the problem?"
    options:
      - { vi: "Scan đọc item của mọi khách rồi mới lọc, và tính tiền cho tất cả", en: "The Scan reads every tenant's items before filtering, and bills for all of them" }
      - { vi: "Bộ lọc chạy trước khi đọc, nên chỉ tính tiền phần của khách đó", en: "The filter runs before the read, so only that tenant's part is billed" }
      - { vi: "Scan trả item theo thứ tự ngẫu nhiên nên trang nhảy lung tung", en: "A Scan returns items in random order, so the page jumps around" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì bộ lọc nằm ngay trong request. Nhưng `FilterExpression` áp sau khi đọc: `ScannedCount` là mọi item của bảng, RCU tính theo phần đã đọc. Đặt khách vào partition key thì Query chỉ đọc phần của khách đó."
      en: "It sounds right because the filter sits right in the request. But `FilterExpression` applies after the read: `ScannedCount` is every item of the table, and RCU is charged on what was read. Put the tenant in the partition key and a Query reads only that tenant's part."
  - q:
      vi: "Bảng có thêm GSI `byStatus` với partition key chỉ là `status`. Dùng nó cho trang \"Đang vận chuyển\" của một khách thì rủi ro gì?"
      en: "The table also has GSI `byStatus` whose partition key is only `status`. What is the risk of using it for one tenant's \"In transit\" page?"
    options:
      - { vi: "GSI chỉ trả thuộc tính khóa, nên trang sẽ thiếu cảng và khối lượng", en: "A GSI returns only key attributes, so the page lacks the port and weight" }
      - { vi: "Không có rủi ro, miễn ứng dụng nhớ lọc lại theo khách sau khi đọc", en: "No risk, as long as the application remembers to filter by tenant after reading" }
      - { vi: "Một Query trên GSI đó trả lô đang mở của mọi khách cùng một lúc", en: "One Query on that GSI returns every tenant's open shipments at once" }
    answer: 2
    trap: 1
    why:
      vi: "Lọc lại trong ứng dụng nghe đủ, nhưng request đã đọc và trả dữ liệu của khách khác, và một lỗi nhỏ trong code là lộ ra. Điều kiện IAM `dynamodb:LeadingKeys` cũng chỉ giữ được khách khi khóa của index mở đầu bằng mã khách. GSI `byTenantStatus` làm đúng việc đó."
      en: "Filtering again in the application sounds enough, but the request has already read and returned other tenants' data, and one small bug exposes it. The IAM condition `dynamodb:LeadingKeys` can only hold a tenant in when the index key starts with the tenant id. GSI `byTenantStatus` does exactly that."
---
## Mở bài

Cổng khách hàng của Cargo Query cho mỗi khách xem lô hàng của riêng mình, và mọi lô của mọi khách nằm trong một bảng `Portal`. Nếu mã khách chỉ là một thuộc tính thường, mỗi lần mở trang là một Scan qua lô của cả cổng. Đặt mã khách vào đầu khóa thì mỗi trang chỉ đọc phần của một khách.

## Ý chính

Mô hình pool trong DynamoDB: các khách dùng chung một bảng, và partition key mở đầu bằng mã khách, ví dụ `PK = TENANT#C02`, `SK = SHIP#<date>#<id>`. Mọi lô của một khách là một item collection, nên trang "Lô hàng của tôi" là một Query `PK = :t`. Sort key mở đầu bằng ngày cho thêm điều kiện `begins_with` hoặc `BETWEEN` mà không cần bộ lọc.

Mỗi mẫu truy cập khác của một khách cần một khóa cũng mở đầu bằng mã khách. GSI `byTenantStatus` có partition key `GSI1PK = TENANT#C02#STATUS#open`, nên "lô đang mở của khách C02" cũng là một Query. Một GSI chỉ theo `status` thì gom lô của mọi khách vào một partition key: request đọc dữ liệu của khách khác, và điều kiện IAM `dynamodb:LeadingKeys` (xem bài `e-dy-l5-09`) không giữ được khách trên index đó.

Không bao giờ dùng Scan trên đường đi của một khách: Scan đọc mọi item rồi mới lọc, và tính RCU cho mọi item đã đọc.

Lab chạy bằng dynoxide trong trình duyệt: số item, `ScannedCount` và RCU là số đo thật.

## Cú pháp

```text
PK     = TENANT#<tenant>
SK     = SHIP#<date>#<id>
GSI1PK = TENANT#<tenant>#STATUS#<s>
Query PK = :t
Query PK = :t AND begins_with(SK, :m)
Query IndexName GSI1PK = :g
```

- Mọi khóa (bảng và GSI) mở đầu bằng mã khách.
- Điều kiện trên sort key nằm trong `KeyConditionExpression`.
- Scan không bao giờ nằm trên đường đi của một khách.

## Ví dụ

Mọi lô của khách `C01`:

```json
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C01"}}}}
```

5 item, `ScannedCount` cũng là 5: không đọc lô của khách nào khác.

Lô đang mở của khách `C03`, qua GSI có tiền tố khách:

```json
{"op": "Query", "input": {
  "TableName": "Portal",
  "IndexName": "byTenantStatus",
  "KeyConditionExpression":
    "GSI1PK = :g",
  "ExpressionAttributeValues": {
    ":g": {"S":
      "TENANT#C03#STATUS#open"}}}}
```

Hai lô, `SH-1006` và `SH-1012`.

## Lỗi hay gặp

Scan có bộ lọc theo khách. Cả hai câu trả đúng 4 lô của `C03`, nhưng câu sai có `ScannedCount` 15:

```json
// WRONG
{"op": "Scan", "input": {
  "TableName": "Portal",
  "FilterExpression": "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C03"}}}}
```

```json
// FIX
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C03"}}}}
```

GSI không có tiền tố khách. Câu sai trả 8 lô đang mở của cả ba khách; câu sửa chỉ trả 3 lô của `C01`:

```json
// WRONG
{"op": "Query", "input": {
  "TableName": "Portal",
  "IndexName": "byStatus",
  "KeyConditionExpression": "#s = :s",
  "ExpressionAttributeNames": {
    "#s": "status"},
  "ExpressionAttributeValues": {
    ":s": {"S": "open"}}}}
```

```json
// FIX
{"op": "Query", "input": {
  "TableName": "Portal",
  "IndexName": "byTenantStatus",
  "KeyConditionExpression":
    "GSI1PK = :g",
  "ExpressionAttributeValues": {
    ":g": {"S":
      "TENANT#C01#STATUS#open"}}}}
```

Muốn đọc "mọi khách bắt đầu bằng `TENANT#`" bằng Query. Partition key chỉ nhận phép bằng:

```json
// ERROR ValidationException
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "begins_with(PK, :p)",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#"}}}}
```

Báo cáo chéo khách không đi qua đường của một khách; đó là việc của một kho phân tích riêng.

## Thực hành

Bảng `Portal` có 15 lô của ba khách `C01`, `C02`, `C03`. Đọc mọi lô của `C02`, một tháng của `C02`, các lô đang mở qua GSI có tiền tố khách, rồi ghi một lô mới cho `C03`. Ba bước đầu có thanh chi phí: câu Scan có bộ lọc cho cùng item nhưng bị chặn.

## Tóm tắt

- Partition key mở đầu bằng mã khách: `TENANT#<id>`.
- Mọi trang của một khách là một Query, không bao giờ là Scan.
- GSI cũng cần partition key mở đầu bằng mã khách.
- Bản đồ chủ đề nhiều tenant: `e-ds-l4-09`; khách nóng: `e-dy-l4-16`; quyền và chi phí: `e-dy-l5-09`.

# EN

## Opening

The Cargo Query customer portal lets each tenant see only its own shipments, and every shipment of every tenant sits in one `Portal` table. If the tenant id is only a plain attribute, every page open is a Scan over the whole portal's shipments. Put the tenant id at the start of the key and each page reads only one tenant's part.

## Key idea

The pool model in DynamoDB: tenants share one table, and the partition key starts with the tenant id, for example `PK = TENANT#C02`, `SK = SHIP#<date>#<id>`. All shipments of one tenant form one item collection, so the "My shipments" page is one Query `PK = :t`. A sort key that starts with the date adds a `begins_with` or `BETWEEN` condition with no filter.

Every other access pattern of one tenant needs a key that also starts with the tenant id. GSI `byTenantStatus` has the partition key `GSI1PK = TENANT#C02#STATUS#open`, so "open shipments of tenant C02" is one Query too. A GSI keyed on `status` alone puts every tenant's shipments under one partition key: the request reads other tenants' data, and the IAM condition `dynamodb:LeadingKeys` (see lesson `e-dy-l5-09`) cannot hold a tenant in on that index.

Never use a Scan on a single tenant's path: a Scan reads every item before it filters, and charges RCU for every item it read.

The lab runs on dynoxide in the browser: item counts, `ScannedCount` and RCU are real measurements.

## Syntax

```text
PK     = TENANT#<tenant>
SK     = SHIP#<date>#<id>
GSI1PK = TENANT#<tenant>#STATUS#<s>
Query PK = :t
Query PK = :t AND begins_with(SK, :m)
Query IndexName GSI1PK = :g
```

- Every key (table and GSI) starts with the tenant id.
- Sort key conditions go in `KeyConditionExpression`.
- A Scan is never on a single tenant's path.

## Example

Every shipment of tenant `C01`:

```json
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C01"}}}}
```

5 items, and `ScannedCount` is 5 too: no other tenant's shipment is read.

Open shipments of tenant `C03`, through the tenant-prefixed GSI:

```json
{"op": "Query", "input": {
  "TableName": "Portal",
  "IndexName": "byTenantStatus",
  "KeyConditionExpression":
    "GSI1PK = :g",
  "ExpressionAttributeValues": {
    ":g": {"S":
      "TENANT#C03#STATUS#open"}}}}
```

Two shipments, `SH-1006` and `SH-1012`.

## Common mistakes

A Scan filtered by tenant. Both requests return the same 4 shipments of `C03`, but the wrong one has a `ScannedCount` of 15:

```json
// WRONG
{"op": "Scan", "input": {
  "TableName": "Portal",
  "FilterExpression": "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C03"}}}}
```

```json
// FIX
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C03"}}}}
```

A GSI without the tenant prefix. The wrong one returns the 8 open shipments of all three tenants; the fix returns only the 3 of `C01`:

```json
// WRONG
{"op": "Query", "input": {
  "TableName": "Portal",
  "IndexName": "byStatus",
  "KeyConditionExpression": "#s = :s",
  "ExpressionAttributeNames": {
    "#s": "status"},
  "ExpressionAttributeValues": {
    ":s": {"S": "open"}}}}
```

```json
// FIX
{"op": "Query", "input": {
  "TableName": "Portal",
  "IndexName": "byTenantStatus",
  "KeyConditionExpression":
    "GSI1PK = :g",
  "ExpressionAttributeValues": {
    ":g": {"S":
      "TENANT#C01#STATUS#open"}}}}
```

Trying to read "every tenant starting with `TENANT#`" with a Query. The partition key only takes equality:

```json
// ERROR ValidationException
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "begins_with(PK, :p)",
  "ExpressionAttributeValues": {
    ":p": {"S": "TENANT#"}}}}
```

A cross-tenant report does not go through a single tenant's path; that is the job of a separate analytics store.

## Practice

Table `Portal` holds 15 shipments of three tenants `C01`, `C02`, `C03`. Read every shipment of `C02`, one month of `C02`, the open shipments through the tenant-prefixed GSI, then write a new shipment for `C03`. The first three steps have a cost bar: the filtered Scan returns the same items but is refused.

## Recap

- The partition key starts with the tenant id: `TENANT#<id>`.
- Every page of one tenant is one Query, never a Scan.
- A GSI also needs a partition key that starts with the tenant id.
- The multi-tenant topic map: `e-ds-l4-09`; hot tenants: `e-dy-l4-16`; access and cost: `e-dy-l5-09`.
