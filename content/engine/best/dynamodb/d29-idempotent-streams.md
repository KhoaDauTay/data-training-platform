---
id: e-bp-d29
engine: best
track: dynamodb
level: L5
module: d
title: "Bên đọc Streams: xử lý idempotent, theo dõi IteratorAge"
title_en: "Stream consumers: idempotent, and watch IteratorAge"
kind: quiz
minutes: 4
objectives:
  - vi: "Viết hàm xử lý DynamoDB Streams idempotent (ghi có điều kiện theo id sự kiện), và đặt báo động trên `IteratorAge`."
    en: "Write DynamoDB Streams handlers that are idempotent (a conditional write keyed by event id), and alarm on `IteratorAge`."
avoid:
  vi: "Điểm thưởng cộng hai lần khi Lambda chạy lại một batch, hoặc mất thay đổi vì tụt quá 24 giờ."
  en: "Reward points added twice when Lambda reruns a batch, or changes lost after falling more than 24 hours behind."
requires: [e-dy-l5-01]
skills: []
adv: []
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.BestPracticesWithDynamoDB.html
  - https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html
verified: { version: "docs.aws.amazon.com", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    {"op": "UpdateItem", "input": {"TableName": "Points", "Key": {"pk": {"S": "CUST#1"}}, "UpdateExpression": "ADD pts :p", "ExpressionAttributeValues": {":p": {"N": "10"}}}}
  good: |
    {"op": "TransactWriteItems", "input": {"TransactItems": [
      {"Put": {"TableName": "Points", "Item": {"pk": {"S": "EVT#<eventID>"}}, "ConditionExpression": "attribute_not_exists(pk)"}},
      {"Update": {"TableName": "Points", "Key": {"pk": {"S": "CUST#1"}}, "UpdateExpression": "ADD pts :p", "ExpressionAttributeValues": {":p": {"N": "10"}}}}
    ]}}
  expect: null
quiz:
  - q:
      vi: "Docs nói mỗi bản ghi xuất hiện đúng một lần trong stream. Hàm Lambda có thể xử lý một bản ghi hai lần không?"
      en: "The docs say each record appears exactly once in the stream. Can a Lambda function process one record twice?"
    options:
      - { vi: "Không, vì bản ghi chỉ có một lần", en: "No, because the record appears once" }
      - { vi: "Có: Lambda thử lại batch lỗi, nên hàm phải idempotent", en: "Yes: Lambda retries failed batches, so the function must be idempotent" }
      - { vi: "Chỉ khi bảng là global table", en: "Only when the table is a global table" }
    answer: 1
    why:
      vi: "\"Đúng một lần\" nói về stream, không nói về số lần hàm chạy. Batch lỗi được gửi lại, nên hàm có thể chạy lại trên bản ghi đã xử lý. Ghi dấu id sự kiện có điều kiện `attribute_not_exists` làm lần chạy lại thành vô hại."
      en: "\"Exactly once\" describes the stream, not how many times your function runs. Failed batches are retried, so the function can run again on records it already handled. Marking the event id with an `attribute_not_exists` condition makes the rerun harmless."
---

## Ý chính

Hàm xử lý bản ghi Streams (thường là Lambda) phải idempotent: ghi dấu id sự kiện có điều kiện, cùng transaction với thay đổi. Đặt báo động trên `IteratorAge`, tuổi bản ghi cũ nhất chưa xử lý.

## Vì sao

- Lambda thử lại batch lỗi, nên hàm có thể chạy hai lần trên cùng bản ghi.
- Stream chỉ giữ bản ghi 24 giờ: tụt quá mức đó là mất thay đổi.

## Ví dụ

Thẻ chỉ cú pháp: dynoxide không có Streams, và chưa có `TransactWriteItems`. `<eventID>` là id của bản ghi stream.

# EN

## Key idea

A Streams record handler (usually Lambda) must be idempotent: mark the event id with a conditional write, in the same transaction as the change. Alarm on `IteratorAge`, the age of the oldest unprocessed record.

## Why

- Lambda retries failed batches, so the handler can run twice on the same record.
- A stream keeps records for 24 hours: falling further behind loses changes.

## Example

Syntax only: dynoxide has no Streams and no `TransactWriteItems` yet. `<eventID>` is the id of the stream record.
