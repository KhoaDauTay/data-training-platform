---
id: e-mg-l4-08
engine: mongodb
level: L4
module: consistency
title: "Nhất quán nhân quả và session"
title_en: "Causal consistency and sessions"
kind: concept
minutes: 10
runtime: docs
objectives:
  - vi: "Kể bốn bảo đảm của session nhất quán nhân quả"
    en: "Name the four guarantees of a causally consistent session"
  - vi: "Biết bảo đảm chỉ có khi đọc `majority` và ghi `majority`"
    en: "Know the guarantees hold only with `majority` reads and `majority` writes"
requires: [e-mg-l4-07]
sources:
  - https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/
  - https://www.mongodb.com/docs/manual/reference/write-concern/
quiz:
  - q:
      vi: "Trong session nhất quán nhân quả, bạn ghi `w: \"majority\"` rồi đọc từ secondary với read concern `majority`. Lần đọc thấy gì?"
      en: "In a causally consistent session you write with `w: \"majority\"` and then read from a secondary with read concern `majority`. What does the read see?"
    options:
      - { vi: "Có thể chưa thấy lần ghi, vì secondary chép không đồng bộ", en: "It may not see the write yet, because secondaries replicate asynchronously" }
      - { vi: "Thấy trạng thái sau lần ghi: secondary chờ tới khi oplog của nó đạt thời điểm đó", en: "It sees the state after the write: the secondary waits until its oplog reaches that time" }
    answer: 1
    why:
      vi: "Driver gắn `afterClusterTime` cho lần đọc; node chỉ phục vụ khi oplog của nó đã tới thời điểm đó. Bảo đảm \"đọc được điều mình ghi\" giữ trên mọi thành viên."
      en: "The driver attaches `afterClusterTime` to the read; a node serves it only once its oplog has reached that time. The read-your-writes guarantee holds on every member."
  - q:
      vi: "Session nhất quán nhân quả nhưng ghi bằng `w: 1` và đọc `local`. Bốn bảo đảm có còn chắc chắn không?"
      en: "A causally consistent session, but writes use `w: 1` and reads use `local`. Are the four guarantees still certain?"
    options:
      - { vi: "Có, session là đủ", en: "Yes, the session is enough" }
      - { vi: "Không, chỉ đọc `majority` và ghi `majority` mới được bảo đảm", en: "No, only `majority` reads and `majority` writes are guaranteed" }
    answer: 1
    why:
      vi: "Docs chính thức: session chỉ bảo đảm nhất quán nhân quả cho lần đọc read concern `majority` và lần ghi write concern `majority`."
      en: "The docs: sessions guarantee causal consistency only for reads with read concern `majority` and writes with write concern `majority`."
---

## Ý chính

Secondary chép oplog không đồng bộ, nên đọc từ secondary có thể cũ (nhưng không bao giờ sai thứ tự). Session nhất quán nhân quả giữ thứ tự giữa các thao tác có quan hệ nhân quả, kể cả khi chúng chạy trên các thành viên khác nhau. Bốn bảo đảm:

- Đọc được điều mình ghi: lần đọc phản ánh lần ghi trước nó.
- Đọc đơn điệu: lần đọc sau không trả trạng thái cũ hơn lần đọc trước.
- Ghi đơn điệu: lần ghi phải đi trước thì chạy trước.
- Ghi theo đọc: lần ghi sau một lần đọc chạy trên trạng thái đã gồm lần đọc đó.

## Ví dụ

Các bảo đảm chỉ có cho đọc read concern `majority` và ghi write concern `majority`. Mỗi thao tác trả về operation time và cluster time; session giữ chúng, và driver tự đặt `afterClusterTime` cho lần đọc kế. Session không cô lập khỏi thao tác ngoài session, và chỉ nên dùng một luồng một lúc.

```javascript
session = db.getMongo().startSession({ causalConsistency: true })
```

Từ 8.0, `w: "majority"` xác nhận khi đa số đã ghi bền mục oplog, trước khi áp vào dữ liệu. Đọc từ secondary ngay sau đó ngoài session có thể chưa thấy lần ghi; trong session nhân quả thì thấy.

Đúng với docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20. Phần chạy thật cần máy chủ thật (nhiều phiên / replica set / AWS). Bài này dùng sơ đồ và kết quả ghi sẵn.

# EN

## Key idea

Secondaries apply the oplog asynchronously, so a read from a secondary can be stale (but never out of order). A causally consistent session keeps the order between causally related operations, even when they run on different members. The four guarantees:

- Read your writes: a read reflects the writes before it.
- Monotonic reads: a later read does not return an older state than an earlier read.
- Monotonic writes: a write that must come first runs first.
- Writes follow reads: a write after a read runs on a state that includes that read.

## Example

The guarantees hold only for reads with read concern `majority` and writes with write concern `majority`. Each operation returns an operation time and a cluster time; the session keeps them and the driver sets `afterClusterTime` on the next read. A session is not isolated from operations outside it, and only one thread at a time should use it.

```javascript
session = db.getMongo().startSession({ causalConsistency: true })
```

From 8.0, `w: "majority"` acknowledges once a majority has durably written the oplog entry, before applying it to the data. A read from a secondary right after, outside a session, may not see the write yet; inside a causal session it does.

Matches the current MongoDB manual, checked 2026-11-20. The real run needs a real server (several sessions / replica set / AWS). This lesson uses diagrams and recorded results.
