---
id: e-bp-d26
engine: best
track: dynamodb
level: L4
module: d
title: "IAM quyền tối thiểu, tới khóa của chính người dùng"
title_en: "Least-privilege IAM, down to the user's own keys"
kind: quiz
minutes: 4
objectives:
  - vi: "Cho ứng dụng đúng action cần trên đúng ARN bảng, và giới hạn người dùng cuối bằng điều kiện `dynamodb:LeadingKeys`."
    en: "Give the application only the actions it needs on the exact table ARN, and limit end users with a `dynamodb:LeadingKeys` condition."
avoid:
  vi: "Credential bị lộ mở được mọi bảng, mọi item."
  en: "A leaked credential that opens every table and every item."
requires: []
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"Effect": "Allow", "Action": "dynamodb:*", "Resource": "*"}
  good: |
    {"Effect": "Allow", "Action": ["dynamodb:GetItem", "dynamodb:Query"], "Resource": "arn:aws:dynamodb:ap-southeast-1:111122223333:table/Orders", "Condition": {"ForAllValues:StringEquals": {"dynamodb:LeadingKeys": ["${cognito-identity.amazonaws.com:sub}"]}}}
  expect: null
quiz:
  - q:
      vi: "Ứng dụng di động cho người dùng đọc thẳng bảng `Orders` (partition key = id người dùng) qua Cognito. Điều gì giữ mỗi người chỉ đọc đơn của mình?"
      en: "A mobile app lets users read table `Orders` (partition key = user id) directly through Cognito. What keeps each user to their own orders?"
    options:
      - { vi: "Ứng dụng tự lọc kết quả", en: "The app filters the results itself" }
      - { vi: "Điều kiện IAM `dynamodb:LeadingKeys` bằng id của người dùng", en: "An IAM condition `dynamodb:LeadingKeys` equal to the user id" }
      - { vi: "Một `FilterExpression` trên id", en: "A `FilterExpression` on the id" }
    answer: 1
    why:
      vi: "`dynamodb:LeadingKeys` là partition key của item mà request chạm tới. Policy đòi nó bằng id Cognito của người gọi, nên đọc item của người khác bị IAM từ chối, dù ứng dụng có lỗi."
      en: "`dynamodb:LeadingKeys` is the partition key of the items a request touches. The policy requires it to equal the caller's Cognito id, so IAM refuses reads of anyone else's items, even if the app has a bug."
---

## Ý chính

Policy IAM của ứng dụng chỉ cho đúng action cần (`dynamodb:Query`, `dynamodb:GetItem`) trên đúng ARN bảng hay index, không `dynamodb:*` trên `*`. Người dùng cuối truy cập trực tiếp thì giới hạn bằng `dynamodb:LeadingKeys`.

## Vì sao

- DynamoDB không có RLS; điều kiện IAM là lớp lọc theo item duy nhất.
- Credential bị lộ chỉ gây hại trong phạm vi policy.
- Người phân tích đọc qua bản xuất hoặc một role chỉ đọc, không dùng credential của ứng dụng.

## Ví dụ

Thẻ chỉ cú pháp: emulator không có IAM. Mã là IAM policy statement, không phải request DynamoDB.

# EN

## Key idea

The application's IAM policy allows only the actions it needs (`dynamodb:Query`, `dynamodb:GetItem`) on the exact table or index ARN, never `dynamodb:*` on `*`. End users who access the table directly are limited with `dynamodb:LeadingKeys`.

## Why

- DynamoDB has no RLS; an IAM condition is the only per-item filter.
- A leaked credential can only do what the policy allows.
- Analysts read an export or use a read-only role, never the application's credentials.

## Example

Syntax only: the emulator has no IAM. The code is an IAM policy statement, not a DynamoDB request.
