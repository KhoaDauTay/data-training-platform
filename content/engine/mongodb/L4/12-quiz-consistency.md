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
    why:
      vi: "Với P-S-A, đa số tính được là 2 mà chỉ có 2 thành viên mang dữ liệu, nên cần cả hai. Arbiter không giữ dữ liệu nên không xác nhận được. Docs chính thức khuyên dùng P-S-S."
      en: "For P-S-A the calculated majority is 2 and there are only 2 data-bearing members, so both are needed. The arbiter holds no data and cannot acknowledge. The docs recommend P-S-S."
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

## Ý chính

Ba câu về write concern với arbiter, read concern `linearizable` và write conflict trong transaction. Đáp án theo docs chính thức của MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

Three questions on write concern with an arbiter, the `linearizable` read concern and write conflicts in transactions. Answers follow the current MongoDB manual, checked 2026-11-20.
