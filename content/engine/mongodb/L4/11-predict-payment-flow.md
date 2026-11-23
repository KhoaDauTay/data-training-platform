---
id: e-mg-l4-11
engine: mongodb
level: L4
module: consistency
title: "Đoán kết quả: luồng ghi thanh toán đọc từ secondary"
title_en: "Predict the outcome: a payment write read back from a secondary"
kind: predict
minutes: 7
runtime: docs
objectives:
  - vi: "Chọn concern và session đúng cho một luồng ghi tiền rồi đọc lại"
    en: "Choose the right concerns and session for a money write that is read back"
requires: [e-mg-l4-07, e-mg-l4-08]
sources:
  - https://www.mongodb.com/docs/manual/reference/write-concern/
  - https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/
predict:
  sql: |
    db.payments.insertOne(
      { orderId: 7, amount: 120, status: "captured" },
      { writeConcern: { w: "majority" } }
    )
    db.getMongo().setReadPref("secondary")
    db.payments.find({ orderId: 7 })
  q:
    vi: "MongoDB 8.x, replica set P-S-S, không dùng session nhân quả. Ghi `w: \"majority\"` vừa được xác nhận, rồi lập tức đọc từ secondary. Lần đọc có chắc thấy thanh toán không?"
    en: "MongoDB 8.x, a P-S-S replica set, no causal session. The `w: \"majority\"` write has just been acknowledged, then the read goes to a secondary at once. Is the read sure to see the payment?"
  options:
    - vi: "Có, `w: \"majority\"` nghĩa là secondary đã áp lần ghi"
      en: "Yes, `w: \"majority\"` means the secondary has applied the write"
    - vi: "Không chắc: secondary có thể chưa áp mục oplog; cần session nhân quả với đọc và ghi `majority`"
      en: "Not sure: the secondary may not have applied the oplog entry yet; use a causal session with `majority` reads and writes"
    - vi: "Không bao giờ thấy, vì secondary chỉ đọc được sau checkpoint"
      en: "Never, because a secondary can read only after a checkpoint"
  answer: 1
  why:
    vi: "Từ 8.0, `w: \"majority\"` xác nhận khi đa số đã ghi bền mục oplog, còn việc áp vào dữ liệu là không đồng bộ. Docs chính thức nói truy vấn trên secondary ngay sau đó có thể chưa thấy lần ghi, và khuyên dùng session nhân quả."
    en: "From 8.0, `w: \"majority\"` acknowledges once a majority has durably written the oplog entry, while applying it to the data is asynchronous. The docs say a query on a secondary right after may not see the write, and recommend a causally consistent session."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/reference/write-concern/
---

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Write Concern", mục Reads after w: majority Writes); trình duyệt không có replica set nên không chạy thật.

Câu trong docs chính thức: từ MongoDB 8.0, ghi `{ w: "majority" }` trả xác nhận sau khi đa số thành viên mang dữ liệu ghi bền mục oplog, rồi các thành viên áp thay đổi không đồng bộ. Truy vấn trên secondary ngay sau xác nhận có thể đọc trước khi secondary áp lần ghi. Ứng dụng cần đọc ngay thay đổi đó từ secondary thì chạy trong session nhân quả.

## Ví dụ

```javascript
session = db.getMongo().startSession({ causalConsistency: true })
```

Trong session đó, ghi với `w: "majority"` và đọc với read concern `majority`: lần đọc trên secondary chờ tới khi oplog của nó đạt thời điểm của lần ghi.

Đúng với docs chính thức của MongoDB hiện hành (8.x), kiểm ngày 2026-11-20. Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

# EN

## Key idea

This is a prediction based on the MongoDB docs (page "Write Concern", section Reads after w: majority Writes); the browser has no replica set, so nothing runs for real.

The statement in the docs: starting in MongoDB 8.0, a `{ w: "majority" }` write is acknowledged after a majority of data-bearing members durably write the oplog entry, and members then apply the change asynchronously. A query on a secondary right after the acknowledgement may read before the secondary applies the write. An application that needs to read that change from a secondary at once should run in a causally consistent session.

## Example

```javascript
session = db.getMongo().startSession({ causalConsistency: true })
```

In that session, write with `w: "majority"` and read with read concern `majority`: the read on a secondary waits until its oplog reaches the write's time.

Matches the current MongoDB manual (8.x), checked 2026-11-20. The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results.
