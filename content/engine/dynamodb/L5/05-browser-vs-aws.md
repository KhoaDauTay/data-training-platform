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

## Ý chính

Bộ máy DynamoDB trong trình duyệt (dynoxide 1.5.0) chạy đúng ngữ nghĩa của request: khóa, Query, GSI, biểu thức, `ConsumedCapacity`, `TransactGetItems`, PartiQL. Nó là một nút đơn trên SQLite, nên **không** có:

- partition thật, throttle, burst, adaptive capacity;
- `TransactWriteItems` (dùng `ExecuteTransaction` thay);
- Streams, tiến trình TTL, global table, backup.

Vì vậy: dùng nó để kiểm thiết kế khóa và số item đã đọc, dùng phép tính để ước lượng tải, và đừng lấy tốc độ đo trong trình duyệt làm bằng chứng hiệu năng.

# EN

## Key idea

The in-browser DynamoDB engine (dynoxide 1.5.0) runs request semantics faithfully: keys, Query, GSIs, expressions, `ConsumedCapacity`, `TransactGetItems`, PartiQL. It is a single node on SQLite, so it does **not** have:

- real partitions, throttling, burst, adaptive capacity;
- `TransactWriteItems` (use `ExecuteTransaction` instead);
- Streams, the TTL process, global tables, backups.

So: use it to check key design and how many items are read, use arithmetic to estimate load, and never take speed measured in the browser as performance evidence.
