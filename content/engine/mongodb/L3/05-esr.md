---
id: e-mg-l3-05
engine: mongodb
level: L3
module: esr-explain
title: "Index kép và luật ESR"
title_en: "Compound indexes and the ESR rule"
kind: concept
minutes: 10
runtime: browser
viz: mg-esr
objectives:
  - vi: "Giải thích vì sao thứ tự trường trong index kép quyết định vùng quét"
    en: "Explain why field order in a compound index decides the scanned range"
  - vi: "Xếp trường theo Equality, Sort, Range và biết khi nào đổi sang ERS"
    en: "Order fields as Equality, Sort, Range and know when to switch to ERS"
  - vi: "Nhận ra toán tử nào là range: $ne, $nin, $regex, $in với mảng lớn"
    en: "Recognise which operators act as a range: $ne, $nin, $regex, $in with a large array"
requires: [e-mg-l3-01]
lab:
  setup: |
    {"collections": {"movies": [
      {"_id": 1, "title": "Blue Velvet", "directors": ["David Lynch"], "year": 1986, "runtime": 120},
      {"_id": 2, "title": "Dune", "directors": ["David Lynch"], "year": 1984, "runtime": 137},
      {"_id": 3, "title": "Mulholland Drive", "directors": ["David Lynch"], "year": 2001, "runtime": 147},
      {"_id": 4, "title": "Fargo", "directors": ["Joel Coen", "Ethan Coen"], "year": 1996, "runtime": 98}
    ]}}
  steps:
    - name: { vi: "Index theo ESR", en: "An ESR index" }
      task:
        vi: "Cửa hàng phim chạy truy vấn `db.movies.find({ directors: \"Joel Coen\", year: { $gte: 1990 } }).sort({ title: 1 })`. Viết một `createIndex` theo ESR cho nó."
        en: "The film shop runs the query `db.movies.find({ directors: \"Joel Coen\", year: { $gte: 1990 } }).sort({ title: 1 })`. Write one `createIndex` for it that follows ESR."
      solution: 'db.movies.createIndex({ directors: 1, title: 1, year: 1 })'
      check: doc
      rule: esr
      target: 'db.movies.find({ directors: "Joel Coen", year: { $gte: 1990 } }).sort({ title: 1 })'
      slow: 'db.movies.createIndex({ directors: 1, year: 1, title: 1 })'
      hint:
        vi: "`directors` so bằng, `title` là trường sắp, `year` là khoảng (`$gte`)."
        en: "`directors` is an equality, `title` is the sort field, `year` is a range (`$gte`)."
      fact:
        vi: "Bước này chấm theo quy tắc ESR trong docs chính thức, không đo trên `mongod`: mingo không có index."
        en: "This step is graded by the ESR rule in the official docs, not measured on `mongod`: mingo has no indexes."
sources:
  - https://www.mongodb.com/docs/manual/tutorial/equality-sort-range-guideline/
  - https://www.mongodb.com/docs/manual/reference/explain-results/
  - https://www.mongodb.com/docs/manual/indexes/
quiz:
  - q:
      vi: "Truy vấn `find({ status: \"A\", qty: { $gt: 10 } }).sort({ day: 1 })`. Index nào theo đúng ESR?"
      en: "Query `find({ status: \"A\", qty: { $gt: 10 } }).sort({ day: 1 })`. Which index follows ESR?"
    options:
      - { vi: "`{ status: 1, qty: 1, day: 1 }`", en: "`{ status: 1, qty: 1, day: 1 }`" }
      - { vi: "`{ status: 1, day: 1, qty: 1 }`", en: "`{ status: 1, day: 1, qty: 1 }`" }
      - { vi: "`{ day: 1, qty: 1, status: 1 }`", en: "`{ day: 1, qty: 1, status: 1 }`" }
    answer: 1
    why:
      vi: "`status` là bằng nên đứng đầu, `day` là trường sắp xếp nên đứng thứ hai, `qty` là khoảng nên đứng cuối."
      en: "`status` is equality so it comes first, `day` is the sort field so it is second, `qty` is a range so it is last."
  - q:
      vi: "Trong luật ESR, `$ne` được tính là gì?"
      en: "Under ESR, what does `$ne` count as?"
    options:
      - { vi: "Equality", en: "Equality" }
      - { vi: "Range", en: "Range" }
      - { vi: "Sort", en: "Sort" }
    answer: 1
    why:
      vi: "Docs chính thức ghi rõ `$ne` và `$nin` là toán tử range, không phải equality. `$regex` cũng là range."
      en: "The docs state that `$ne` and `$nin` are range operators, not equality. `$regex` is a range too."
---

## Ý chính

Index (chỉ mục) MongoDB là B-tree. Index kép `{ a: 1, b: 1, c: 1 }` sắp khóa theo `a`, trong cùng `a` thì theo `b`, rồi theo `c`, như một danh bạ xếp theo họ rồi tên. Truy vấn chỉ quét được một đoạn liền của index khi các trường đứng trước đã bị cố định bằng phép so bằng.

Docs chính thức của MongoDB khuyên xếp trường theo ESR: Equality (so bằng) trước, Sort (trường sắp xếp) sau đó, Range (khoảng) cuối cùng. Trong một khối bằng, khóa đã có sẵn thứ tự nên MongoDB đọc theo index mà không phải sắp lại.

## Ví dụ

Nếu range đứng trước sort, thứ tự sort bị vỡ qua các giá trị range, MongoDB phải sắp trong bộ nhớ và explain có stage `SORT`. Theo docs chính thức, kế hoạch không có stage `SORT` nghĩa là thứ tự lấy từ index. Khi điều kiện khoảng rất chọn lọc, đặt range trước sort (ERS) có thể rẻ hơn, vì chỉ còn vài tài liệu phải sắp.

- `$ne`, `$nin` và `$regex` là range.
- `$in` một mình như nhiều phép bằng. Đi với `.sort()`: mảng dưới 201 phần tử được tách thành phép bằng rồi trộn theo thứ tự index (`SORT_MERGE`); từ 201 phần tử trở lên thì như range. Docs chính thức nói ngưỡng này không cam kết giữ nguyên giữa các phiên bản.

Ví dụ trong docs chính thức: `directors` là equality, `year` là sort, `runtime` là range.

```javascript
db.movies.find(
  { directors: "David Lynch", runtime: { $lt: 130 } },
  { title: 1, year: 1, runtime: 1 }
).sort({ year: 1 })

db.movies.createIndex({ directors: 1, year: 1, runtime: 1 })
```

Đúng với docs chính thức của MongoDB hiện hành (8.x), kiểm ngày 2026-11-20.

# EN

## Key idea

MongoDB indexes are B-trees. The compound index `{ a: 1, b: 1, c: 1 }` sorts keys by `a`, then within the same `a` by `b`, then by `c`, like a phone book ordered by family name then given name. A query scans one contiguous part of the index only when the fields in front are fixed by equality.

The MongoDB docs recommend the ESR order: Equality fields first, then Sort fields, then Range fields last. Inside an equality block the keys are already ordered, so MongoDB reads in index order with no extra sort.

## Example

If the range comes before the sort, the sort order breaks across range values, MongoDB must sort in memory and explain shows a `SORT` stage. Per the docs, a plan with no `SORT` stage got its order from the index. When the range predicate is very selective, range before sort (ERS) can be cheaper, because only a few documents are left to sort.

- `$ne`, `$nin` and `$regex` are ranges.
- `$in` alone acts as several equality matches. With `.sort()`: an array with fewer than 201 elements is expanded into equality matches and merged in index order (`SORT_MERGE`); with 201 or more it acts like a range. The docs say this threshold is not guaranteed to stay the same across versions.

The example from the docs: `directors` is equality, `year` is sort, `runtime` is range.

```javascript
db.movies.find(
  { directors: "David Lynch", runtime: { $lt: 130 } },
  { title: 1, year: 1, runtime: 1 }
).sort({ year: 1 })

db.movies.createIndex({ directors: 1, year: 1, runtime: 1 })
```

Matches the current MongoDB manual (8.x), checked 2026-11-20.
