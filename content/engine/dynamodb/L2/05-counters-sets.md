---
id: e-dy-l2-05
engine: dynamodb
level: L2
module: safe-writes
title: "Bộ đếm nguyên tử và tập hợp với ADD"
title_en: "Atomic counters and sets with ADD"
kind: lab
runtime: browser
minutes: 10
objectives:
  - vi: Tăng một số bằng `ADD`, kể cả khi thuộc tính chưa có.
    en: Increase a number with `ADD`, even when the attribute does not exist yet.
  - vi: Tạo và mở rộng một tập hợp chuỗi (`SS`) bằng `ADD`, bớt phần tử bằng `DELETE`.
    en: Create and grow a string set (`SS`) with `ADD`, and remove elements with `DELETE`.
  - vi: Giải thích vì sao bộ đếm nguyên tử không idempotent.
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
quiz:
  - q:
      vi: Ứng dụng gửi `ADD views :one`, mạng chập chờn nên SDK gửi lại lần nữa. Điều gì có thể xảy ra?
      en: An app sends `ADD views :one`, the network hiccups and the SDK retries. What can happen?
    options:
      - vi: DynamoDB tự nhận ra lần gửi lại và bỏ qua.
        en: DynamoDB recognises the retry and ignores it.
      - vi: Bộ đếm có thể bị cộng hai lần, vì bộ đếm nguyên tử không idempotent.
        en: The counter may be incremented twice, because an atomic counter is not idempotent.
      - vi: Request thứ hai luôn lỗi.
        en: The second request always fails.
    answer: 1
    why:
      vi: AWS ghi rõ bộ đếm nguyên tử không idempotent. Dùng nó khi sai số nhỏ chấp nhận được (lượt xem). Với tiền hay tồn kho, dùng ghi có điều kiện để lần gửi lại bị từ chối.
      en: AWS states that atomic counters are not idempotent. Use them where a small error is fine (view counts). For money or stock, use a conditional write so the retry is rejected.
---

## Ý chính

`ADD` có hai nghĩa tùy kiểu:

- Với **số**: cộng vào (số âm để trừ). Thuộc tính chưa có thì coi như 0.
- Với **tập hợp** (`SS`, `NS`, `BS`): thêm phần tử. Thuộc tính chưa có thì tạo tập mới.

`DELETE` chỉ dùng cho tập hợp: bớt phần tử. Tập hợp không được rỗng, nên bớt phần tử cuối cùng sẽ xóa luôn thuộc tính.

`ADD` không dùng được cho danh sách `L`; danh sách dùng `list_append`.

## Ví dụ

Hai tập được ghép, phần tử trùng chỉ giữ một:

```text
formats = {"ebook", "paperback"}
ADD formats {"ebook", "audio"}     -> {"audio", "ebook", "paperback"}
DELETE formats {"paperback"}       -> {"audio", "ebook"}
```

## Thực hành

Trang về UpdateExpression của AWS ghi: nhìn chung nên dùng `SET` thay cho `ADD` để thao tác idempotent. Nhưng `SET a = a + :n` cũng cộng lại mỗi lần gửi; chỉ một điều kiện trên chính thuộc tính đang sửa (bài trước) mới làm lần gửi lại vô hại. `ADD` vẫn là cách duy nhất để thêm phần tử vào tập hợp.

# EN

## Key idea

`ADD` means two things depending on the type:

- On a **number**: add to it (a negative number subtracts). A missing attribute counts as 0.
- On a **set** (`SS`, `NS`, `BS`): add elements. A missing attribute becomes a new set.

`DELETE` works only on sets: it removes elements. A set cannot be empty, so removing the last element removes the attribute.

`ADD` does not work on `L` lists; lists use `list_append`.

## Example

Two sets are merged and duplicates kept once:

```text
formats = {"ebook", "paperback"}
ADD formats {"ebook", "audio"}     -> {"audio", "ebook", "paperback"}
DELETE formats {"paperback"}       -> {"audio", "ebook"}
```

## Practice

The AWS page on update expressions says that, in general, you should use `SET` rather than `ADD` to keep operations idempotent. But `SET a = a + :n` also adds again on every send; only a condition on the attribute being changed (previous lesson) makes a retry harmless. `ADD` is still the only way to add elements to a set.
