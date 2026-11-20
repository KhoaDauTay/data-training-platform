---
id: e-mg-l3-01
engine: mongodb
level: L3
module: indexes
title: "Multikey, partial và TTL: index nào cho dữ liệu nào"
title_en: "Multikey, partial and TTL: which index for which data"
kind: concept
minutes: 12
runtime: docs
objectives:
  - vi: "Biết index multikey sinh một khóa cho mỗi giá trị khác nhau trong mảng"
    en: "Know that a multikey index stores one key per distinct array value"
  - vi: "Nêu giới hạn của index kép multikey"
    en: "State the limits of a compound multikey index"
  - vi: "Biết truy vấn chỉ dùng được index partial khi điều kiện của nó nằm trong bộ lọc của index"
    en: "Know that a query can use a partial index only when its condition falls inside the index filter"
  - vi: "Dùng index TTL để tự xóa tài liệu hết hạn và biết giới hạn của nó"
    en: "Use a TTL index to expire documents and know its limits"
requires: []
sources:
  - https://www.mongodb.com/docs/manual/core/indexes/index-types/index-multikey/
  - https://www.mongodb.com/docs/manual/core/index-partial/
  - https://www.mongodb.com/docs/manual/core/index-ttl/
quiz:
  - q:
      vi: "Một tài liệu có `genres: [\"Drama\", \"Action\", \"Drama\"]`. Index `{ genres: 1 }` giữ bao nhiêu khóa cho tài liệu này?"
      en: "A document has `genres: [\"Drama\", \"Action\", \"Drama\"]`. How many keys does the index `{ genres: 1 }` hold for it?"
    options:
      - { vi: "1", en: "1" }
      - { vi: "2", en: "2" }
      - { vi: "3", en: "3" }
    answer: 1
    why:
      vi: "Mỗi giá trị khác nhau trong mảng là một khóa; giá trị lặp lại chỉ có một khóa. Hai giá trị khác nhau nên có 2 khóa."
      en: "Each distinct array value is one key; a repeated value gets only one key. Two distinct values, so 2 keys."
  - q:
      vi: "Index TTL `{ lastSeen: 1 }` với `expireAfterSeconds: 3600`. Một tài liệu hết hạn lúc 10:00. Khi nào chắc chắn nó bị xóa?"
      en: "TTL index `{ lastSeen: 1 }` with `expireAfterSeconds: 3600`. A document expires at 10:00. When is it certainly removed?"
    options:
      - { vi: "Đúng 10:00:00", en: "Exactly at 10:00:00" }
      - { vi: "Khi tác vụ nền chạy lần kế tiếp sau 10:00, tác vụ này chạy mỗi 60 giây", en: "When the background task next runs after 10:00; it runs every 60 seconds" }
      - { vi: "Chỉ khi có truy vấn đọc tới tài liệu đó", en: "Only when a query reads that document" }
    answer: 1
    why:
      vi: "Việc xóa do một tác vụ nền làm, chạy mỗi 60 giây, nên tài liệu có thể còn thêm một lúc sau khi hết hạn."
      en: "Removal is done by a background task that runs every 60 seconds, so a document can stay a little after it expires."
---

## Ý chính

Bạn không khai báo "multikey". Tạo index (chỉ mục) trên một trường có giá trị là mảng thì MongoDB tự làm nó thành index multikey: mỗi giá trị khác nhau trong mảng là một khóa, và mọi khóa trỏ về cùng một tài liệu. Mảng không có trần thì index phình theo.

- Index kép multikey: mỗi tài liệu có tối đa một trường được index là mảng. Hai trường cùng là mảng thì không tạo được index, và khi đã có index thì không chèn được tài liệu như vậy.
- Index hashed không thể là multikey. Index multikey không làm shard key được.
- Index partial chỉ chứa tài liệu khớp `partialFilterExpression`. MongoDB không dùng nó nếu việc đó làm thiếu kết quả, nên điều kiện của truy vấn phải nằm trọn trong bộ lọc. Docs chính thức khuyên dùng partial thay cho sparse.
- Index TTL: một tác vụ nền xóa tài liệu hết hạn, chạy mỗi 60 giây. Trường phải là ngày (mảng ngày thì lấy ngày sớm nhất). TTL không là index kép và không đặt trên `_id`.

## Ví dụ

```javascript
db.movies.createIndex({ genres: 1 })

db.movies.createIndex(
  { year: 1 },
  { name: "year_gt_2000_partial", partialFilterExpression: { year: { $gt: 2000 } } }
)

db.sessions.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 3600 })
```

Với index partial ở trên, `{ year: 2005 }` và `{ year: { $gt: 2010 } }` dùng được index. `{ year: { $gt: 1990 } }` thì không, vì nó gồm cả phim 1991 đến 2000 mà index không giữ.

Đúng với docs chính thức của MongoDB hiện hành (8.x), kiểm ngày 2026-11-20.

# EN

## Key idea

You never declare "multikey". Index a field whose value is an array and MongoDB makes it a multikey index: each distinct array value is one key, and every key points back to the same document. An array with no upper bound makes the index grow with it.

- Compound multikey index: each document can have at most one indexed field whose value is an array. You cannot build the index when two indexed fields are arrays, and once it exists such a document cannot be inserted.
- A hashed index cannot be multikey. A multikey index cannot be a shard key index.
- A partial index holds only documents that match its `partialFilterExpression`. MongoDB does not use it if that would give an incomplete result, so the query condition must fall fully inside the filter. The docs recommend partial indexes over sparse ones.
- TTL index: a background task removes expired documents and runs every 60 seconds. The field must hold a date (for an array of dates the earliest counts). A TTL index is not compound and cannot be on `_id`.

## Example

```javascript
db.movies.createIndex({ genres: 1 })

db.movies.createIndex(
  { year: 1 },
  { name: "year_gt_2000_partial", partialFilterExpression: { year: { $gt: 2000 } } }
)

db.sessions.createIndex({ lastSeen: 1 }, { expireAfterSeconds: 3600 })
```

With the partial index above, `{ year: 2005 }` and `{ year: { $gt: 2010 } }` can use the index. `{ year: { $gt: 1990 } }` cannot, because it also covers movies from 1991 to 2000 that the index does not hold.

Matches the current MongoDB manual (8.x), checked 2026-11-20.
