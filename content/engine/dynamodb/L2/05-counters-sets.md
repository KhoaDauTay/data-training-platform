---
id: e-dy-l2-05
engine: dynamodb
level: L2
module: safe-writes
title: "Atomic counter và tập hợp với ADD"
title_en: "Atomic counters and sets with ADD"
kind: lab
runtime: browser
minutes: 10
figures: [{ name: dy-atomic-add, at: idea }]
objectives:
  - vi: Tăng một số bằng `ADD`, kể cả khi thuộc tính chưa có.
    en: Increase a number with `ADD`, even when the attribute does not exist yet.
  - vi: Tạo và mở rộng một tập hợp chuỗi (`SS`) bằng `ADD`, bớt phần tử bằng `DELETE`.
    en: Create and grow a string set (`SS`) with `ADD`, and remove elements with `DELETE`.
  - vi: Giải thích vì sao atomic counter không idempotent.
    en: Explain why an atomic counter is not idempotent.
requires: [e-dy-l2-03]
sources:
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
  - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html
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
        vi: Nhập thêm 10 cuốn `978-0-03` vào kho bằng một phép cộng nguyên tử, trả về giá trị mới của thuộc tính vừa sửa.
        en: Receive 10 more copies of `978-0-03` with one atomic addition, and return the new value of the changed attribute.
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-03"}},
          "UpdateExpression": "ADD stock :n",
          "ExpressionAttributeValues": {":n": {"N": "10"}},
          "ReturnValues": "UPDATED_NEW"}}
      check: doc
      hint:
        vi: '`ADD` không có dấu `=`: `ADD stock :n`.'
        en: '`ADD` has no `=` sign: `ADD stock :n`.'
    - task:
        vi: 'Ghi lại rằng cuốn `978-0-01` có hai định dạng "paperback" và "ebook", trong một tập hợp chuỗi `formats` (chưa có).'
        en: 'Record that book `978-0-01` comes in two formats, "paperback" and "ebook", in a string set `formats` (it does not exist yet).'
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-01"}},
          "UpdateExpression": "ADD formats :f",
          "ExpressionAttributeValues": {":f": {"SS": ["paperback", "ebook"]}},
          "ReturnValues": "UPDATED_NEW"}}
      check: doc
      hint:
        vi: 'Giá trị là một tập hợp, nhãn `SS`: `{"SS": ["…", "…"]}`. Tập hợp không có thứ tự và không trùng.'
        en: 'The value is a set with the `SS` tag: `{"SS": ["…", "…"]}`. Sets have no order and no duplicates.'
    - task:
        vi: 'Đếm lượt xem cuốn `978-0-05` trong thuộc tính `views` (chưa có) bằng `ADD`, cộng 1, và trả về giá trị mới.'
        en: 'Count a view of book `978-0-05` in the attribute `views` (it does not exist yet) with `ADD`, adding 1, and return the new value.'
      solution: |
        {"op": "UpdateItem", "input": {"TableName": "Books",
          "Key": {"isbn": {"S": "978-0-05"}},
          "UpdateExpression": "ADD #v :one",
          "ExpressionAttributeNames": {"#v": "views"},
          "ExpressionAttributeValues": {":one": {"N": "1"}},
          "ReturnValues": "UPDATED_NEW"}}
      check: doc
      hint:
        vi: '`ADD` coi thuộc tính số chưa có là 0, nên không cần `if_not_exists`. `views` là từ dành riêng.'
        en: '`ADD` treats a missing number attribute as 0, so no `if_not_exists` is needed. `views` is a reserved word.'
quiz:
  - q:
      vi: Ứng dụng gửi `ADD views :one`, mạng chập chờn nên SDK gửi lại lần nữa. Điều gì có thể xảy ra?
      en: An app sends `ADD views :one`, the network hiccups and the SDK retries. What can happen?
    options:
      - vi: DynamoDB tự nhận ra lần gửi lại và bỏ qua.
        en: DynamoDB recognises the retry and ignores it.
      - vi: Bộ đếm có thể bị cộng hai lần, vì atomic counter không idempotent.
        en: The counter may be incremented twice, because an atomic counter is not idempotent.
      - vi: Request thứ hai luôn lỗi.
        en: The second request always fails.
    answer: 1
    trap: 0
    why:
      vi: Nghe hợp lý vì SDK tự gửi lại nên có vẻ DynamoDB phải biết, nhưng AWS ghi rõ atomic counter không idempotent (gửi lại thì kết quả đổi tiếp), mỗi lần gửi là một lần cộng. Nếu lần đầu đã ghi xong mà phản hồi bị mất, lần gửi lại cộng thêm 1. Lần gửi lại cũng không lỗi, vì `ADD views :one` không kèm điều kiện nào để bị từ chối. Dùng nó khi sai số nhỏ chấp nhận được (lượt xem). Với tiền hay tồn kho, dùng ghi có điều kiện để lần gửi lại bị từ chối.
      en: It sounds right because the SDK sends the retry on its own, so DynamoDB seems to know, but AWS states that atomic counters are not idempotent (sending again changes the result again), so every send is one more addition. If the first write succeeded and only its response was lost, the retry adds 1 more. The retry does not fail either, because `ADD views :one` carries no condition that could reject it. Use them where a small error is fine (view counts). For money or stock, use a conditional write so the retry is rejected.
  - q:
      vi: 'Thuộc tính `tags` là một danh sách `L`. `ADD tags :t` với `:t` là `{"SS": ["new"]}` làm gì?'
      en: 'The attribute `tags` is an `L` list. What does `ADD tags :t` with `:t` set to `{"SS": ["new"]}` do?'
    options:
      - vi: Thêm "new" vào cuối danh sách
        en: It appends "new" to the list
      - vi: '`ValidationException`: `ADD` chỉ dùng cho số và tập hợp, không cho danh sách'
        en: 'A `ValidationException`: `ADD` works only on numbers and sets, not on lists'
      - vi: Đổi `tags` thành tập hợp
        en: It turns `tags` into a set
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì `ADD` thêm được phần tử vào tập hợp, nhưng danh sách và tập hợp là hai kiểu khác nhau, và kiểu của toán hạng (`SS`) phải khớp kiểu thuộc tính (`L`). Không khớp thì DynamoDB từ chối cả request chứ không tự đổi `tags` thành tập hợp, nên danh sách cũ giữ nguyên. Danh sách dùng `SET tags = list_append(tags, :t)`.'
      en: 'It sounds right because `ADD` can add elements to a set, but a list and a set are different types, and the operand type (`SS`) must match the attribute type (`L`). On a mismatch DynamoDB rejects the whole request rather than turning `tags` into a set, so the old list stays as it was. Lists use `SET tags = list_append(tags, :t)`.'
---

## Mở bài

Mỗi lần ai đó mở trang một cuốn sách, bạn muốn cộng 1 vào lượt xem. Đọc số cũ, cộng, rồi ghi lại thì hai lượt xem cùng lúc sẽ mất một. Có cách nào cộng thẳng trên server?

## Ý chính

`ADD` là cách làm **atomic counter** (bộ đếm nguyên tử): cộng ngay trên server, không đọc trước. `ADD` có hai nghĩa tùy kiểu:

- Với **số**: cộng vào (số âm để trừ). Thuộc tính chưa có thì coi như 0.
- Với **tập hợp** (`SS`, `NS`, `BS`): thêm phần tử. Thuộc tính chưa có thì tạo tập mới.

`DELETE` chỉ dùng cho tập hợp: bớt phần tử. Tập hợp không được rỗng, nên bớt phần tử cuối cùng sẽ xóa luôn thuộc tính. `ADD` không dùng được cho danh sách `L`; danh sách dùng `list_append`.

Trang về UpdateExpression của AWS ghi: nhìn chung nên dùng `SET` thay cho `ADD` để thao tác idempotent (gửi lại nhiều lần vẫn cho cùng kết quả). Nhưng `SET a = a + :n` cũng cộng lại mỗi lần gửi; chỉ một điều kiện trên chính thuộc tính đang sửa (bài trước) mới làm lần gửi lại vô hại. `ADD` vẫn là cách duy nhất để thêm phần tử vào tập hợp.

Hình từng bước ở cuối mục này nhập 10 cuốn `978-0-02` bằng `SET`, bằng `ADD`, rồi gửi lại cùng `ADD` một lần nữa.

## Cú pháp

```text
ADD stock :n            (number: add, a negative :n subtracts)
ADD formats :f          (set: add elements, :f is {"SS": [...]})
DELETE formats :f       (set: remove elements)
```

- `ADD` và `DELETE` không có dấu `=`.
- Hai tập được ghép thì phần tử trùng chỉ giữ một: `{"ebook", "paperback"}` thêm `{"ebook", "audio"}` thành `{"audio", "ebook", "paperback"}`.

## Ví dụ

Bán 3 cuốn `978-0-06`: `ADD` với số âm:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-06"}}, "UpdateExpression": "ADD stock :n", "ExpressionAttributeValues": {":n": {"N": "-3"}}, "ReturnValues": "UPDATED_NEW"}}
```

`stock` của `978-0-06` từ 41 còn 38, không cần đọc trước.

Tạo tập `formats` cho cuốn `978-0-02`:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "ADD formats :f", "ExpressionAttributeValues": {":f": {"SS": ["ebook", "audio"]}}, "ReturnValues": "UPDATED_NEW"}}
```

Thuộc tính `formats` chưa có nên được tạo thành tập `{"audio", "ebook"}`. Tập hợp không giữ thứ tự bạn viết.

## Lỗi hay gặp

`ADD` vào một danh sách `L`:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "ADD tags :t", "ExpressionAttributeValues": {":t": {"SS": ["new"]}}}}
```

`tags` là danh sách `L`, không phải tập hợp, nên DynamoDB báo toán hạng sai kiểu. Muốn thêm vào danh sách, dùng `SET tags = list_append(tags, :t)`.

Dùng `SET` khi muốn cộng thêm hàng về:

```json
// WRONG: stock becomes 10, the 3 copies already there are forgotten
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "SET stock = :n", "ExpressionAttributeValues": {":n": {"N": "10"}}, "ReturnValues": "UPDATED_NEW"}}
```

```json
// FIX: ADD adds to the current value
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "ADD stock :n", "ExpressionAttributeValues": {":n": {"N": "10"}}, "ReturnValues": "UPDATED_NEW"}}
```

Bản sai cho `stock` 10, bản sửa cho 13. Nhưng nhớ: gửi lại bản sửa thêm lần nữa sẽ thành 23, vì `ADD` không idempotent.

## Thực hành

Bảng `Books` có 8 cuốn; `tags` là danh sách `L`, chưa cuốn nào có tập hợp. Làm ba bước. Bước 1 cộng vào kho bằng `ADD`. Bước 2 tạo một tập chuỗi mới. Bước 3 đếm từ một thuộc tính số chưa có, không cần `if_not_exists`.

## Tóm tắt

- `ADD` trên số: cộng nguyên tử, thuộc tính chưa có coi là 0.
- `ADD` / `DELETE` trên tập hợp: thêm / bớt phần tử, không trùng.
- `ADD` không dùng cho danh sách `L`.
- Atomic counter không idempotent: lần gửi lại cộng thêm lần nữa.

# EN

## Opening

Every time someone opens a book's page, you want to add 1 to its view count. Read the old number, add, write it back, and two views at the same moment lose one. Is there a way to add directly on the server?

## Key idea

`ADD` is how you build an **atomic counter**: it adds on the server, with no read first. `ADD` means two things depending on the type:

- On a **number**: add to it (a negative number subtracts). A missing attribute counts as 0.
- On a **set** (`SS`, `NS`, `BS`): add elements. A missing attribute becomes a new set.

`DELETE` works only on sets: it removes elements. A set cannot be empty, so removing the last element removes the attribute. `ADD` does not work on `L` lists; lists use `list_append`.

The AWS page on update expressions says that, in general, you should use `SET` rather than `ADD` to keep operations idempotent. But `SET a = a + :n` also adds again on every send; only a condition on the attribute being changed (previous lesson) makes a retry harmless. `ADD` is still the only way to add elements to a set.

The step-through figure at the end of this section receives 10 copies of `978-0-02` with `SET`, with `ADD`, then sends the same `ADD` once more.

## Syntax

```text
ADD stock :n            (number: add, a negative :n subtracts)
ADD formats :f          (set: add elements, :f is {"SS": [...]})
DELETE formats :f       (set: remove elements)
```

- `ADD` and `DELETE` have no `=` sign.
- When two sets are merged, duplicates are kept once: `{"ebook", "paperback"}` plus `{"ebook", "audio"}` gives `{"audio", "ebook", "paperback"}`.

## Example

Sell 3 copies of `978-0-06`: `ADD` with a negative number:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-06"}}, "UpdateExpression": "ADD stock :n", "ExpressionAttributeValues": {":n": {"N": "-3"}}, "ReturnValues": "UPDATED_NEW"}}
```

The `stock` of `978-0-06` goes from 41 to 38 without a read first.

Create the set `formats` for book `978-0-02`:

```json
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "ADD formats :f", "ExpressionAttributeValues": {":f": {"SS": ["ebook", "audio"]}}, "ReturnValues": "UPDATED_NEW"}}
```

The attribute `formats` did not exist, so it is created as the set `{"audio", "ebook"}`. A set does not keep the order you wrote.

## Common mistakes

`ADD` on an `L` list:

```json
// ERROR ValidationException
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-01"}}, "UpdateExpression": "ADD tags :t", "ExpressionAttributeValues": {":t": {"SS": ["new"]}}}}
```

`tags` is an `L` list, not a set, so DynamoDB reports an operand of the wrong type. To add to a list, use `SET tags = list_append(tags, :t)`.

Using `SET` when new stock arrives:

```json
// WRONG: stock becomes 10, the 3 copies already there are forgotten
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "SET stock = :n", "ExpressionAttributeValues": {":n": {"N": "10"}}, "ReturnValues": "UPDATED_NEW"}}
```

```json
// FIX: ADD adds to the current value
{"op": "UpdateItem", "input": {"TableName": "Books", "Key": {"isbn": {"S": "978-0-02"}}, "UpdateExpression": "ADD stock :n", "ExpressionAttributeValues": {":n": {"N": "10"}}, "ReturnValues": "UPDATED_NEW"}}
```

The wrong version gives `stock` 10, the fix 13. But remember: sending the fix once more makes it 23, because `ADD` is not idempotent.

## Practice

Table `Books` holds 8 books; `tags` is an `L` list and no book has a set yet. Do the three steps. Step 1 adds to the stock with `ADD`. Step 2 creates a new string set. Step 3 counts from a number attribute that does not exist yet, without `if_not_exists`.

## Recap

- `ADD` on a number: an atomic addition, a missing attribute counts as 0.
- `ADD` / `DELETE` on a set: add / remove elements, no duplicates.
- `ADD` does not work on `L` lists.
- An atomic counter is not idempotent: a retry adds again.
