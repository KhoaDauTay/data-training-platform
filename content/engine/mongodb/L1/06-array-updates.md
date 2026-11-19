---
id: e-mg-l1-06
engine: mongodb
level: L1
module: crud
title: Sửa mảng với $push, $addToSet, $pull
title_en: Updating arrays with $push, $addToSet, $pull
kind: lab
minutes: 10
objectives:
  - vi: Thêm phần tử vào mảng bằng `$push` (kể cả nhiều phần tử với `$each`) và `$addToSet`.
    en: Add elements to an array with `$push` (several at once with `$each`) and `$addToSet`.
  - vi: Bỏ phần tử khỏi mảng bằng `$pull`.
    en: Remove elements from an array with `$pull`.
requires: [e-mg-l1-05]
sources:
  - https://www.mongodb.com/docs/manual/reference/operator/update/push/
  - https://www.mongodb.com/docs/manual/reference/operator/update/addtoset/
  - https://www.mongodb.com/docs/manual/reference/operator/update/pull/
lab:
  setup: |
    {"collections": {"customers": [
      {"_id": "c1", "name": "An", "tier": "gold", "tags": ["vip", "newsletter"]},
      {"_id": "c2", "name": "Binh", "tier": "silver", "tags": ["newsletter"]},
      {"_id": "c3", "name": "Chi", "tier": "silver", "tags": []},
      {"_id": "c4", "name": "Dung", "tier": "gold", "tags": ["vip"]},
      {"_id": "c5", "name": "Em", "tier": "bronze"}
    ]}}
  steps:
    - task:
        vi: Thêm nhãn `"birthday"` vào cuối mảng `tags` của khách `"c3"`.
        en: Append the tag `"birthday"` to the `tags` array of customer `"c3"`.
      solution: 'db.customers.updateOne({ _id: "c3" }, { $push: { tags: "birthday" } })'
      check: doc
      hint:
        vi: "`$push` thêm một phần tử vào cuối mảng."
        en: "`$push` appends one element to the end of the array."
    - task:
        vi: Mọi khách hạng `"gold"` phải có nhãn `"newsletter"`, nhưng không được lặp nhãn ở khách đã có.
        en: Every `"gold"` customer must have the tag `"newsletter"`, without repeating it for a customer who already has it.
      solution: 'db.customers.updateMany({ tier: "gold" }, { $addToSet: { tags: "newsletter" } })'
      check: doc
      hint:
        vi: "`$addToSet` chỉ thêm khi giá trị chưa có trong mảng."
        en: "`$addToSet` only adds the value when the array does not hold it yet."
    - task:
        vi: Bỏ nhãn `"newsletter"` khỏi mọi khách.
        en: Remove the tag `"newsletter"` from every customer.
      solution: 'db.customers.updateMany({}, { $pull: { tags: "newsletter" } })'
      check: doc
      hint:
        vi: "`$pull` xóa mọi phần tử bằng giá trị đã cho. Khách không có `tags` thì không bị ảnh hưởng."
        en: "`$pull` removes every element equal to the given value. A customer without `tags` is left alone."
    - task:
        vi: Thêm cùng lúc hai nhãn `"early"` và `"reviewer"` (theo thứ tự đó) vào `tags` của khách `"c4"`.
        en: Append the two tags `"early"` and `"reviewer"` (in that order) to the `tags` of customer `"c4"`.
      solution: 'db.customers.updateOne({ _id: "c4" }, { $push: { tags: { $each: ["early", "reviewer"] } } })'
      check: doc
      hint:
        vi: "`$push: { tags: [\"early\", \"reviewer\"] }` sẽ thêm một mảng con. Dùng `$each` để thêm từng phần tử."
        en: "`$push: { tags: [\"early\", \"reviewer\"] }` would add a nested array. Use `$each` to add each element."
---
## Ý chính

Mảng là một phần của tài liệu, nên sửa mảng cũng là update trên tài liệu đó:

- `$push` thêm phần tử vào cuối mảng (mảng chưa có thì được tạo);
- `$push` với `$each` thêm nhiều phần tử, đúng thứ tự;
- `$addToSet` chỉ thêm khi giá trị chưa có, dùng cho mảng kiểu "tập hợp" như nhãn;
- `$pull` xóa mọi phần tử bằng một giá trị, hoặc khớp một điều kiện như `{ $pull: { scores: { $lt: 50 } } }`.

Không ghi hai toán tử lên cùng một trường trong một lệnh (ví dụ `$push` và `$pull` cùng `tags`): MongoDB báo xung đột.

Vì một update trên một tài liệu là atomic, hai người cùng `$push` vào một mảng không làm mất phần tử của nhau. Đọc mảng ra, sửa trong ứng dụng rồi ghi đè lại thì có thể mất.

Làm được: thêm, thêm không trùng và bỏ phần tử trong mảng mà không ghi đè cả mảng.

## Ví dụ

```js
db.customers.updateOne({ _id: "c1" }, { $addToSet: { tags: "vip" } })
```

`"c1"` đã có `"vip"` nên tài liệu không đổi (`modifiedCount: 0`).

## Thực hành

Bốn bước trên `customers`. Khách `"c5"` không có trường `tags`.

# EN

## Key idea

An array is part of its document, so changing an array is an update on that document:

- `$push` appends an element (creating the array if it is missing);
- `$push` with `$each` appends several elements, in order;
- `$addToSet` adds only when the value is not there yet, for set-like arrays such as tags;
- `$pull` removes every element equal to a value, or matching a condition such as `{ $pull: { scores: { $lt: 50 } } }`.

Do not apply two operators to the same field in one command (for example `$push` and `$pull` on `tags`): MongoDB reports a conflict.

Because an update on one document is atomic, two clients that `$push` to the same array never lose each other's elements. Reading the array, changing it in the application and writing it back can lose them.

You can now: add, add without duplicates and remove array elements without overwriting the whole array.

## Example

```js
db.customers.updateOne({ _id: "c1" }, { $addToSet: { tags: "vip" } })
```

`"c1"` already has `"vip"`, so the document does not change (`modifiedCount: 0`).

## Practice

Four steps on `customers`. Customer `"c5"` has no `tags` field.
