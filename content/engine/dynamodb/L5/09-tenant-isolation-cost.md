---
id: e-dy-l5-09
engine: dynamodb
level: L5
module: global-ops
title: "Cách ly và chi phí theo khách: bảng chung hay bảng riêng"
title_en: "Isolation and cost per tenant: a shared table or a table each"
kind: concept
runtime: docs
docs_why: server
minutes: 12
objectives:
  - { vi: "Chọn bảng chung có tiền tố khách, bảng riêng hay tài khoản riêng theo số khách và yêu cầu cách ly", en: "Choose a shared table with a tenant prefix, a table each or an account each by tenant count and isolation needs" }
  - { vi: "Viết điều kiện `dynamodb:LeadingKeys` có chặn `Null` và không cấp Scan", en: "Write a `dynamodb:LeadingKeys` condition with a `Null` guard and no Scan grant" }
  - { vi: "Biết tag chi phí gắn theo bảng, nên bảng chung cần ứng dụng tự đo chi phí từng khách", en: "Know that cost tags attach per table, so a shared table needs the application to meter each tenant's cost" }
requires: [e-dy-l5-08, e-dy-l3-14]
sources:
  - url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
    title: "IAM policy conditions for fine-grained access"
  - url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ServiceQuotas.html
    title: "Quotas"
  - url: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Tagging.html
    title: "Tagging resources"
demo_setup: |
  {"tables": [{"TableName": "Portal", "BillingMode": "PAY_PER_REQUEST", "KeySchema": [{"AttributeName": "PK", "KeyType": "HASH"}, {"AttributeName": "SK", "KeyType": "RANGE"}], "AttributeDefinitions": [{"AttributeName": "PK", "AttributeType": "S"}, {"AttributeName": "SK", "AttributeType": "S"}]}],
   "items": {"Portal": [
    {"PK": "TENANT#C01", "SK": "SHIP#2026-10-04#SH-1004", "status": "open", "weightKg": 950},
    {"PK": "TENANT#C01", "SK": "SHIP#2026-10-15#SH-1010", "status": "open", "weightKg": 400},
    {"PK": "TENANT#C02", "SK": "SHIP#2026-10-10#SH-1008", "status": "open", "weightKg": 500},
    {"PK": "TENANT#C02", "SK": "SHIP#2026-10-24#SH-1014", "status": "open", "weightKg": 300},
    {"PK": "TENANT#C02", "SK": "SHIP#2026-10-27#SH-1015", "status": "open", "weightKg": 750},
    {"PK": "TENANT#C03", "SK": "SHIP#2026-10-07#SH-1006", "status": "open", "weightKg": 700}
  ]}}
quiz:
  - q:
      vi: "Chính sách IAM của khách `C02` có `ForAllValues:StringEquals` trên `dynamodb:LeadingKeys` và cấp cả `dynamodb:Scan`. Khách đó gọi Scan bảng `Portal`. Chuyện gì xảy ra?"
      en: "Tenant `C02`'s IAM policy has `ForAllValues:StringEquals` on `dynamodb:LeadingKeys` and also grants `dynamodb:Scan`. That tenant calls a Scan on table `Portal`. What happens?"
    options:
      - { vi: "Scan được cho phép và trả item của mọi khách trong bảng", en: "The Scan is allowed and returns every tenant's items in the table" }
      - { vi: "Scan chỉ trả item có partition key bắt đầu bằng `TENANT#C02`", en: "The Scan returns only items whose partition key starts with `TENANT#C02`" }
      - { vi: "Scan bị từ chối vì `LeadingKeys` luôn chặn mọi thao tác quét", en: "The Scan is refused because `LeadingKeys` always blocks every scan" }
    answer: 0
    trap: 1
    why:
      vi: "Nghe hợp lý vì điều kiện nhắc mã khách. Nhưng Scan không mang `dynamodb:LeadingKeys`, và `ForAllValues` đúng khi khóa điều kiện vắng mặt. Docs của AWS bảo thêm `Null` trên cùng khóa với giá trị `false`, và không cấp Scan."
      en: "It sounds right because the condition names the tenant id. But a Scan carries no `dynamodb:LeadingKeys`, and `ForAllValues` is true when the condition key is absent. The AWS docs say to add `Null` on the same key with the value `false`, and not to grant Scan."
  - q:
      vi: "Cổng Cargo Query có 6.000 khách nhỏ. Một kỹ sư đề xuất mỗi khách một bảng để báo cáo chi phí theo tag. Điều gì chặn đề xuất này đầu tiên?"
      en: "The Cargo Query portal has 6,000 small tenants. An engineer proposes one table per tenant so cost can be reported by tag. What stops this proposal first?"
    options:
      - { vi: "Bảng riêng không gắn tag được, nên báo cáo theo tag không chạy", en: "Separate tables cannot carry tags, so the tag report would not work" }
      - { vi: "Quota ban đầu là 2.500 bảng mỗi vùng cho một tài khoản", en: "The initial quota is 2,500 tables per Region for one account" }
      - { vi: "Bảng riêng bắt buộc dùng chế độ provisioned, không on-demand", en: "Separate tables must use provisioned mode, never on-demand" }
    answer: 1
    trap: 0
    why:
      vi: "Bảng gắn tag được, và tag chi phí đúng là theo bảng. Nhưng quota ban đầu là 2.500 bảng mỗi vùng; tài khoản xin tăng được tới 10.000, quá nữa thì phải thêm tài khoản. Khách nhỏ và giống nhau hợp với bảng chung có tiền tố khách, cộng đo chi phí trong ứng dụng."
      en: "Tables can carry tags, and cost tags are indeed per table. But the initial quota is 2,500 tables per Region; an account can ask for up to 10,000, and beyond that you need more accounts. Small, similar tenants fit a shared table with a tenant prefix, plus cost metering in the application."
---
## Mở bài

Một khách lớn của cổng Cargo Query hỏi hai câu: "Ai khác đọc được dữ liệu của tôi không?" và "Tháng này tôi tốn bao nhiêu?". Với bảng chung, câu đầu do khóa và IAM trả lời, câu sau do chính ứng dụng. Bài này đặt hai câu trả lời đó cạnh cách thứ hai: mỗi khách một bảng.

## Ý chính

**Bảng chung (pool)**: mọi khách trong một bảng, mọi khóa mở đầu bằng mã khách (bài `e-dy-l3-14`). Rẻ, một bộ cài đặt, một lần đổi thiết kế. Cách ly dựa vào khóa và điều kiện IAM `dynamodb:LeadingKeys` (bài `e-dy-l5-08`).

**Điều kiện khóa theo khách** (`LeadingKeys`): cấp cho thông tin đăng nhập của khách `C02` quyền đọc ghi item có partition key `TENANT#C02`. Ba bẫy nằm trong docs của AWS. Một: `ForAllValues` đúng khi request không mang khóa đó, và Scan không mang, nên thêm `"Null": {"dynamodb:LeadingKeys": "false"}` và không cấp Scan. Hai: mọi khóa, cả của GSI, phải mở đầu bằng mã khách. Ba: khóa có hậu tố (`TENANT#C09#2`) cần `StringLike` với mẫu tiền tố. Lệnh theo lô và transaction được duyệt quyền theo từng item.

**Bảng hay tài khoản riêng (silo)**: cài đặt, backup, alarm và phạm vi sự cố theo từng khách. Quota ban đầu 2.500 bảng mỗi vùng cho một tài khoản, xin tăng được tới 10.000; quá nữa thì thêm tài khoản. Giữ cùng thiết kế khóa có tiền tố khách trong bảng riêng, để chuyển khách giữa hai mô hình không phải viết lại truy vấn.

**Chi phí**: tag chi phí gắn theo bảng (GSI theo tag của bảng), nên bảng chung chỉ có một dòng trên hóa đơn. Muốn chi phí từng khách, ứng dụng cộng `ConsumedCapacity` của mỗi request vào mã khách. Bảng riêng thì tag mã khách lên bảng.

Bài này cần IAM và hóa đơn AWS thật, dynoxide không có; hai Query ví dụ chạy được.

## Cú pháp

```text
"Condition": {
  "ForAllValues:StringEquals": {
    "dynamodb:LeadingKeys":
      ["TENANT#C02"]},
  "Null": {
    "dynamodb:LeadingKeys": "false"}}
Action: GetItem, Query, PutItem, ...
        never dynamodb:Scan
```

- `Null` = `false`: request phải mang partition key.
- Khóa có hậu tố: `ForAllValues:StringLike` với `TENANT#C09#*`.
- Chi phí khách trong bảng chung = tổng `ConsumedCapacity` theo khách.

## Ví dụ

Request của khách `C02`, đúng dạng mà điều kiện IAM cho phép:

```json
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C02"}},
  "ReturnConsumedCapacity": "TOTAL"}}
```

3 lô của `C02`. `ConsumedCapacity` trong kết quả là phần ứng dụng cộng vào sổ chi phí của `C02`.

Request của khách `C01`, đọc nhất quán mạnh:

```json
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C01"}},
  "ConsistentRead": true}}
```

2 lô. Đọc mạnh tốn gấp đôi đọc thường, và sổ chi phí của `C01` ghi đúng phần đó.

Sổ chi phí của ứng dụng (minh họa, không đo):

```text
request  tenant  op     RCU
r-101    C02     Query  0.5
r-102    C01     Query  1.0
month C02 = sum(RCU, tenant = C02)
```

## Lỗi hay gặp

Điều kiện không chặn `Null` và cấp Scan. Khách `C02` đọc được bảng của mọi khách:

```text
// WRONG
"Action": ["dynamodb:Query",
           "dynamodb:Scan"],
"Condition": {
  "ForAllValues:StringEquals": {
    "dynamodb:LeadingKeys":
      ["TENANT#C02"]}}
Scan as C02 -> every tenant's items
```

```text
// FIX
"Action": ["dynamodb:Query"],
"Condition": {
  "ForAllValues:StringEquals": {
    "dynamodb:LeadingKeys":
      ["TENANT#C02"]},
  "Null": {
    "dynamodb:LeadingKeys": "false"}}
Scan as C02 -> AccessDeniedException
```

Đo chi phí khách bằng tag trên bảng chung. Tag chỉ chia theo bảng, nên mọi khách cùng một dòng:

```text
// WRONG
Portal: tag tenant=all
bill: one line, 6,000 tenants
```

```text
// FIX
Portal: tag app=portal
log per request:
  tenant, ConsumedCapacity
```

## Tóm tắt

- Bảng chung: mọi khóa, cả GSI, mở đầu bằng mã khách.
- `LeadingKeys` cần `Null` = `false` và không cấp Scan.
- Bảng riêng: quota ban đầu 2.500 bảng mỗi vùng, tối đa 10.000 mỗi tài khoản.
- Tag chi phí theo bảng; bảng chung đo chi phí khách trong ứng dụng.
- Bản đồ chủ đề nhiều tenant: `e-ds-l4-09`; khách nóng: `e-dy-l4-16`.

# EN

## Opening

A big tenant of the Cargo Query portal asks two questions: "Can anyone else read my data?" and "What did I cost this month?". With a shared table, keys and IAM answer the first, and the application itself answers the second. This lesson puts those two answers next to the other way: one table per tenant.

## Key idea

**A shared table (pool)**: every tenant in one table, every key starting with the tenant id (lesson `e-dy-l3-14`). Cheap, one set of settings, one design change. Isolation rests on the keys and the IAM condition `dynamodb:LeadingKeys` (lesson `e-dy-l5-08`).

**Key conditions per tenant** (`LeadingKeys`): give tenant `C02`'s credentials read and write access to items whose partition key is `TENANT#C02`. Three traps sit in the AWS docs. One: `ForAllValues` is true when the request does not carry that key, and a Scan does not, so add `"Null": {"dynamodb:LeadingKeys": "false"}` and do not grant Scan. Two: every key, GSI keys included, must start with the tenant id. Three: a key with a suffix (`TENANT#C09#2`) needs `StringLike` with a prefix pattern. Batch calls and transactions are authorised item by item.

**A table or account each (silo)**: settings, backups, alarms and the blast radius per tenant. The initial quota is 2,500 tables per Region for one account, which can be raised to 10,000; beyond that, add accounts. Keep the same tenant-prefixed key design in a table of its own, so moving a tenant between the two models does not mean rewriting queries.

**Cost**: cost tags attach per table (GSIs take the table's tags), so a shared table is one line on the bill. For each tenant's cost, the application adds each request's `ConsumedCapacity` to the tenant id. With a table each, tag the table with the tenant id.

This lesson needs real IAM and a real AWS bill, which dynoxide does not have; the two example Queries do run.

## Syntax

```text
"Condition": {
  "ForAllValues:StringEquals": {
    "dynamodb:LeadingKeys":
      ["TENANT#C02"]},
  "Null": {
    "dynamodb:LeadingKeys": "false"}}
Action: GetItem, Query, PutItem, ...
        never dynamodb:Scan
```

- `Null` = `false`: the request must carry a partition key.
- A key with a suffix: `ForAllValues:StringLike` with `TENANT#C09#*`.
- A tenant's cost in a shared table = the sum of `ConsumedCapacity` per tenant.

## Example

A request from tenant `C02`, in the shape the IAM condition allows:

```json
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C02"}},
  "ReturnConsumedCapacity": "TOTAL"}}
```

The 3 shipments of `C02`. The `ConsumedCapacity` in the result is what the application adds to the cost ledger of `C02`.

A request from tenant `C01`, with a strongly consistent read:

```json
{"op": "Query", "input": {
  "TableName": "Portal",
  "KeyConditionExpression":
    "PK = :t",
  "ExpressionAttributeValues": {
    ":t": {"S": "TENANT#C01"}},
  "ConsistentRead": true}}
```

2 shipments. A strong read costs twice an eventually consistent one, and the cost ledger of `C01` records exactly that.

The application's cost ledger (illustration, not measured):

```text
request  tenant  op     RCU
r-101    C02     Query  0.5
r-102    C01     Query  1.0
month C02 = sum(RCU, tenant = C02)
```

## Common mistakes

A condition with no `Null` guard and a Scan grant. Tenant `C02` can read every tenant's table:

```text
// WRONG
"Action": ["dynamodb:Query",
           "dynamodb:Scan"],
"Condition": {
  "ForAllValues:StringEquals": {
    "dynamodb:LeadingKeys":
      ["TENANT#C02"]}}
Scan as C02 -> every tenant's items
```

```text
// FIX
"Action": ["dynamodb:Query"],
"Condition": {
  "ForAllValues:StringEquals": {
    "dynamodb:LeadingKeys":
      ["TENANT#C02"]},
  "Null": {
    "dynamodb:LeadingKeys": "false"}}
Scan as C02 -> AccessDeniedException
```

Measuring tenant cost with tags on a shared table. Tags only split by table, so every tenant shares one line:

```text
// WRONG
Portal: tag tenant=all
bill: one line, 6,000 tenants
```

```text
// FIX
Portal: tag app=portal
log per request:
  tenant, ConsumedCapacity
```

## Recap

- Shared table: every key, GSIs included, starts with the tenant id.
- `LeadingKeys` needs `Null` = `false` and no Scan grant.
- A table each: an initial quota of 2,500 tables per Region, at most 10,000 per account.
- Cost tags are per table; a shared table meters tenant cost in the application.
- The multi-tenant topic map: `e-ds-l4-09`; hot tenants: `e-dy-l4-16`.
