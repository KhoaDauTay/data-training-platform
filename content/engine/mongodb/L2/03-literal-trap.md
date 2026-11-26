---
id: e-mg-l2-03
engine: mongodb
level: L2
module: update-pipeline
title: Bẫy chuỗi bắt đầu bằng $ và $literal
title_en: The dollar-string trap and $literal
kind: predict
runtime: browser
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
  trap: 0
  why:
    vi: 'Chuỗi trông như dữ liệu thường, nhưng lệnh có dấu `[ ]` nên là update dạng pipeline, nơi `"$sale"` nghĩa là giá trị của trường `sale`. Sản phẩm `"p1"` không có trường `sale`, nên biểu thức cho ra "thiếu" (missing), và `$set` gặp giá trị thiếu thì không tạo trường. Không có lỗi cú pháp: đọc một trường không tồn tại là hợp lệ, nên lệnh chạy êm và lỗi khó thấy. Ở update kiểu toán tử `{ $set: { label: "$sale" } }` thì chuỗi được ghi nguyên văn.'
    en: 'The string looks like plain data, but the command is wrapped in `[ ]`, so it is a pipeline update, where `"$sale"` means the value of field `sale`. Product `"p1"` has no `sale` field, so the expression yields "missing", and `$set` creates no field for a missing value. There is no syntax error: reading a field that does not exist is valid, so the command runs quietly and the mistake is easy to miss. In an operator-style update `{ $set: { label: "$sale" } }` the string is stored as written.'
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
quiz:
  - q:
      vi: 'Không có dấu `[ ]`: `db.products.updateOne({ _id: "p2" }, { $set: { promo: "$5 off" } })`. Sau lệnh, `promo` của `"p2"` là gì?'
      en: 'No `[ ]` this time: `db.products.updateOne({ _id: "p2" }, { $set: { promo: "$5 off" } })`. After the command, what is `promo` on `"p2"`?'
    options:
      - vi: 'Chuỗi `"$5 off"`'
        en: 'The string `"$5 off"`'
      - vi: Không có trường `promo`, vì chuỗi bắt đầu bằng `$` luôn là đường dẫn trường
        en: No `promo` field, because a string starting with `$` is always a field path
      - vi: Lệnh báo lỗi vì giá trị bắt đầu bằng `$`
        en: The command fails because the value starts with `$`
    answer: 0
    trap: 1
    why:
      vi: 'Sau câu dự đoán, dễ nghĩ mọi chuỗi bắt đầu bằng `$` đều là đường dẫn trường, nhưng luật đó chỉ áp cho biểu thức aggregation. Lệnh này không có `[ ]`, nên là update kiểu toán tử: giá trị là dữ liệu, và `promo` của `"p2"` nhận đúng chuỗi `"$5 off"`. Cũng không có lỗi: MongoDB chỉ hạn chế `$` ở đầu tên trường, không hạn chế trong giá trị.'
      en: 'After the prediction it is easy to think every string starting with `$` is a field path, but that rule only applies to aggregation expressions. This command has no `[ ]`, so it is an operator-style update: the value is data, and `promo` on `"p2"` gets exactly the string `"$5 off"`. There is no error either: MongoDB restricts `$` at the start of field names, not inside values.'
---
## Mở bài

Bạn gắn nhãn khuyến mãi cho một sản phẩm bằng update dạng pipeline, và nhãn bắt đầu bằng ký hiệu `$`. Lệnh chạy không báo lỗi. Nhưng trong tài liệu thật sự có gì?

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

## Tóm tắt

- Trong pipeline, chuỗi bắt đầu bằng `$` là đường dẫn trường, `$$` là biến.
- Đường dẫn tới trường không có cho ra "thiếu", và `$set` không tạo trường.
- `$literal` giữ nguyên giá trị như viết.
- Update kiểu toán tử coi giá trị là dữ liệu, không có bẫy này.

# EN

## Opening

You tag a product with a promo label through a pipeline-style update, and the label starts with the `$` sign. The command runs without an error. But what is really in the document?

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

## Recap

- In a pipeline, a string starting with `$` is a field path, and `$$` is a variable.
- A path to a missing field yields "missing", and `$set` creates no field.
- `$literal` keeps the value exactly as written.
- An operator-style update treats values as data and has no such trap.
