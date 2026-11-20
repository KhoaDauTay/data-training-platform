---
id: e-dy-l2-12
engine: dynamodb
level: L2
module: safe-writes
title: "Kiểm tra cấp L2: ca trực tiệm sách"
title_en: "Level L2 check: a shift at the bookshop"
kind: capstone
runtime: browser
minutes: 20
objectives:
  - vi: Ghi an toàn dưới tải thật - chỉ thêm khi mới, không bán quá kho, không đè thay đổi của người khác.
    en: Write safely under real load - insert only when new, never oversell, never overwrite someone else's change.
  - vi: Dùng biểu thức, batch và PartiQL đúng chỗ.
    en: Use expressions, batches and PartiQL in the right place.
requires: [e-dy-l2-04, e-dy-l2-05, e-dy-l2-06, e-dy-l2-07]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
lab:
  setup: |
    {"tables": [{"TableName":"Books","KeySchema":[{"AttributeName":"isbn","KeyType":"HASH"}],"AttributeDefinitions":[{"AttributeName":"isbn","AttributeType":"S"}],"BillingMode":"PAY_PER_REQUEST"}],
     "items": {"Books": [
      {"isbn":"978-0-01","title":"Data at Rest","author":"Mai Lan","price":120000,"stock":14,"tags":["db","storage"]},
      {"isbn":"978-0-02","title":"Keys and Values","author":"Tran Binh","price":95000,"stock":3,"tags":["nosql"]},
      {"isbn":"978-0-03","title":"The Partition Book","author":"Le Hoa","price":150000,"stock":0,"tags":["nosql","scale"]},
      {"isbn":"978-0-04","title":"Query Not Scan","author":"Pham An","price":88000,"stock":22,"tags":["nosql","perf"]},
      {"isbn":"978-0-05","title":"Indexes by Hand","author":"Mai Lan","price":132000,"stock":7,"tags":["db"]},
      {"isbn":"978-0-06","title":"Small Items Fast","author":"Vo Khanh","price":70000,"stock":41,"tags":["perf"]},
      {"isbn":"978-0-07","title":"One Table","author":"Le Hoa","price":160000,"stock":5,"tags":["nosql","design"]},
      {"isbn":"978-0-08","title":"Eventually","author":"Tran Binh","price":99000,"stock":12,"tags":["nosql"]}
    ]}}
  steps:
    - task:
        vi: 'Nhà phát hành hay gửi trùng sách. Thêm cuốn `978-0-14` (`title` "Shift Notes", `price` `64000`), nhưng chỉ khi chưa có cuốn nào mang `isbn` đó.'
        en: 'The publisher often sends duplicates. Add book `978-0-14` (`title` "Shift Notes", `price` `64000`), but only if no book has that `isbn` yet.'
      solution: |
        {"op": "PutItem", "input": {"TableName": "Books",
          "Item": {"isbn": {"S": "978-0-14"}, "title": {"S": "Shift Notes"}, "price": {"N": "64000"}},
          "ConditionExpression": "attribute_not_exists(isbn)"}}
      check: doc
      hint:
        vi: Cùng một mẫu cho mọi lần "chỉ thêm nếu chưa có".
        en: The same pattern for every "insert only if new".
    - task:
        vi: Một đơn mua 3 cuốn `978-0-08`. Trừ kho đi 3 chỉ khi còn đủ, trả về `stock` mới.
        en: An order buys 3 copies of `978-0-08`. Take 3 from stock only if there are enough, and return the new `stock`.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-08"}},
          "UpdateExpression": "SET stock = stock - :q",
          "ConditionExpression": "stock >= :q",
          "ExpressionAttributeValues": {":q": {"N": "3"}},
          "ReturnValues": "UPDATED_NEW"}}
      check: doc
      hint:
        vi: Phép trừ và điều kiện dùng chung `:q`.
        en: The subtraction and the condition share `:q`.
    - task:
        vi: Bạn đọc giá cuốn `978-0-07` là `160000` và muốn hạ còn `150000`, nhưng không được đè lên thay đổi của đồng nghiệp ca trước.
        en: You read the price of `978-0-07` as `160000` and want to drop it to `150000`, without overwriting a change a colleague made on the previous shift.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-07"}},
          "UpdateExpression": "SET price = :new",
          "ConditionExpression": "price = :old",
          "ExpressionAttributeValues": {":new": {"N": "150000"}, ":old": {"N": "160000"}}}}
      check: doc
      hint:
        vi: Điều kiện kiểm giá bạn đã đọc.
        en: The condition checks the price you read.
    - task:
        vi: Khách đứng ở quầy hỏi ba cuốn `978-0-02`, `978-0-05`, `978-0-06`. Lấy `isbn`, `title`, `stock` của cả ba trong một request.
        en: A customer at the counter asks about three books, `978-0-02`, `978-0-05` and `978-0-06`. Get `isbn`, `title` and `stock` of all three in one request.
      solution: |
        {"op": "BatchGetItem", "input": {"RequestItems": {"Books": {
          "Keys": [{"isbn": {"S": "978-0-02"}}, {"isbn": {"S": "978-0-05"}}, {"isbn": {"S": "978-0-06"}}],
          "ProjectionExpression": "isbn, title, stock"}}}}
      check: doc
      hint:
        vi: Một bảng, ba khóa, một projection.
        en: One table, three keys, one projection.
    - task:
        vi: Cuối ca, bằng PartiQL, xem lại cuốn `978-0-01` để kiểm tra trước khi đóng sổ.
        en: At the end of the shift, use PartiQL to look at book `978-0-01` once more before closing the books.
      solution: |
        SELECT * FROM Books WHERE isbn = '978-0-01'
      check: doc
      hint:
        vi: Điều kiện bằng trên partition key, nên chỉ đọc một item.
        en: An equality on the partition key, so only one item is read.
quiz:
  - q:
      vi: 'Ở bước 3, DynamoDB trả `ConditionalCheckFailedException`. Điều đó nói gì, và bạn làm gì tiếp?'
      en: 'In step 3, DynamoDB returns `ConditionalCheckFailedException`. What does it tell you, and what do you do next?'
    options:
      - vi: DynamoDB đang trục trặc; gửi lại đúng request đó cho tới khi được.
        en: DynamoDB is having trouble; send the same request again until it works.
      - vi: Giá đã không còn là giá bạn đọc, vì có người sửa trước; đọc lại giá mới rồi quyết định lại.
        en: The price is no longer the one you read, because someone changed it first; read the new price and decide again.
      - vi: Lần ghi không xảy ra nên không tốn gì; bỏ qua và làm bước tiếp.
        en: The write did not happen, so it cost nothing; ignore it and move on.
    answer: 1
    why:
      vi: 'Một lỗi nghe như lỗi hệ thống nên dễ muốn gửi lại. Nhưng đây là optimistic locking làm đúng việc: điều kiện `price = :old` sai nghĩa là đồng nghiệp đã đổi giá. Gửi lại y hệt vẫn bị từ chối. Lần bị từ chối vẫn tốn WCU, nên cũng không phải "không tốn gì".'
      en: 'An exception sounds like a system fault, so resending is tempting. But this is optimistic locking doing its job: a false `price = :old` means a colleague changed the price. Sending the same request again is rejected again. The rejected write still consumed WCU, so it is not free either.'
---

## Ý chính

Bài kiểm tra cấp L2 là một ca trực: thêm sách mới mà không ghi đè, trừ kho không âm, sửa giá bằng optimistic locking, tra nhiều cuốn một lúc và kiểm lại bằng PartiQL. Mọi lần ghi đều có điều kiện; mọi lần đọc đều đi theo khóa.

## Thực hành

Bảng `Books` có 8 cuốn như các bài trước. Mỗi bước chạy lại từ dữ liệu gốc. Bước ghi được chấm bằng trạng thái bảng sau khi ghi; bước đọc bằng tập item trả về.

# EN

## Key idea

The level L2 check is one shift: add a new book without overwriting, take stock without going negative, change a price with optimistic locking, look up several books at once and check one again with PartiQL. Every write has a condition; every read goes through a key.

## Practice

Table `Books` holds the same 8 books as before. Each step runs again from the original data. A write step is graded by the table's state after the write; a read step by the set of items returned.
