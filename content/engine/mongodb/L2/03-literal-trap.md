---
id: e-mg-l2-03
engine: mongodb
level: L2
module: update-pipeline
title: Bẫy chuỗi bắt đầu bằng $ và $literal
title_en: The dollar-string trap and $literal
kind: predict
minutes: 6
objectives:
  - vi: Đoán đúng chuyện gì xảy ra khi một chuỗi bắt đầu bằng `$` nằm trong update dạng pipeline.
    en: Predict what happens when a string starting with `$` sits in a pipeline-style update.
  - vi: Dùng `$literal` để ghi đúng chuỗi đó.
    en: Use `$literal` to store that exact string.
requires: [e-mg-l2-02]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/literal/
  - https://www.mongodb.com/docs/manual/tutorial/update-documents-with-aggregation-pipeline/
predict:
  sql: 'db.products.updateOne({ _id: "p1" }, [{ $set: { label: "$sale" } }])'
  q:
    vi: Sau lệnh này, sản phẩm `"p1"` có gì ở trường `label`?
    en: After this command, what does product `"p1"` hold in field `label`?
  options:
    - vi: Chuỗi `"$sale"`
      en: The string `"$sale"`
    - vi: Không có trường `label`, vì `"$sale"` là đường dẫn tới một trường không tồn tại
      en: No `label` field, because `"$sale"` is the path of a field that does not exist
    - vi: Lệnh báo lỗi cú pháp
      en: The command fails with a syntax error
  answer: 1
  why:
    vi: 'Trong pipeline, `"$sale"` nghĩa là giá trị của trường `sale`. Trường đó không có nên biểu thức cho ra "thiếu", và `$set` không tạo trường. Ở update kiểu toán tử `{ $set: { label: "$sale" } }` thì chuỗi được ghi nguyên văn.'
    en: 'In a pipeline, `"$sale"` means the value of field `sale`. That field is missing, so the expression yields "missing" and `$set` creates no field. In an operator-style update `{ $set: { label: "$sale" } }` the string is stored as written.'
lab:
  setup: |
    {"collections": {"products": [
      {"_id": "p1", "name": "Green tea", "category": "drink", "price": 25000, "stock": 40},
      {"_id": "p2", "name": "Coffee beans", "category": "drink", "price": 120000, "stock": 8},
      {"_id": "p4", "name": "Dried mango", "category": "snack", "price": 45000, "stock": 25}
    ]}}
  steps:
    - task:
        vi: Vẫn dùng update dạng pipeline, đặt `label` của sản phẩm `"p1"` thành đúng chuỗi `"$sale"`.
        en: Still using a pipeline-style update, set the `label` of product `"p1"` to the exact string `"$sale"`.
      solution: 'db.products.updateOne({ _id: "p1" }, [{ $set: { label: { $literal: "$sale" } } }])'
      check: doc
      hint:
        vi: "`{ $literal: ... }` trả về giá trị đúng như viết, không đọc nó như đường dẫn trường."
        en: "`{ $literal: ... }` returns the value exactly as written, without reading it as a field path."
---
## Ý chính

Trong biểu thức aggregation (kể cả update dạng pipeline), chuỗi bắt đầu bằng `$` là đường dẫn trường, và `$$` là biến. Vì vậy `"$sale"` không phải chữ "$sale" mà là "giá trị của trường `sale`".

Bẫy hay gặp ở mã giảm giá, đơn vị tiền tệ hay ký hiệu như `"$5 off"`. Cách đúng là `{ $literal: "$5 off" }`.

Update kiểu toán tử (`{ $set: { ... } }` không nằm trong mảng) không có bẫy này: ở đó giá trị là dữ liệu, không phải biểu thức.

Làm được: đọc một update dạng pipeline và biết chỗ nào là dữ liệu, chỗ nào là biểu thức.

## Ví dụ

```js
db.products.updateOne({ _id: "p2" }, [{ $set: { promo: { $literal: "$5 off" } } }])
```

## Thực hành

Chọn đáp án cho câu dự đoán, bấm xem thật, rồi viết lại lệnh cho đúng.

# EN

## Key idea

In an aggregation expression (pipeline updates included), a string starting with `$` is a field path, and `$$` is a variable. So `"$sale"` is not the text "$sale" but "the value of field `sale`".

The trap shows up with promo codes, currencies or labels such as `"$5 off"`. The fix is `{ $literal: "$5 off" }`.

An operator-style update (`{ $set: { ... } }` not wrapped in an array) has no such trap: there the value is data, not an expression.

You can now: read a pipeline update and tell which parts are data and which are expressions.

## Example

```js
db.products.updateOne({ _id: "p2" }, [{ $set: { promo: { $literal: "$5 off" } } }])
```

## Practice

Pick an answer to the prediction, reveal the real result, then rewrite the command correctly.
