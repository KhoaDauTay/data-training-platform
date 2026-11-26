---
id: e-mg-l4-12
engine: mongodb
level: L4
module: consistency
title: "Kiểm tra: nhất quán, transaction, change stream"
title_en: "Check: consistency, transactions, change streams"
kind: quiz
minutes: 6
runtime: docs
objectives:
  - vi: "Chọn đúng cơ chế nhất quán cho từng tình huống"
    en: "Pick the right consistency mechanism for each situation"
  - vi: "Nhận ra vì sao arbiter không giúp lần ghi `majority`"
    en: "See why an arbiter does not help a `majority` write"
requires: [e-mg-l4-08, e-mg-l4-09, e-mg-l4-10]
sources:
  - https://www.mongodb.com/docs/manual/reference/write-concern/
  - https://www.mongodb.com/docs/manual/reference/read-concern/
  - https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
quiz:
  - q:
      vi: "Replica set Primary-Secondary-Arbiter. Ghi `w: \"majority\"` khi secondary đang tắt thì sao?"
      en: "A Primary-Secondary-Arbiter replica set. What happens to a `w: \"majority\"` write while the secondary is down?"
    options:
      - { vi: "Arbiter xác nhận thay, ghi thành công", en: "The arbiter acknowledges instead, the write succeeds" }
      - { vi: "Có thể hết giờ hoặc không bao giờ được xác nhận, vì đa số tính bằng 2 thành viên mang dữ liệu", en: "It may time out or never be acknowledged, because the majority equals the 2 data-bearing members" }
    answer: 1
    trap: 0
    why:
      vi: "Arbiter có phiếu bầu nên nghe hợp lý, nhưng phiếu đó chỉ dùng để chọn primary. Với P-S-A, 3 thành viên bầu cho đa số là 2, mà chỉ có 2 thành viên mang dữ liệu, nên cần cả hai; secondary tắt thì chỉ còn 1 node xác nhận được, thiếu 1. Arbiter không giữ dữ liệu nên không ghi được gì để xác nhận. Docs chính thức khuyên dùng P-S-S."
      en: "The arbiter has a vote, so it sounds right, but that vote only elects a primary. For P-S-A, 3 voting members give a majority of 2, and there are only 2 data-bearing members, so both are needed; with the secondary down only 1 node can acknowledge, one short. The arbiter holds no data, so it has nothing to write and acknowledge. The docs recommend P-S-S."
  - q:
      vi: "Bạn cần đọc một tài liệu theo `_id` phản ánh mọi lần ghi majority đã xong trước khi đọc, trên primary. Read concern nào?"
      en: "You need to read one document by `_id` reflecting every majority write completed before the read, on the primary. Which read concern?"
    options:
      - { vi: "`local`", en: "`local`" }
      - { vi: "`available`", en: "`available`" }
      - { vi: "`linearizable`, kèm `maxTimeMS`", en: "`linearizable`, with `maxTimeMS`" }
    answer: 2
    why:
      vi: "`local` và `available` trả ngay dữ liệu node đang có, kể cả lần ghi chưa được đa số xác nhận và có thể bị rollback, nên không bảo đảm phản ánh mọi lần ghi majority đã xong. `linearizable` trên primary kiểm với đa số rằng node vẫn là primary trước khi trả, nên phản ánh mọi lần ghi majority xong trước khi đọc. Nó chỉ chạy trên primary, bộ lọc phải trúng một tài liệu, và nên có `maxTimeMS` để không chờ mãi."
      en: "`local` and `available` return the node's data at once, including writes a majority has not acknowledged and that may be rolled back, so they do not promise to reflect every completed majority write. `linearizable` on the primary checks with a majority that the node is still primary before answering, so it reflects every majority write completed before the read. It runs on the primary only, the filter must hit one document, and it should have `maxTimeMS` so it never waits forever."
  - q:
      vi: "Trong transaction, một lệnh ghi ngoài transaction sửa tài liệu mà transaction định sửa sau đó. Kết quả?"
      en: "During a transaction, a write outside it modifies a document the transaction later tries to modify. Result?"
    options:
      - { vi: "Transaction hủy vì write conflict", en: "The transaction aborts with a write conflict" }
      - { vi: "Lệnh ghi ngoài bị hoàn tác", en: "The outside write is undone" }
    answer: 0
    why:
      vi: "Lệnh ghi ngoài đã xong và đã được xác nhận trước, nên MongoDB không hoàn tác nó. Transaction đọc trên một snapshot cũ; khi nó định sửa tài liệu đã bị đổi sau snapshot đó, ghi tiếp sẽ đè mất thay đổi kia, nên docs chính thức nói transaction hủy vì write conflict. Lỗi mang nhãn `TransientTransactionError`: ứng dụng chạy lại cả transaction trên dữ liệu mới."
      en: "The outside write has already finished and been acknowledged, so MongoDB does not undo it. The transaction reads from an older snapshot; when it tries to modify a document changed after that snapshot, going on would overwrite the other change, so the docs say the transaction aborts with a write conflict. The error carries the `TransientTransactionError` label: the application runs the whole transaction again on the new data."
---
## Mở bài

Ba tình huống thật trong một hệ thanh toán: một secondary đang bảo trì, một lần đọc số dư cần chắc chắn mới nhất, và một transaction va vào lệnh ghi khác. Mỗi câu hỏi là một quyết định bạn sẽ phải làm khi vận hành.

## Ý chính

Ba câu kiểm lại ba ý của module: write concern `majority` đếm thành viên mang dữ liệu, không đếm arbiter; read concern `linearizable` là mức đọc mạnh nhất cho một tài liệu trên primary; một transaction hủy vì write conflict khi lệnh ghi ngoài transaction đổi trước tài liệu mà nó định đổi. Đáp án theo docs chính thức của MongoDB hiện hành.

## Ví dụ

```text
P-S-A, secondary down:   voting members 3, majority 2, data-bearing members up 1  -> w: "majority" cannot be acknowledged
P-S-S, one secondary down: voting members 3, majority 2, data-bearing members up 2 -> w: "majority" is acknowledged
```

Bảng trên cho thấy vì sao docs khuyên P-S-S: mất một thành viên mang dữ liệu vẫn còn đủ đa số để xác nhận.

## Tóm tắt

- Arbiter có phiếu bầu nhưng không giữ dữ liệu, nên không xác nhận được lần ghi.
- `linearizable`: một tài liệu, trên primary, kèm `maxTimeMS`.
- Lệnh ghi ngoài đổi trước tài liệu transaction định đổi: transaction hủy vì write conflict.

# EN

## Opening

Three real situations in a payments system: a secondary under maintenance, a balance read that must be the latest, and a transaction that runs into another write. Each question is a decision you will have to make in operations.

## Key idea

Three questions recheck three ideas of this module: write concern `majority` counts data-bearing members, not arbiters; read concern `linearizable` is the strongest read for one document on the primary; a transaction aborts with a write conflict when a write outside it changes a document it later tries to change. Answers follow the current MongoDB manual.

## Example

```text
P-S-A, secondary down:   voting members 3, majority 2, data-bearing members up 1  -> w: "majority" cannot be acknowledged
P-S-S, one secondary down: voting members 3, majority 2, data-bearing members up 2 -> w: "majority" is acknowledged
```

The table shows why the docs recommend P-S-S: losing one data-bearing member still leaves enough of a majority to acknowledge.

## Recap

- An arbiter has a vote but holds no data, so it cannot acknowledge a write.
- `linearizable`: one document, on the primary, with `maxTimeMS`.
- A write outside that first changes a document the transaction later tries to change: the transaction aborts with a write conflict.
