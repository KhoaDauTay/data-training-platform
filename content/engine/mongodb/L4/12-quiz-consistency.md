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
figures: [{ name: mg-majority-psa, at: example }]
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
      vi: "Nghe hợp lý vì arbiter có phiếu bầu, nhưng phiếu bầu chỉ dùng để chọn primary. Với P-S-A, đa số tính được là 2 mà chỉ có 2 thành viên mang dữ liệu, nên cần cả hai. Arbiter không giữ dữ liệu nên không xác nhận được. Docs chính thức khuyên dùng P-S-S."
      en: "It sounds right because the arbiter has a vote, but that vote only elects a primary. For P-S-A the calculated majority is 2 and there are only 2 data-bearing members, so both are needed. The arbiter holds no data and cannot acknowledge. The docs recommend P-S-S."
  - q:
      vi: "Bạn cần đọc một tài liệu theo `_id` phản ánh mọi lần ghi majority đã xong trước khi đọc, trên primary. Read concern nào?"
      en: "You need to read one document by `_id` reflecting every majority write completed before the read, on the primary. Which read concern?"
    options:
      - { vi: "`local`", en: "`local`" }
      - { vi: "`available`", en: "`available`" }
      - { vi: "`linearizable`, kèm `maxTimeMS`", en: "`linearizable`, with `maxTimeMS`" }
    answer: 2
    why:
      vi: "`linearizable` trả dữ liệu phản ánh mọi lần ghi majority xong trước khi đọc; chỉ trên primary, bộ lọc trúng một tài liệu, và nên có `maxTimeMS` để không chờ mãi."
      en: "`linearizable` returns data reflecting every majority write completed before the read; primary only, a filter that hits one document, and `maxTimeMS` so it never waits forever."
  - q:
      vi: "Trong transaction, một lệnh ghi ngoài transaction sửa tài liệu mà transaction định sửa sau đó. Kết quả?"
      en: "During a transaction, a write outside it modifies a document the transaction later tries to modify. Result?"
    options:
      - { vi: "Transaction hủy vì write conflict", en: "The transaction aborts with a write conflict" }
      - { vi: "Lệnh ghi ngoài bị hoàn tác", en: "The outside write is undone" }
    answer: 0
    why:
      vi: "Docs chính thức: nếu một lần ghi ngoài transaction sửa tài liệu mà thao tác trong transaction định sửa sau đó, transaction hủy vì write conflict."
      en: "The docs: if a write outside the transaction modifies a document that an operation in the transaction later tries to modify, the transaction aborts with a write conflict."
---
## Mở bài

Ba tình huống thật trong một hệ thanh toán: một secondary đang bảo trì, một lần đọc số dư cần chắc chắn mới nhất, và một transaction va vào lệnh ghi khác. Mỗi câu hỏi là một quyết định bạn sẽ phải làm khi vận hành.

## Ý chính

Ba câu kiểm lại ba ý của module: write concern `majority` đếm thành viên mang dữ liệu, không đếm arbiter; read concern `linearizable` là mức đọc mạnh nhất cho một tài liệu trên primary; một transaction hủy vì write conflict khi lệnh ghi ngoài transaction đổi trước tài liệu mà nó định đổi. Đáp án theo docs chính thức của MongoDB hiện hành.

## Ví dụ

Hai replica set ba thành viên, mỗi bên mất một secondary. Với P-S-A chỉ còn primary mang dữ liệu, nên `w: "majority"` không được xác nhận; với P-S-S còn hai thành viên mang dữ liệu, đủ đa số. Hình dưới cho thấy vì sao docs khuyên P-S-S.

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

Two three-member replica sets, each losing one secondary. In P-S-A only the primary still holds data, so `w: "majority"` is never acknowledged; in P-S-S two data-bearing members remain, a majority. The figure below shows why the docs recommend P-S-S.

## Recap

- An arbiter has a vote but holds no data, so it cannot acknowledge a write.
- `linearizable`: one document, on the primary, with `maxTimeMS`.
- A write outside that first changes a document the transaction later tries to change: the transaction aborts with a write conflict.
