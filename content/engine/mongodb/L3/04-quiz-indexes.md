---
id: e-mg-l3-04
engine: mongodb
level: L3
module: indexes
title: "Kiểm tra: các loại index"
title_en: "Check: index kinds"
kind: quiz
minutes: 5
runtime: docs
objectives:
  - vi: "Chọn đúng loại và thuộc tính index cho một nhu cầu"
    en: "Pick the right index kind and property for a need"
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
    why:
      vi: "Với index partial có thêm ràng buộc duy nhất, ràng buộc chỉ áp lên tài liệu khớp bộ lọc. Sparse chỉ xét trường `email` có hay không, không xét `password`. Index kép trên hai trường thì kiểm duy nhất trên cặp, không phải trên `email`."
      en: "With a unique partial index, the constraint applies only to documents that match the filter. Sparse looks only at whether `email` exists, not `password`. A compound index on both fields checks uniqueness of the pair, not of `email`."
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
      vi: "Tài liệu: mỗi tài liệu được index có tối đa một trường mảng trong một index kép multikey. Không tạo được index nếu hai trường cùng là mảng."
      en: "The docs: each indexed document can have at most one array field in a compound multikey index. The index cannot be built when two fields are arrays."
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
      vi: "Index TTL là index một trường kiểu ngày. Nó không là index kép và không đặt trên `_id`."
      en: "A TTL index is a single-field index on a date. It is not compound and cannot be on `_id`."
---

## Ý chính

Ba câu hỏi về multikey, partial, unique và TTL. Đáp án dựa trên tài liệu MongoDB hiện hành, kiểm ngày 2026-11-20.

# EN

## Key idea

Three questions on multikey, partial, unique and TTL indexes. Answers follow the current MongoDB manual, checked 2026-11-20.
