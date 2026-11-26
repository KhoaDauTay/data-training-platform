---
id: e-mg-l4-06
engine: mongodb
level: L4
module: patterns
title: "Lab: dữ liệu đa hình trong một collection"
title_en: "Lab: polymorphic data in one collection"
kind: lab
minutes: 14
runtime: browser
viz: mg-pipeline
objectives:
  - vi: "Đọc nhiều dạng tài liệu trong một collection bằng `$switch` theo trường loại"
    en: "Read several document shapes in one collection with `$switch` on a type field"
  - vi: "Chạy một truy vấn chung trên phần mọi loại cùng có"
    en: "Run one common query over the part every kind shares"
  - vi: "Thêm một loại mới mà không phải đổi tài liệu cũ"
    en: "Add a new kind without touching the old documents"
requires: [e-mg-l4-01]
sources:
  - https://www.mongodb.com/docs/manual/data-modeling/design-patterns/polymorphic-data/
  - https://www.mongodb.com/docs/manual/reference/operator/aggregation/switch/
lab:
  setup: |
    {"collections": {"policies": [
      {"_id": 1, "kind": "car", "plate": "43A-12345", "insured": 300},
      {"_id": 2, "kind": "home", "address": "12 Bach Dang", "insured": 1500},
      {"_id": 3, "kind": "travel", "destination": "Tokyo", "days": 6, "insured": 80},
      {"_id": 4, "kind": "car", "plate": "43B-67890", "insured": 260},
      {"_id": 5, "kind": "home", "address": "8 Tran Phu", "insured": 2100}
    ]}}
  steps:
    - task:
        vi: "Collection `policies` chứa ba loại hợp đồng, phân biệt bằng `kind`. Trả một dòng tổng hợp cho mỗi `kind`: `_id` là `kind`, `count`, `totalInsured` (tổng `insured`), `labels` là mảng nhãn theo `_id` hợp đồng tăng dần. Nhãn: `plate` với `car`, `address` với `home`, `destination` với `travel`. Xếp theo `_id` tăng dần."
        en: "The `policies` collection holds three kinds of policy, told apart by `kind`. Return one summary per `kind`: `_id` is the `kind`, `count`, `totalInsured` (sum of `insured`), `labels` the array of labels by policy `_id` ascending. Label: `plate` for `car`, `address` for `home`, `destination` for `travel`. Order by `_id` ascending."
      solution: |
        db.policies.aggregate([
          { $sort: { _id: 1 } },
          { $group: {
              _id: "$kind",
              count: { $sum: 1 },
              totalInsured: { $sum: "$insured" },
              labels: { $push: { $switch: { branches: [
                { case: { $eq: [ "$kind", "car" ] }, then: "$plate" },
                { case: { $eq: [ "$kind", "home" ] }, then: "$address" },
                { case: { $eq: [ "$kind", "travel" ] }, then: "$destination" }
              ] } } }
          } },
          { $sort: { _id: 1 } }
        ])
      check: doc
      ordered: true
      hint:
        vi: "`$sort` theo `_id` trước `$group` để `labels` đúng thứ tự. Trong `$push`, dùng `$switch` với ba `case` theo `kind`."
        en: "`$sort` by `_id` before `$group` so `labels` comes out in order. Inside `$push`, use `$switch` with three `case` branches on `kind`."
    - task:
        vi: "Phòng tài chính chỉ cần một con số: tổng `insured` của mọi hợp đồng, mọi loại. Trả một tài liệu `{ _id: null, total }`."
        en: "Finance needs one figure: the total `insured` of every policy, every kind. Return one document `{ _id: null, total }`."
      solution: 'db.policies.aggregate([ { $group: { _id: null, total: { $sum: "$insured" } } } ])'
      check: doc
      hint:
        vi: "`insured` là phần chung của mọi loại, nên không cần `$switch`; `_id: null` gom tất cả vào một nhóm."
        en: "`insured` is the part every kind shares, so no `$switch` is needed; `_id: null` puts everything in one group."
    - task:
        vi: "Công ty mở thêm bảo hiểm thú cưng. Thêm hợp đồng `_id: 6`, `kind: \"pet\"`, `petName: \"Lu\"`, `insured: 50` mà không đổi tài liệu nào khác."
        en: "The company starts selling pet insurance. Add policy `_id: 6`, `kind: \"pet\"`, `petName: \"Lu\"`, `insured: 50` without changing any other document."
      solution: 'db.policies.insertOne({ _id: 6, kind: "pet", petName: "Lu", insured: 50 })'
      check: doc
      hint:
        vi: "Một `insertOne`: collection không bắt mọi tài liệu cùng trường, nên loại mới chỉ cần phần chung và phần riêng của nó."
        en: "One `insertOne`: the collection does not force every document to share fields, so the new kind needs only the common part and its own part."
quiz:
  - q:
      vi: "Ba loại hợp đồng có trường riêng khác nhau. Vì sao để chúng chung một collection?"
      en: "Three kinds of policy have different specific fields. Why keep them in one collection?"
    options:
      - { vi: "Vì MongoDB bắt mọi tài liệu trong collection có cùng trường", en: "Because MongoDB forces every document in a collection to have the same fields" }
      - { vi: "Truy vấn chung trên phần giống nhau (`insured`) chỉ cần một lần đọc, và `kind` cho biết đọc phần riêng nào", en: "A common query over the shared part (`insured`) needs one read, and `kind` tells which specific part to read" }
      - { vi: "Để mỗi loại có index riêng", en: "So each kind gets its own index" }
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý nếu quen bảng SQL, nhưng collection MongoDB không bắt tài liệu cùng trường (trừ khi bạn thêm validator): trong lab, hợp đồng xe có `plate`, hợp đồng nhà có `address`, cùng một collection. Index riêng cho từng loại cũng không phải lý do, vì index đặt trên trường chứ không theo loại, và tách collection mới cho mỗi loại một index riêng. Lý do của mẫu là truy vấn chung: tổng `insured` của mọi loại chỉ đọc một collection, còn `kind` cho biết đọc phần riêng nào."
      en: "It sounds right if you are used to SQL tables, but a MongoDB collection does not force documents to share fields (unless you add a validator): in the lab, car policies have `plate` and home policies `address`, in the same collection. A per-kind index is not the reason either: an index is set on fields, not per kind, and it is separate collections that would give each kind its own index. The pattern's reason is the common query: the `insured` total of every kind reads one collection, and `kind` says which specific part to read."
  - q:
      vi: "Trên `mongod`, `$switch` không có `default` gặp một `kind` mới (`pet`) chưa có nhánh. Chuyện gì xảy ra?"
      en: "On `mongod`, a `$switch` with no `default` meets a new `kind` (`pet`) that has no branch. What happens?"
    options:
      - { vi: "Nhãn của hợp đồng đó là `null`", en: "That policy's label is `null`" }
      - { vi: "Aggregation báo lỗi vì không nhánh nào khớp và không có `default`", en: "The aggregation fails because no branch matches and there is no `default`" }
      - { vi: "Hợp đồng đó bị bỏ qua", en: "That policy is skipped" }
    answer: 1
    why:
      vi: "Docs của `$switch` nói rõ: không nhánh nào khớp mà thiếu `default` thì báo lỗi, và cả aggregation dừng, không trả tài liệu nào. `$switch` chỉ tính một giá trị, không bỏ được tài liệu nào, nên hợp đồng `pet` không bị bỏ qua; nhãn `null` chỉ có khi đặt `default: null`. Mingo trong trình duyệt để nhãn trống thay vì báo lỗi, nên đây là chỗ hai bên khác nhau. Khi thêm loại mới, hoặc thêm nhánh cho nó, hoặc đặt `default`."
      en: "The `$switch` docs are clear: if no branch matches and there is no `default`, it raises an error and the whole aggregation stops, returning no document. `$switch` only computes a value and cannot drop a document, so the `pet` policy is never skipped; a `null` label only comes from setting `default: null`. Mingo in the browser leaves the label empty instead of failing, so this is where the two differ. When you add a kind, add a branch for it or set a `default`."
---
## Mở bài

Công ty bảo hiểm bán ba loại hợp đồng: xe, nhà và du lịch. Phần lớn câu hỏi của phòng tài chính là "tổng tiền bảo hiểm", nhưng mỗi loại lại có thông tin riêng. Một bảng cho mỗi loại, hay một chỗ cho tất cả?

## Ý chính

Mẫu Polymorphic Data: các tài liệu giống nhau ở phần chung (`insured`) nhưng khác nhau ở phần riêng của từng loại (`plate`, `address`, `destination`). Đặt chúng trong một collection giúp truy vấn chung chỉ cần một lần đọc; một trường loại như `kind` cho biết phải đọc phần riêng nào. Thêm loại mới không cần đổi tài liệu cũ hay "thêm cột".

Đọc phần riêng thường dùng `$switch` theo `kind`. Trên `mongod`, `$switch` mà không nhánh nào khớp và thiếu `default` thì báo lỗi, nên khi thêm loại mới phải thêm nhánh hoặc đặt `default`.

Nhiều người nghĩ collection MongoDB bắt mọi tài liệu có cùng trường như bảng SQL. Thật ra không có ràng buộc đó trừ khi bạn thêm validator. Cái giá là mã đọc phải xử lý mọi dạng, và một phép tính trên trường không có ở mọi loại có thể ra số sai mà không báo lỗi.

Lab chạy bằng mingo trong trình duyệt; mỗi lần chạy bắt đầu lại từ dữ liệu gốc.

## Cú pháp

```text
{ $switch: {
    branches: [ { case: <condition>, then: <value> }, ... ],
    default: <value>                 // needed when no branch may match
} }
db.<coll>.find({ <specific field>: { $exists: true } })
db.<coll>.aggregate([ { $group: { _id: "$kind", ... } } ])
```

- `branches`: thử lần lượt, nhánh đầu tiên khớp thắng.
- `default`: giá trị khi không nhánh nào khớp; thiếu nó thì `mongod` báo lỗi.
- `$exists` trên trường riêng tìm một loại mà không cần `kind`.

## Ví dụ

Nhãn riêng của từng hợp đồng, có `default` cho loại chưa biết:

```javascript
db.policies.aggregate([{ $project: { label: { $switch: { branches: [{ case: { $eq: ["$kind", "car"] }, then: "$plate" }], default: "?" } } } }])
```

Hai hợp đồng xe ra biển số, ba hợp đồng còn lại ra `"?"`.

Tìm theo phần riêng của một loại:

```javascript
db.policies.find({ kind: "travel", days: { $gte: 5 } })
```

Chỉ hợp đồng Tokyo 6 ngày; trường `days` chỉ có ở loại du lịch.

Truy vấn chung trên phần mọi loại cùng có:

```javascript
db.policies.aggregate([{ $group: { _id: null, total: { $sum: "$insured" } } }])
```

Tổng 4240, một lần đọc cho cả ba loại.

## Lỗi hay gặp

Cộng nhầm một trường riêng không phải số:

```javascript
// WRONG: plate is a string, $sum skips it and gives 0
db.policies.aggregate([{ $group: { _id: null, total: { $sum: "$plate" } } }])
```

```javascript
// FIX: sum the shared numeric field
db.policies.aggregate([{ $group: { _id: null, total: { $sum: "$insured" } } }])
```

`$sum` bỏ qua giá trị không phải số, nên câu sai ra 0 thay vì báo lỗi.

Thêm loại mới mà quên nhánh trong `$switch`:

```text
// WRONG: a "pet" policy exists, no branch and no default
{ $switch: { branches: [ { case: { $eq: [ "$kind", "car" ] }, then: "$plate" }, ... ] } }
mongod: $switch could not find a matching branch for an input, and no default was specified.
```

```text
// FIX: a branch for the new kind, or a default
{ $switch: { branches: [ ..., { case: { $eq: [ "$kind", "pet" ] }, then: "$petName" } ], default: null } }
```

Mingo trong trình duyệt không báo lỗi này (nó bỏ trống nhãn), nên phần này lấy từ docs của `$switch`.

## Thực hành

Ba bước: tổng hợp theo `kind` với nhãn riêng, tính tổng tiền chung, rồi thêm một loại hợp đồng mới.

## Tóm tắt

- Polymorphic Data: nhiều dạng tài liệu trong một collection, chung một phần, khác phần riêng.
- Trường `kind` cho biết đọc phần riêng nào; `$switch` đọc theo `kind`.
- Trên `mongod`, `$switch` không khớp và thiếu `default` thì báo lỗi.
- Phép tính trên trường không có ở mọi loại có thể sai lặng lẽ; tính trên phần chung.

# EN

## Opening

An insurer sells three kinds of policy: car, home and travel. Most of the finance team's questions are about "total insured", yet each kind has its own details. One table per kind, or one place for all of them?

## Key idea

The Polymorphic Data pattern: documents share a common part (`insured`) but differ in the part specific to each kind (`plate`, `address`, `destination`). Keeping them in one collection lets a common query run in a single read; a type field such as `kind` says which specific part to read. Adding a new kind needs no change to old documents and no "new column".

Reading the specific part usually uses a `$switch` on `kind`. On `mongod`, a `$switch` where no branch matches and there is no `default` raises an error, so a new kind needs a new branch or a `default`.

Many people think a MongoDB collection forces every document to have the same fields, like a SQL table. In fact there is no such rule unless you add a validator. The price is that the reading code must handle every shape, and math on a field that not every kind has can give a wrong number without any error.

The lab runs on mingo in the browser; every run starts again from the original data.

## Syntax

```text
{ $switch: {
    branches: [ { case: <condition>, then: <value> }, ... ],
    default: <value>                 // needed when no branch may match
} }
db.<coll>.find({ <specific field>: { $exists: true } })
db.<coll>.aggregate([ { $group: { _id: "$kind", ... } } ])
```

- `branches`: tried in order, the first matching branch wins.
- `default`: the value when no branch matches; without it `mongod` raises an error.
- `$exists` on a specific field finds one kind without using `kind`.

## Example

Each policy's own label, with a `default` for unknown kinds:

```javascript
db.policies.aggregate([{ $project: { label: { $switch: { branches: [{ case: { $eq: ["$kind", "car"] }, then: "$plate" }], default: "?" } } } }])
```

The two car policies give their plates, the other three give `"?"`.

Searching on the specific part of one kind:

```javascript
db.policies.find({ kind: "travel", days: { $gte: 5 } })
```

Only the 6-day Tokyo policy; the `days` field exists only on travel policies.

A common query over the part every kind shares:

```javascript
db.policies.aggregate([{ $group: { _id: null, total: { $sum: "$insured" } } }])
```

A total of 4240, one read for all three kinds.

## Common mistakes

Summing a specific field that is not a number:

```javascript
// WRONG: plate is a string, $sum skips it and gives 0
db.policies.aggregate([{ $group: { _id: null, total: { $sum: "$plate" } } }])
```

```javascript
// FIX: sum the shared numeric field
db.policies.aggregate([{ $group: { _id: null, total: { $sum: "$insured" } } }])
```

`$sum` skips non-numeric values, so the wrong query gives 0 instead of raising an error.

Adding a new kind and forgetting its `$switch` branch:

```text
// WRONG: a "pet" policy exists, no branch and no default
{ $switch: { branches: [ { case: { $eq: [ "$kind", "car" ] }, then: "$plate" }, ... ] } }
mongod: $switch could not find a matching branch for an input, and no default was specified.
```

```text
// FIX: a branch for the new kind, or a default
{ $switch: { branches: [ ..., { case: { $eq: [ "$kind", "pet" ] }, then: "$petName" } ], default: null } }
```

Mingo in the browser does not raise this error (it leaves the label empty), so this part comes from the `$switch` docs.

## Practice

Three steps: summarise by `kind` with each kind's own label, compute the shared total, then add a new kind of policy.

## Recap

- Polymorphic Data: several document shapes in one collection, a shared part and a specific part.
- A `kind` field says which specific part to read; `$switch` reads by `kind`.
- On `mongod`, a `$switch` with no match and no `default` raises an error.
- Math on a field not every kind has can be silently wrong; compute on the shared part.
