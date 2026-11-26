---
id: e-mg-l1-06
engine: mongodb
level: L1
module: crud
title: Sửa mảng với $push, $addToSet, $pull
title_en: Updating arrays with $push, $addToSet, $pull
kind: lab
runtime: browser
minutes: 10
figures: [{ name: mg-array-update-ops, at: idea }]
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
quiz:
  - q:
      vi: 'Khách `"c4"` có `tags: ["vip"]`. Sau `db.customers.updateOne({ _id: "c4" }, { $push: { tags: ["early", "reviewer"] } })`, `tags` là gì?'
      en: 'Customer `"c4"` has `tags: ["vip"]`. After `db.customers.updateOne({ _id: "c4" }, { $push: { tags: ["early", "reviewer"] } })`, what is `tags`?'
    options:
      - vi: '`["vip", "early", "reviewer"]`'
        en: '`["vip", "early", "reviewer"]`'
      - vi: '`["vip", ["early", "reviewer"]]`'
        en: '`["vip", ["early", "reviewer"]]`'
      - vi: '`["early", "reviewer"]`'
        en: '`["early", "reviewer"]`'
    answer: 1
    trap: 0
    why:
      vi: 'Nghe hợp lý vì bạn đưa vào hai nhãn, nhưng `$push` thêm đúng một phần tử, và ở đây phần tử đó là cả mảng. Muốn thêm từng phần tử thì viết `{ $push: { tags: { $each: ["early", "reviewer"] } } }`.'
      en: 'It sounds right because you passed two tags, but `$push` appends exactly one element, and here that element is the whole array. To add each element, write `{ $push: { tags: { $each: ["early", "reviewer"] } } }`.'
  - q:
      vi: 'Hai nhân viên cùng lúc chạy `$push` một nhãn khác nhau vào `tags` của cùng một khách. Kết quả là gì?'
      en: 'Two staff members run `$push` with different tags into the `tags` of the same customer at the same time. What is the result?'
    options:
      - vi: Cả hai nhãn đều có, vì mỗi update trên một tài liệu là nguyên tử
        en: Both tags are there, because each update on one document is atomic
      - vi: Một nhãn có thể mất, như khi hai người cùng ghi đè
        en: One tag may be lost, as when two people overwrite each other
      - vi: Lệnh thứ hai bị từ chối
        en: The second command is refused
    answer: 0
    trap: 1
    why:
      vi: 'Nghe hợp lý vì ghi đồng thời hay làm mất dữ liệu, nhưng điều đó xảy ra khi ứng dụng đọc mảng ra, sửa rồi ghi đè cả mảng. `$push` sửa mảng ngay trong máy chủ, mỗi lệnh nguyên tử, nên không lệnh nào xóa phần tử của lệnh kia.'
      en: 'It sounds right because concurrent writes often lose data, but that happens when the application reads the array, changes it and writes the whole array back. `$push` changes the array inside the server, each command is atomic, so neither removes the other''s element.'
---
## Mở bài

Khách vừa đăng ký nhận tin, cần thêm nhãn `"newsletter"`. Đọc cả mảng nhãn ra, sửa trong ứng dụng rồi ghi lại thì có thể đè mất nhãn người khác vừa thêm. Có cách sửa mảng ngay trong MongoDB không?

## Ý chính

Mảng là một phần của tài liệu, nên sửa mảng cũng là update trên tài liệu đó:

- `$push` thêm phần tử vào cuối mảng (mảng chưa có thì được tạo);
- `$push` với `$each` thêm nhiều phần tử, đúng thứ tự;
- `$addToSet` chỉ thêm khi giá trị chưa có, dùng cho mảng kiểu "tập hợp" như nhãn;
- `$pull` xóa mọi phần tử bằng một giá trị, hoặc khớp một điều kiện như `{ $pull: { scores: { $lt: 50 } } }`.

Không ghi hai toán tử lên cùng một trường trong một lệnh (ví dụ `$push` và `$pull` cùng `tags`): MongoDB báo xung đột.

Vì một update trên một tài liệu là nguyên tử (atomic), hai người cùng `$push` vào một mảng không làm mất phần tử của nhau. Đọc mảng ra, sửa trong ứng dụng rồi ghi đè lại thì có thể mất.

Làm được: thêm, thêm không trùng và bỏ phần tử trong mảng mà không ghi đè cả mảng.

Hình từng bước ở cuối mục này áp `$push`, `$addToSet` rồi `$pull` cùng giá trị `"vip"` lên mảng `tags` của khách `c1`.

## Cú pháp

```text
{ $push: { <array>: <value> } }
{ $push: { <array>: { $each: [ <value>, <value> ] } } }
{ $addToSet: { <array>: <value> } }
{ $pull: { <array>: <value or condition> } }
```

- Đây là tài liệu update, đối số thứ hai của `updateOne` / `updateMany`.
- `$each` cũng dùng được với `$addToSet`.
- Mỗi mảng chỉ chịu một toán tử trong một lệnh.

## Ví dụ

`"c1"` đã có `"vip"`, nên `$addToSet` không đổi gì:

```js
db.customers.updateOne({ _id: "c1" }, { $addToSet: { tags: "vip" } })
```

Thêm nhãn cho khách chưa có trường `tags`; mảng được tạo:

```js
db.customers.updateOne({ _id: "c5" }, { $push: { tags: "new" } })
```

Bỏ nhãn `"vip"` khỏi mọi khách:

```js
db.customers.updateMany({}, { $pull: { tags: "vip" } })
```

## Lỗi hay gặp

Đưa một mảng cho `$push`, tưởng sẽ thêm từng phần tử:

```js
// WRONG: one nested array is appended
db.customers.updateOne({ _id: "c4" }, { $push: { tags: ["early", "reviewer"] } })
```

```js
// FIX: $each appends each element
db.customers.updateOne({ _id: "c4" }, { $push: { tags: { $each: ["early", "reviewer"] } } })
```

`$push` và `$pull` trên cùng một mảng trong một lệnh:

```js
// ERROR mingo
db.customers.updateOne({ _id: "c1" }, { $push: { tags: "early" }, $pull: { tags: "vip" } })
```

Tách thành hai lệnh. Dùng `$push` cho mảng kiểu tập hợp cũng dễ sinh nhãn trùng; khi đó chọn `$addToSet`.

## Thực hành

Bốn bước trên `customers`. Khách `"c5"` không có trường `tags`.

## Tóm tắt

- `$push` thêm một phần tử; `$each` để thêm nhiều phần tử.
- `$addToSet` chỉ thêm giá trị chưa có.
- `$pull` bỏ mọi phần tử bằng giá trị hoặc khớp điều kiện.
- Một mảng chỉ chịu một toán tử mỗi lệnh.
- Sửa mảng trong máy chủ là nguyên tử; đọc ra rồi ghi đè thì không.

# EN

## Opening

A customer just signed up for the newsletter and needs the tag `"newsletter"`. Reading the whole tag array, changing it in the application and writing it back can wipe a tag someone else just added. Can you change the array inside MongoDB instead?

## Key idea

An array is part of its document, so changing an array is an update on that document:

- `$push` appends an element (creating the array if it is missing);
- `$push` with `$each` appends several elements, in order;
- `$addToSet` adds only when the value is not there yet, for set-like arrays such as tags;
- `$pull` removes every element equal to a value, or matching a condition such as `{ $pull: { scores: { $lt: 50 } } }`.

Do not apply two operators to the same field in one command (for example `$push` and `$pull` on `tags`): MongoDB reports a conflict.

Because an update on one document is atomic, two clients that `$push` to the same array never lose each other's elements. Reading the array, changing it in the application and writing it back can lose them.

You can now: add, add without duplicates and remove array elements without overwriting the whole array.

The step-through figure at the end of this section applies `$push`, `$addToSet` and then `$pull` with the same value `"vip"` to the `tags` array of customer `c1`.

## Syntax

```text
{ $push: { <array>: <value> } }
{ $push: { <array>: { $each: [ <value>, <value> ] } } }
{ $addToSet: { <array>: <value> } }
{ $pull: { <array>: <value or condition> } }
```

- These are update documents, the second argument of `updateOne` / `updateMany`.
- `$each` works with `$addToSet` too.
- Each array takes only one operator per command.

## Example

`"c1"` already has `"vip"`, so `$addToSet` changes nothing:

```js
db.customers.updateOne({ _id: "c1" }, { $addToSet: { tags: "vip" } })
```

Add a tag to a customer with no `tags` field; the array is created:

```js
db.customers.updateOne({ _id: "c5" }, { $push: { tags: "new" } })
```

Remove the tag `"vip"` from every customer:

```js
db.customers.updateMany({}, { $pull: { tags: "vip" } })
```

## Common mistakes

Passing an array to `$push` and expecting each element to be added:

```js
// WRONG: one nested array is appended
db.customers.updateOne({ _id: "c4" }, { $push: { tags: ["early", "reviewer"] } })
```

```js
// FIX: $each appends each element
db.customers.updateOne({ _id: "c4" }, { $push: { tags: { $each: ["early", "reviewer"] } } })
```

`$push` and `$pull` on the same array in one command:

```js
// ERROR mingo
db.customers.updateOne({ _id: "c1" }, { $push: { tags: "early" }, $pull: { tags: "vip" } })
```

Split it into two commands. Using `$push` on a set-like array also breeds duplicate tags; pick `$addToSet` there.

## Practice

Four steps on `customers`. Customer `"c5"` has no `tags` field.

## Recap

- `$push` appends one element; `$each` appends several.
- `$addToSet` adds only a value that is not there yet.
- `$pull` removes every element equal to a value or matching a condition.
- An array takes only one operator per command.
- Changing an array inside the server is atomic; read-then-overwrite is not.
