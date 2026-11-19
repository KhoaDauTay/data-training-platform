---
id: e-mg-l4-10
engine: mongodb
level: L4
module: consistency
title: "Change streams"
title_en: "Change streams"
kind: concept
minutes: 10
runtime: docs
objectives:
  - vi: "Mở change stream trên collection, database hoặc cả hệ thống"
    en: "Open a change stream on a collection, a database or a whole deployment"
  - vi: "Tiếp tục stream bằng resume token và biết nó phụ thuộc cửa sổ oplog"
    en: "Resume a stream with a resume token and know it depends on the oplog window"
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
    why:
      vi: "Docs chính thức: oplog phải còn đủ lịch sử để tìm thao tác ứng với token. Ứng dụng phải chịu mất sự kiện hoặc đọc lại toàn bộ."
      en: "The docs: the oplog must hold enough history to find the token's operation. The application must accept the gap or reload everything."
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

## Ý chính

Change stream cho ứng dụng đăng ký mọi thay đổi dữ liệu trên một collection, một database hoặc cả hệ thống, mà không phải tự đọc oplog. Nó dùng khung aggregation, nên lọc và biến đổi sự kiện bằng pipeline được.

- Cần replica set hoặc sharded cluster dùng WiredTiger.
- `_id` của mỗi sự kiện là resume token. Mở lại bằng `resumeAfter` (sau một sự kiện) hoặc `startAfter` (kể cả sau sự kiện invalidate như xóa hay đổi tên collection).
- Oplog phải còn đủ lịch sử tới thao tác của token: cửa sổ oplog quyết định ứng dụng được phép dừng bao lâu.
- Mặc định sự kiện update chỉ có phần thay đổi; `fullDocument: "updateLookup"` lấy bản mới nhất đã majority-commit. Muốn ảnh trước và sau thay đổi thì bật pre-image và post-image cho collection.
- Đừng sửa hay bỏ trường `_id` của sự kiện trong pipeline, vì đó là token.

## Ví dụ

```javascript
let cursor = db.inventory.watch()
let resumeToken = cursor.next()._id
let resumedCursor = db.inventory.watch( [ ], { resumeAfter: resumeToken } )
```

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20. Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn. mingo không có oplog.

# EN

## Key idea

A change stream lets an application subscribe to every data change on a collection, a database or a whole deployment, without tailing the oplog by hand. It is built on the aggregation framework, so you can filter and reshape events with a pipeline.

- Needs a replica set or a sharded cluster using WiredTiger.
- Each event's `_id` is the resume token. Reopen with `resumeAfter` (after one event) or `startAfter` (also after an invalidate event such as a collection drop or rename).
- The oplog must still hold history back to the token's operation: the oplog window decides how long the application may be down.
- By default an update event holds only the delta; `fullDocument: "updateLookup"` fetches the latest majority-committed version. For the image before and after a change, enable pre-images and post-images on the collection.
- Do not change or remove the event's `_id` in the pipeline, because it is the token.

## Example

```javascript
let cursor = db.inventory.watch()
let resumeToken = cursor.next()._id
let resumedCursor = db.inventory.watch( [ ], { resumeAfter: resumeToken } )
```

Matches the current MongoDB manual, checked 2026-11-20. The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results. mingo has no oplog.
