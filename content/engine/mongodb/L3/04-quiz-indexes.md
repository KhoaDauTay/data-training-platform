---
id: e-mg-l3-04
engine: mongodb
level: L3
module: indexes
title: "Kiểm tra: các loại index"
title_en: "Check: index kinds"
kind: quiz
minutes: 6
runtime: docs
objectives:
  - vi: "Chọn đúng loại và thuộc tính index cho một nhu cầu"
    en: "Pick the right index kind and property for a need"
  - vi: "Phân biệt partial, sparse và index kép khi cần ràng buộc duy nhất"
    en: "Tell partial, sparse and compound indexes apart when you need a unique constraint"
requires: [e-mg-l3-01, e-mg-l3-02, e-mg-l3-03]
sources:
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
  - https://www.mongodb.com/docs/manual/core/index-partial/
  - https://www.mongodb.com/docs/manual/core/index-ttl/
quiz:
  - q:
      vi: "Bạn muốn `email` là duy nhất, nhưng chỉ với tài liệu có trường `password`. Index nào?"
      en: "You want `email` to be unique, but only for documents that have a `password` field. Which index?"
    options:
      - vi: "`createIndex({ email: 1 }, { unique: true, sparse: true })`"
        en: "`createIndex({ email: 1 }, { unique: true, sparse: true })`"
      - vi: "`createIndex({ email: 1 }, { unique: true, partialFilterExpression: { password: { $exists: true } } })`"
        en: "`createIndex({ email: 1 }, { unique: true, partialFilterExpression: { password: { $exists: true } } })`"
      - vi: "`createIndex({ email: 1, password: 1 }, { unique: true })`"
        en: "`createIndex({ email: 1, password: 1 }, { unique: true })`"
    answer: 1
    trap: 0
    why:
      vi: "Nghe hợp lý vì sparse cũng bỏ qua một số tài liệu, nhưng sparse chỉ xét trường `email` có hay không, không xét `password`. Index partial unique áp ràng buộc chỉ lên tài liệu khớp bộ lọc. Index kép trên hai trường thì kiểm duy nhất trên cặp, không phải trên `email`."
      en: "It sounds right because sparse also skips some documents, but sparse looks only at whether `email` exists, not `password`. A unique partial index applies the constraint only to documents that match the filter. A compound index on both fields checks uniqueness of the pair, not of `email`."
  - q:
      vi: "Collection có `tags` và `sizes` đều là mảng trong cùng tài liệu. Tạo `{ tags: 1, sizes: 1 }` thì sao?"
      en: "A collection has `tags` and `sizes`, both arrays in the same document. What happens when you create `{ tags: 1, sizes: 1 }`?"
    options:
      - vi: "Tạo được, index có tích Descartes các khóa"
        en: "It works, the index holds the cartesian product of the keys"
      - vi: "Không tạo được: index kép multikey chỉ cho tối đa một trường mảng mỗi tài liệu"
        en: "It fails: a compound multikey index allows at most one array field per document"
      - vi: "Tạo được nhưng chỉ index phần tử đầu của mỗi mảng"
        en: "It works but indexes only the first element of each array"
    answer: 1
    why:
      vi: "Docs chính thức: mỗi tài liệu được index có tối đa một trường mảng trong một index kép multikey. Không tạo được index nếu hai trường cùng là mảng, và khi index đã có thì không chèn được tài liệu như vậy."
      en: "The docs: each indexed document can have at most one array field in a compound multikey index. The index cannot be built when two fields are arrays, and once it exists such a document cannot be inserted."
  - q:
      vi: "Bạn muốn xóa phiên đăng nhập sau 1 giờ không hoạt động. Câu nào đúng?"
      en: "You want to drop login sessions after 1 hour of inactivity. Which is right?"
    options:
      - vi: "`createIndex({ lastSeen: 1 }, { expireAfterSeconds: 3600 })` trên một trường ngày"
        en: "`createIndex({ lastSeen: 1 }, { expireAfterSeconds: 3600 })` on a date field"
      - vi: "`createIndex({ userId: 1, lastSeen: 1 }, { expireAfterSeconds: 3600 })`"
        en: "`createIndex({ userId: 1, lastSeen: 1 }, { expireAfterSeconds: 3600 })`"
      - vi: "`createIndex({ _id: 1 }, { expireAfterSeconds: 3600 })`"
        en: "`createIndex({ _id: 1 }, { expireAfterSeconds: 3600 })`"
    answer: 0
    why:
      vi: "Index TTL là index một trường kiểu ngày. Index kép không hỗ trợ TTL, và TTL không đặt trên `_id`."
      en: "A TTL index is a single-field index on a date. Compound indexes do not support TTL, and TTL cannot be on `_id`."
---
## Mở bài

Ba nhu cầu thật của một cửa hàng: email duy nhất nhưng chỉ cho tài khoản có mật khẩu, sản phẩm có hai mảng, phiên đăng nhập tự hết hạn. Mỗi câu dưới đây có một lựa chọn nghe đúng nhưng sai.

## Ý chính

Nhớ ba luật từ các bài trước: index partial chỉ chứa tài liệu khớp bộ lọc, và `unique` trên nó chỉ áp lên các tài liệu đó; index kép multikey cho tối đa một trường mảng mỗi tài liệu; TTL là index một trường kiểu ngày, không trên `_id`.

Nhiều người nghĩ sparse và partial là một. Thật ra sparse chỉ xét chính trường được index có hay không, còn partial nhận một điều kiện bất kỳ, kể cả trên trường khác. Docs chính thức khuyên dùng partial.

## Ví dụ

Index partial unique theo một trường khác, chạy bằng mingo trên bộ `shop` (mingo chỉ trả danh sách index, không kiểm trùng):

```javascript
db.customers.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { tier: "gold" } })
```

Trên `mongod`, chỉ khách `gold` bị kiểm trùng email.

```text
db.sessions.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 3600 })   // TTL: one date field
```

## Tóm tắt

- `unique` + `partialFilterExpression`: duy nhất chỉ trong phần tài liệu khớp.
- Sparse chỉ xét trường được index; partial nhận điều kiện bất kỳ.
- Index kép multikey: tối đa một trường mảng mỗi tài liệu.
- TTL: một trường ngày, không index kép, không `_id`.

# EN

## Opening

Three real needs of a shop: a unique email but only for accounts with a password, products with two arrays, login sessions that expire on their own. Each question below has one option that sounds right but is wrong.

## Key idea

Remember three rules from the earlier lessons: a partial index holds only documents matching its filter, and `unique` on it applies only to those documents; a compound multikey index allows at most one array field per document; TTL is a single-field date index, never on `_id`.

Many people think sparse and partial are the same. In fact sparse only looks at whether the indexed field itself exists, while partial takes any condition, even on another field. The docs recommend partial.

## Example

A unique partial index keyed on another field, run on mingo over the `shop` dataset (mingo only returns the index list, it does not check duplicates):

```javascript
db.customers.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { tier: "gold" } })
```

On `mongod`, only `gold` customers are checked for duplicate emails.

```text
db.sessions.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 3600 })   // TTL: one date field
```

## Recap

- `unique` + `partialFilterExpression`: unique only among the matching documents.
- Sparse looks only at the indexed field; partial takes any condition.
- Compound multikey index: at most one array field per document.
- TTL: one date field, no compound index, not `_id`.
