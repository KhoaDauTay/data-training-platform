---
id: e-bp-m35
engine: best
track: mongodb
level: L4
module: m
title: "Change stream: lưu resume token, tiếp tục bằng resumeAfter/startAfter"
title_en: "Persist the change stream resume token"
kind: quiz
minutes: 3
objectives:
  - vi: "Lưu bền `_id` (resume token) của mỗi sự kiện change stream sau khi xử lý, khởi động lại bằng `resumeAfter` hoặc `startAfter`, và không sửa `_id` trong pipeline."
    en: "Durably save each change stream event's `_id` (the resume token) after processing it, restart with `resumeAfter` or `startAfter`, and never change `_id` in the pipeline."
avoid:
  vi: "Bên đọc khởi động lại và mất mọi sự kiện xảy ra trong lúc nó dừng."
  en: "A consumer restarting and losing every event that happened while it was down."
requires: [e-mg-l4-10]
skills: []
adv: []
sources:
  - https://www.mongodb.com/docs/manual/changestreams/
verified: { version: "MongoDB manual 9.0", date: "2026-11-20" }
pair:
  runtime: none
  check: syntax
  setup: null
  bad: |
    db.orders.watch([{ $project: { _id: 0, fullDocument: 1 } }])
  good: |
    db.orders.watch([], { resumeAfter: savedToken })
  expect: null
quiz:
  - q:
      vi: "Bản Không nên bỏ `_id` khỏi mỗi sự kiện bằng `$project`. Vì sao đó là lỗi?"
      en: "The bad version drops `_id` from each event with `$project`. Why is that a mistake?"
    options:
      - { vi: "Vì `_id` của sự kiện là resume token; bỏ nó thì không tiếp tục stream được", en: "Because the event's `_id` is the resume token; without it the stream cannot be resumed" }
      - { vi: "Vì `$project` không được dùng trong `watch()`", en: "Because `$project` is not allowed in `watch()`" }
      - { vi: "Vì `fullDocument` luôn rỗng", en: "Because `fullDocument` is always empty" }
    answer: 0
    why:
      vi: "Docs: trường `_id` của sự kiện là resume token, và không được dùng pipeline để sửa hay bỏ nó. Bên đọc cần token để tiếp tục bằng `resumeAfter` hoặc `startAfter`."
      en: "The docs: an event's `_id` field acts as the resume token, and the pipeline must not modify or remove it. The consumer needs the token to resume with `resumeAfter` or `startAfter`."
---

## Ý chính

Sau khi xử lý mỗi sự kiện change stream, lưu `_id` của nó (resume token) vào nơi bền vững. Khởi động lại thì mở stream bằng `resumeAfter` (hoặc `startAfter`) với token đã lưu. Giữ thời gian dừng ngắn hơn cửa sổ oplog.

## Vì sao

- Không có token, lần mở lại bắt đầu từ "bây giờ": sự kiện trong lúc dừng bị mất.
- Token chỉ dùng được khi oplog còn giữ thời điểm đó.
- Lưu token **sau** khi xử lý xong, để một lần hỏng giữa chừng làm sự kiện được đọc lại chứ không bị bỏ.
- Thẻ này chỉ cú pháp: change stream cần replica set, mingo không có.

# EN

## Key idea

After processing each change stream event, save its `_id` (the resume token) somewhere durable. On restart, open the stream with `resumeAfter` (or `startAfter`) and the saved token. Keep downtime shorter than the oplog window.

## Why

- Without a token, reopening starts from "now": events during the downtime are lost.
- A token only works while the oplog still holds that point in time.
- Save the token **after** processing, so a failure half-way makes the event be read again rather than skipped.
- This card is syntax only: change streams need a replica set, which mingo does not have.
