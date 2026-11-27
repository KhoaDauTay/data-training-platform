---
id: e-mg-l4-11
engine: mongodb
level: L4
module: consistency
title: "Đoán kết quả: luồng ghi thanh toán đọc từ secondary"
title_en: "Predict the outcome: a payment write read back from a secondary"
figures: [{ name: mg-causal-session, at: idea, variant: nosession }]
kind: predict
minutes: 7
runtime: docs
objectives:
  - vi: "Chọn concern và session đúng cho một luồng ghi tiền rồi đọc lại"
    en: "Choose the right concerns and session for a money write that is read back"
  - vi: "Phân biệt \"đa số đã ghi oplog\" với \"secondary đã áp lần ghi\""
    en: "Tell \"a majority wrote the oplog\" from \"the secondary applied the write\""
requires: [e-mg-l4-07, e-mg-l4-08]
sources:
  - { url: https://www.mongodb.com/docs/manual/reference/write-concern/, title_vi: "Write concern" }
  - { url: https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/, title_vi: "Cô lập, nhất quán và độ mới khi đọc" }
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
  trap: 0
  why:
    vi: "\"Majority\" nghe như đa số đã có dữ liệu, nhưng từ 8.0, `w: \"majority\"` xác nhận khi 2 trong 3 node đã ghi bền mục oplog (nhật ký thao tác), còn việc áp mục đó vào dữ liệu đọc được chạy sau, không đồng bộ. Vì vậy truy vấn trên secondary ngay sau xác nhận có thể chưa thấy thanh toán. \"Không bao giờ thấy\" cũng sai: secondary đọc được ngay khi đã áp mục oplog, không phải chờ checkpoint (lần ghi định kỳ dữ liệu xuống đĩa). Docs khuyên dùng session nhân quả, ghi và đọc `majority`, để secondary chờ tới lần ghi."
    en: "\"Majority\" sounds like a majority already has the data, but from 8.0, `w: \"majority\"` acknowledges once 2 of the 3 nodes have durably written the oplog entry (the operation log), while applying that entry to the readable data happens later, asynchronously. So a query on a secondary right after the acknowledgement may not see the payment yet. \"Never\" is wrong too: a secondary can read the write as soon as it applies the oplog entry, it does not wait for a checkpoint (the periodic flush of data to disk). The docs recommend a causal session with `majority` writes and reads, so the secondary waits for the write."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/reference/write-concern/
quiz:
  - q:
      vi: "Cùng luồng đó nhưng chạy trong session `causalConsistency: true`, ghi `w: \"majority\"` và đọc read concern `majority` từ secondary. Lần đọc làm gì nếu secondary chưa áp lần ghi?"
      en: "The same flow inside a `causalConsistency: true` session, writing with `w: \"majority\"` and reading with read concern `majority` from a secondary. What does the read do if the secondary has not applied the write yet?"
    options:
      - { vi: "Trả trạng thái cũ, không có thanh toán", en: "Returns the old state, without the payment" }
      - { vi: "Chờ tới khi secondary đạt thời điểm của lần ghi rồi mới trả", en: "Waits until the secondary reaches the write's time, then answers" }
      - { vi: "Tự chuyển sang đọc primary", en: "Switches to reading the primary by itself" }
    answer: 1
    why:
      vi: "Trong session, driver gắn cho lần đọc `afterClusterTime` = thời điểm của lần ghi thanh toán; secondary chỉ trả lời khi dữ liệu của nó đã áp tới thời điểm đó, nên không bao giờ trả trạng thái cũ thiếu thanh toán. Session cũng không đổi read preference: lần đọc vẫn ở secondary, không tự chuyển sang primary, chỉ chậm hơn một chút vì phải chờ."
      en: "Inside the session the driver gives the read `afterClusterTime` = the time of the payment write; the secondary answers only once its data has applied up to that time, so it never returns the old state without the payment. Nor does the session change the read preference: the read stays on the secondary, it does not switch to the primary, it is just a little slower because it waits."
---
## Mở bài

Khách vừa thanh toán, ứng dụng nhận xác nhận `w: "majority"`, rồi trang hóa đơn đọc từ secondary để đỡ tải cho primary. Có lúc hóa đơn hiện "chưa thanh toán". Đoán trước khi xem đáp án: lỗi nằm ở đâu?

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "Write Concern", mục về đọc sau khi ghi `w: "majority"`); trình duyệt không có replica set nên không chạy thật.

Theo docs, từ MongoDB 8.0, ghi `{ w: "majority" }` trả xác nhận sau khi đa số thành viên mang dữ liệu ghi bền mục oplog; các thành viên áp thay đổi vào dữ liệu sau đó, không đồng bộ. Truy vấn trên secondary ngay sau xác nhận có thể đọc trước khi secondary áp lần ghi.

Ứng dụng cần đọc ngay thay đổi đó từ secondary thì chạy trong session nhân quả (`startSession({ causalConsistency: true })`), ghi `w: "majority"` và đọc read concern `majority`. Lần đọc mang `afterClusterTime`, nên secondary chờ tới thời điểm của lần ghi rồi mới trả lời.

Hình dưới vẽ lần đọc từ secondary ngay sau lần ghi, khi chưa có session.

## Tóm tắt

- `w: "majority"` từ 8.0 = đa số đã ghi bền oplog, chưa chắc đã áp vào dữ liệu.
- Đọc secondary ngay sau đó, ngoài session, có thể chưa thấy lần ghi.
- Session nhân quả + ghi và đọc `majority`: secondary chờ thay vì trả dữ liệu cũ.

# EN

## Opening

A customer has just paid, the application got a `w: "majority"` acknowledgement, and the invoice page reads from a secondary to take load off the primary. Sometimes the invoice says "unpaid". Predict before you look at the answer: where is the bug?

## Key idea

This is a prediction based on the MongoDB docs (page "Write Concern", the part about reads after `w: "majority"` writes); the browser has no replica set, so nothing runs for real.

Per the docs, starting in MongoDB 8.0, a `{ w: "majority" }` write is acknowledged after a majority of data-bearing members durably write the oplog entry; members then apply the change to the data asynchronously. A query on a secondary right after the acknowledgement may read before the secondary applies the write.

An application that needs to read that change from a secondary at once should run in a causally consistent session (`startSession({ causalConsistency: true })`), writing with `w: "majority"` and reading with read concern `majority`. The read carries `afterClusterTime`, so the secondary waits until it reaches the write's time before answering.

The figure below draws a read from a secondary right after the write, with no session.

## Recap

- `w: "majority"` from 8.0 = a majority durably wrote the oplog, not necessarily applied it to the data.
- A secondary read right after, outside a session, may miss the write.
- A causal session with `majority` writes and reads: the secondary waits instead of returning old data.
