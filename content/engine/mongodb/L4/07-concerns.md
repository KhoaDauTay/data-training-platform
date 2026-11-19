---
id: e-mg-l4-07
engine: mongodb
level: L4
module: consistency
title: "Write concern và read concern"
title_en: "Write concern and read concern"
kind: concept
minutes: 12
runtime: docs
viz: mg-replica-election
objectives:
  - vi: "Đọc `w`, `j`, `wtimeout` và biết mỗi mức xác nhận điều gì"
    en: "Read `w`, `j`, `wtimeout` and know what each level acknowledges"
  - vi: "Chọn read concern `local`, `majority`, `linearizable` hay `snapshot`"
    en: "Choose read concern `local`, `majority`, `linearizable` or `snapshot`"
requires: []
sources:
  - https://www.mongodb.com/docs/manual/reference/write-concern/
  - https://www.mongodb.com/docs/manual/reference/read-concern/
quiz:
  - q:
      vi: "Replica set P-S-S, ghi với `{ w: 1 }`. Primary sập trước khi secondary nào chép được. Điều gì có thể xảy ra?"
      en: "A P-S-S replica set, a write with `{ w: 1 }`. The primary fails before any secondary copies it. What can happen?"
    options:
      - { vi: "Không gì cả, `w: 1` đã ghi xuống đĩa nên an toàn", en: "Nothing, `w: 1` is on disk so it is safe" }
      - { vi: "Lần ghi có thể bị rollback khi primary mới được bầu", en: "The write can be rolled back once a new primary is elected" }
      - { vi: "Client nhận lỗi và ghi lại tự động", en: "The client gets an error and writes again automatically" }
    answer: 1
    why:
      vi: "Docs chính thức: với `w: 1`, dữ liệu có thể bị rollback nếu primary bước xuống trước khi lần ghi được chép sang secondary nào. `w: \"majority\"` chờ đa số thành viên bỏ phiếu ghi bền vào oplog."
      en: "The docs: with `w: 1`, data can be rolled back if the primary steps down before the write reaches any secondary. `w: \"majority\"` waits for a majority of voting members to durably write it to their oplog."
  - q:
      vi: "Lần ghi `w: \"majority\"` với `wtimeout: 1000` trả lỗi hết giờ. Dữ liệu đã ghi trên primary thì sao?"
      en: "A `w: \"majority\"` write with `wtimeout: 1000` returns a timeout error. What about the data already written on the primary?"
    options:
      - { vi: "MongoDB hoàn tác nó", en: "MongoDB undoes it" }
      - { vi: "MongoDB không hoàn tác: lần ghi vẫn có thể sẽ đạt write concern sau đó", en: "MongoDB does not undo it: the write may still reach the write concern later" }
    answer: 1
    why:
      vi: "Docs chính thức: khi quá `wtimeout`, MongoDB trả lỗi write concern nhưng không hoàn tác thay đổi đã thành công. Lỗi chỉ nói chưa xác nhận kịp."
      en: "The docs: past `wtimeout`, MongoDB returns a write concern error but does not undo the successful change. The error only says it was not confirmed in time."
---

## Ý chính

Write concern là mức xác nhận bạn đòi cho một lần ghi: `{ w, j, wtimeout }`.

- `w: 1`: primary xác nhận. Dữ liệu có thể bị rollback nếu primary bước xuống trước khi chép sang secondary.
- `w: "majority"`: đa số thành viên mang dữ liệu có quyền bầu đã ghi bền vào oplog của mình. Với P-S-S, đa số là 2. Đây là mặc định ngầm của hầu hết hệ thống; ngoại lệ là hệ có arbiter mà số thành viên mang dữ liệu không quá đa số, khi đó mặc định là `w: 1`.
- `j: true`: xác nhận sau khi đã ghi vào journal trên đĩa.
- `wtimeout`: giới hạn chờ. Quá giờ thì trả lỗi, nhưng không hoàn tác thay đổi.

Read concern quyết định đọc thấy gì:

## Ví dụ

- `local`: dữ liệu của node, có thể bị rollback. Mặc định cho đọc từ primary và secondary.
- `majority`: dữ liệu đa số đã xác nhận, bền kể cả khi primary sập.
- `linearizable`: phản ánh mọi lần ghi majority đã xong trước khi đọc bắt đầu; chỉ đọc trên primary, cần bộ lọc trúng một tài liệu, nên dùng kèm `maxTimeMS`.
- `snapshot`: dữ liệu majority tại một thời điểm, dùng trong transaction nhiều tài liệu và một số lệnh đọc.

```javascript
db.payments.insertOne(
  { orderId: 7, amount: 120 },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
)
db.payments.find({ orderId: 7 }).readConcern("majority")
```

Đúng với docs chính thức của MongoDB hiện hành (8.x), kiểm ngày 2026-11-20. Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

# EN

## Key idea

Write concern is the acknowledgement you ask for on a write: `{ w, j, wtimeout }`.

- `w: 1`: the primary acknowledges. Data can be rolled back if the primary steps down before the write reaches a secondary.
- `w: "majority"`: a majority of data-bearing voting members have durably written it to their oplog. For P-S-S the majority is 2. This is the implicit default for most deployments; the exception is a set with arbiters where data-bearing members are not more than the voting majority, and then the default is `w: 1`.
- `j: true`: acknowledge after the write is in the on-disk journal.
- `wtimeout`: a time limit. Past it you get an error, but the change is not undone.

Read concern decides what a read can see:

## Example

- `local`: the node's data, which may be rolled back. The default for reads on the primary and on secondaries.
- `majority`: data acknowledged by a majority, durable even if the primary fails.
- `linearizable`: reflects every majority write completed before the read started; primary only, needs a filter that hits one document, and should be used with `maxTimeMS`.
- `snapshot`: majority data at one point in time, used in multi-document transactions and some read commands.

```javascript
db.payments.insertOne(
  { orderId: 7, amount: 120 },
  { writeConcern: { w: "majority", wtimeout: 5000 } }
)
db.payments.find({ orderId: 7 }).readConcern("majority")
```

Matches the current MongoDB manual (8.x), checked 2026-11-20. The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results.
