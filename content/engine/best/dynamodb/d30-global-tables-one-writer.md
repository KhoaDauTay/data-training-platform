---
id: e-bp-d30
engine: best
track: dynamodb
level: L5
module: d
title: "Global tables: đừng để hai Region cùng sửa một item"
title_en: "Global tables: do not let two Regions update one item"
kind: quiz
minutes: 3
objectives:
  - vi: "Cho mỗi item một Region ghi, và ghi giá trị tuyệt đối thay cho cập nhật tương đối khi có thể."
    en: "Give each item one writing Region, and write absolute values instead of relative updates where you can."
avoid:
  vi: "Hai lần cộng ở hai Region cùng lúc, một lần biến mất không báo lỗi."
  en: "Two increments in two Regions at the same moment, one of them gone with no error."
requires: [e-dy-l5-03]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_HowItWorks.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "UpdateItem", "input": {"TableName": "Users", "Key": {"pk": {"S": "U#7"}}, "UpdateExpression": "SET bookmark = bookmark + :one", "ExpressionAttributeValues": {":one": {"N": "1"}}}}
  good: |
    {"op": "UpdateItem", "input": {"TableName": "Users", "Key": {"pk": {"S": "U#7"}}, "UpdateExpression": "SET bookmark = :v", "ExpressionAttributeValues": {":v": {"N": "25"}}}}
  expect: null
quiz:
  - q:
      vi: "Global table kiểu MREC. Hai Region cùng lúc cộng 1 vào `bookmark` của cùng một item (đang là 24). Sau khi đồng bộ, giá trị thường là bao nhiêu?"
      en: "An MREC global table. Two Regions add 1 to `bookmark` of the same item (now 24) at the same moment. After replication, what is the value usually?"
    options:
      - { vi: "26", en: "26" }
      - { vi: "25: một lần cộng bị lần ghi sau thắng mất", en: "25: one increment is lost to the last write" }
      - { vi: "Lỗi xung đột trả về cho cả hai", en: "A conflict error returned to both" }
    answer: 1
    why:
      vi: "Global tables giải xung đột bằng \"last writer wins\": mỗi Region tính 25 từ 24, và một lần ghi đè lần kia. Không ai nhận lỗi. Cho item một Region ghi, hoặc ghi giá trị tuyệt đối, thì ghi lại vẫn đúng."
      en: "Global tables resolve conflicts with \"last writer wins\": each Region computes 25 from 24, and one write replaces the other. Nobody gets an error. One writing Region per item, or absolute values, keep a repeated write correct."
---

## Ý chính

Với global tables nhất quán cuối (MREC, mặc định), cho mỗi item một Region ghi: chặn bằng IAM hoặc chia người dùng theo Region. Thay cập nhật tương đối (`x = x + 1`) bằng giá trị tuyệt đối khi có thể.

## Vì sao

- Xung đột được giải bằng "last writer wins".
- Hai lần cộng ở hai Region cùng lúc thì một lần biến mất, không báo lỗi.

## Ví dụ

Thẻ chỉ cú pháp: dynoxide không có global tables.

# EN

## Key idea

With eventually consistent global tables (MREC, the default), give each item one writing Region: enforce it with IAM or route users by Region. Replace relative updates (`x = x + 1`) with absolute values where you can.

## Why

- Conflicts are resolved with "last writer wins".
- Two increments in two Regions at the same moment lose one, with no error.

## Example

Syntax only: dynoxide has no global tables.
