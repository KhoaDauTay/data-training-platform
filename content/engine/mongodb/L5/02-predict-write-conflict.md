---
id: e-mg-l5-02
engine: mongodb
level: L5
module: wiredtiger
title: "Đoán kết quả: hai lần ghi cùng một tài liệu"
title_en: "Predict the outcome: two writes on the same document"
kind: predict
minutes: 6
runtime: docs
objectives:
  - vi: "Giải thích vì sao ghi xung đột được chạy lại mà ứng dụng không thấy"
    en: "Explain why a conflicting write is retried without the application noticing"
requires: [e-mg-l5-01]
sources:
  - https://www.mongodb.com/docs/manual/core/wiredtiger/
  - https://www.mongodb.com/docs/manual/core/transactions-production-consideration/
predict:
  sql: |
    // client A
    db.stock.updateOne({ _id: "A" }, { $inc: { qty: -1 } })
    // client B, at the same moment
    db.stock.updateOne({ _id: "A" }, { $inc: { qty: -2 } })
  q:
    vi: "Hai client chạy cùng lúc, ngoài transaction, trên cùng tài liệu `qty: 10`. Kết quả nào đúng?"
    en: "Two clients run at the same moment, outside any transaction, on the same document with `qty: 10`. Which is right?"
  options:
    - vi: "Một lệnh nhận lỗi write conflict, `qty` là 9 hoặc 8"
      en: "One command gets a write conflict error, `qty` ends at 9 or 8"
    - vi: "WiredTiger phát hiện xung đột và tự chạy lại một lệnh; cả hai thành công, `qty` là 7"
      en: "WiredTiger detects the conflict and retries one command itself; both succeed, `qty` ends at 7"
    - vi: "Collection bị khóa độc quyền, lệnh thứ hai chờ hết lệnh đầu"
      en: "The collection is locked exclusively, the second command waits for the first"
  answer: 1
  why:
    vi: "Tài liệu WiredTiger: kiểm soát lạc quan, chỉ intent lock ở mức collection; khi hai thao tác xung đột, một bên gặp write conflict và MongoDB chạy lại nó một cách trong suốt. Mỗi lệnh trên một tài liệu là atomic, nên `qty` giảm đủ 3. Khác với transaction đa tài liệu: ở đó write conflict làm transaction hủy và ứng dụng phải chạy lại."
    en: "The WiredTiger docs: optimistic control with only intent locks at the collection level; when two operations conflict, one hits a write conflict and MongoDB retries it transparently. Each single-document command is atomic, so `qty` drops by the full 3. Unlike a multi-document transaction: there a write conflict aborts the transaction and the application must retry."
---

## Ý chính

Đây là bài đoán theo tài liệu MongoDB (trang "WiredTiger Storage Engine", mục Document Level Concurrency); trình duyệt không chạy WiredTiger. Hai câu quyết định:

- WiredTiger chỉ giữ intent lock ở mức global, database, collection; hai client sửa hai tài liệu khác nhau không chờ nhau.
- Khi hai thao tác xung đột trên cùng tài liệu, một thao tác gặp write conflict và MongoDB chạy lại nó, ứng dụng không cần làm gì.

Trong transaction đa tài liệu thì khác: write conflict làm transaction hủy, ứng dụng phải bắt lỗi và chạy lại cả transaction.

## Ví dụ

```javascript
db.stock.find({ _id: "A" })
```

Sau hai lệnh, tài liệu có `qty` bằng 7.

Đúng với tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

This is a prediction based on the MongoDB docs (page "WiredTiger Storage Engine", section Document Level Concurrency); the browser runs no WiredTiger. Two statements decide it:

- WiredTiger holds only intent locks at the global, database and collection levels; two clients modifying two different documents do not wait for each other.
- When two operations conflict on the same document, one hits a write conflict and MongoDB retries it, with nothing for the application to do.

A multi-document transaction is different: a write conflict aborts the transaction, and the application must catch the error and retry the whole transaction.

## Example

```javascript
db.stock.find({ _id: "A" })
```

After both commands the document has `qty` equal to 7.

Matches the current MongoDB manual, checked 2026-11-20.
