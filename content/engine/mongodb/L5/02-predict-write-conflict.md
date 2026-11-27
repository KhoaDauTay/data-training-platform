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
  - vi: "Phân biệt xung đột ngoài transaction với xung đột trong transaction nhiều tài liệu"
    en: "Tell a conflict outside a transaction from one inside a multi-document transaction"
requires: [e-mg-l5-01]
sources:
  - { url: https://www.mongodb.com/docs/manual/core/wiredtiger/, title_vi: "Bộ lưu trữ WiredTiger" }
  - { url: https://www.mongodb.com/docs/manual/core/transactions-production-consideration/, title_vi: "Transaction khi chạy thật: những điều cần lưu ý" }
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
    - vi: "Collection bị giữ lock độc quyền, lệnh thứ hai chờ hết lệnh đầu"
      en: "The collection holds an exclusive lock, the second command waits for the first"
  answer: 1
  trap: 0
  why:
    vi: "Một lỗi nghe hợp lý vì transaction nhiều tài liệu đúng là trả write conflict về ứng dụng, nhưng ở đây hai lệnh nằm ngoài transaction. Theo docs chính thức về WiredTiger, khi hai thao tác xung đột trên cùng tài liệu, một bên gặp write conflict và MongoDB tự chạy lại nó, ứng dụng không thấy lỗi; mỗi lệnh atomic nên `qty` = 10 − 1 − 2 = 7. Collection cũng không bị lock độc quyền: ở mức collection chỉ có intent lock (lock báo ý định, cho nhiều lệnh ghi cùng chạy), nên lệnh thứ hai không phải chờ cả collection."
    en: "An error sounds right because a multi-document transaction does return a write conflict to the application, but here both commands run outside a transaction. Per the WiredTiger docs, when two operations conflict on the same document, one hits a write conflict and MongoDB retries it itself, so the application sees no error; each command is atomic, so `qty` = 10 − 1 − 2 = 7. Nor does the collection get an exclusive lock: at the collection level there are only intent locks (locks that announce an intent and let many writes run at once), so the second command does not wait on the whole collection."
  recorded:
    tier: docs
    server: MongoDB
    version: "9.0"
    date: "2026-11-20"
    url: https://www.mongodb.com/docs/manual/core/wiredtiger/
quiz:
  - q:
      vi: "Cùng hai lệnh, nhưng giờ mỗi lệnh nằm trong một transaction nhiều tài liệu, và hai transaction đụng cùng tài liệu. Ứng dụng phải làm gì?"
      en: "The same two commands, but now each runs inside a multi-document transaction, and both transactions touch the same document. What must the application do?"
    options:
      - { vi: "Không gì cả: MongoDB tự chạy lại như ngoài transaction", en: "Nothing: MongoDB retries it, as outside a transaction" }
      - { vi: "Bắt lỗi có nhãn `TransientTransactionError` và chạy lại cả transaction", en: "Catch the error labelled `TransientTransactionError` and retry the whole transaction" }
      - { vi: "Đổi sang `w: 0` để tránh xung đột", en: "Switch to `w: 0` to avoid the conflict" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý khi suy từ trường hợp một tài liệu, nhưng trong transaction, write conflict làm transaction bị hủy và lỗi mang nhãn `TransientTransactionError`. Ứng dụng (hoặc callback API của driver, như `withTransaction`) phải chạy lại cả transaction, vì các lệnh trước trong transaction cũng đã bị bỏ. `w: 0` chỉ đổi việc server có gửi xác nhận hay không, không đổi việc hai transaction cùng sửa một tài liệu, nên xung đột vẫn xảy ra."
      en: "It sounds right by analogy with the single-document case, but inside a transaction a write conflict aborts the transaction, and the error carries the `TransientTransactionError` label. The application (or the driver's callback API, such as `withTransaction`) must retry the whole transaction, because the earlier commands in it were dropped too. `w: 0` only changes whether the server sends an acknowledgement, not the fact that two transactions modify one document, so the conflict still happens."
---
## Mở bài

Hai nhân viên kho bấm "xuất hàng" cho cùng một mặt hàng trong cùng một mili giây. Một người có bị báo lỗi không, và kho còn đúng số không?

## Ý chính

Đây là bài đoán theo docs chính thức của MongoDB (trang "WiredTiger Storage Engine", mục Document Level Concurrency); trình duyệt không chạy WiredTiger. Hai câu quyết định: WiredTiger chỉ giữ intent lock ở mức global, database, collection, nên hai client sửa hai tài liệu khác nhau không chờ nhau; khi hai thao tác xung đột trên cùng tài liệu, một thao tác gặp write conflict và MongoDB chạy lại nó, ứng dụng không cần làm gì.

Nhiều người nghĩ cứ có xung đột là ứng dụng thấy lỗi. Thật ra điều đó chỉ đúng trong transaction nhiều tài liệu: ở đó write conflict làm transaction hủy, lỗi mang nhãn `TransientTransactionError`, và ứng dụng phải chạy lại cả transaction. Một lệnh trên một tài liệu thì luôn atomic và được chạy lại trong suốt, nên `$inc` của cả hai client đều được tính.

## Tóm tắt

- Lệnh trên một tài liệu là atomic; xung đột ngoài transaction được MongoDB tự chạy lại.
- Chỉ có intent lock ở mức collection: ghi khác tài liệu không chờ nhau.
- Trong transaction nhiều tài liệu, write conflict hủy transaction; chạy lại khi gặp `TransientTransactionError`.
- `$inc` trên server an toàn hơn đọc rồi ghi lại giá trị ở ứng dụng.

# EN

## Opening

Two warehouse clerks press "ship" for the same item in the same millisecond. Does one of them get an error, and is the stock count still right?

## Key idea

This is a prediction based on the MongoDB docs (page "WiredTiger Storage Engine", section Document Level Concurrency); the browser runs no WiredTiger. Two statements decide it: WiredTiger holds only intent locks at the global, database and collection levels, so two clients modifying two different documents do not wait for each other; when two operations conflict on the same document, one hits a write conflict and MongoDB retries it, with nothing for the application to do.

Many people think any conflict shows up as an error in the application. In fact that is only true inside a multi-document transaction: there a write conflict aborts the transaction, the error carries the `TransientTransactionError` label, and the application must retry the whole transaction. A command on one document is always atomic and retried transparently, so the `$inc` of both clients counts.

## Recap

- A command on one document is atomic; a conflict outside a transaction is retried by MongoDB itself.
- Only intent locks at the collection level: writes on different documents do not wait for each other.
- In a multi-document transaction a write conflict aborts it; retry on `TransientTransactionError`.
- A server-side `$inc` is safer than reading and writing the value back in the application.
