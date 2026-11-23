---
id: e-dy-l5-05
engine: dynamodb
level: L5
module: global-ops
title: "Bộ máy trong trình duyệt khác DynamoDB thật ở đâu"
title_en: "Where the in-browser engine differs from real DynamoDB"
kind: quiz
runtime: docs
minutes: 5
objectives:
  - { vi: "Biết phần nào của L4–L5 đã chạy thật trong trình duyệt và phần nào chỉ có trên AWS", en: "Know which parts of L4–L5 ran for real in the browser and which exist only on AWS" }
  - { vi: "Không rút kết luận về hiệu năng từ một bộ máy một nút", en: "Not draw performance conclusions from a single-node engine" }
requires: [e-dy-l4-02, e-dy-l5-02]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
quiz:
  - q: { vi: "Bạn ghi 5000 item mỗi giây vào một partition key trong bộ máy trình duyệt và không thấy throttle. Kết luận nào đúng?", en: "You write 5000 items per second to one partition key in the browser engine and see no throttling. Which conclusion is right?" }
    options:
      - { vi: "Thiết kế ổn, DynamoDB thật cũng sẽ chịu được", en: "The design is fine, real DynamoDB will cope too" }
      - { vi: "Không kết luận được: bộ máy một nút không mô phỏng partition hay throttle; trên AWS khóa này vượt 1000 WCU", en: "No conclusion: a single-node engine simulates neither partitions nor throttling; on AWS this key exceeds 1000 WCU" }
      - { vi: "Adaptive capacity đã cứu", en: "Adaptive capacity saved it" }
    answer: 1
    trap: 0
    why: { vi: "Throttle, burst và adaptive capacity chỉ có trên DynamoDB thật. Trong trình duyệt hãy tính bằng tay (bài 3) thay vì đo.", en: "Throttling, burst and adaptive capacity exist only on real DynamoDB. In the browser, compute by hand (lesson 3) instead of measuring." }
  - q: { vi: "Trong bài TTL, item đã hết hạn không bao giờ tự biến mất. Vì sao, và điều đó có sai với AWS không?", en: "In the TTL lesson, expired items never vanish by themselves. Why, and is that wrong compared with AWS?" }
    options:
      - { vi: "Bộ máy không có tiến trình TTL; trên AWS item cũng có thể còn vài ngày, nên phải lọc ở cả hai nơi", en: "The engine has no TTL process; on AWS items can also linger for days, so you filter in both places" }
      - { vi: "Lỗi của bài, AWS xóa ngay lúc hết hạn", en: "A lesson bug, AWS deletes at the moment of expiry" }
      - { vi: "Vì `expires_at` phải là chuỗi", en: "Because `expires_at` must be a string" }
    answer: 0
    why: { vi: "AWS xóa item hết hạn trong vòng vài ngày và khuyên lọc bằng `FilterExpression`. Bộ máy trình duyệt không xóa, nên bài học về lọc vẫn đúng.", en: "AWS deletes expired items within a few days and recommends filtering with a `FilterExpression`. The browser engine never deletes, so the filtering lesson still holds." }
  - q: { vi: "API nào ở L4–L5 đã chạy thật trong trình duyệt?", en: "Which L4–L5 API actually ran in the browser?" }
    options:
      - { vi: "`TransactWriteItems`", en: "`TransactWriteItems`" }
      - { vi: "`TransactGetItems` và PartiQL `ExecuteTransaction`", en: "`TransactGetItems` and PartiQL `ExecuteTransaction`" }
      - { vi: "DynamoDB Streams", en: "DynamoDB Streams" }
    answer: 1
    why: { vi: "dynoxide 1.5.0 có `TransactGetItems` và `ExecuteTransaction`; `TransactWriteItems`, TTL và Streams trả `UnsupportedOperation`, nên các bài đó là bài đọc.", en: "dynoxide 1.5.0 has `TransactGetItems` and `ExecuteTransaction`; `TransactWriteItems`, TTL and Streams return `UnsupportedOperation`, so those lessons are reading lessons." }
---

## Mở bài

Bạn đã chạy hàng chục lab DynamoDB ngay trong trình duyệt, không cần tài khoản AWS. Nhưng một bảng thật có partition, throttle và tiến trình nền. Kết luận nào từ trình duyệt mang sang AWS được, kết luận nào không?

## Ý chính

Bộ máy DynamoDB trong trình duyệt (dynoxide 1.5.0) chạy đúng ngữ nghĩa của request: khóa, Query, GSI, LSI, biểu thức, ghi có điều kiện, `ConsumedCapacity`, `TransactGetItems`, PartiQL và `ExecuteTransaction`. Số `Count`, `ScannedCount` và capacity theo luật là số đo thật của bộ máy này.

Nó là một nút đơn chạy trên SQLite, nên không có partition thật, throttle, burst hay adaptive capacity; không có `TransactWriteItems` (dùng `ExecuteTransaction` thay); không có Streams, tiến trình TTL, global table hay backup.

Nhiều người nghĩ chạy nhanh trong trình duyệt nghĩa là chạy nhanh trên AWS. Thật ra tốc độ ở đây chỉ nói về máy của bạn. Hãy dùng bộ máy để kiểm thiết kế khóa và số item đã đọc, dùng phép tính (WCU, RCU, trần mỗi partition) để ước lượng tải.

## Ví dụ

Cái gì kiểm được ở đâu:

```text
question                                   browser engine         real AWS / arithmetic
does this Query read only the collection?  yes: ScannedCount      same
how many RCU does this read cost?          yes: ConsumedCapacity  same rule
will 5000 writes/s on one key throttle?    no                     1000 WCU per partition -> yes
are expired items deleted?                 never                  within a few days
```

## Tóm tắt

- Bộ máy trình duyệt đúng ngữ nghĩa request: khóa, index, biểu thức, capacity theo luật.
- Không có partition, throttle, Streams, TTL, global table, backup, `TransactWriteItems`.
- Kiểm thiết kế bằng `ScannedCount`; ước lượng tải bằng phép tính.
- Tốc độ đo trong trình duyệt không phải bằng chứng hiệu năng trên AWS.

# EN

## Opening

You have run dozens of DynamoDB labs right in the browser, with no AWS account. But a real table has partitions, throttling and background processes. Which conclusions from the browser carry over to AWS, and which do not?

## Key idea

The in-browser DynamoDB engine (dynoxide 1.5.0) runs request semantics faithfully: keys, Query, GSIs, LSIs, expressions, conditional writes, `ConsumedCapacity`, `TransactGetItems`, PartiQL and `ExecuteTransaction`. The `Count`, `ScannedCount` and rule-based capacity figures are real measurements of this engine.

It is a single node running on SQLite, so it has no real partitions, throttling, burst or adaptive capacity; no `TransactWriteItems` (use `ExecuteTransaction` instead); no Streams, TTL process, global tables or backups.

Many people think fast in the browser means fast on AWS. In fact speed here only says something about your machine. Use the engine to check key design and how many items are read, and use arithmetic (WCU, RCU, the per-partition ceiling) to estimate load.

## Example

What can be checked where:

```text
question                                   browser engine         real AWS / arithmetic
does this Query read only the collection?  yes: ScannedCount      same
how many RCU does this read cost?          yes: ConsumedCapacity  same rule
will 5000 writes/s on one key throttle?    no                     1000 WCU per partition -> yes
are expired items deleted?                 never                  within a few days
```

## Recap

- The browser engine is faithful to request semantics: keys, indexes, expressions, rule-based capacity.
- It has no partitions, throttling, Streams, TTL, global tables, backups or `TransactWriteItems`.
- Check design with `ScannedCount`; estimate load with arithmetic.
- Speed measured in the browser is not performance evidence for AWS.
