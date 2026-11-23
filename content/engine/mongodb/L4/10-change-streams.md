---
id: e-mg-l4-10
engine: mongodb
level: L4
module: consistency
title: "Change streams"
title_en: "Change streams"
kind: concept
minutes: 12
runtime: docs
objectives:
  - vi: "Mở change stream trên collection, database hoặc cả hệ thống"
    en: "Open a change stream on a collection, a database or a whole deployment"
  - vi: "Tiếp tục stream bằng resume token và biết nó phụ thuộc cửa sổ oplog"
    en: "Resume a stream with a resume token and know it depends on the oplog window"
  - vi: "Lọc sự kiện bằng pipeline mà không làm hỏng resume token"
    en: "Filter events with a pipeline without breaking the resume token"
requires: [e-mg-l4-07]
sources:
  - https://www.mongodb.com/docs/manual/changestreams/
  - https://www.mongodb.com/docs/manual/core/replica-set-oplog/
quiz:
  - q:
      vi: "Ứng dụng nghe change stream bị dừng hai ngày. Cửa sổ oplog chỉ còn 24 giờ. Mở lại với `resumeAfter` token cũ thì sao?"
      en: "An application listening to a change stream was down for two days. The oplog window is only 24 hours. What happens when it reopens with `resumeAfter` and the old token?"
    options:
      - { vi: "Tiếp tục bình thường, token luôn dùng được", en: "It resumes normally, a token always works" }
      - { vi: "Không tiếp tục được, vì oplog không còn đủ lịch sử tới thao tác của token", en: "It cannot resume, because the oplog no longer holds history back to the token's operation" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì token trông như một con trỏ bền, nhưng nó chỉ trỏ vào oplog, và oplog là collection có giới hạn, mục cũ bị ghi đè. Docs chính thức: oplog phải còn đủ lịch sử để tìm thao tác ứng với token. Ứng dụng phải chịu mất sự kiện hoặc đọc lại toàn bộ."
      en: "It sounds right because a token looks like a durable pointer, but it only points into the oplog, a capped collection whose old entries are overwritten. The docs: the oplog must hold enough history to find the token's operation. The application must accept the gap or reload everything."
  - q:
      vi: "Bạn cần cả tài liệu sau khi cập nhật, không chỉ phần thay đổi. Tùy chọn nào?"
      en: "You need the whole document after an update, not just the changed fields. Which option?"
    options:
      - { vi: "`fullDocument: \"updateLookup\"`", en: "`fullDocument: \"updateLookup\"`" }
      - { vi: "`startAfter`", en: "`startAfter`" }
    answer: 0
    why:
      vi: "Mặc định sự kiện update chỉ có phần thay đổi. `fullDocument: \"updateLookup\"` trả bản majority-committed mới nhất của tài liệu. `startAfter` dùng để mở stream mới sau một sự kiện invalidate."
      en: "By default an update event holds only the delta. `fullDocument: \"updateLookup\"` returns the latest majority-committed version of the document. `startAfter` opens a new stream after an invalidate event."
---
## Mở bài

Kho hàng cần biết ngay khi một đơn chuyển sang `paid` để đóng gói. Hỏi lại database mỗi giây vừa chậm vừa tốn. Change stream cho ứng dụng nhận từng thay đổi khi nó xảy ra.

## Ý chính

Change stream cho ứng dụng đăng ký mọi thay đổi dữ liệu trên một collection, một database hoặc cả hệ thống, mà không phải tự đọc oplog. Nó dựng trên khung aggregation, nên lọc và biến đổi sự kiện bằng pipeline được (`$match`, `$project`, `$addFields`...). Cần replica set hoặc sharded cluster dùng WiredTiger.

`_id` của mỗi sự kiện là resume token. Mở lại bằng `resumeAfter` (sau một sự kiện) hoặc `startAfter` (kể cả sau sự kiện invalidate như xóa hay đổi tên collection). Oplog phải còn đủ lịch sử tới thao tác của token: cửa sổ oplog quyết định ứng dụng được phép dừng bao lâu. Vì vậy đừng sửa hay bỏ `_id` của sự kiện trong pipeline.

Mặc định sự kiện update chỉ có phần thay đổi (`updateDescription`); `fullDocument: "updateLookup"` lấy bản mới nhất đã majority-commit, có thể đã khác lúc thay đổi xảy ra. Muốn ảnh đúng trước và sau thay đổi thì bật pre-image và post-image cho collection.

Nhiều người nghĩ resume token dùng được mãi. Thật ra token trỏ vào oplog, mà oplog là collection có giới hạn: dừng lâu hơn cửa sổ oplog thì không tiếp tục được.

Mingo trong trình duyệt không có oplog, nên các lệnh dưới đây lấy theo docs.

## Cú pháp

```text
cursor = db.<coll>.watch([ <pipeline stages> ], {
  fullDocument: "default" | "updateLookup" | "whenAvailable" | "required",
  resumeAfter: <token> | startAfter: <token> | startAtOperationTime: <timestamp>
})
db.watch(...)                          // whole database
db.getMongo().watch(...)               // whole deployment
```

- Pipeline nhận `$match`, `$project`, `$addFields`, `$set`, `$unset`, `$replaceRoot`, `$replaceWith`, `$redact`.
- `resumeAfter` / `startAfter`: tiếp tục sau một token.
- `fullDocument: "updateLookup"`: kèm bản mới nhất của tài liệu cho sự kiện update.

## Ví dụ

Chỉ nghe các đơn vừa chuyển sang `paid`:

```text
cursor = db.orders.watch(
  [ { $match: { operationType: "update", "updateDescription.updatedFields.status": "paid" } } ],
  { fullDocument: "updateLookup" }
)
```

Mỗi sự kiện có `documentKey` và, nhờ `updateLookup`, cả đơn hàng hiện tại.

Lưu token rồi tiếp tục sau khi khởi động lại:

```text
let token = cursor.next()._id
let resumed = db.orders.watch([], { resumeAfter: token })
```

Ứng dụng nên ghi `token` ra chỗ bền sau mỗi sự kiện đã xử lý.

## Lỗi hay gặp

Bỏ `_id` của sự kiện trong pipeline:

```text
// WRONG: the event _id is the resume token; the stream errors once it is gone
db.orders.watch([ { $project: { _id: 0, documentKey: 1 } } ])
```

```text
// FIX: keep _id, drop only what you do not need
db.orders.watch([ { $project: { documentKey: 1, operationType: 1 } } ])
```

Chờ cả tài liệu trong sự kiện update mà không xin:

```text
// WRONG: event.fullDocument is missing for updates
db.orders.watch([ { $match: { operationType: "update" } } ])
```

```text
// FIX: ask for the current document
db.orders.watch([ { $match: { operationType: "update" } } ], { fullDocument: "updateLookup" })
```

## Tóm tắt

- Change stream đẩy từng thay đổi tới ứng dụng, dựng trên aggregation.
- `_id` của sự kiện là resume token; giữ nó và lưu nó ra chỗ bền.
- Dừng lâu hơn cửa sổ oplog thì không tiếp tục được bằng token cũ.
- Sự kiện update chỉ có phần thay đổi trừ khi xin `fullDocument`.

# EN

## Opening

The warehouse needs to know as soon as an order turns `paid` so it can pack it. Asking the database again every second is slow and wasteful. A change stream lets the application receive each change as it happens.

## Key idea

A change stream lets an application subscribe to every data change on a collection, a database or a whole deployment, without tailing the oplog by hand. It is built on the aggregation framework, so you can filter and reshape events with a pipeline (`$match`, `$project`, `$addFields`...). It needs a replica set or a sharded cluster using WiredTiger.

Each event's `_id` is the resume token. Reopen with `resumeAfter` (after one event) or `startAfter` (also after an invalidate event such as a collection drop or rename). The oplog must still hold history back to the token's operation: the oplog window decides how long the application may be down. So never change or remove the event's `_id` in the pipeline.

By default an update event holds only the delta (`updateDescription`); `fullDocument: "updateLookup"` fetches the latest majority-committed version, which may already differ from the moment of the change. For the exact image before and after a change, enable pre-images and post-images on the collection.

Many people think a resume token works forever. In fact a token points into the oplog, and the oplog is a capped collection: be down longer than the oplog window and you cannot resume.

Mingo in the browser has no oplog, so the commands below follow the docs.

## Syntax

```text
cursor = db.<coll>.watch([ <pipeline stages> ], {
  fullDocument: "default" | "updateLookup" | "whenAvailable" | "required",
  resumeAfter: <token> | startAfter: <token> | startAtOperationTime: <timestamp>
})
db.watch(...)                          // whole database
db.getMongo().watch(...)               // whole deployment
```

- The pipeline accepts `$match`, `$project`, `$addFields`, `$set`, `$unset`, `$replaceRoot`, `$replaceWith`, `$redact`.
- `resumeAfter` / `startAfter`: continue after a token.
- `fullDocument: "updateLookup"`: adds the latest version of the document to update events.

## Example

Listen only to orders that just turned `paid`:

```text
cursor = db.orders.watch(
  [ { $match: { operationType: "update", "updateDescription.updatedFields.status": "paid" } } ],
  { fullDocument: "updateLookup" }
)
```

Each event has `documentKey` and, thanks to `updateLookup`, the current order too.

Keep the token and continue after a restart:

```text
let token = cursor.next()._id
let resumed = db.orders.watch([], { resumeAfter: token })
```

The application should write `token` somewhere durable after each event it has handled.

## Common mistakes

Dropping the event's `_id` in the pipeline:

```text
// WRONG: the event _id is the resume token; the stream errors once it is gone
db.orders.watch([ { $project: { _id: 0, documentKey: 1 } } ])
```

```text
// FIX: keep _id, drop only what you do not need
db.orders.watch([ { $project: { documentKey: 1, operationType: 1 } } ])
```

Expecting the whole document in an update event without asking:

```text
// WRONG: event.fullDocument is missing for updates
db.orders.watch([ { $match: { operationType: "update" } } ])
```

```text
// FIX: ask for the current document
db.orders.watch([ { $match: { operationType: "update" } } ], { fullDocument: "updateLookup" })
```

## Recap

- A change stream pushes each change to the application, built on aggregation.
- The event's `_id` is the resume token; keep it and store it somewhere durable.
- Down longer than the oplog window, you cannot resume with the old token.
- An update event holds only the delta unless you ask for `fullDocument`.
